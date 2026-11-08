import { useState } from "react";
import { Card } from "@/components/ui/card";
import { MetricHelp } from "@/components/metric-help";
import { useDashboard } from "@/features/dashboard/context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { ReportPage } from "@/features/reports/report-page";
import { fmt } from "@/lib/format";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Report } from "../../../shared/types";

const metrics = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
type Metric = typeof metrics[number];
const notes: Record<Metric, string> = {
  LCP: "Largest Contentful Paint: how long the largest visible image or text block takes to appear. Lower is better.",
  INP: "Interaction to Next Paint: how quickly the page visually responds to clicks, taps, and keyboard input. Lower is better.",
  CLS: "Cumulative Layout Shift: how much visible content unexpectedly moves as the page is used. Lower is better; this is a score, not a duration.",
  FCP: "First Contentful Paint: how long the first text, image, or other content takes to appear. Lower is better.",
  TTFB: "Time to First Byte: how long the browser waits for the first byte of the document response. Lower is better.",
};
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
  const { percentile } = useDashboard();
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
  const dateLabel = (at: number, month: "short" | "long" = "short") => new Date(at).toLocaleString(undefined, { timeZone: "UTC", month, day: "numeric", ...(hourly ? { hour: "2-digit", minute: "2-digit" } : {}) });
  const pathRows = [...new Set(report.performance.map(row => row.path))].map(path => {
    const rows = report.performance.filter(row => row.path === path);
    return { name: path, ...Object.fromEntries(metrics.map(m => [m, rows.find(row => row.metric === m)?.[percentile]])), samples: rows.find(row => row.metric === metric)?.samples ?? 0 };
  }).sort((a, b) => ((b as any)[metric] ?? -1) - ((a as any)[metric] ?? -1));
  const pageRows = pagesBy === "path" ? pathRows : overview.filter(row => row.group === "title" && row.metric === metric).map(row => ({ name: row.name || "Untitled", [metric]: row[percentile], samples: row.samples })).sort((a, b) => (b[metric] as number) - (a[metric] as number));
  const environmentRows = overview.filter(row => row.group === environment && row.metric === metric).map(row => ({ name: row.name, value: row[percentile], samples: row.samples })).sort((a, b) => b.value - a.value);
  const renderValue = (m: Metric, value?: number) => <span className="performance-value" data-rating={rating(m, value)}>{valueLabel(m, value)}</span>;
  return (
    <div className="performance-page">
      <div className="performance-metrics" aria-label="Performance metrics">
        {metrics.map(m => {
          const row = summary.find(row => row.metric === m);
          const status = rating(m, row?.[percentile]);
          return (
            <div key={m} className="performance-metric-card" data-active={metric === m}>
              <div className="performance-metric-header">
                <button type="button" data-slot="button" className="performance-metric" aria-pressed={metric === m} onClick={() => setMetric(m)}>
                  {m}
                </button>
                <MetricHelp title={names[m]} note={notes[m]} />
              </div>
              <strong>{valueLabel(m, row?.[percentile])}</strong>
              <span className="performance-value" data-rating={status}>{status}</span>
            </div>
          );
        })}
      </div>
      <Card className="panel chart-panel">
        <div className="panel-heading"><div><h2>{names[metric]}</h2><span className="subtle">{hourly ? "Hourly" : "Daily"} performance · UTC</span></div><div className="performance-chart-details">
          <div className="performance-legend" aria-label="Chart legend">{["p50", "p75", "p95"].map((p, i) => <span key={p}><i style={{ background: `var(--chart-${i + 1})` }} />{p.toUpperCase()}</span>)}</div>
          <span className="performance-chart-divider" aria-hidden="true" />
          <span className="performance-sample-size">{fmt(selected?.samples ?? 0)} Data Points</span>
        </div></div>
        {!timed.length ? <Empty text={`No ${metric} measurements in this period. Measurements appear as visitors use your site.`} /> : <>
          <div className="chart-frame" role="img" aria-label={`${names[metric]} over time, showing p50, p75 and p95. Missing measurements are gaps.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="at" tickFormatter={at => dateLabel(at)} minTickGap={50} height={40} tickMargin={12} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: "var(--text-sm)" }} axisLine={false} tickLine={false} />
                <YAxis width="auto" tickMargin={8} tickFormatter={value => valueLabel(metric, Number(value))} tick={{ fill: "var(--muted-foreground)", fontSize: "var(--text-sm)" }} axisLine={false} tickLine={false} domain={[0, "auto"]} />
                <Tooltip labelFormatter={value => dateLabel(Number(value), "long")} formatter={(value, name) => [valueLabel(metric, Number(value)), String(name).toUpperCase()]} contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8 }} />
                {(["p50", "p75", "p95"] as const).map((p, i) => <Line key={p} type="linear" dataKey={p} stroke={`var(--chart-${i + 1})`} strokeWidth={p === percentile ? 3 : 1.5} strokeOpacity={p === percentile ? 1 : 0.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>}
      </Card>
      <div className="performance-breakdowns">
        <Card className="panel">
          <DataTable heading={<><h2>Pages</h2><span className="subtle">{percentile.toUpperCase()} · Slowest First</span></>} beforeTable={<Tabs className="performance-table-tabs" value={pagesBy} onValueChange={setPagesBy}><TabsList><TabsTrigger value="path">Path</TabsTrigger><TabsTrigger value="title">Page Title</TabsTrigger></TabsList></Tabs>} key={pagesBy} rows={pageRows} emptyText="No page measurements in this period." columns={[
            { key: "name", name: pagesBy === "path" ? "Path" : "Page Title", render: row => <span className="performance-path" title={row.name}>{row.name}</span> },
            ...(pagesBy === "path" ? metrics : [metric]).map(m => ({ key: m, name: m, numeric: true, render: (row: any) => renderValue(m, row[m]) })),
            { key: "samples", name: `${metric} Samples`, numeric: true },
          ]} />
        </Card>
        <Card className="panel">
          <DataTable
            heading={<><h2>Environment</h2><span className="subtle">{percentile.toUpperCase()}</span></>}
            beforeTable={<Tabs className="performance-table-tabs" value={environment} onValueChange={setEnvironment}><TabsList><TabsTrigger value="device">Device</TabsTrigger><TabsTrigger value="browser">Browser</TabsTrigger></TabsList></Tabs>}
            key={environment} rows={environmentRows} search={false} emptyText="No environment measurements in this period." columns={[
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
