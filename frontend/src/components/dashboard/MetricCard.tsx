import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
};

const tones = {
  default: "text-primary bg-muted",
  good: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300",
  warn: "text-amber-700 bg-amber-500/10 dark:text-amber-300",
  bad: "text-red-700 bg-red-500/10 dark:text-red-300"
};

export function MetricCard({ label, value, detail, icon, tone = "default" }: MetricCardProps) {
  return (
    <Card className="min-h-28 shadow-none">
      <CardContent className="flex h-full items-start gap-3 p-4">
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-md", tones[tone])}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
          {detail ? <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
