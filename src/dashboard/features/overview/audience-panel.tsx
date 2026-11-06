import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnvironmentIcon } from "@/components/environment-icon";
import { CountryFlag } from "@/components/country-flag";
import { Empty } from "@/components/empty";
import { api } from "@/lib/api";
import { countryName, fmt } from "@/lib/format";
import { useDashboard } from "@/features/dashboard/context";
import type {
  Audience,
  AudienceDimension,
  AudienceRow,
} from "../../../shared/types";

const groups = {
  environment: [
    { value: "browser", label: "Browsers" },
    { value: "os", label: "OS" },
    { value: "device", label: "Devices" },
  ],
  location: [
    { value: "country", label: "Countries" },
    { value: "region", label: "Regions" },
    { value: "city", label: "Cities" },
  ],
} satisfies Record<string, { value: AudienceDimension; label: string }[]>;

function rowLabel(row: AudienceRow, dimension: AudienceDimension) {
  if (dimension === "country")
    return row.name === "Unknown" ? "Unknown" : countryName(row.name);
  if (dimension === "region" || dimension === "city") {
    const context = [
      dimension === "city" ? row.region : null,
      row.country ? countryName(row.country) : null,
    ].filter(Boolean);
    return [row.name, ...context].join(", ");
  }
  return row.name;
}
export function AudiencePanel({
  kind,
  from,
  to,
}: {
  kind: keyof typeof groups;
  from: number;
  to: number;
}) {
  const { site, navigatePage } = useDashboard();
  const [dimension, setDimension] = useState<AudienceDimension>(
    groups[kind][0].value,
  );
  const query = useQuery({
    queryKey: ["analytics", site.id, "audience", from, to, dimension],
    queryFn: ({ signal }) =>
      api<Audience>(
        `/api/sites/${site.id}/audience?from=${from}&to=${to}&dimension=${dimension}`,
        undefined,
        "GET",
        signal,
      ),
  });
  const max = Math.max(
    1,
    ...(query.data?.rows.map((row) => row.visitors) || []),
  );
  return (
    <Card className="panel audience-panel">
      <div className="panel-heading audience-heading">
        <h2>{kind === "environment" ? "Environment" : "Location"}</h2>
        <Tabs
          value={dimension}
          onValueChange={(value) => setDimension(value as AudienceDimension)}
        >
          <TabsList
            aria-label={
              kind === "environment"
                ? "Environment breakdown"
                : "Location breakdown"
            }
          >
            {groups[kind].map((tab) => (
              <TabsTrigger value={tab.value} key={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="audience-columns">
        <span>
          {groups[kind].find((tab) => tab.value === dimension)?.label}
        </span>
        <span>Visitors</span>
      </div>
      {query.isPending ? (
        <div className="loading" role="status">
          <Loader2 size={18} className="spin" />
          Loading Breakdown…
        </div>
      ) : query.error ? (
        <div role="alert" className="error-banner">
          {query.error.message}
          <Button variant="link" onClick={() => void query.refetch()}>
            Try Again
          </Button>
        </div>
      ) : !query.data?.rows.length ? (
        <Empty text={kind === "location" ? "You’re on your way to be worldwide!" : undefined} />
      ) : (
        <div className="audience-rows">
          {query.data.rows.map((row) => {
            const name = rowLabel(row, dimension);
            const share = query.data!.visitors
              ? (row.visitors / query.data!.visitors) * 100
              : 0;
            return (
              <div
                className="audience-row"
                key={JSON.stringify([row.name, row.country, row.region])}
              >
                {kind === "location" ? (
                  <CountryFlag country={row.country} />
                ) : (
                  <EnvironmentIcon name={row.name} dimension={dimension} />
                )}
                <div className="audience-track">
                  <span
                    className="audience-bar"
                    style={{ width: `${(row.visitors / max) * 100}%` }}
                  />
                  <span className="audience-name" title={name}>
                    {name}
                  </span>
                </div>
                <strong>{fmt(row.visitors)}</strong>
                <span className="audience-share">{share.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
      {kind === "location" && (
        <Button
          variant="link"
          className="w-full border-t rounded-none"
          onClick={() => navigatePage("locations")}
        >
          Explore Locations
          <ArrowUpRight size={14} />
        </Button>
      )}
    </Card>
  );
}
