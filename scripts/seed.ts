import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { AnalyticsDatabase } from "../src/server/database.js";
const path = resolve(process.env.DEMO_DATABASE_PATH || "data/demo.db");
const db = new AnalyticsDatabase(path);
if (db.sites().length) {
  db.close();
  throw new Error(
    "Demo database already contains a site; refusing to add sample data. Choose a new DEMO_DATABASE_PATH.",
  );
}
// This is an explicitly separate synthetic database, never the normal DATABASE_PATH.
db.sqlite.pragma("synchronous = OFF");
const site = db.saveSite({
  name: "abhi.now · demo",
  domains: ["abhi.now", "localhost:3000", "127.0.0.1:3000"],
});
const visitors = Array.from({ length: 220 }, () => randomUUID());
const paths = [
  "/",
  "/writing/a-small-web",
  "/writing/notes-on-attention",
  "/about",
  "/writing/a-place-of-your-own",
  "/now",
  "/writing/things-worth-keeping",
  "/blogroll",
];
const refs = [
  "https://indieweb.org",
  "https://kottke.org",
  "https://lobste.rs",
  "https://anh.email",
  "",
  "",
  "https://sive.rs",
];
const places = [
  { country: "IN", region: "MH", city: "Mumbai" },
  { country: "US", region: "CA", city: "San Francisco" },
  { country: "GB", region: "ENG", city: "London" },
  { country: "DE", region: "BE", city: "Berlin" },
  { country: "CA", region: "ON", city: "Toronto" },
];
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) >>> 0;
  return state / 4294967296;
};
const pick = <T>(values: T[]) => values[Math.floor(rand() * values.length)];
const now = Date.now();
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
for (let day = 29; day >= 0; day--) {
  const count = day === 0 ? 14 : 18 + Math.floor(rand() * 22);
  for (let i = 0; i < count; i++) {
    const at =
      day === 0
        ? Math.min(
            now - 60_000,
            today.getTime() + rand() * (now - today.getTime()),
          )
        : today.getTime() - day * 86_400_000 + Math.floor(rand() * 82_000_000);
    const visitorId = pick(visitors),
      geo = pick(places),
      referrer = pick(refs);
    const campaign = pick([
      "abc",
      "abc_group",
      "abc_grp",
      "monthly-letter",
      "",
    ]);
    for (let p = 0; p < 1 + Math.floor(rand() * 3); p++) {
      const viewId = randomUUID(),
        pathname = pick(paths),
        started = at + p * 210_000;
      if (started >= now) continue;
      db.ingest(
        {
          type: "view",
          siteId: site.id,
          visitorId,
          viewId,
          url: `https://abhi.now${pathname}`,
          title:
            pathname === "/"
              ? "Abhi — writing on the small web"
              : pathname.split("/").pop()!.replaceAll("-", " "),
          referrer,
          utm: {
            source: campaign.startsWith("abc") ? "whatsapp" : "newsletter",
            medium: campaign ? "community" : undefined,
            campaign: campaign || undefined,
          },
        },
        "https://abhi.now",
        geo,
        started,
      );
      const durationMs = 35_000 + Math.floor(rand() * 230_000);
      db.ingest(
        { type: "time", siteId: site.id, visitorId, viewId, durationMs },
        "https://abhi.now",
        geo,
        started + durationMs,
      );
      if (rand() > 0.65)
        db.ingest(
          {
            type: "click",
            siteId: site.id,
            visitorId,
            viewId,
            eventId: randomUUID(),
            destination: pick([
              "https://anh.email/writing/",
              "https://indieweb.org/",
              "https://sive.rs/now",
              "https://100r.co/site/home.html",
            ]),
            kind: "link",
            includeQuery: false,
            includeHash: false,
          },
          "https://abhi.now",
          geo,
          started + 30_000,
        );
      for (const metric of ["LCP", "INP", "CLS", "TTFB", "FCP"] as const)
        db.ingest(
          {
            type: "vital",
            siteId: site.id,
            visitorId,
            viewId,
            metric,
            value:
              metric === "CLS"
                ? rand() * 0.1
                : metric === "INP"
                  ? 50 + rand() * 130
                  : metric === "LCP"
                    ? 900 + rand() * 1200
                    : 200 + rand() * 450,
          },
          "https://abhi.now",
          geo,
          started + 50_000,
        );
    }
  }
}
db.saveLabel({
  siteId: site.id,
  dimension: "campaign",
  name: "ABC WhatsApp Group",
  values: ["abc", "abc_group", "abc_grp"],
});
db.saveLabel({
  siteId: site.id,
  dimension: "campaign",
  name: "Letters to friends",
  values: ["monthly-letter"],
});
db.sqlite.pragma("synchronous = FULL");
db.close();
console.log(
  `Created synthetic demo data at ${path}. Start with DATABASE_PATH=${path}.`,
);
