import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  Gauge,
  KeyRound,
  Moon,
  Play,
  RadioTower,
  RefreshCw,
  Server,
  Sun
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TabsInCellForNavigation } from "@/components/ui/tabs-in-cell-for-navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConnectionState, Environment, TimeRange } from "@/lib/types";

export type View =
  | "overview"
  | "events"
  | "nodes"
  | "deployments"
  | "requests"
  | "failures"
  | "benchmarks"
  | "settings";

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "events", label: "Live Events", icon: RadioTower },
  { id: "nodes", label: "Inference Nodes", icon: Server },
  { id: "deployments", label: "Model Deployments", icon: Boxes },
  { id: "requests", label: "Requests / Latency", icon: Gauge },
  { id: "failures", label: "Failures", icon: AlertTriangle },
  { id: "benchmarks", label: "Benchmarks", icon: BarChart3 },
  { id: "settings", label: "API Keys", icon: KeyRound }
];

const navTabs = navItems.map((item) => ({
  value: item.id,
  label: item.label,
  icon: item.icon
}));

type AppShellProps = {
  view: View;
  environment: Environment;
  timeRange: TimeRange;
  connectionState: ConnectionState;
  darkMode: boolean;
  isSimulating: boolean;
  onViewChange: (view: View) => void;
  onEnvironmentChange: (environment: Environment) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onRefresh: () => void;
  onSimulate: () => void;
  children: ReactNode;
};

export function AppShell({
  view,
  environment,
  timeRange,
  connectionState,
  darkMode,
  isSimulating,
  onViewChange,
  onEnvironmentChange,
  onTimeRangeChange,
  onDarkModeChange,
  onRefresh,
  onSimulate,
  children
}: AppShellProps) {
  const activeItem = navItems.find((item) => item.id === view) ?? navItems[0];

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <div>
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                <Activity className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">AI inference operations</p>
                <h1 className="truncate text-xl font-semibold leading-tight">{activeItem.label}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={environment} onValueChange={(value) => onEnvironmentChange(value as Environment)}>
                <SelectTrigger className="h-8 w-32" aria-label="Environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="prod-sim">Prod Sim</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={(value) => onTimeRangeChange(value as TimeRange)}>
                <SelectTrigger className="h-8 w-28" aria-label="Time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 min</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                </SelectContent>
              </Select>
              <ConnectionStatus state={connectionState} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh data">
                    <RefreshCw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>
              <Button onClick={onSimulate} disabled={isSimulating} className="h-8">
                <Play className="size-4" />
                Simulate
              </Button>
              <Separator orientation="vertical" className="hidden h-7 sm:block" />
              <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2">
                {darkMode ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
                <Switch checked={darkMode} onCheckedChange={onDarkModeChange} aria-label="Toggle dark mode" />
              </div>
            </div>
          </div>
          <div className="border-t px-4 py-2 lg:px-6">
            <TabsInCellForNavigation value={view} tabs={navTabs} onValueChange={onViewChange} />
          </div>
        </header>

        <main className="px-4 py-4 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
