import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/select-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { ReportPage } from "@/features/reports/report-page";
import { fmt } from "@/lib/format";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "../../../shared/types";

const metrics = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
type Metric = typeof metrics[number];
type Percentile = "p50" | "p75" | "p95";
const names: Record<Metric, string> = { LCP: "Largest Contentful Paint", INP: "Interaction to Next Paint", CLS: "Cumulative Layout Shift", FCP: "First Contentful Paint", TTFB: "Time to First Byte" };
// Web Vitals thresholds: https://developers.google.com/speed/docs/insights/v5/about
const thresholds: Record<Metric, [number, number]> = { LCP: [2500, 4000], INP: [200, 500], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };
function valueLabel(metric: Metric, value?: number) {
  if (value === undefined) return "—";
  return metric === "CLS" ? value.toFixed(3) : value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${fmt(value)} ms`;
}
function rating(metric: Metric, value?: number) {
  if (value === undefined) return "No Data";
  return value <= thresholds[metric][0] ? "Good" : value <= thresholds[metric][1] ? "Needs Improvement" : "Poor";
}
export function Page() {
  return <ReportPage>{({ report, from, to }) => <Performance report={report} from={from} to={to} />}</ReportPage>;
}
export function Performance({ report, from, to }: { report: Report; from: number; to: number }) {
  const [metric, setMetric] = useState<Metric>("LCP");
  const [percentile, setPercentile] = useState<Percentile>("p75");
  const [pagesBy, setPagesBy] = useState("path");
  const [environment, setEnvironment] = useState("device");
  const overview = report.performanceOverview ?? [];
  const summary = overview.filter(row => row.group === "summary");
  const selected = summary.find(row => row.metric === metric);
  const timed = overview.filter(row => row.group === "time" && row.metric === metric);
  const step = to - from <= 86400000 ? 3600000 : 86400000;
  const hourly = timed.length ? timed[0].name.includes("T") : step === 3600000;
  const bucket = hourly ? 3600000 : 86400000;
  const points = [];
  const byTime = new Map(timed.map(row => [Date.parse(row.name), row]));
  for (let at = Math.floor(from / bucket) * bucket; at < to; at += bucket) {
    const row = byTime.get(at);
    points.push({ at, p50: row?.p50 ?? null, p75: row?.p75 ?? null, p95: row?.p95 ?? null });
  }
  const dateLabel = (at: number) => new Date(at).toLocaleString(undefined, { timeZone: "UTC", month: "short", day: "numeric", ...(hourly ? { hour: "2-digit", minute: "2-digit" } : {}) });
  const pathRows = [...new Set(report.performance.map(row => row.path))].map(path => {
    const rows = report.performance.filter(row => row.path === path);
    return { name: path, ...Object.fromEntries(metrics.map(m => [m, rows.find(row => row.metric === m)?.[percentile]])), samples: rows.find(row => row.metric === metric)?.samples ?? 0 };
  }).sort((a, b) => ((b as any)[metric] ?? -1) - ((a as any)[metric] ?? -1));
  const pageRows = pagesBy === "path" ? pathRows : overview.filter(row => row.group === "title" && row.metric === metric).map(row => ({ name: row.name || "Untitled", [metric]: row[percentile], samples: row.samples })).sort((a, b) => (b[metric] as number) - (a[metric] as number));
  const environmentRows = overview.filter(row => row.group === environment && row.metric === metric).map(row => ({ name: row.name, value: row[percentile], samples: row.samples })).sort((a, b) => b.value - a.value);
  const renderValue = (m: Metric, value?: number) => <span className="performance-value" data-rating={rating(m, value)}>{valueLabel(m, value)}</span>;
  return (
    <div className="performance-page">
      <div className="performance-controls">
        <span className="text-sm font-medium">Percentile</span>
        <SelectField label="Performance Percentile" value={percentile} onValueChange={value => setPercentile(value as Percentile)} options={[{ value: "p50", label: "p50 — 50th Percentile" }, { value: "p75", label: "p75 — 75th Percentile" }, { value: "p95", label: "p95 — 95th Percentile" }]} />
      </div>
      <div className="performance-metrics" aria-label="Performance metrics">
        {metrics.map(m => {
          const row = summary.find(row => row.metric === m);
          const status = rating(m, row?.[percentile]);
          return <Button key={m} className="performance-metric" aria-pressed={metric === m} onClick={() => setMetric(m)} title={names[m]}>
            <span>{m}</span><strong>{valueLabel(m, row?.[percentile])}</strong>
            <span className="performance-value" data-rating={status}>{status}</span>
          </Button>;
        })}
      </div>
      <Card className="panel chart-panel">
        <div className="panel-heading"><div><h2>{names[metric]}</h2><span className="subtle">{hourly ? "Hourly" : "Daily"} performance · UTC</span></div><span className="subtle">Sample Size: {fmt(selected?.samples ?? 0)}</span></div>
        {!timed.length ? <Empty text={`No ${metric} measurements in this period. Measurements appear as visitors use your site.`} /> : <>
          <div className="chart-frame" role="img" aria-label={`${names[metric]} over time, showing p50, p75 and p95. Missing measurements are gaps.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 8 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="at" tickFormatter={dateLabel} minTickGap={60} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis width={78} tickFormatter={value => valueLabel(metric, Number(value))} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, "auto"]} />
                <Tooltip labelFormatter={value => dateLabel(Number(value))} formatter={(value, name) => [valueLabel(metric, Number(value)), String(name).toUpperCase()]} contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8 }} />
                {(["p50", "p75", "p95"] as const).map((p, i) => <Line key={p} type="linear" dataKey={p} stroke={`var(--chart-${i + 1})`} strokeWidth={p === percentile ? 3 : 1.5} strokeOpacity={p === percentile ? 1 : 0.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="performance-legend">{["p50", "p75", "p95"].map((p, i) => <span key={p}><i style={{ background: `var(--chart-${i + 1})` }} />{p}</span>)}</div>
        </>}
      </Card>
      <div className="performance-breakdowns">
        <Card className="panel">
          <DataTable heading={<><h2>Pages</h2><span className="subtle">{percentile.toUpperCase()} · Slowest First</span></>} beforeTable={<Tabs value={pagesBy} onValueChange={setPagesBy}><TabsList><TabsTrigger value="path">Path</TabsTrigger><TabsTrigger value="title">Page Title</TabsTrigger></TabsList></Tabs>} key={pagesBy} rows={pageRows} emptyText="No page measurements in this period." columns={[
            { key: "name", name: pagesBy === "path" ? "Path" : "Page Title", render: row => <span className="performance-path" title={row.name}>{row.name}</span> },
            ...(pagesBy === "path" ? metrics : [metric]).map(m => ({ key: m, name: m, numeric: true, render: (row: any) => renderValue(m, row[m]) })),
            { key: "samples", name: `${metric} Samples`, numeric: true },
          ]} />
        </Card>
        <Card className="panel">
          <div className="panel-heading"><h2>Environment</h2><span className="subtle">{percentile.toUpperCase()}</span></div>
          <Tabs value={environment} onValueChange={setEnvironment}><TabsList><TabsTrigger value="device">Device</TabsTrigger><TabsTrigger value="browser">Browser</TabsTrigger></TabsList></Tabs>
          <DataTable key={environment} rows={environmentRows} search={false} emptyText="No environment measurements in this period." columns={[
            { key: "name", name: environment === "device" ? "Device" : "Browser" },
            { key: "value", name: metric, numeric: true, render: row => renderValue(metric, row.value) },
            { key: "samples", name: "Samples", numeric: true },
          ]} />
        </Card>
      </div>
      <p className="performance-note">Measurements belong to the initial document route. Missing measurements stay absent. Percentiles use observed samples; small samples may vary considerably.</p>
    </div>
  );
}
