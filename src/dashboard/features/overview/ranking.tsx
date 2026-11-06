import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

import { Empty } from "@/components/empty";
import { fmt, siteName } from "@/lib/format";
export function Ranking({
  title,
  subtitle,
  rows,
  onMore,
  type,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; value: number }[];
  onMore: () => void;
  type: "path" | "referrer";
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="panel ranking">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <span className="subtle">{subtitle}</span>
        </div>
        <span className="tiny-label">
          {type === "referrer" ? "VISITS" : "VIEWS"}
        </span>
      </div>
      {!rows.length ? (
        <Empty />
      ) : (
        <div className="ranking-rows">
          {rows.slice(0, 5).map((r, i) => (
            <div className="ranking-row" key={r.name}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <div className="ranking-track">
                <div
                  className="ranking-bar"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
                <span className={type === "path" ? "mono" : ""}>
                  {type === "referrer" ? siteName(r.name) : r.name}
                </span>
              </div>
              <strong>{fmt(r.value)}</strong>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="link"
        className="w-full border-t rounded-none"
        onClick={onMore}
      >
        Explore {type === "referrer" ? "Referrers" : "Pages"}
        <ArrowUpRight size={14} />
      </Button>
    </Card>
  );
}
