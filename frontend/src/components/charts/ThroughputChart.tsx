import { RadioTower } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

type ThroughputChartProps = {
  data: { time: string; requests: number; failures: number }[];
};

const config = {
  requests: {
    label: "Requests",
    color: "var(--chart-2)"
  },
  failures: {
    label: "Failures",
    color: "var(--chart-4)"
  }
} satisfies ChartConfig;

export function ThroughputChart({ data }: ThroughputChartProps) {
  const hasData = data.some((point) => point.requests > 0 || point.failures > 0);

  if (!hasData) {
    return (
      <EmptyState
        title="No throughput yet"
        description="The chart will update as requests are recorded by the backend simulator."
        icon={<RadioTower className="size-5" />}
      />
    );
  }

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={data} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={34} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="requests"
          stackId="traffic"
          fill="var(--color-requests)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        <Bar
          dataKey="failures"
          stackId="traffic"
          fill="var(--color-failures)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
