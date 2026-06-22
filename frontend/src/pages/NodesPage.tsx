import { Server } from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { NodesTable } from "@/components/tables/NodesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { nodeRuntimeMetrics } from "@/data/mock-data";
import type { InferenceNode, ModelDeployment } from "@/lib/types";

type NodesPageProps = {
  nodes: InferenceNode[];
  deployments: ModelDeployment[];
  loading: boolean;
};

export function NodesPage({ nodes, deployments, loading }: NodesPageProps) {
  const online = nodes.filter((node) => node.status === "online").length;
  const avgLoad = nodes.length
    ? Math.round(nodes.reduce((sum, node) => sum + node.current_load, 0) * 100 / nodes.length)
    : 0;
  const totalQueue = nodes.reduce((sum, node) => sum + nodeRuntimeMetrics(node, deployments).queueDepth, 0);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Online nodes" value={`${online}/${nodes.length}`} icon={<Server className="size-4" />} />
        <MetricCard label="Average load" value={`${avgLoad}%`} icon={<Server className="size-4" />} />
        <MetricCard label="Queue depth" value={totalQueue} icon={<Server className="size-4" />} />
      </section>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Inference nodes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[420px] rounded-md" /> : <NodesTable nodes={nodes} deployments={deployments} />}
        </CardContent>
      </Card>
    </div>
  );
}
