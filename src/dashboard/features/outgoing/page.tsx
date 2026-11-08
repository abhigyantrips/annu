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
          <DataTable
            heading={<><h2>Outgoing Links</h2>
              <span className="subtle">
                Only explicitly opted-in links are measured.
              </span></>}
            icon={<ArrowUpRight size={19} />}
            rows={report.outbound}
            emptyText="Good links lead to new adventures. Enable outgoing-link tracking to follow them."
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
