import { AlertTriangle, Database, Gauge, RadioTower, Server } from "lucide-react";

import { LatencyChart } from "@/components/charts/LatencyChart";
import { ThroughputChart } from "@/components/charts/ThroughputChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  criticalEvents,
  deploymentRuntimeStats,
  errorRate,
  latencySummary,
  latencyTimeline,
  requestRate,
  throughputSeries
} from "@/data/mock-data";
import { formatMs, formatNumber, formatPercent, formatTime } from "@/lib/format";
import type {
  InferenceRequest,
  LatencyPoint,
  ModelDeployment,
  OverviewStats,
  SystemEvent,
  TimeRange
} from "@/lib/types";

type OverviewPageProps = {
  overview: OverviewStats;
  deployments: ModelDeployment[];
  events: SystemEvent[];
  requests: InferenceRequest[];
  latency: LatencyPoint[];
  timeRange: TimeRange;
  loading: boolean;
};

export function OverviewPage({
  overview,
  deployments,
  events,
  requests,
  latency,
  timeRange,
  loading
}: OverviewPageProps) {
  const summary = latencySummary(requests, latency);
  const liveRps = requestRate(requests, timeRange);
  const computedErrorRate = requests.length > 0 ? errorRate(requests) : 100 - overview.success_rate;
  const critical = criticalEvents(events);

  if (loading) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Total requests" value={formatNumber(overview.requests_total)} icon={<Database className="size-4" />} />
        <MetricCard label="p50 latency" value={formatMs(summary.p50)} icon={<Gauge className="size-4" />} />
        <MetricCard label="p95 latency" value={formatMs(summary.p95 || overview.p95_latency_ms)} icon={<Gauge className="size-4" />} />
        <MetricCard label="p99 latency" value={formatMs(summary.p99)} icon={<Gauge className="size-4" />} />
        <MetricCard
          label="Error rate"
          value={formatPercent(computedErrorRate)}
          detail={`${overview.failures_total} failures`}
          tone={computedErrorRate > 5 ? "bad" : computedErrorRate > 1 ? "warn" : "good"}
          icon={<AlertTriangle className="size-4" />}
        />
        <MetricCard
          label="Active nodes"
          value={`${overview.nodes_online}/${overview.nodes_total}`}
          detail={`${overview.deployments_active} active deployments`}
          icon={<Server className="size-4" />}
        />
        <MetricCard label="Live RPS" value={liveRps} icon={<RadioTower className="size-4" />} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Latency trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LatencyChart data={latencyTimeline(requests)} />
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <ThroughputChart data={throughputSeries(requests, timeRange)} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model health summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deployments registered.</p>
            ) : (
              deployments.map((deployment) => {
                const stats = deploymentRuntimeStats(deployment, requests);
                return (
                  <div
                    key={deployment.id}
                    className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{deployment.model_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {deployment.runtime} / {deployment.model_version}
                      </p>
                    </div>
                    <StatusBadge value={deployment.status} />
                    <span>{formatMs(stats.p95LatencyMs)}</span>
                    <span>{formatPercent(stats.errorRate)} errors</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent critical events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {critical.length === 0 ? (
              <p className="text-sm text-muted-foreground">No critical events in the retained stream.</p>
            ) : (
              critical.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge value={event.severity} />
                    <span className="font-mono text-xs text-muted-foreground">{formatTime(event.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{event.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.event_type}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-md" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[340px] rounded-md" />
        <Skeleton className="h-[340px] rounded-md" />
      </section>
    </div>
  );
}
