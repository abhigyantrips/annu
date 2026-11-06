export const datePresets = [
  "1",
  "24h",
  "7",
  "30",
  "90",
  "365",
  "custom",
] as const;
export type DatePreset = (typeof datePresets)[number];
export type Filters = { range: DatePreset; start?: string; end?: string };
const validDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export function validateFilters(input: Record<string, unknown>): Filters {
  return {
    range: datePresets.includes(input.range as DatePreset)
      ? (input.range as DatePreset)
      : "24h",
    start: validDate(input.start) ? input.start : undefined,
    end: validDate(input.end) ? input.end : undefined,
  };
}
export function dateRange(filters: Filters, now = Date.now()) {
  const today = Math.floor(now / 86_400_000) * 86_400_000;
  const from =
    filters.range === "24h"
      ? now - 86_400_000
      : filters.range === "custom" && filters.start
        ? Date.parse(filters.start)
        : today -
          (Number(filters.range === "custom" ? 7 : filters.range) - 1) *
            86_400_000;
  const to =
    filters.range === "custom" && filters.end
      ? Date.parse(filters.end) + 86_400_000
      : now;
  return {
    from,
    to,
    bucket:
      filters.range === "1" || filters.range === "24h"
        ? ("hour" as const)
        : ("day" as const),
  };
}
