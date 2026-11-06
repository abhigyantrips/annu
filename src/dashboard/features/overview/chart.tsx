import { Card } from "@/components/ui/card";
import { useDashboard } from "@/features/dashboard/context";
import { fmt } from "@/lib/format";
import { trafficPoints } from "@/lib/traffic-series";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Report } from "../../../shared/types";
export function Chart({
  report,
  from,
  to,
}: {
  report: Report;
  from: number;
  to: number;
}) {
  const { filters } = useDashboard();
  const hourly = filters.range === "1" || filters.range === "24h";
  const points = trafficPoints(
    report.series,
    from,
    to,
    hourly ? "hour" : "day",
  );
  const label = (at: number) =>
    new Date(at).toLocaleString(undefined, {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      ...(hourly ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
  return (
    <Card className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Traffic Over Time</h2>
          <span className="subtle">
            {hourly ? "Hourly" : "Daily"} visitors and page views{" "}
            <span className="utc">· UTC</span>
          </span>
        </div>
        <div
          className="chart-legend flex flex-wrap items-center gap-4 text-sm"
          aria-label="Chart legend"
        >
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--chart-1)" }}
              aria-hidden="true"
            />
            Visitors
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "var(--chart-2)" }}
              aria-hidden="true"
            />
            Views
          </span>
        </div>
      </div>
      <div
        className="chart-frame"
        role="img"
        aria-label={`${hourly ? "Hourly" : "Daily"} visitors and page views, UTC. Each bar shows views with visitors overlaid. Hover or use arrow keys to inspect both counts.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="at"
              tickFormatter={label}
              minTickGap={50}
              height={40}
              tickMargin={12}
              interval="preserveStartEnd"
              tick={{ fontSize: "var(--text-sm)", fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width="auto"
              tickMargin={8}
              allowDecimals={false}
              tickFormatter={fmt}
              tick={{ fontSize: "var(--text-sm)", fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-1)", fillOpacity: 0.06 }}
              content={({ active, payload, label: at }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as (typeof points)[number];
                return (
                  <div
                    style={{
                      background: "var(--card)",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      padding: "10px 12px",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    <p className="mb-2">{label(Number(at))} UTC</p>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                      <dt style={{ color: "var(--chart-1)" }}>Visitors</dt>
                      <dd className="text-right font-medium">
                        {fmt(point.visitors)}
                      </dd>
                      <dt>Views</dt>
                      <dd className="text-right font-medium">
                        {fmt(point.views)}
                      </dd>
                    </dl>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="views"
              name="Views"
              fill="var(--chart-2)"
              maxBarSize={48}
              isAnimationActive={false}
              activeBar={false}
              shape={(props) => {
                const { x, y, width, height, payload } = props as {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                  payload: (typeof points)[number];
                };
                // Draw both values on one scale, so the full bar remains total views.
                const visitorHeight = payload.views
                  ? (height * payload.visitors) / payload.views
                  : 0;
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill="var(--chart-2)"
                      rx={2}
                    />
                    <rect
                      x={x}
                      y={y + height - visitorHeight}
                      width={width}
                      height={visitorHeight}
                      fill="var(--chart-1)"
                      rx={2}
                    />
                  </g>
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
