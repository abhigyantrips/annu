import type { Site, Timeline } from "../../../shared/types";
import { VisitorAvatar } from "@/components/visitor-avatar";
import { MetricHelp } from "@/components/metric-help";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, FileText, LogIn, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { Empty } from "@/components/empty";
import { Modal } from "@/components/modal";
import { api } from "@/lib/api";
import { duration, visitorName } from "@/lib/format";
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
  const days = visitorTimeline(data);
  const busy = query.isFetching;
  const error = query.error?.message;
  return (
    <Modal title="Visitor Activity" onClose={onClose} wide>
      <div className="mb-3 flex items-center gap-3">
        <VisitorAvatar siteId={site.id} visitorId={visitor} size={64} />
        <div className="min-w-0">
          <div className="visitor-pseudonym flex items-center gap-1">
            <p className="font-medium">{visitorName(visitor)}</p>
            <MetricHelp
              title="this browser ID"
              note="This is a randomized ID that is stored on the browser for analytics. It hence identified a browser, not a person; clearing the site data removes and generates a new one. Pseudonym and avatar are also generated from it."
            />
          </div>
          <p className="visitor-id mono">{visitor}</p>
        </div>
      </div>
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
      <div className="visitor-timeline">
        {days.map(({ date, events }) => (
          <section className="visitor-day" key={date}>
            <h3>{new Date(events[0].at).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}</h3>
            <ol>
              {events.map((event) => {
                const Icon = event.kind === "page" ? FileText : event.kind === "entry" ? LogIn : ArrowUpRight;
                return (
                  <li className="visitor-event" key={event.id}>
                    <time dateTime={new Date(event.at).toISOString()}>
                      {new Date(event.at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </time>
                    <Icon size={16} aria-hidden="true" />
                    <span className="visitor-event-label" title={event.title}>
                      {event.kind === "entry" && <span className="muted">Came via </span>}
                      {event.kind === "outgoing" && <span className="muted">Visited </span>}
                      {event.label}
                    </span>
                    {event.kind === "page" && (
                      <span className="visitor-reading-time" aria-label={`Reading time: ${duration(event.duration)}`}>
                        {duration(event.duration)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      {data && !data.visits.length && <Empty text="The trail is quiet for now. This visitor’s next visit will appear here." />}
      {data?.nextBefore && (
        <Button disabled={busy} onClick={() => void query.fetchNextPage()}>
          {busy ? <Loader2 size={14} className="spin" /> : null}Load Older
          visits
        </Button>
      )}
    </Modal>
  );
}

type VisitorEvent = {
  id: string;
  at: number;
  kind: "entry" | "page" | "outgoing";
  label: string;
  title?: string;
  duration: number;
};

export function visitorTimeline(data?: Pick<Timeline, "visits" | "views" | "clicks">) {
  if (!data) return [];
  const events: VisitorEvent[] = [
    ...data.visits.filter((visit) => visit.referrer).map((visit): VisitorEvent => ({
      id: `entry:${visit.id}`,
      at: Number(visit.started_at),
      kind: "entry",
      label: String(visit.referrer),
      duration: 0,
    })),
    ...data.views.map((view): VisitorEvent => ({
      id: `page:${view.id}`,
      at: Number(view.started_at),
      kind: "page",
      label: String(view.path),
      title: view.title ? String(view.title) : undefined,
      duration: Number(view.duration_ms),
    })),
    ...data.clicks.map((click): VisitorEvent => ({
      id: `outgoing:${click.id}`,
      at: Number(click.at),
      kind: "outgoing",
      label: String(click.destination),
      duration: 0,
    })),
  ];
  // Entry first when a referral and its landing page share a timestamp.
  const order = { entry: 0, page: 1, outgoing: 2 };
  events.sort((a, b) => a.at - b.at || order[a.kind] - order[b.kind] || a.id.localeCompare(b.id));
  const days = new Map<string, VisitorEvent[]>();
  for (const event of events) {
    const at = new Date(event.at);
    const date = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
    const group = days.get(date);
    if (group) group.push(event);
    else days.set(date, [event]);
  }
  // Newest date first; events within each date read chronologically.
  return [...days].reverse().map(([date, events]) => ({ date, events }));
}
