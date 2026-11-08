import type { Report } from "../../../shared/types";
import { CircleHelp } from "lucide-react";
import { useId, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { duration, fmt } from "@/lib/format";
function MetricHelp({ title, note }: { title: string; note: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Tooltip
      open={open}
      triggerId={id}
      onOpenChange={(next, details) => {
        // A tap opens help; outside presses, blur, and Escape dismiss it.
        if (details.reason !== "trigger-press") setOpen(next);
      }}
    >
      <TooltipTrigger
        id={id}
        type="button"
        className="metric-help"
        aria-label={`About ${title}`}
        aria-describedby={open ? `${id}-content` : undefined}
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={16} aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent id={`${id}-content`} role="tooltip">{note}</TooltipContent>
    </Tooltip>
  );
}

export function Stats({ report }: { report: Report }) {
  const t = report.totals;
  return (
    <div className="stats">
      {[
        {
          title: "Visitors",
          value: fmt(t.visitors),
          note: "Distinct browser identities. A browser is counted once in the selected period.",
        },
        {
          title: "Visits",
          value: fmt(t.visits),
          note: "Visits are activity windows separated by at least 30 minutes of inactivity.",
        },
        {
          title: "Pages Viewed",
          value: fmt(t.views),
          note: "Total page views in the selected period, including repeat views.",
        },
        {
          title: "Average Visit Duration",
          value: duration(t.duration),
          note: "Estimated active reading time per visit, based on tracker heartbeats.",
        },
      ].map(({ title, value, note }) => (
        <div className="stat" key={title}>
          <div className="stat-label">
            {title}
            <MetricHelp title={title} note={note} />
          </div>
          <div className="stat-value">{value}</div>
        </div>
      ))}
    </div>
  );
}
