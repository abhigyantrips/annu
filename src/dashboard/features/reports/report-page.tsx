import { QueryStatusFooter } from "@/components/query-status-footer";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/features/dashboard/context";
import { reportQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
      <QueryStatusFooter
        isFetching={query.isFetching}
        dataUpdatedAt={query.dataUpdatedAt}
        live={live}
        onRefresh={refresh}
      />
    </>
  );
}
