import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from time import perf_counter
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import SessionLocal, get_db
from app.models import (
    EventSeverity,
    InferenceRequest,
    LatencyMetric,
    ModelDeployment,
    RequestStatus,
)
from app.schemas import ChatCompletionRequest, EventCreate
from app.services.events import create_and_publish_event
from app.services.inference_gateway import (
    ChatCompletionStream,
    OpenAICompatibleGateway,
    UpstreamInferenceError,
    get_inference_gateway,
)

router = APIRouter(
    prefix="/v1",
    tags=["inference"],
    dependencies=[Depends(require_api_token)],
)


@router.post("/chat/completions", response_model=None)
async def create_chat_completion(
    payload: ChatCompletionRequest,
    response: Response,
    db: Session = Depends(get_db),
    gateway: OpenAICompatibleGateway = Depends(get_inference_gateway),
) -> dict[str, Any] | JSONResponse | StreamingResponse:
    request_id = f"req_{uuid4().hex[:16]}"
    started_at = perf_counter()
    request_payload = payload.model_dump(exclude_none=True)

    if payload.stream:
        stream_options = request_payload.setdefault("stream_options", {})
        if isinstance(stream_options, dict):
            stream_options.setdefault("include_usage", True)
        try:
            upstream = await gateway.open_chat_completion_stream(request_payload)
        except UpstreamInferenceError as exc:
            status = RequestStatus.timeout if exc.status_code == 504 else RequestStatus.failed
            return await _error_response(
                db,
                request_id=request_id,
                model_name=payload.model,
                status=status,
                latency_ms=_elapsed_ms(started_at),
                status_code=exc.status_code,
                message=exc.message,
                is_streaming=True,
            )
        return StreamingResponse(
            _stream_chat_completion(
                upstream,
                request_id=request_id,
                requested_model=payload.model,
                started_at=started_at,
            ),
            media_type="text/event-stream",
            headers={
                "cache-control": "no-cache",
                "x-accel-buffering": "no",
                "x-inference-request-id": request_id,
            },
        )

    try:
        result = await gateway.create_chat_completion(request_payload)
    except UpstreamInferenceError as exc:
        status = RequestStatus.timeout if exc.status_code == 504 else RequestStatus.failed
        return await _error_response(
            db,
            request_id=request_id,
            model_name=payload.model,
            status=status,
            latency_ms=_elapsed_ms(started_at),
            status_code=exc.status_code,
            message=exc.message,
        )

    latency_ms = _elapsed_ms(started_at)
    usage = result.get("usage", {})
    telemetry = await _persist_telemetry(
        db,
        request_id=request_id,
        model_name=payload.model,
        status=RequestStatus.success,
        latency_ms=latency_ms,
        prompt_tokens=_safe_int(usage.get("prompt_tokens")) if isinstance(usage, dict) else 0,
        completion_tokens=(
            _safe_int(usage.get("completion_tokens")) if isinstance(usage, dict) else 0
        ),
        upstream_model_name=_safe_string(result.get("model")),
    )
    response.headers["x-inference-request-id"] = request_id
    await _publish_request_event(db, telemetry)
    return result


async def _error_response(
    db: Session,
    *,
    request_id: str,
    model_name: str,
    status: RequestStatus,
    latency_ms: float,
    status_code: int,
    message: str,
    is_streaming: bool = False,
) -> JSONResponse:
    telemetry = await _persist_telemetry(
        db,
        request_id=request_id,
        model_name=model_name,
        status=status,
        latency_ms=latency_ms,
        error_message=message,
        is_streaming=is_streaming,
    )
    await _publish_request_event(db, telemetry)
    return JSONResponse(
        status_code=status_code,
        headers={"x-inference-request-id": request_id},
        content={"error": {"message": message, "type": "upstream_error"}},
    )


async def _persist_telemetry(
    db: Session,
    *,
    request_id: str,
    model_name: str,
    status: RequestStatus,
    latency_ms: float,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    error_message: str | None = None,
    upstream_model_name: str | None = None,
    is_streaming: bool = False,
    time_to_first_token_ms: float | None = None,
    tokens_per_second: float | None = None,
) -> InferenceRequest:
    deployment = db.scalar(
        select(ModelDeployment)
        .where(ModelDeployment.model_name == model_name)
        .order_by(ModelDeployment.updated_at.desc())
        .limit(1)
    )
    request = InferenceRequest(
        request_id=request_id,
        model_name=model_name,
        upstream_model_name=upstream_model_name,
        is_streaming=is_streaming,
        status=status,
        latency_ms=latency_ms,
        time_to_first_token_ms=time_to_first_token_ms,
        tokens_per_second=tokens_per_second,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        error_message=error_message,
        node_id=deployment.node_id if deployment else None,
        deployment_id=deployment.id if deployment else None,
    )
    db.add(request)
    db.flush()
    db.add(
        LatencyMetric(
            request_id=request.id,
            queue_ms=0.0,
            inference_ms=latency_ms,
            total_ms=latency_ms,
        )
    )
    db.commit()
    db.refresh(request)
    return request


async def _publish_request_event(db: Session, request: InferenceRequest) -> None:
    severity = (
        EventSeverity.info if request.status == RequestStatus.success else EventSeverity.error
    )
    await create_and_publish_event(
        db,
        EventCreate(
            event_type="inference.request",
            severity=severity,
            message=f"{request.status} request on {request.model_name}",
            node_id=request.node_id,
            deployment_id=request.deployment_id,
            payload={
                "request_id": request.request_id,
                "latency_ms": request.latency_ms,
                "status": request.status,
                "model_name": request.model_name,
                "upstream_model_name": request.upstream_model_name,
                "is_streaming": request.is_streaming,
                "time_to_first_token_ms": request.time_to_first_token_ms,
                "tokens_per_second": request.tokens_per_second,
                "prompt_tokens": request.prompt_tokens,
                "completion_tokens": request.completion_tokens,
            },
        ),
    )


def _elapsed_ms(started_at: float) -> float:
    return round((perf_counter() - started_at) * 1000, 2)


def _safe_int(value: Any) -> int:
    return value if isinstance(value, int) and value >= 0 else 0


def _safe_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


@dataclass
class StreamTelemetry:
    upstream_model_name: str | None = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    first_token_at: float | None = None
    status: RequestStatus = RequestStatus.success
    error_message: str | None = None


async def _stream_chat_completion(
    upstream: ChatCompletionStream,
    *,
    request_id: str,
    requested_model: str,
    started_at: float,
) -> AsyncIterator[bytes]:
    state = StreamTelemetry()
    try:
        async for line in upstream.aiter_lines():
            _observe_stream_line(line, state)
            yield f"{line}\n".encode()
    except (asyncio.CancelledError, GeneratorExit):
        state.status = RequestStatus.failed
        state.error_message = "Client disconnected before stream completed"
        raise
    except httpx.TimeoutException:
        state.status = RequestStatus.timeout
        state.error_message = "Inference upstream timed out during streaming"
        yield _stream_error_event(state.error_message)
    except httpx.RequestError:
        state.status = RequestStatus.failed
        state.error_message = "Inference upstream disconnected during streaming"
        yield _stream_error_event(state.error_message)
    finally:
        await upstream.aclose()
        latency_ms = _elapsed_ms(started_at)
        ttft_ms = (
            round((state.first_token_at - started_at) * 1000, 2)
            if state.first_token_at is not None
            else None
        )
        tokens_per_second = _token_throughput(
            state.completion_tokens,
            latency_ms,
            ttft_ms,
        )
        with SessionLocal() as stream_db:
            telemetry = await _persist_telemetry(
                stream_db,
                request_id=request_id,
                model_name=requested_model,
                upstream_model_name=state.upstream_model_name,
                is_streaming=True,
                status=state.status,
                latency_ms=latency_ms,
                time_to_first_token_ms=ttft_ms,
                tokens_per_second=tokens_per_second,
                prompt_tokens=state.prompt_tokens,
                completion_tokens=state.completion_tokens,
                error_message=state.error_message,
            )
            await _publish_request_event(stream_db, telemetry)


def _observe_stream_line(line: str, state: StreamTelemetry) -> None:
    if not line.startswith("data:"):
        return
    raw_data = line.removeprefix("data:").strip()
    if not raw_data or raw_data == "[DONE]":
        return
    try:
        chunk = json.loads(raw_data)
    except json.JSONDecodeError:
        return
    if not isinstance(chunk, dict):
        return

    state.upstream_model_name = _safe_string(chunk.get("model")) or state.upstream_model_name
    usage = chunk.get("usage")
    if isinstance(usage, dict):
        state.prompt_tokens = _safe_int(usage.get("prompt_tokens"))
        state.completion_tokens = _safe_int(usage.get("completion_tokens"))

    if state.first_token_at is None and _chunk_has_generated_output(chunk):
        state.first_token_at = perf_counter()


def _chunk_has_generated_output(chunk: dict[str, Any]) -> bool:
    choices = chunk.get("choices")
    if not isinstance(choices, list):
        return False
    for choice in choices:
        if not isinstance(choice, dict):
            continue
        delta = choice.get("delta")
        if not isinstance(delta, dict):
            continue
        for key, value in delta.items():
            if key != "role" and value not in (None, "", [], {}):
                return True
    return False


def _token_throughput(
    completion_tokens: int,
    latency_ms: float,
    time_to_first_token_ms: float | None,
) -> float | None:
    if completion_tokens <= 0 or time_to_first_token_ms is None:
        return None
    generation_seconds = (latency_ms - time_to_first_token_ms) / 1000
    if generation_seconds <= 0:
        return None
    return round(completion_tokens / generation_seconds, 2)


def _stream_error_event(message: str) -> bytes:
    body = json.dumps({"error": {"message": message, "type": "upstream_error"}})
    return f"data: {body}\n\n".encode()
