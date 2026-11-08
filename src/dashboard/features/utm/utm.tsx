import type { Dimension, Report, Site } from "../../../shared/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { DataTable } from "@/components/data-table";
import { Empty } from "@/components/empty";
import { LabelSettings } from "@/features/utm/label-settings";
import { colors, fmt } from "@/lib/format";
export function Utm({ report, site }: { report: Report; site: Site }) {
  return (
    <div className="utm-sections">
      {(["source", "medium", "campaign"] as const).map((dimension) => (
        <UtmSection key={dimension} report={report} site={site} dimension={dimension} />
      ))}
    </div>
  );
}

function UtmSection({ report, site, dimension }: { report: Report; site: Site; dimension: Dimension }) {
  const [configure, setConfigure] = useState(false);
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
      <Card className="panel" render={<section aria-label={`${dimension[0].toUpperCase() + dimension.slice(1)} UTM tags`} />}>
        <div className="panel-heading">
          <h2>{dimension[0].toUpperCase() + dimension.slice(1)}</h2>
          <Button aria-label={`Configure ${dimension} labels`} onClick={() => setConfigure(true)}>
            <SlidersHorizontal size={15} />
            Configure Labels
          </Button>
        </div>
        {!rows.length ? (
          <Empty
            text={`Every journey starts with a link. Share one with utm_${dimension} to see where visits come from.`}
          />
        ) : (
          <div className="utm-layout">
            <div className="donut-wrap">
              <div
                className="utm-donut"
                role="img"
                aria-label={`${dimension} distribution in visits`}
              >
                <ResponsiveContainer width="100%" height="100%">
                <PieChart accessibilityLayer>
                  <Pie
                    data={slices}
                    dataKey="visits"
                    nameKey="name"
                    innerRadius="68%"
                    outerRadius="92%"
                    stroke="var(--card)"
                    isAnimationActive={false}
                  >
                    {slices.map((slice, index) => (
                      <Cell key={index} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 10 }}
                    content={({ active, payload }) => {
                      const item = payload?.[0];
                      if (!active || !item) return null;
                      const visits = Number(item.value);
                      return (
                        <div className="utm-chart-tooltip">
                          <strong>{item.name}</strong>
                          <span>{fmt(visits)} visits ({((visits / total) * 100).toFixed(1)}%)</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
                </ResponsiveContainer>
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
          dimension={dimension}
          onClose={() => setConfigure(false)}
        />
      )}
    </>
  );
}
