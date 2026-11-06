import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity as ActivityIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
import { fmt } from "@/lib/format";
export function Page() {
  return (
    <ReportPage>
      {({ report }) => (
        <Card className="panel">
          <div className="panel-heading">
            <div>
              <h2>Real-World Performance</h2>
              <span className="subtle">
                Standard Web Vitals belong to the initial document route.
                Unsupported metrics stay absent.
              </span>
            </div>
            <ActivityIcon size={19} />
          </div>
          <DataTable
            rows={report.performance}
            columns={[
              {
                key: "path",
                name: "Page",
                render: (r) => <span className="mono">{r.path}</span>,
              },
              {
                key: "metric",
                name: "Metric",
                render: (r) => <Badge variant="secondary">{r.metric}</Badge>,
              },
              ...(["p50", "p75", "p95"] as const).map((key) => ({
                key,
                name: key.toUpperCase(),
                numeric: true,
                render: (r: any) =>
                  r.metric === "CLS" ? r[key].toFixed(3) : `${fmt(r[key])} ms`,
              })),
              { key: "samples", name: "Samples", numeric: true },
            ]}
          />
          <div className="panel-note">
            LCP · INP · CLS · TTFB · FCP. Percentiles use observed samples;
            missing measurements are never treated as zero.
          </div>
        </Card>
      )}
    </ReportPage>
  );
}
