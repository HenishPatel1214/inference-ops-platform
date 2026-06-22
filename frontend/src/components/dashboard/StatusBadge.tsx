import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  value: string;
  className?: string;
};

export function StatusBadge({ value, className }: StatusBadgeProps) {
  const normalized = value.toLowerCase();
  const tone =
    normalized.includes("online") ||
    normalized.includes("active") ||
    normalized.includes("success") ||
    normalized.includes("healthy") ||
    normalized.includes("info")
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : normalized.includes("warn") || normalized.includes("degraded") || normalized.includes("timeout")
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : normalized.includes("error") ||
            normalized.includes("fail") ||
            normalized.includes("critical") ||
            normalized.includes("offline")
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-border bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn("capitalize", tone, className)}>
      {value}
    </Badge>
  );
}
