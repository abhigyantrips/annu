import { useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { ReportPage } from "@/features/reports/report-page";
import { countryName } from "@/lib/format";
import { regionName } from "@/lib/region-name";
import { WorldMap } from "./world-map";
import type { Report } from "../../../shared/types";

export function Page() {
  return <ReportPage>{({ report }) => <Locations report={report} />}</ReportPage>;
}
export function Locations({ report }: { report: Report }) {
  const [selected, setSelected] = useState<string | null>(null);
  const countryCell = (country: string) => <span className="inline-flex items-center gap-2"><CountryFlag country={country} />{countryName(country)}</span>;
  return (
    <div className="locations-page">
      <div className="locations-summary">
        <WorldMap rows={report.countries ?? []} selected={selected} onSelect={setSelected} />
        <Card className="panel country-ranking">
          <DataTable heading={<h2>Countries</h2>} rows={report.countries ?? []} emptyText="No country data for this period yet." columns={[
            { key: "country", name: "Country", render: row => <button className="country-ranking-link" aria-pressed={selected === row.country} onClick={() => setSelected(selected === row.country ? null : row.country)}>{countryCell(row.country)}</button> },
            { key: "visitors", name: "Visitors", numeric: true },
            { key: "visits", name: "Visits", numeric: true },
          ]} />
        </Card>
      </div>
      <Card className="panel">
        <DataTable heading={<><h2>{selected ? `Visitor Locations · ${countryName(selected)}` : "Visitor Locations"}</h2><span className="subtle">See where your visitors are coming from.</span></>} actions={selected && <Button size="sm" onClick={() => setSelected(null)}>Show All Countries</Button>} key={selected ?? "all"} rows={report.locations.filter(row => !selected || row.country === selected).map(row => ({ ...row, regionCode: row.region, region: regionName(row.country, row.region) }))} emptyText="No city or region data for this selection." columns={[
          { key: "country", name: "Country", render: row => countryCell(row.country) },
          { key: "region", name: "Province / Region" },
          { key: "city", name: "City" },
          { key: "visitors", name: "Visitors", numeric: true },
          { key: "visits", name: "Visits", numeric: true },
        ]} />
        <div className="panel-note">Locations are supplied by Cloudflare when available. Visitors are counted once per country; city counts may overlap.</div>
      </Card>
    </div>
  );
}
