import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { FailuresTable } from "@/components/tables/FailuresTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InferenceNode, InferenceRequest } from "@/lib/types";

type FailuresPageProps = {
  failures: InferenceRequest[];
  nodes: InferenceNode[];
  loading: boolean;
  onRetry: (request: InferenceRequest) => void;
};

export function FailuresPage({ failures, nodes, loading, onRetry }: FailuresPageProps) {
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const timeoutCount = useMemo(
    () => failures.filter((failure) => failure.status === "timeout").length,
    [failures]
  );
  const runtimeErrors = failures.filter((failure) => failure.status !== "timeout").length;

  const markReviewed = (id: number) => {
    setReviewedIds((current) => new Set(current).add(id));
    setMessage("Failure marked reviewed.");
  };

  const retry = (request: InferenceRequest) => {
    onRetry(request);
    setMessage(`Retry requested for ${request.request_id}.`);
  };

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Open failures" value={failures.length} tone={failures.length ? "bad" : "good"} icon={<AlertTriangle className="size-4" />} />
        <MetricCard label="Timeouts" value={timeoutCount} tone={timeoutCount ? "warn" : "good"} icon={<Clock className="size-4" />} />
        <MetricCard label="Runtime errors" value={runtimeErrors} tone={runtimeErrors ? "bad" : "good"} icon={<RotateCcw className="size-4" />} />
        <MetricCard label="Reviewed" value={reviewedIds.size} icon={<CheckCircle2 className="size-4" />} />
      </section>

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Failure triage</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[420px] rounded-md" />
          ) : (
            <FailuresTable
              failures={failures}
              nodes={nodes}
              reviewedIds={reviewedIds}
              onMarkReviewed={markReviewed}
              onRetry={retry}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
