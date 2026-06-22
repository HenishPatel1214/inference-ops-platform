export type Environment = "local" | "staging" | "prod-sim";

export type TimeRange = "15m" | "1h" | "6h" | "24h";

export type ConnectionState = "connecting" | "live" | "degraded" | "offline";

export type OverviewStats = {
  nodes_total: number;
  nodes_online: number;
  deployments_active: number;
  requests_total: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  failures_total: number;
  events_total: number;
};

export type InferenceNode = {
  id: number;
  name: string;
  region: string;
  gpu_type: string;
  status: string;
  capacity_rps: number;
  current_load: number;
  last_heartbeat_at: string;
  created_at: string;
};

export type ModelDeployment = {
  id: number;
  model_name: string;
  model_version: string;
  runtime: string;
  status: string;
  replicas: number;
  node_id: number | null;
  created_at: string;
  updated_at: string;
};

export type SystemEvent = {
  id: number;
  event_type: string;
  severity: string;
  message: string;
  node_id: number | null;
  deployment_id: number | null;
  payload: Record<string, unknown>;
  created_at: string;
  published_at?: string;
};

export type InferenceRequest = {
  id: number;
  request_id: string;
  model_name: string;
  status: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  error_message: string | null;
  node_id: number | null;
  deployment_id: number | null;
  created_at: string;
};

export type LatencyPoint = {
  model_name: string;
  count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
};

export type BenchmarkResult = {
  requests: number;
  failures: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  elapsed_seconds: number;
};

export type NodeRuntimeMetrics = {
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  queueDepth: number;
  healthScore: number;
  activeModel: string;
};

export type DeploymentRuntimeStats = {
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorRate: number;
  throughputRps: number;
  replicasHealthy: number;
};

export type LatencySummary = {
  p50: number;
  p95: number;
  p99: number;
};

export type BenchmarkScenario = {
  id: string;
  label: string;
  requests: number;
  concurrency: number;
  description: string;
};
