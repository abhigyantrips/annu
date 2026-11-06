import type { Report } from "../../../shared/types";
import { Card } from "@/components/ui/card";
import { ArrowDownLeft, Clock3, FileText, Users } from "lucide-react";

import { duration, fmt } from "@/lib/format";
export function Stats({ report }: { report: Report }) {
  const t = report.totals;
  return (
    <div className="stats">
      {[
        {
          title: "Visitors",
          value: fmt(t.visitors),
          icon: Users,
          note: "Distinct browser identities",
        },
        {
          title: "Visits",
          value: fmt(t.visits),
          icon: ArrowDownLeft,
          note: "30-minute activity windows",
        },
        {
          title: "Page Views",
          value: fmt(t.views),
          icon: FileText,
          note: "Total page views",
        },
        {
          title: "Average Visit Duration",
          value: duration(t.duration),
          icon: Clock3,
          note: "Estimated active time",
        },
      ].map(({ title, value, icon: Icon, note }) => (
        <Card className="stat" key={title}>
          <div className="stat-label">
            {title}
            <Icon size={15} strokeWidth={1.6} />
          </div>
          <div className="stat-value">{value}</div>
          <div className="stat-note">{note}</div>
        </Card>
      ))}
    </div>
  );
}
