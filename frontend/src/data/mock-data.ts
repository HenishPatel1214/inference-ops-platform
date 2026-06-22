import type {
  BenchmarkScenario,
  DeploymentRuntimeStats,
  InferenceNode,
  InferenceRequest,
  LatencyPoint,
  LatencySummary,
  ModelDeployment,
  NodeRuntimeMetrics,
  SystemEvent,
  TimeRange
} from "@/lib/types";

const rangeMs: Record<TimeRange, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000
};

export const benchmarkScenarios: BenchmarkScenario[] = [
  {
    id: "smoke",
    label: "Smoke test",
    requests: 25,
    concurrency: 1,
    description: "Fast check for request path, event emission, and p95 visibility."
  },
  {
    id: "burst",
    label: "Burst load",
    requests: 100,
    concurrency: 8,
    description: "Short stress run for queue depth, timeouts, and node load changes."
  },
  {
    id: "soak",
    label: "Mini soak",
    requests: 250,
    concurrency: 16,
    description: "Longer demo run for latency spread and failure trend inspection."
  }
];

export function filterByRange<T extends { created_at: string }>(rows: T[], range: TimeRange): T[] {
  const cutoff = Date.now() - rangeMs[range];
  return rows.filter((row) => new Date(row.created_at).getTime() >= cutoff);
}

export function requestRate(requests: InferenceRequest[], range: TimeRange): number {
  const count = filterByRange(requests, range).length;
  return Number((count / (rangeMs[range] / 1000)).toFixed(2));
}

export function errorRate(requests: InferenceRequest[]): number {
  if (requests.length === 0) return 0;
  const failures = requests.filter((request) => request.status !== "success").length;
  return Number(((failures / requests.length) * 100).toFixed(1));
}

export function latencySummary(requests: InferenceRequest[], latency: LatencyPoint[]): LatencySummary {
  const values = requests.map((request) => request.latency_ms).sort((a, b) => a - b);

  if (values.length > 0) {
    return {
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99)
    };
  }

  if (latency.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  return {
    p50: average(latency.map((point) => point.p50_ms)),
    p95: average(latency.map((point) => point.p95_ms)),
    p99: average(latency.map((point) => point.p99_ms))
  };
}

export function latencyTimeline(requests: InferenceRequest[]) {
  return [...requests]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-48)
    .map((request) => ({
      time: shortTime(request.created_at),
      latency: request.latency_ms,
      status: request.status,
      model: request.model_name
    }));
}

export function throughputSeries(requests: InferenceRequest[], range: TimeRange) {
  const rows = filterByRange(requests, range);
  const bucketCount = range === "15m" ? 15 : range === "1h" ? 12 : 24;
  const bucketSize = rangeMs[range] / bucketCount;
  const start = Date.now() - rangeMs[range];
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    time: shortTime(new Date(start + bucketSize * index).toISOString()),
    requests: 0,
    failures: 0
  }));

  rows.forEach((request) => {
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((new Date(request.created_at).getTime() - start) / bucketSize))
    );
    buckets[index].requests += 1;
    if (request.status !== "success") buckets[index].failures += 1;
  });

  return buckets;
}

export function latencyDistribution(requests: InferenceRequest[]) {
  const bins = [
    { label: "0-50", min: 0, max: 50 },
    { label: "50-100", min: 50, max: 100 },
    { label: "100-150", min: 100, max: 150 },
    { label: "150-250", min: 150, max: 250 },
    { label: "250+", min: 250, max: Number.POSITIVE_INFINITY }
  ];

  return bins.map((bin) => ({
    bucket: bin.label,
    requests: requests.filter((request) => request.latency_ms >= bin.min && request.latency_ms < bin.max)
      .length
  }));
}

export function nodeRuntimeMetrics(
  node: InferenceNode,
  deployments: ModelDeployment[]
): NodeRuntimeMetrics {
  const seed = hashNumber(node.name);
  const baseLoad = Math.min(1, Math.max(0, node.current_load));
  const activeDeployment = deployments.find((deployment) => deployment.node_id === node.id);
  const statusPenalty = node.status === "online" ? 0 : node.status === "degraded" ? 18 : 45;

  return {
    cpuUsage: clamp(Math.round(baseLoad * 72 + (seed % 18)), 4, 99),
    memoryUsage: clamp(Math.round(baseLoad * 66 + ((seed >> 2) % 22)), 6, 98),
    gpuUsage: clamp(Math.round(baseLoad * 82 + ((seed >> 4) % 16)), 8, 99),
    queueDepth: clamp(Math.round(baseLoad * node.capacity_rps + (seed % 7)), 0, 128),
    healthScore: clamp(Math.round(100 - baseLoad * 28 - statusPenalty), 0, 100),
    activeModel: activeDeployment?.model_name ?? "unassigned"
  };
}

export function deploymentRuntimeStats(
  deployment: ModelDeployment,
  requests: InferenceRequest[]
): DeploymentRuntimeStats {
  const modelRequests = requests.filter((request) => request.model_name === deployment.model_name);
  const failures = modelRequests.filter((request) => request.status !== "success");
  const latencies = modelRequests.map((request) => request.latency_ms).sort((a, b) => a - b);
  const healthyReplicas =
    deployment.status === "active" ? Math.max(1, deployment.replicas - (failures.length > 3 ? 1 : 0)) : 0;

  return {
    avgLatencyMs: modelRequests.length ? average(latencies) : 0,
    p95LatencyMs: modelRequests.length ? percentile(latencies, 95) : 0,
    errorRate: modelRequests.length ? Number(((failures.length / modelRequests.length) * 100).toFixed(1)) : 0,
    throughputRps: Number((modelRequests.length / 60).toFixed(2)),
    replicasHealthy: healthyReplicas
  };
}

export function criticalEvents(events: SystemEvent[]) {
  return events.filter((event) => ["critical", "error", "warning"].includes(event.severity)).slice(0, 8);
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return Math.round(sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function shortTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function hashNumber(value: string): number {
  return value.split("").reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 7);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
