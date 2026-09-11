import time
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
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
) -> dict[str, Any] | JSONResponse:
    request_id = f"req_{uuid4().hex[:16]}"
    started_at = time.perf_counter()
    request_payload = payload.model_dump(exclude_none=True)

    if payload.stream:
        return await _error_response(
            db,
            request_id=request_id,
            model_name=payload.model,
            status=RequestStatus.failed,
            latency_ms=_elapsed_ms(started_at),
            status_code=400,
            message="Streaming responses are not supported yet",
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
) -> JSONResponse:
    telemetry = await _persist_telemetry(
        db,
        request_id=request_id,
        model_name=model_name,
        status=status,
        latency_ms=latency_ms,
        error_message=message,
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
        status=status,
        latency_ms=latency_ms,
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
                "prompt_tokens": request.prompt_tokens,
                "completion_tokens": request.completion_tokens,
            },
        ),
    )


def _elapsed_ms(started_at: float) -> float:
    return round((time.perf_counter() - started_at) * 1000, 2)


def _safe_int(value: Any) -> int:
    return value if isinstance(value, int) and value >= 0 else 0
