import { useState } from "react";
import { FileJson, Search } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatTime, payloadPreview } from "@/lib/format";
import type { ModelDeployment, SystemEvent } from "@/lib/types";

type EventsTableProps = {
  events: SystemEvent[];
  deployments: ModelDeployment[];
};

export function EventsTable({ events, deployments }: EventsTableProps) {
  const [selected, setSelected] = useState<SystemEvent | null>(null);

  if (events.length === 0) {
    return (
      <EmptyState
        title="No events match the current filters"
        description="Events will appear here from `/api/events` and the `/ws/events` stream."
        icon={<Search className="size-5" />}
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Payload preview</TableHead>
              <TableHead className="text-right">Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-xs">{formatTime(event.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge value={event.severity} />
                </TableCell>
                <TableCell className="font-medium">{event.event_type}</TableCell>
                <TableCell>{event.node_id ? `node-${event.node_id}` : "n/a"}</TableCell>
                <TableCell>{eventModel(event, deployments)}</TableCell>
                <TableCell className="max-w-[320px] truncate font-mono text-xs text-muted-foreground">
                  {payloadPreview(event.payload)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
                    <FileJson className="size-4" />
                    View
                  </Button>
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
                <SheetTitle>{selected.event_type}</SheetTitle>
                <SheetDescription>{formatDateTime(selected.created_at)}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={selected.severity} />
                  <StatusBadge value={selected.node_id ? `node-${selected.node_id}` : "no node"} />
                  <StatusBadge value={eventModel(selected, deployments)} />
                </div>
                <div>
                  <p className="text-sm font-medium">Message</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.message}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Payload</p>
                  <ScrollArea className="mt-2 h-72 rounded-md border bg-muted/30 p-3">
                    <pre className="text-xs leading-relaxed">
                      {JSON.stringify(selected.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function eventModel(event: SystemEvent, deployments: ModelDeployment[]): string {
  const payloadModel = event.payload.model_name;
  if (typeof payloadModel === "string") return payloadModel;
  return deployments.find((deployment) => deployment.id === event.deployment_id)?.model_name ?? "n/a";
}
