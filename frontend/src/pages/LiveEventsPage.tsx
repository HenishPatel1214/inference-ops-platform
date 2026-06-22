import { useMemo, useState } from "react";
import { AlertCircle, Filter, Search } from "lucide-react";

import { EventsTable } from "@/components/tables/EventsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { filterByRange } from "@/data/mock-data";
import type { ModelDeployment, SystemEvent, TimeRange } from "@/lib/types";

type LiveEventsPageProps = {
  events: SystemEvent[];
  deployments: ModelDeployment[];
  timeRange: TimeRange;
  loading: boolean;
  error: Error | null;
};

export function LiveEventsPage({ events, deployments, timeRange, loading, error }: LiveEventsPageProps) {
  const [severity, setSeverity] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [search, setSearch] = useState("");

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((event) => event.event_type))).sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return filterByRange(events, timeRange).filter((event) => {
      const matchesSeverity = severity === "all" || event.severity === severity;
      const matchesType = eventType === "all" || event.event_type === eventType;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        event.message.toLowerCase().includes(normalizedSearch) ||
        event.event_type.toLowerCase().includes(normalizedSearch) ||
        JSON.stringify(event.payload).toLowerCase().includes(normalizedSearch);
      return matchesSeverity && matchesType && matchesSearch;
    });
  }, [eventType, events, search, severity, timeRange]);

  return (
    <Card className="shadow-none">
      <CardHeader className="gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="text-base">Real-time event feed</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events"
              className="h-8 pl-8 sm:w-56"
              aria-label="Search events"
            />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 sm:w-36" aria-label="Severity filter">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-8 sm:w-48" aria-label="Event type filter">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {eventTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Event API unavailable</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        {loading ? <Skeleton className="h-[420px] rounded-md" /> : <EventsTable events={filtered} deployments={deployments} />}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="size-3.5" />
          Showing {filtered.length} of {events.length} retained events.
        </div>
      </CardContent>
    </Card>
  );
}
