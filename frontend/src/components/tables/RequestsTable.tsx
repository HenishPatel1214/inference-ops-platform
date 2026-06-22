import { Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMs } from "@/lib/format";
import type { InferenceNode, InferenceRequest } from "@/lib/types";

type RequestsTableProps = {
  requests: InferenceRequest[];
  nodes: InferenceNode[];
};

export function RequestsTable({ requests, nodes }: RequestsTableProps) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No requests match the current filters"
        description="Adjust filters or run simulated traffic to create request samples."
        icon={<Search className="size-5" />}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[980px]">
        <TableHeader>
          <TableRow>
            <TableHead>Request ID</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead>Prompt</TableHead>
            <TableHead>Completion</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-mono text-xs">{request.request_id}</TableCell>
              <TableCell className="font-medium">{request.model_name}</TableCell>
              <TableCell>{nodeName(request.node_id, nodes)}</TableCell>
              <TableCell>
                <StatusBadge value={request.status} />
              </TableCell>
              <TableCell>{formatMs(request.latency_ms)}</TableCell>
              <TableCell>{request.prompt_tokens}</TableCell>
              <TableCell>{request.completion_tokens}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(request.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function nodeName(nodeId: number | null, nodes: InferenceNode[]): string {
  if (!nodeId) return "n/a";
  return nodes.find((node) => node.id === nodeId)?.name ?? `node-${nodeId}`;
}
