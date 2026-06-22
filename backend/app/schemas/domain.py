from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class NodeBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    region: str = "local"
    gpu_type: str = "simulated"
    status: str = "online"
    capacity_rps: float = Field(default=25.0, ge=0)
    current_load: float = Field(default=0.0, ge=0)


class NodeCreate(NodeBase):
    pass


class NodeUpdate(BaseModel):
    region: str | None = None
    gpu_type: str | None = None
    status: str | None = None
    capacity_rps: float | None = Field(default=None, ge=0)
    current_load: float | None = Field(default=None, ge=0)


class NodeRead(NodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_heartbeat_at: datetime
    created_at: datetime


class DeploymentBase(BaseModel):
    model_name: str = Field(min_length=2, max_length=160)
    model_version: str = "latest"
    runtime: str = "vllm"
    status: str = "active"
    replicas: int = Field(default=1, ge=1)
    node_id: int | None = None


class DeploymentCreate(DeploymentBase):
    pass


class DeploymentUpdate(BaseModel):
    model_version: str | None = None
    runtime: str | None = None
    status: str | None = None
    replicas: int | None = Field(default=None, ge=1)
    node_id: int | None = None


class DeploymentRead(DeploymentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class InferenceRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    model_name: str
    status: str
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    error_message: str | None
    node_id: int | None
    deployment_id: int | None
    created_at: datetime


class EventCreate(BaseModel):
    event_type: str = Field(min_length=2, max_length=80)
    severity: str = "info"
    message: str = Field(min_length=1)
    node_id: int | None = None
    deployment_id: int | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    severity: str
    message: str
    node_id: int | None
    deployment_id: int | None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class OverviewStats(BaseModel):
    nodes_total: int
    nodes_online: int
    deployments_active: int
    requests_total: int
    success_rate: float
    avg_latency_ms: float
    p95_latency_ms: float
    failures_total: int
    events_total: int


class LatencyPoint(BaseModel):
    model_name: str
    count: int
    p50_ms: float
    p95_ms: float
    p99_ms: float


class BenchmarkResult(BaseModel):
    requests: int
    failures: int
    p50_ms: float
    p95_ms: float
    p99_ms: float
    elapsed_seconds: float
