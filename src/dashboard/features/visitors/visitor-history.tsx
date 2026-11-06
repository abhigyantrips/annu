import type { Site, Timeline } from "../../../shared/types";
import { CountryFlag } from "@/components/country-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, FileText, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Empty } from "@/components/empty";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { countryName, dateTime, duration, siteName } from "@/lib/format";
export function VisitorHistory({
  site,
  visitor,
  onClose,
}: {
  site: Site;
  visitor: string;
  onClose: () => void;
}) {
  const query = useInfiniteQuery({
    queryKey: ["analytics", site.id, "history", visitor],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam, signal }) =>
      api<Timeline>(
        `/api/sites/${site.id}/visitors/${visitor}${pageParam ? `?before=${pageParam}` : ""}`,
        undefined,
        "GET",
        signal,
      ),
    getNextPageParam: (page) => page.nextBefore ?? undefined,
  });
  const pages = query.data?.pages;
  const data = pages
    ? {
        ...pages[pages.length - 1],
        visits: pages.flatMap((p) => p.visits),
        views: pages.flatMap((p) => p.views),
        clicks: pages.flatMap((p) => p.clicks),
      }
    : undefined;
  const busy = query.isFetching;
  const error = query.error?.message;
  return (
    <Modal title="Visitor Activity" onClose={onClose} wide>
      <p className="visitor-id mono">{visitor}</p>
      <p className="muted">
        History across all retained dates · {data?.totalVisits ?? "…"} visits.
        This ID identifies a browser, not a person.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
          <Button variant="link" onClick={() => void query.refetch()}>
            Try Again
          </Button>
        </p>
      )}
      {!data && busy && (
        <p className="loading">
          <Loader2 size={18} className="spin" />
          Loading History…
        </p>
      )}
      {data?.visits.map((v) => (
        <Card className="visit-card" key={String(v.id)}>
          <div className="visit-heading">
            <strong>{dateTime(Number(v.started_at))}</strong>
            <Badge variant="secondary">
              {v.referrer ? siteName(String(v.referrer)) : "Direct / Unknown"}
            </Badge>
          </div>
          <p className="subtle flex items-center gap-2">
            <CountryFlag country={v.country ? String(v.country) : null} />
            {[v.country && countryName(String(v.country)), v.region, v.city]
              .filter(Boolean)
              .join(" · ") || "Location Unknown"}
            {v.campaign ? ` · Campaign: ${v.campaign}` : ""}
          </p>
          <div className="timeline">
            {[
              ...data.views
                .filter((p) => p.visit_id === v.id)
                .map((p) => ({
                  id: p.id,
                  at: Number(p.started_at),
                  path: String(p.path),
                  title: String(p.title),
                  duration: Number(p.duration_ms),
                  click: false,
                })),
              ...data.clicks
                .filter((c) => c.visit_id === v.id)
                .map((c) => ({
                  id: c.id,
                  at: Number(c.at),
                  path: String(c.destination),
                  title: `${c.kind} from ${c.path}`,
                  duration: 0,
                  click: true,
                })),
            ]
              .sort((a, b) => a.at - b.at)
              .map((item) => (
                <div className="timeline-event" key={String(item.id)}>
                  <span
                    className={`event-icon ${item.click ? "outbound" : ""}`}
                  >
                    {item.click ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                  </span>
                  <div>
                    <strong className="mono">{item.path}</strong>
                    <small>{item.title}</small>
                  </div>
                  <span className="event-time">
                    {new Date(item.at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    {!item.click && <small>{duration(item.duration)}</small>}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ))}
      {data && !data.visits.length && <Empty title="No Retained Visits" />}
      {data?.nextBefore && (
        <Button disabled={busy} onClick={() => void query.fetchNextPage()}>
          {busy ? <Loader2 size={14} className="spin" /> : null}Load Older
          visits
        </Button>
      )}
    </Modal>
  );
}
