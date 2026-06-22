import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatMs } from "@/lib/format";
import type { InferenceNode, InferenceRequest } from "@/lib/types";

type FailuresTableProps = {
  failures: InferenceRequest[];
  nodes: InferenceNode[];
  reviewedIds: Set<number>;
  onMarkReviewed: (id: number) => void;
  onRetry: (request: InferenceRequest) => void;
};

export function FailuresTable({
  failures,
  nodes,
  reviewedIds,
  onMarkReviewed,
  onRetry
}: FailuresTableProps) {
  const [selected, setSelected] = useState<InferenceRequest | null>(null);

  if (failures.length === 0) {
    return (
      <EmptyState
        title="No failures recorded"
        description="Failures from `/api/requests?failures_only=true` will appear here with retry and review controls."
        icon={<AlertTriangle className="size-5" />}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failures.map((failure) => (
              <TableRow key={failure.id}>
                <TableCell className="font-mono text-xs">{failure.request_id}</TableCell>
                <TableCell className="font-medium">{failure.model_name}</TableCell>
                <TableCell>{nodeName(failure.node_id, nodes)}</TableCell>
                <TableCell>
                  <StatusBadge value={failure.status} />
                </TableCell>
                <TableCell>{formatMs(failure.latency_ms)}</TableCell>
                <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                  {failure.error_message ?? "No error message"}
                </TableCell>
                <TableCell>
                  <StatusBadge value={reviewedIds.has(failure.id) ? "reviewed" : "open"} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(failure)}>
                      Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onRetry(failure)}>
                      <RotateCcw className="size-4" />
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{selected.request_id}</SheetTitle>
                <SheetDescription>{formatDateTime(selected.created_at)}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selected.status} />
                  <StatusBadge value={selected.model_name} />
                  <StatusBadge value={nodeName(selected.node_id, nodes)} />
                </div>
                <div>
                  <p className="text-sm font-medium">Failure summary</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.error_message ?? "No backend error message was recorded."}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Event detail</p>
                  <ScrollArea className="mt-2 h-48 rounded-md border bg-muted/30 p-3">
                    <pre className="text-xs leading-relaxed">
                      {JSON.stringify(
                        {
                          request_id: selected.request_id,
                          status: selected.status,
                          latency_ms: selected.latency_ms,
                          prompt_tokens: selected.prompt_tokens,
                          completion_tokens: selected.completion_tokens,
                          stack: [
                            "inference.runtime.dispatch",
                            "worker.execute_generation",
                            selected.error_message ?? "runtime_error"
                          ]
                        },
                        null,
                        2
                      )}
                    </pre>
                  </ScrollArea>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onRetry(selected)}>
                    <RotateCcw className="size-4" />
                    Retry request
                  </Button>
                  <Button variant="outline" onClick={() => onMarkReviewed(selected.id)}>
                    Mark reviewed
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function nodeName(nodeId: number | null, nodes: InferenceNode[]): string {
  if (!nodeId) return "n/a";
  return nodes.find((node) => node.id === nodeId)?.name ?? `node-${nodeId}`;
}
