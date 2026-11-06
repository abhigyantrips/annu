import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDashboard } from "@/features/dashboard/context";
import { api } from "@/lib/api";
import { dateRange } from "@/lib/date-range";
import { countryName, dateTime, duration } from "@/lib/format";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowUpRight, Loader2, Users } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { useState } from "react";
import type { Activity } from "../../../shared/types";
import { VisitorHistory } from "./visitor-history";
export function Page() {
  const { site, filters, live } = useDashboard();
  const [visitor, setVisitor] = useState<string>();
  const query = useInfiniteQuery({
    queryKey: ["analytics", site.id, "visitors", filters],
    initialPageParam: undefined as
      | { lastSeen: number; visitorId: string; from: number; to: number }
      | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const range = pageParam || dateRange(filters);
      const rows = await api<Activity[]>(
        `/api/sites/${site.id}/activity?from=${range.from}&to=${range.to}${pageParam ? `&before=${pageParam.lastSeen}&beforeId=${pageParam.visitorId}` : ""}`,
        undefined,
        "GET",
        signal,
      );
      return { rows, from: range.from, to: range.to };
    },
    getNextPageParam: (page) =>
      page.rows.length === 100
        ? { ...page.rows[page.rows.length - 1], from: page.from, to: page.to }
        : undefined,
    refetchInterval: live ? 5000 : false,
  });
  const rows = query.data?.pages.flatMap((p) => p.rows) || [];
  return (
    <>
      {query.error && (
        <div className="error-banner" role="alert">
          {query.error.message}
          <Button onClick={() => void query.refetch()}>Try Again</Button>
        </div>
      )}
      {query.isPending ? (
        <div className="loading">
          <Loader2 className="spin" />
          Loading Visitors…
        </div>
      ) : (
        <Card className="panel">
          <div className="panel-heading">
            <div>
              <h2>Visit History</h2>
              <span className="subtle">
                Open a browser identity to see its retained activity across
                days.
              </span>
            </div>
            <Users size={19} />
          </div>
          <DataTable
            rows={rows}
            columns={[
              {
                key: "visitorId",
                name: "Browser Identity",
                render: (r) => (
                  <Button
                    variant="link"
                    className="font-mono"
                    onClick={() => setVisitor(r.visitorId)}
                  >
                    <span className="visitor-dot" />
                    {r.visitorId.slice(0, 8)}
                    <ArrowUpRight size={13} />
                  </Button>
                ),
              },
              {
                key: "city",
                name: "Location",
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag country={r.country} />
                    {[r.city, r.country && countryName(r.country)]
                      .filter(Boolean)
                      .join(", ") || "Unknown"}
                  </span>
                ),
              },
              {
                key: "lastSeen",
                name: "Last Seen",
                render: (r) => dateTime(r.lastSeen),
              },
              { key: "visits", name: "Visits", numeric: true },
              { key: "views", name: "Views", numeric: true },
              {
                key: "duration",
                name: "Reading Time",
                numeric: true,
                render: (r) => duration(r.duration),
              },
            ]}
          />
          {query.hasNextPage && (
            <div className="panel-note">
              <Button
                disabled={query.isFetching}
                onClick={() => void query.fetchNextPage()}
              >
                Load Older Visitors
              </Button>
            </div>
          )}
        </Card>
      )}
      <footer className="status-footer">
        <Button
          variant="ghost"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? "Refreshing…" : "Refresh Visitors"}
        </Button>
      </footer>
      {visitor && (
        <VisitorHistory
          key={`${site.id}:${visitor}`}
          site={site}
          visitor={visitor}
          onClose={() => setVisitor(undefined)}
        />
      )}
    </>
  );
}
