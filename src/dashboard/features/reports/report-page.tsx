import { Button } from "@/components/ui/button";
import { useDashboard } from "@/features/dashboard/context";
import { reportQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import type { Report } from "../../../shared/types";
export function ReportPage({
  children,
}: {
  children: (data: {
    report: Report;
    from: number;
    to: number;
    refresh: () => void;
  }) => ReactNode;
}) {
  const { site, filters, live } = useDashboard();
  const query = useQuery({
    ...reportQuery(site.id, filters),
    refetchInterval: live ? 5000 : false,
  });
  const refresh = () => {
    void query.refetch();
  };
  return (
    <>
      {query.error && (
        <div className="error-banner" role="alert">
          {query.error.message}
          <Button variant="link" onClick={refresh}>
            Try Again
          </Button>
        </div>
      )}
      {query.data ? (
        children({ ...query.data, refresh })
      ) : query.isPending ? (
        <div className="loading">
          <Loader2 className="spin" size={20} />
          Gathering a little perspective…
        </div>
      ) : null}
      <footer className="status-footer">
        <div className="status-pill rounded-lg">
          <span className="status-pill-label">
            {query.isFetching
              ? "Refreshing…"
              : query.dataUpdatedAt
                ? `Updated ${new Date(query.dataUpdatedAt).toLocaleTimeString()}`
                : "Waiting for Data"}
            {live ? " · Live" : ""}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh Analytics"
            disabled={query.isFetching}
            onClick={refresh}
          >
            <RefreshCw size={12} />
          </Button>
        </div>
      </footer>
    </>
  );
}
