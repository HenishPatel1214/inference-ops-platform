import { useMemo, useState } from "react";
import { Server } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nodeRuntimeMetrics } from "@/data/mock-data";
import { formatDateTime } from "@/lib/format";
import type { InferenceNode, ModelDeployment } from "@/lib/types";

type NodesTableProps = {
  nodes: InferenceNode[];
  deployments: ModelDeployment[];
};

export function NodesTable({ nodes, deployments }: NodesTableProps) {
  const [selected, setSelected] = useState<InferenceNode | null>(null);
  const selectedMetrics = useMemo(
    () => (selected ? nodeRuntimeMetrics(selected, deployments) : null),
    [selected, deployments]
  );

  if (nodes.length === 0) {
    return (
      <EmptyState
        title="No inference nodes registered"
        description="Seed demo traffic or register a worker through `/api/nodes` to populate this table."
        icon={<Server className="size-5" />}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[940px]">
          <TableHeader>
            <TableRow>
              <TableHead>Node</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memory</TableHead>
              <TableHead>GPU</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Region / env</TableHead>
              <TableHead>Last heartbeat</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodes.map((node) => {
              const metrics = nodeRuntimeMetrics(node, deployments);
              return (
                <TableRow key={node.id}>
                  <TableCell>
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs text-muted-foreground">{node.gpu_type}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={node.status} />
                  </TableCell>
                  <TableCell>
                    <Usage value={metrics.cpuUsage} />
                  </TableCell>
                  <TableCell>
                    <Usage value={metrics.memoryUsage} />
                  </TableCell>
                  <TableCell>
                    <Usage value={metrics.gpuUsage} />
                  </TableCell>
                  <TableCell>{metrics.queueDepth}</TableCell>
                  <TableCell>{node.region}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(node.last_heartbeat_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(node)}>
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && selectedMetrics ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.gpu_type} in {selected.region}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selected.status} />
                  <StatusBadge value={`health ${selectedMetrics.healthScore}`} />
                  <StatusBadge value={selectedMetrics.activeModel} />
                </div>
                <Separator />
                <MetricLine label="CPU usage" value={selectedMetrics.cpuUsage} />
                <MetricLine label="Memory usage" value={selectedMetrics.memoryUsage} />
                <MetricLine label="GPU usage" value={selectedMetrics.gpuUsage} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{selected.capacity_rps} rps</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Queue depth</p>
                    <p className="font-medium">{selectedMetrics.queueDepth}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDateTime(selected.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Heartbeat</p>
                    <p className="font-medium">{formatDateTime(selected.last_heartbeat_at)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Usage({ value }: { value: number }) {
  return (
    <div className="flex w-28 items-center gap-2">
      <Progress value={value} />
      <span className="w-8 text-right text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}
