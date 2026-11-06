import { CountryFlag } from "@/components/country-flag";
import { Card } from "@/components/ui/card";
import { Globe2 } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
import { countryName } from "@/lib/format";
export function Page() {
  return (
    <ReportPage>
      {({ report }) => (
        <Card className="panel">
          <div className="panel-heading">
            <div>
              <h2>Visitor Locations</h2>
              <span className="subtle">
                Cloudflare headers only. No IP lookup or location inference.
              </span>
            </div>
            <Globe2 size={19} />
          </div>
          <DataTable
            rows={report.locations}
            emptyText="You’re on your way to be worldwide!"
            columns={[
              {
                key: "country",
                name: "Country",
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag country={r.country} />
                    {countryName(r.country)}
                  </span>
                ),
              },
              { key: "region", name: "Province / Region" },
              { key: "city", name: "City" },
              { key: "visitors", name: "Visitors", numeric: true },
              { key: "visits", name: "Visits", numeric: true },
            ]}
          />
        </Card>
      )}
    </ReportPage>
  );
}
