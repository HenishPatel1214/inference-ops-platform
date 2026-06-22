import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { AppShell, type View } from "@/components/layout/AppShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEventStream } from "@/hooks/useEventStream";
import { useOpsData } from "@/hooks/useInferenceOps";
import { BenchmarksPage } from "@/pages/BenchmarksPage";
import { DeploymentsPage } from "@/pages/DeploymentsPage";
import { FailuresPage } from "@/pages/FailuresPage";
import { LiveEventsPage } from "@/pages/LiveEventsPage";
import { NodesPage } from "@/pages/NodesPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { RequestsLatencyPage } from "@/pages/RequestsLatencyPage";
import { SettingsPage } from "@/pages/SettingsPage";
import type { Environment, OverviewStats, TimeRange } from "@/lib/types";

const fallbackOverview: OverviewStats = {
  nodes_total: 0,
  nodes_online: 0,
  deployments_active: 0,
  requests_total: 0,
  success_rate: 100,
  avg_latency_ms: 0,
  p95_latency_ms: 0,
  failures_total: 0,
  events_total: 0
};

export function App() {
  const [view, setView] = useState<View>("overview");
  const [environment, setEnvironment] = useState<Environment>("local");
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [darkMode, setDarkMode] = useState(false);
  const ops = useOpsData();
  const connectionState = useEventStream();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const overview = ops.overview.data ?? fallbackOverview;
  const nodes = ops.nodes.data ?? [];
  const deployments = ops.deployments.data ?? [];
  const events = ops.events.data ?? [];
  const requests = ops.requests.data ?? [];
  const failures = ops.failures.data ?? requests.filter((request) => request.status !== "success");
  const latency = ops.latency.data ?? [];
  const firstError = ops.firstError instanceof Error ? ops.firstError : null;

  const simulate = () => {
    ops.simulateTraffic.mutate(40);
  };

  return (
    <AppShell
      view={view}
      environment={environment}
      timeRange={timeRange}
      connectionState={connectionState}
      darkMode={darkMode}
      isSimulating={ops.simulateTraffic.isPending}
      onViewChange={setView}
      onEnvironmentChange={setEnvironment}
      onTimeRangeChange={setTimeRange}
      onDarkModeChange={setDarkMode}
      onRefresh={ops.refreshAll}
      onSimulate={simulate}
    >
      {firstError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertTitle>Backend data unavailable</AlertTitle>
          <AlertDescription>{firstError.message}</AlertDescription>
        </Alert>
      ) : null}

      {view === "overview" ? (
        <OverviewPage
          overview={overview}
          deployments={deployments}
          events={events}
          requests={requests}
          latency={latency}
          timeRange={timeRange}
          loading={ops.isInitialLoading}
        />
      ) : null}

      {view === "events" ? (
        <LiveEventsPage
          events={events}
          deployments={deployments}
          timeRange={timeRange}
          loading={ops.events.isLoading}
          error={ops.events.error}
        />
      ) : null}

      {view === "nodes" ? (
        <NodesPage nodes={nodes} deployments={deployments} loading={ops.nodes.isLoading} />
      ) : null}

      {view === "deployments" ? (
        <DeploymentsPage
          deployments={deployments}
          nodes={nodes}
          requests={requests}
          loading={ops.deployments.isLoading}
        />
      ) : null}

      {view === "requests" ? (
        <RequestsLatencyPage
          requests={requests}
          nodes={nodes}
          latency={latency}
          timeRange={timeRange}
          loading={ops.requests.isLoading}
        />
      ) : null}

      {view === "failures" ? (
        <FailuresPage
          failures={failures}
          nodes={nodes}
          loading={ops.failures.isLoading}
          onRetry={() => ops.simulateTraffic.mutate(1)}
        />
      ) : null}

      {view === "benchmarks" ? (
        <BenchmarksPage
          isRunning={ops.simulateTraffic.isPending}
          onRunBenchmark={(count) => ops.simulateTraffic.mutateAsync(count)}
        />
      ) : null}

      {view === "settings" ? (
        <SettingsPage darkMode={darkMode} onDarkModeChange={setDarkMode} />
      ) : null}
    </AppShell>
  );
}
