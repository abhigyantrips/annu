import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function QueryStatusFooter({
  isFetching,
  dataUpdatedAt,
  live,
  onRefresh,
  refreshLabel = "Refresh Analytics",
}: {
  isFetching: boolean;
  dataUpdatedAt: number;
  live: boolean;
  onRefresh: () => void;
  refreshLabel?: string;
}) {
  return (
      <footer className="status-footer">
        <div className="status-pill rounded-lg">
          <span className="status-pill-label">
            {isFetching
              ? "Refreshing…"
              : dataUpdatedAt
                ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                : "Waiting for Data"}
            {live ? " · Live" : ""}
          </span>
          <Button
            variant="default"
            size="icon-sm"
            aria-label={refreshLabel}
            disabled={isFetching}
            onClick={onRefresh}
          >
            <RefreshCw size={12} />
          </Button>
        </div>
      </footer>
  );
}
