import json

import httpx
from sqlalchemy import select

from app.core.config import Settings
from app.db.session import SessionLocal
from app.main import app
from app.models import InferenceRequest, RequestStatus
from app.services.inference_gateway import OpenAICompatibleGateway, get_inference_gateway


def successful_upstream(request: httpx.Request) -> httpx.Response:
    payload = json.loads(request.content)
    assert request.url == "http://ollama.test/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer test-upstream-key"
    assert payload["model"] == "qwen2.5-coder:7b"
    assert payload["messages"][0]["content"] == "Hello"
    return httpx.Response(
        200,
        json={
            "id": "chatcmpl-upstream-1",
            "object": "chat.completion",
            "model": payload["model"],
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": "Hello back"},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 8, "completion_tokens": 3, "total_tokens": 11},
        },
    )


def unavailable_upstream(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("connection refused", request=request)


def streaming_upstream(request: httpx.Request) -> httpx.Response:
    payload = json.loads(request.content)
    assert payload["stream"] is True
    assert payload["stream_options"]["include_usage"] is True
    events = [
        {
            "id": "chatcmpl-stream-1",
            "object": "chat.completion.chunk",
            "model": "resolved-model-v2",
            "choices": [{"index": 0, "delta": {"role": "assistant"}}],
        },
        {
            "id": "chatcmpl-stream-1",
            "object": "chat.completion.chunk",
            "model": "resolved-model-v2",
            "choices": [{"index": 0, "delta": {"content": "Hello"}}],
        },
        {
            "id": "chatcmpl-stream-1",
            "object": "chat.completion.chunk",
            "model": "resolved-model-v2",
            "choices": [],
            "usage": {"prompt_tokens": 9, "completion_tokens": 4, "total_tokens": 13},
        },
    ]
    body = "".join(f"data: {json.dumps(event)}\n\n" for event in events)
    body += "data: [DONE]\n\n"
    return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=body)


class InterruptedStream(httpx.AsyncByteStream):
    async def __aiter__(self):
        yield (
            b'data: {"model":"resolved-model-v2","choices":'
            b'[{"delta":{"content":"partial"}}]}\n\n'
        )
        raise httpx.ReadError("upstream reset")


def interrupted_upstream(request: httpx.Request) -> httpx.Response:
    return httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        stream=InterruptedStream(),
    )


def gateway_with(transport: httpx.MockTransport) -> OpenAICompatibleGateway:
    settings = Settings(
        inference_upstream_url="http://ollama.test/v1",
        inference_upstream_api_key="test-upstream-key",
    )
    return OpenAICompatibleGateway(settings, transport=transport)


def test_chat_completion_proxies_and_persists_telemetry(client, auth_headers):
    gateway = gateway_with(httpx.MockTransport(successful_upstream))
    app.dependency_overrides[get_inference_gateway] = lambda: gateway
    try:
        response = client.post(
            "/v1/chat/completions",
            headers=auth_headers,
            json={
                "model": "qwen2.5-coder:7b",
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
    finally:
        app.dependency_overrides.pop(get_inference_gateway, None)

    assert response.status_code == 200
    assert response.json()["choices"][0]["message"]["content"] == "Hello back"
    assert response.headers["x-inference-request-id"].startswith("req_")

    with SessionLocal() as db:
        stored = db.scalar(select(InferenceRequest))
        assert stored is not None
        assert stored.status == RequestStatus.success
        assert stored.model_name == "qwen2.5-coder:7b"
        assert stored.upstream_model_name == "qwen2.5-coder:7b"
        assert stored.is_streaming is False
        assert stored.time_to_first_token_ms is None
        assert stored.tokens_per_second is None
        assert stored.prompt_tokens == 8
        assert stored.completion_tokens == 3
        assert stored.latency_metric.total_ms == stored.latency_ms


def test_chat_completion_persists_upstream_failure(client, auth_headers):
    gateway = gateway_with(httpx.MockTransport(unavailable_upstream))
    app.dependency_overrides[get_inference_gateway] = lambda: gateway
    try:
        response = client.post(
            "/v1/chat/completions",
            headers=auth_headers,
            json={
                "model": "missing-model",
                "messages": [{"role": "user", "content": "Hello"}],
            },
        )
    finally:
        app.dependency_overrides.pop(get_inference_gateway, None)

    assert response.status_code == 502
    assert response.json()["error"]["message"] == "Inference upstream is unavailable"

    with SessionLocal() as db:
        stored = db.scalar(select(InferenceRequest))
        assert stored is not None
        assert stored.status == RequestStatus.failed
        assert stored.error_message == "Inference upstream is unavailable"


def test_streaming_chat_completion_records_runtime_metrics(client, auth_headers, monkeypatch):
    node = client.post(
        "/api/nodes",
        headers=auth_headers,
        json={"name": "ollama-local", "gpu_type": "M2", "capacity_rps": 2},
    ).json()
    deployment = client.post(
        "/api/deployments",
        headers=auth_headers,
        json={
            "model_name": "requested-model",
            "runtime": "ollama",
            "replicas": 1,
            "node_id": node["id"],
        },
    ).json()

    clock = iter([100.0, 100.05, 100.25])
    monkeypatch.setattr("app.api.inference.perf_counter", lambda: next(clock))
    gateway = gateway_with(httpx.MockTransport(streaming_upstream))
    app.dependency_overrides[get_inference_gateway] = lambda: gateway
    try:
        response = client.post(
            "/v1/chat/completions",
            headers=auth_headers,
            json={
                "model": "requested-model",
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": True,
            },
        )
    finally:
        app.dependency_overrides.pop(get_inference_gateway, None)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["x-inference-request-id"].startswith("req_")
    assert "data: [DONE]" in response.text

    with SessionLocal() as db:
        stored = db.scalar(select(InferenceRequest))
        assert stored is not None
        assert stored.status == RequestStatus.success
        assert stored.is_streaming is True
        assert stored.model_name == "requested-model"
        assert stored.upstream_model_name == "resolved-model-v2"
        assert stored.node_id == node["id"]
        assert stored.deployment_id == deployment["id"]
        assert stored.time_to_first_token_ms == 50.0
        assert stored.tokens_per_second == 20.0
        assert stored.prompt_tokens == 9
        assert stored.completion_tokens == 4


def test_interrupted_stream_emits_error_and_persists_failure(client, auth_headers, monkeypatch):
    clock = iter([200.0, 200.04, 200.1])
    monkeypatch.setattr("app.api.inference.perf_counter", lambda: next(clock))
    gateway = gateway_with(httpx.MockTransport(interrupted_upstream))
    app.dependency_overrides[get_inference_gateway] = lambda: gateway
    try:
        response = client.post(
            "/v1/chat/completions",
            headers=auth_headers,
            json={
                "model": "requested-model",
                "messages": [{"role": "user", "content": "Hello"}],
                "stream": True,
            },
        )
    finally:
        app.dependency_overrides.pop(get_inference_gateway, None)

    assert response.status_code == 200
    assert "Inference upstream disconnected during streaming" in response.text

    with SessionLocal() as db:
        stored = db.scalar(select(InferenceRequest))
        assert stored is not None
        assert stored.status == RequestStatus.failed
        assert stored.is_streaming is True
        assert stored.time_to_first_token_ms == 40.0
        assert stored.tokens_per_second is None
        assert stored.error_message == "Inference upstream disconnected during streaming"
