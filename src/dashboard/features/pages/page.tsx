import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
import { duration } from "@/lib/format";
export function Page() {
  return (
    <ReportPage>
      {({ report }) => (
        <Card className="panel">
          <DataTable
            heading={<><h2>Page Breakdown</h2>
              <span className="subtle">
                Reading time on a path ÷ distinct visits to that path.
              </span></>}
            icon={<FileText size={18} />}
            rows={report.paths}
            columns={[
              {
                key: "path",
                name: "Page",
                render: (r) => <span className="mono path-text">{r.path}</span>,
              },
              { key: "visitors", name: "Visitors", numeric: true },
              { key: "visits", name: "Visits", numeric: true },
              { key: "views", name: "Views", numeric: true },
              {
                key: "duration",
                name: "Average Visit Duration",
                numeric: true,
                render: (r) => duration(r.duration),
              },
            ]}
          />
        </Card>
      )}
    </ReportPage>
  );
}
