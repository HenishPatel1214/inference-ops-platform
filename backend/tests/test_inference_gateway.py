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
