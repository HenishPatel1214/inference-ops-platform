import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const queryKeys = {
  overview: ["overview"] as const,
  nodes: ["nodes"] as const,
  deployments: ["deployments"] as const,
  events: ["events"] as const,
  requests: ["requests"] as const,
  failures: ["requests", "failures"] as const,
  latency: ["latency"] as const
};

export function useOpsData() {
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: queryKeys.overview,
    queryFn: api.overview,
    refetchInterval: 8000
  });

  const nodes = useQuery({
    queryKey: queryKeys.nodes,
    queryFn: api.nodes,
    refetchInterval: 8000
  });

  const deployments = useQuery({
    queryKey: queryKeys.deployments,
    queryFn: api.deployments,
    refetchInterval: 12000
  });

  const events = useQuery({
    queryKey: queryKeys.events,
    queryFn: () => api.events(160),
    refetchInterval: 15000
  });

  const requests = useQuery({
    queryKey: queryKeys.requests,
    queryFn: () => api.requests(220, false)
  });

  const failures = useQuery({
    queryKey: queryKeys.failures,
    queryFn: () => api.requests(120, true),
    refetchInterval: 10000
  });

  const latency = useQuery({
    queryKey: queryKeys.latency,
    queryFn: api.latency
  });

  const simulateTraffic = useMutation({
    mutationFn: api.simulateTraffic,
    onSuccess: () => {
      void invalidateOpsData(queryClient);
    }
  });

  const refreshAll = () => invalidateOpsData(queryClient);

  return {
    overview,
    nodes,
    deployments,
    events,
    requests,
    failures,
    latency,
    simulateTraffic,
    refreshAll,
    isInitialLoading:
      overview.isLoading ||
      nodes.isLoading ||
      deployments.isLoading ||
      events.isLoading ||
      requests.isLoading ||
      latency.isLoading,
    firstError:
      overview.error ??
      nodes.error ??
      deployments.error ??
      events.error ??
      requests.error ??
      failures.error ??
      latency.error
  };
}

function invalidateOpsData(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.overview }),
    queryClient.invalidateQueries({ queryKey: queryKeys.nodes }),
    queryClient.invalidateQueries({ queryKey: queryKeys.deployments }),
    queryClient.invalidateQueries({ queryKey: queryKeys.events }),
    queryClient.invalidateQueries({ queryKey: queryKeys.requests }),
    queryClient.invalidateQueries({ queryKey: queryKeys.failures }),
    queryClient.invalidateQueries({ queryKey: queryKeys.latency })
  ]);
}
