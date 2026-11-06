import type { Dimension, Report, Site } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { DataTable } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { LabelSettings } from "@/features/utm/label-settings";
import { colors, fmt } from "@/lib/format";
export function Utm({ report, site }: { report: Report; site: Site }) {
  const [dimension, setDimension] = useState<Dimension>("campaign"),
    [configure, setConfigure] = useState(false);
  const rows = report.utm[dimension],
    total = rows.reduce((n, r) => n + r.visits, 0);
  const slices = rows
    .slice(0, 7)
    .map((row, i) => ({ ...row, color: colors[i] }));
  const remaining = rows.slice(7).reduce((n, row) => n + row.visits, 0);
  if (remaining)
    slices.push({
      name: "Other",
      raw: [],
      visits: remaining,
      color: colors[7],
    });
  return (
    <>
      <Card className="panel">
        <div className="panel-heading">
          <Tabs
            value={dimension}
            onValueChange={(value) => setDimension(value as Dimension)}
          >
            <TabsList>
              {(["source", "medium", "campaign"] as const).map((d) => (
                <TabsTrigger key={d} value={d}>
                  {d[0].toUpperCase() + d.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button onClick={() => setConfigure(true)}>
            <SlidersHorizontal size={15} />
            Configure Labels
          </Button>
        </div>
        {!rows.length ? (
          <Empty
            title={`No ${dimension[0].toUpperCase() + dimension.slice(1)} Tags Yet`}
            text={`Share a link with utm_${dimension} to see where visits come from.`}
          />
        ) : (
          <div className="utm-layout">
            <div className="donut-wrap">
              <div
                style={{ position: "relative", width: 220, height: 220 }}
                role="img"
                aria-label={`${dimension} distribution in visits`}
              >
                <PieChart width={220} height={220} accessibilityLayer>
                  <Pie
                    data={slices}
                    dataKey="visits"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={100}
                    isAnimationActive={false}
                  >
                    {slices.map((slice, index) => (
                      <Cell key={index} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `${fmt(Number(value))} visits (${((Number(value) / total) * 100).toFixed(1)}%)`,
                      "Visits",
                    ]}
                  />
                </PieChart>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    pointerEvents: "none",
                  }}
                >
                  <strong>{fmt(total)}</strong>
                  <span className="subtle">tagged visits</span>
                </div>
              </div>
              <p className="subtle">Grouped by {dimension}</p>
            </div>
            <div>
              <DataTable
                rows={rows.map((r, index) => ({
                  ...r,
                  share: r.visits / total,
                  color: colors[Math.min(index, 7)],
                }))}
                search={false}
                columns={[
                  {
                    key: "name",
                    name: dimension[0].toUpperCase() + dimension.slice(1),
                    render: (r) => (
                      <div className="label-cell">
                        <span
                          className="legend-dot"
                          style={{
                            background: r.color,
                          }}
                        />
                        <div>
                          <strong>{r.name}</strong>
                          <small>{r.raw.join(", ")}</small>
                        </div>
                      </div>
                    ),
                  },
                  { key: "visits", name: "Visits", numeric: true },
                  {
                    key: "share",
                    name: "Share",
                    numeric: true,
                    render: (r) => `${((r.visits / total) * 100).toFixed(1)}%`,
                  },
                ]}
              />
            </div>
          </div>
        )}
        <div className="panel-note">
          Tags belong to the entry page of a visit. Label changes also apply to
          historical reports.
        </div>
      </Card>
      {configure && (
        <LabelSettings
          site={site}
          initialDimension={dimension}
          onClose={() => setConfigure(false)}
        />
      )}
    </>
  );
}
