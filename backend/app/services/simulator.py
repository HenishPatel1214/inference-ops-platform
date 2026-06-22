import asyncio
import random
import time
from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import (
    EventSeverity,
    InferenceNode,
    InferenceRequest,
    LatencyMetric,
    ModelDeployment,
    RequestStatus,
)
from app.schemas import BenchmarkResult, EventCreate
from app.services.analytics import percentile
from app.services.events import create_and_publish_event

MODELS = ["llama-3.1-8b", "mistral-7b", "qwen2.5-coder-7b"]
ERRORS = ["GPU memory pressure", "upstream timeout", "invalid runtime response"]


def ensure_demo_topology(db: Session) -> tuple[list[InferenceNode], list[ModelDeployment]]:
    nodes = list(db.scalars(select(InferenceNode)).all())
    if not nodes:
        nodes = [
            InferenceNode(
                name="worker-a100-01",
                region="us-west",
                gpu_type="A100",
                capacity_rps=45,
            ),
            InferenceNode(name="worker-l4-02", region="us-central", gpu_type="L4", capacity_rps=28),
            InferenceNode(
                name="worker-local-03",
                region="edge",
                gpu_type="M2 Max",
                capacity_rps=12,
            ),
        ]
        db.add_all(nodes)
        db.commit()
        for node in nodes:
            db.refresh(node)

    deployments = list(db.scalars(select(ModelDeployment)).all())
    if not deployments:
        deployments = [
            ModelDeployment(
                model_name=model,
                model_version="demo",
                node_id=nodes[i % len(nodes)].id,
            )
            for i, model in enumerate(MODELS)
        ]
        db.add_all(deployments)
        db.commit()
        for deployment in deployments:
            db.refresh(deployment)
    return nodes, deployments


async def simulate_one_request(db: Session) -> InferenceRequest:
    nodes, deployments = ensure_demo_topology(db)
    deployment = random.choice(deployments)
    node = random.choice(nodes)
    queue_ms = max(1.0, random.gauss(12, 6))
    inference_ms = max(10.0, random.gauss(105, 45))
    failure = random.random() < 0.08
    latency_ms = round(queue_ms + inference_ms + random.uniform(3, 20), 2)
    status = (
        random.choice([RequestStatus.failed, RequestStatus.timeout])
        if failure
        else RequestStatus.success
    )

    request = InferenceRequest(
        request_id=f"req_{uuid4().hex[:16]}",
        model_name=deployment.model_name,
        status=status,
        latency_ms=latency_ms,
        prompt_tokens=random.randint(24, 1800),
        completion_tokens=random.randint(16, 900),
        error_message=random.choice(ERRORS) if failure else None,
        node_id=node.id,
        deployment_id=deployment.id,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    db.add(
        LatencyMetric(
            request_id=request.id,
            queue_ms=round(queue_ms, 2),
            inference_ms=round(inference_ms, 2),
            total_ms=latency_ms,
        )
    )
    node.current_load = round(random.uniform(0.15, 0.95), 2)
    node.last_heartbeat_at = datetime.utcnow()
    db.commit()

    severity = EventSeverity.error if failure else EventSeverity.info
    await create_and_publish_event(
        db,
        EventCreate(
            event_type="inference.request",
            severity=severity,
            message=f"{request.status} request on {deployment.model_name} via {node.name}",
            node_id=node.id,
            deployment_id=deployment.id,
            payload={
                "request_id": request.request_id,
                "latency_ms": request.latency_ms,
                "status": request.status,
                "model_name": request.model_name,
            },
        ),
    )
    return request


async def simulate_batch(db: Session, count: int) -> BenchmarkResult:
    start = time.perf_counter()
    latencies: list[float] = []
    failures = 0
    for _ in range(count):
        request = await simulate_one_request(db)
        latencies.append(float(request.latency_ms))
        if request.status != RequestStatus.success:
            failures += 1
    return BenchmarkResult(
        requests=count,
        failures=failures,
        p50_ms=percentile(latencies, 50),
        p95_ms=percentile(latencies, 95),
        p99_ms=percentile(latencies, 99),
        elapsed_seconds=round(time.perf_counter() - start, 3),
    )


async def run_forever(interval_seconds: float) -> None:
    while True:
        db = SessionLocal()
        try:
            await simulate_one_request(db)
        finally:
            db.close()
        await asyncio.sleep(interval_seconds)
