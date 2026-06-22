import { RadioTower } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConnectionState } from "@/lib/types";

const labels: Record<ConnectionState, string> = {
  connecting: "Connecting",
  live: "Live",
  degraded: "Degraded",
  offline: "Offline"
};

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5">
          <RadioTower className="size-4 text-muted-foreground" />
          <StatusBadge value={labels[state]} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>WebSocket event stream: {labels[state].toLowerCase()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
