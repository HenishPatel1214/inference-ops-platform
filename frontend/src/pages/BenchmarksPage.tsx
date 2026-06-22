import { useState } from "react";
import { BarChart3, Play, TimerReset } from "lucide-react";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { benchmarkScenarios } from "@/data/mock-data";
import { formatMs } from "@/lib/format";
import type { BenchmarkResult } from "@/lib/types";

type BenchmarksPageProps = {
  isRunning: boolean;
  onRunBenchmark: (count: number) => Promise<BenchmarkResult>;
};

type BenchmarkRow = BenchmarkResult & {
  id: string;
  label: string;
  createdAt: string;
};

export function BenchmarksPage({ isRunning, onRunBenchmark }: BenchmarksPageProps) {
  const [scenarioId, setScenarioId] = useState(benchmarkScenarios[1].id);
  const [history, setHistory] = useState<BenchmarkRow[]>([]);
  const selectedScenario = benchmarkScenarios.find((scenario) => scenario.id === scenarioId) ?? benchmarkScenarios[1];

  const runBenchmark = async () => {
    const result = await onRunBenchmark(selectedScenario.requests);
    setHistory((current) => [
      {
        ...result,
        id: crypto.randomUUID(),
        label: selectedScenario.label,
        createdAt: new Date().toISOString()
      },
      ...current
    ]);
  };

  const latest = history[0];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Last run" value={latest ? latest.label : "None"} icon={<BarChart3 className="size-4" />} />
        <MetricCard label="p50" value={latest ? formatMs(latest.p50_ms) : "0 ms"} icon={<TimerReset className="size-4" />} />
        <MetricCard label="p95" value={latest ? formatMs(latest.p95_ms) : "0 ms"} icon={<TimerReset className="size-4" />} />
        <MetricCard label="Failures" value={latest ? latest.failures : 0} tone={latest?.failures ? "warn" : "good"} icon={<BarChart3 className="size-4" />} />
      </section>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Benchmark runner</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="run">
            <TabsList>
              <TabsTrigger value="run">Run</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="run" className="mt-4 space-y-4">
              <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)_auto] lg:items-start">
                <Select value={scenarioId} onValueChange={setScenarioId}>
                  <SelectTrigger aria-label="Benchmark scenario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {benchmarkScenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={`${selectedScenario.requests} requests`} />
                    <StatusBadge value={`${selectedScenario.concurrency} concurrency`} />
                  </div>
                  <p className="mt-2 text-muted-foreground">{selectedScenario.description}</p>
                </div>
                <Button onClick={runBenchmark} disabled={isRunning}>
                  <Play className="size-4" />
                  Run benchmark
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              {history.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No benchmark runs in this browser session.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Failures</TableHead>
                        <TableHead>p50</TableHead>
                        <TableHead>p95</TableHead>
                        <TableHead>p99</TableHead>
                        <TableHead>Elapsed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell>{row.requests}</TableCell>
                          <TableCell>{row.failures}</TableCell>
                          <TableCell>{formatMs(row.p50_ms)}</TableCell>
                          <TableCell>{formatMs(row.p95_ms)}</TableCell>
                          <TableCell>{formatMs(row.p99_ms)}</TableCell>
                          <TableCell>{row.elapsed_seconds}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
