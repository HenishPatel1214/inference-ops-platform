import { Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

type LatencyChartProps = {
  data: { time: string; latency: number; status: string; model: string }[];
};

const config = {
  latency: {
    label: "Latency",
    color: "var(--chart-1)"
  }
} satisfies ChartConfig;

export function LatencyChart({ data }: LatencyChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="No latency samples"
        description="Run simulated traffic or connect live workers to populate the latency trend."
        icon={<Activity className="size-5" />}
      />
    );
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={42}
          tickFormatter={(value) => `${value}ms`}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <Area
          type="monotone"
          dataKey="latency"
          stroke="var(--color-latency)"
          fill="var(--color-latency)"
          fillOpacity={0.14}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
