import { MoreHorizontal, PackageOpen } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deploymentRuntimeStats } from "@/data/mock-data";
import { formatMs, formatPercent } from "@/lib/format";
import type { InferenceNode, InferenceRequest, ModelDeployment } from "@/lib/types";

type DeploymentsTableProps = {
  deployments: ModelDeployment[];
  nodes: InferenceNode[];
  requests: InferenceRequest[];
  onAction: (message: string) => void;
};

export function DeploymentsTable({ deployments, nodes, requests, onAction }: DeploymentsTableProps) {
  if (deployments.length === 0) {
    return (
      <EmptyState
        title="No model deployments"
        description="Create a deployment through `/api/deployments` or run demo traffic to seed the platform."
        icon={<PackageOpen className="size-5" />}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead>Runtime</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Replicas</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Avg latency</TableHead>
            <TableHead>p95</TableHead>
            <TableHead>Error rate</TableHead>
            <TableHead>RPS</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.map((deployment) => {
            const stats = deploymentRuntimeStats(deployment, requests);
            const node = nodes.find((item) => item.id === deployment.node_id);
            return (
              <TableRow key={deployment.id}>
                <TableCell>
                  <div className="font-medium">{deployment.model_name}</div>
                  <div className="text-xs text-muted-foreground">version {deployment.model_version}</div>
                </TableCell>
                <TableCell className="uppercase">{deployment.runtime}</TableCell>
                <TableCell>
                  <StatusBadge value={deployment.status} />
                </TableCell>
                <TableCell>
                  {stats.replicasHealthy}/{deployment.replicas}
                </TableCell>
                <TableCell>{node?.name ?? "unassigned"}</TableCell>
                <TableCell>{formatMs(stats.avgLatencyMs)}</TableCell>
                <TableCell>{formatMs(stats.p95LatencyMs)}</TableCell>
                <TableCell>{formatPercent(stats.errorRate)}</TableCell>
                <TableCell>{stats.throughputRps}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Open actions for ${deployment.model_name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Deployment actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onAction(`Restart queued for ${deployment.model_name}`)}>
                        Restart workers
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction(`Scale workflow opened for ${deployment.model_name}`)}>
                        Scale replicas
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onAction(`Routing pause staged for ${deployment.model_name}`)}>
                        Pause routing
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
