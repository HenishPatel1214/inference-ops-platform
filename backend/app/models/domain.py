from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class NodeStatus(StrEnum):
    online = "online"
    degraded = "degraded"
    offline = "offline"


class DeploymentStatus(StrEnum):
    deploying = "deploying"
    active = "active"
    paused = "paused"
    failed = "failed"


class RequestStatus(StrEnum):
    success = "success"
    failed = "failed"
    timeout = "timeout"


class EventSeverity(StrEnum):
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InferenceNode(Base):
    __tablename__ = "inference_nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    region: Mapped[str] = mapped_column(String(80), default="local")
    gpu_type: Mapped[str] = mapped_column(String(120), default="simulated")
    status: Mapped[NodeStatus] = mapped_column(String(32), default=NodeStatus.online)
    capacity_rps: Mapped[float] = mapped_column(Float, default=25.0)
    current_load: Mapped[float] = mapped_column(Float, default=0.0)
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    requests: Mapped[list["InferenceRequest"]] = relationship(back_populates="node")
    deployments: Mapped[list["ModelDeployment"]] = relationship(back_populates="node")


class ModelDeployment(Base):
    __tablename__ = "model_deployments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    model_name: Mapped[str] = mapped_column(String(160), index=True)
    model_version: Mapped[str] = mapped_column(String(80), default="latest")
    runtime: Mapped[str] = mapped_column(String(120), default="vllm")
    status: Mapped[DeploymentStatus] = mapped_column(String(32), default=DeploymentStatus.active)
    replicas: Mapped[int] = mapped_column(Integer, default=1)
    node_id: Mapped[int | None] = mapped_column(ForeignKey("inference_nodes.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    node: Mapped[InferenceNode | None] = relationship(back_populates="deployments")
    requests: Mapped[list["InferenceRequest"]] = relationship(back_populates="deployment")


class InferenceRequest(Base):
    __tablename__ = "inference_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    model_name: Mapped[str] = mapped_column(String(160), index=True)
    upstream_model_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_streaming: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[RequestStatus] = mapped_column(String(32), default=RequestStatus.success)
    latency_ms: Mapped[float] = mapped_column(Float)
    time_to_first_token_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    tokens_per_second: Mapped[float | None] = mapped_column(Float, nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    node_id: Mapped[int | None] = mapped_column(ForeignKey("inference_nodes.id"), nullable=True)
    deployment_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_deployments.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    node: Mapped[InferenceNode | None] = relationship(back_populates="requests")
    deployment: Mapped[ModelDeployment | None] = relationship(back_populates="requests")
    latency_metric: Mapped["LatencyMetric"] = relationship(back_populates="request")


class LatencyMetric(Base):
    __tablename__ = "latency_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("inference_requests.id"), index=True)
    queue_ms: Mapped[float] = mapped_column(Float, default=0.0)
    inference_ms: Mapped[float] = mapped_column(Float, default=0.0)
    total_ms: Mapped[float] = mapped_column(Float, index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    request: Mapped[InferenceRequest] = relationship(back_populates="latency_metric")


class SystemEvent(Base):
    __tablename__ = "system_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True)
    severity: Mapped[EventSeverity] = mapped_column(String(32), default=EventSeverity.info)
    message: Mapped[str] = mapped_column(Text)
    node_id: Mapped[int | None] = mapped_column(ForeignKey("inference_nodes.id"), nullable=True)
    deployment_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_deployments.id"), nullable=True
    )
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


Index("ix_requests_model_created", InferenceRequest.model_name, InferenceRequest.created_at)
Index("ix_events_type_created", SystemEvent.event_type, SystemEvent.created_at)
