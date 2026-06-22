import { Gauge } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

type LatencyDistributionChartProps = {
  data: { bucket: string; requests: number }[];
};

const config = {
  requests: {
    label: "Requests",
    color: "var(--chart-3)"
  }
} satisfies ChartConfig;

export function LatencyDistributionChart({ data }: LatencyDistributionChartProps) {
  const hasData = data.some((point) => point.requests > 0);

  if (!hasData) {
    return (
      <EmptyState
        title="No latency distribution"
        description="No request samples are available for the selected filters."
        icon={<Gauge className="size-5" />}
      />
    );
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={34} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="requests"
          fill="var(--color-requests)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
