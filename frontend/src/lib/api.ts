import type {
  BenchmarkResult,
  InferenceNode,
  InferenceRequest,
  LatencyPoint,
  ModelDeployment,
  OverviewStats,
  SystemEvent
} from "@/lib/types";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "dev-token";

type RequestOptions = RequestInit & {
  token?: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token = API_TOKEN, headers, ...init } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  overview: () => request<OverviewStats>("/api/analytics/overview"),
  nodes: () => request<InferenceNode[]>("/api/nodes"),
  deployments: () => request<ModelDeployment[]>("/api/deployments"),
  events: (limit = 160) => request<SystemEvent[]>(`/api/events?limit=${limit}`),
  requests: (limit = 220, failuresOnly = false) =>
    request<InferenceRequest[]>(`/api/requests?limit=${limit}&failures_only=${failuresOnly}`),
  latency: () => request<LatencyPoint[]>("/api/analytics/latency"),
  simulateTraffic: (count = 25) =>
    request<BenchmarkResult>(`/api/traffic/simulate?count=${count}`, { method: "POST" }),
  createEvent: (event: Pick<SystemEvent, "event_type" | "severity" | "message" | "payload">) =>
    request<SystemEvent>("/api/events", {
      method: "POST",
      body: JSON.stringify(event)
    })
};
