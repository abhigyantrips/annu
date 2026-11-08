import { Card } from "@/components/ui/card";
import { ArrowDownLeft, ExternalLink } from "lucide-react";

import { SiteFavicon } from "@/components/site-favicon";
import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
import { duration, siteName } from "@/lib/format";
export function Page() {
  return (
    <ReportPage>
      {({ report }) => (
        <Card className="panel">
          <DataTable
            heading={<><h2>Referrers</h2>
              <span className="subtle">
                Referring websites only.
              </span></>}
            icon={<ArrowDownLeft size={19} />}
            rows={report.referrers}
            columns={[
              {
                key: "name",
                name: "Referring Website",
                render: (r) => (
                  <span className="referrer-cell">
                    <SiteFavicon domain={r.name} name={siteName(r.name)} />
                    {r.name.startsWith("http") ? (
                      <a href={r.name} target="_blank" rel="noreferrer">
                        {siteName(r.name)}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      r.name
                    )}
                  </span>
                ),
              },
              { key: "visitors", name: "Visitors", numeric: true },
              { key: "visits", name: "Visits", numeric: true },
              {
                key: "duration",
                name: "Time per Visit",
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
