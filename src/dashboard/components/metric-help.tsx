import { CircleHelp } from "lucide-react";
import { useId, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MetricHelp({ title, note }: { title: string; note: string }) {
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

