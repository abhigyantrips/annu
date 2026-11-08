import type { Report } from "../../../shared/types";
import { MetricHelp } from "@/components/metric-help";

import { duration, fmt } from "@/lib/format";

export function Stats({ report }: { report: Report }) {
  const t = report.totals;
  return (
    <div className="stats">
      {[
        {
          title: "Visitors",
          value: fmt(t.visitors),
          note: "Distinct browser identities. A browser is counted once in the selected period.",
        },
        {
          title: "Visits",
          value: fmt(t.visits),
          note: "Visits are activity windows separated by at least 30 minutes of inactivity.",
        },
        {
          title: "Pages Viewed",
          value: fmt(t.views),
          note: "Total page views in the selected period, including repeat views.",
        },
        {
          title: "Average Visit Duration",
          value: duration(t.duration),
          note: "Estimated active reading time per visit, based on tracker heartbeats.",
        },
      ].map(({ title, value, note }) => (
        <div className="stat" key={title}>
          <div className="stat-label">
            {title}
            <MetricHelp title={title} note={note} />
          </div>
          <div className="stat-value">{value}</div>
        </div>
      ))}
    </div>
  );
}
