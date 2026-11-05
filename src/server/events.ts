import { z } from "zod";
const base = { siteId: z.uuid(), visitorId: z.uuid(), viewId: z.uuid() };
const short = z.string().max(300);
export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("view"),
    url: z.url().max(2000),
    title: z.string().max(500).default(""),
    referrer: z.string().max(2000).default(""),
    utm: z
      .object({
        source: short.optional(),
        medium: short.optional(),
        campaign: short.optional(),
      })
      .default({}),
  }),
  z.object({
    ...base,
    type: z.literal("time"),
    durationMs: z.number().int().min(0).max(86_400_000),
  }),
  z.object({
    ...base,
    type: z.literal("click"),
    eventId: z.uuid(),
    destination: z.string().max(2000),
    kind: z.enum(["link", "download", "mailto"]),
    includeQuery: z.boolean().default(false),
    includeHash: z.boolean().default(false),
  }),
  z.object({
    ...base,
    type: z.literal("vital"),
    metric: z.enum(["LCP", "INP", "CLS", "TTFB", "FCP"]),
    value: z.number().finite().min(0).max(3_600_000),
  }),
]);
export type AnalyticsEvent = z.infer<typeof eventSchema>;
export type Geo = {
  country: string | null;
  region: string | null;
  city: string | null;
};
export const visitTimeout = 30 * 60_000;

export function normalizeDestination(
  value: string,
  kind: string,
  query = false,
  hash = false,
) {
  const url = new URL(value);
  if (kind === "mailto") {
    if (url.protocol !== "mailto:") throw new Error("Invalid mail link");
    return `mailto:${url.pathname}${query ? url.search : ""}${hash ? url.hash : ""}`;
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Unsupported link protocol");
  return `${url.origin}${url.pathname}${query ? url.search : ""}${hash ? url.hash : ""}`;
}
export function referrerOrigin(value: string, domains: string[]) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !domains.includes(url.host)
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
