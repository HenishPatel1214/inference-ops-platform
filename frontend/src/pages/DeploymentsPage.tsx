import { useState } from "react";
import { Boxes } from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { DeploymentsTable } from "@/components/tables/DeploymentsTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InferenceNode, InferenceRequest, ModelDeployment } from "@/lib/types";

type DeploymentsPageProps = {
  deployments: ModelDeployment[];
  nodes: InferenceNode[];
  requests: InferenceRequest[];
  loading: boolean;
};

export function DeploymentsPage({ deployments, nodes, requests, loading }: DeploymentsPageProps) {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const active = deployments.filter((deployment) => deployment.status === "active").length;
  const replicas = deployments.reduce((sum, deployment) => sum + deployment.replicas, 0);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active deployments" value={`${active}/${deployments.length}`} icon={<Boxes className="size-4" />} />
        <MetricCard label="Replicas" value={replicas} icon={<Boxes className="size-4" />} />
        <MetricCard label="Models serving" value={new Set(deployments.map((deployment) => deployment.model_name)).size} icon={<Boxes className="size-4" />} />
      </section>
      {actionMessage ? (
        <Alert>
          <AlertDescription>{actionMessage}</AlertDescription>
        </Alert>
      ) : null}
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Model deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[420px] rounded-md" />
          ) : (
            <DeploymentsTable
              deployments={deployments}
              nodes={nodes}
              requests={requests}
              onAction={setActionMessage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
