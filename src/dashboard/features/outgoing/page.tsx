import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
export function Page() {
  return (
    <ReportPage>
      {({ report }) => (
        <Card className="panel">
          <div className="panel-heading">
            <div>
              <h2>Outgoing Links</h2>
              <span className="subtle">
                Only explicitly opted-in links are measured.
              </span>
            </div>
            <ArrowUpRight size={19} />
          </div>
          <DataTable
            rows={report.outbound}
            emptyText="Add data-annu-link to the links you’d like to understand, or enable all outgoing links in your tracker."
            columns={[
              {
                key: "destination",
                name: "Destination",
                render: (r) => (
                  <div className="destination">
                    <span className="mono">{r.destination}</span>
                    <Badge variant="secondary">{r.kind}</Badge>
                  </div>
                ),
              },
              {
                key: "path",
                name: "From Page",
                render: (r) => <span className="mono">{r.path}</span>,
              },
              { key: "clicks", name: "Clicks", numeric: true },
              { key: "visitors", name: "Visitors", numeric: true },
            ]}
          />
        </Card>
      )}
    </ReportPage>
  );
}
