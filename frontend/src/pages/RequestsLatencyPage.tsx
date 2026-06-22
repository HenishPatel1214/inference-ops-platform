import { useMemo, useState } from "react";
import { Database, Gauge, Search } from "lucide-react";

import { LatencyDistributionChart } from "@/components/charts/LatencyDistributionChart";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RequestsTable } from "@/components/tables/RequestsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { filterByRange, latencyDistribution, latencySummary } from "@/data/mock-data";
import { formatMs } from "@/lib/format";
import type { InferenceNode, InferenceRequest, LatencyPoint, TimeRange } from "@/lib/types";

type RequestsLatencyPageProps = {
  requests: InferenceRequest[];
  nodes: InferenceNode[];
  latency: LatencyPoint[];
  timeRange: TimeRange;
  loading: boolean;
};

export function RequestsLatencyPage({ requests, nodes, latency, timeRange, loading }: RequestsLatencyPageProps) {
  const [model, setModel] = useState("all");
  const [node, setNode] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const models = useMemo(
    () => Array.from(new Set(requests.map((request) => request.model_name))).sort(),
    [requests]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return filterByRange(requests, timeRange).filter((request) => {
      const matchesModel = model === "all" || request.model_name === model;
      const matchesNode = node === "all" || String(request.node_id ?? "none") === node;
      const matchesStatus = status === "all" || request.status === status;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        request.request_id.toLowerCase().includes(normalizedSearch) ||
        request.model_name.toLowerCase().includes(normalizedSearch);
      return matchesModel && matchesNode && matchesStatus && matchesSearch;
    });
  }, [model, node, requests, search, status, timeRange]);

  const failures = filtered.filter((request) => request.status !== "success");
  const summary = latencySummary(filtered, latency);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Requests" value={filtered.length} icon={<Database className="size-4" />} />
        <MetricCard label="p50 latency" value={formatMs(summary.p50)} icon={<Gauge className="size-4" />} />
        <MetricCard label="p95 latency" value={formatMs(summary.p95)} icon={<Gauge className="size-4" />} />
        <MetricCard label="p99 latency" value={formatMs(summary.p99)} icon={<Gauge className="size-4" />} />
      </section>

      <Card className="shadow-none">
        <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="text-base">Request filters</CardTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Request or model"
                className="h-8 pl-8 lg:w-52"
                aria-label="Search requests"
              />
            </div>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 lg:w-48" aria-label="Model filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {models.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={node} onValueChange={setNode}>
              <SelectTrigger className="h-8 lg:w-48" aria-label="Node filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All nodes</SelectItem>
                {nodes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 lg:w-36" aria-label="Status filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="requests">
            <TabsList>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="latency">Latency distribution</TabsTrigger>
              <TabsTrigger value="failures">Failed requests</TabsTrigger>
            </TabsList>
            <TabsContent value="requests" className="mt-4">
              {loading ? <Skeleton className="h-[420px] rounded-md" /> : <RequestsTable requests={filtered} nodes={nodes} />}
            </TabsContent>
            <TabsContent value="latency" className="mt-4">
              <LatencyDistributionChart data={latencyDistribution(filtered)} />
            </TabsContent>
            <TabsContent value="failures" className="mt-4">
              {loading ? <Skeleton className="h-[420px] rounded-md" /> : <RequestsTable requests={failures} nodes={nodes} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
