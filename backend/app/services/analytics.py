from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    DeploymentStatus,
    InferenceNode,
    InferenceRequest,
    ModelDeployment,
    NodeStatus,
    RequestStatus,
    SystemEvent,
)
from app.schemas import LatencyPoint, OverviewStats


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((pct / 100) * (len(ordered) - 1))))
    return round(ordered[index], 2)


def overview_stats(db: Session) -> OverviewStats:
    nodes_total = db.scalar(select(func.count()).select_from(InferenceNode)) or 0
    nodes_online = (
        db.scalar(
            select(func.count())
            .select_from(InferenceNode)
            .where(InferenceNode.status == NodeStatus.online)
        )
        or 0
    )
    deployments_active = (
        db.scalar(
            select(func.count())
            .select_from(ModelDeployment)
            .where(ModelDeployment.status == DeploymentStatus.active)
        )
        or 0
    )
    requests_total = db.scalar(select(func.count()).select_from(InferenceRequest)) or 0
    failures_total = (
        db.scalar(
            select(func.count())
            .select_from(InferenceRequest)
            .where(InferenceRequest.status != RequestStatus.success)
        )
        or 0
    )
    events_total = db.scalar(select(func.count()).select_from(SystemEvent)) or 0
    latencies = list(db.scalars(select(InferenceRequest.latency_ms)).all())
    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
    success_rate = (
        round(((requests_total - failures_total) / requests_total) * 100, 2)
        if requests_total
        else 100.0
    )
    return OverviewStats(
        nodes_total=nodes_total,
        nodes_online=nodes_online,
        deployments_active=deployments_active,
        requests_total=requests_total,
        success_rate=success_rate,
        avg_latency_ms=avg_latency,
        p95_latency_ms=percentile(latencies, 95),
        failures_total=failures_total,
        events_total=events_total,
    )


def latency_by_model(db: Session) -> list[LatencyPoint]:
    rows = db.execute(select(InferenceRequest.model_name, InferenceRequest.latency_ms)).all()
    grouped: dict[str, list[float]] = defaultdict(list)
    for model_name, latency_ms in rows:
        grouped[model_name].append(float(latency_ms))
    return [
        LatencyPoint(
            model_name=model_name,
            count=len(values),
            p50_ms=percentile(values, 50),
            p95_ms=percentile(values, 95),
            p99_ms=percentile(values, 99),
        )
        for model_name, values in sorted(grouped.items())
    ]
