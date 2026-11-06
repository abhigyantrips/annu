import type { Report } from "../../shared/types";
export function trafficPoints(
  series: Report["series"],
  from: number,
  to: number,
  bucket: "hour" | "day",
) {
  const step = bucket === "hour" ? 3_600_000 : 86_400_000;
  const values = new Map(
    series.map((p) => [
      Date.parse(p.date.length === 10 ? p.date + "T00:00:00Z" : p.date),
      p,
    ]),
  );
  const points = [];
  for (let at = Math.floor(from / step) * step; at < to; at += step)
    points.push({ at, visitors: 0, visits: 0, views: 0, ...values.get(at) });
  return points;
}
