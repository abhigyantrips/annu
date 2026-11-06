import { DesertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function Empty({
  text = "Keep your door open, and visitors will surely come through.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <HugeiconsIcon
        icon={DesertIcon}
        size={80}
        strokeWidth={1.25}
        className="empty-icon"
        aria-hidden="true"
      />
      <p>{text}</p>
    </div>
  );
}
