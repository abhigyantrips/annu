import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { AnalyticsDatabase } from "../src/server/database.js";
import {
  normalizeDestination,
  type AnalyticsEvent,
} from "../src/server/events.js";

function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "annu-db-"));
  const db = new AnalyticsDatabase(join(dir, "test.db"));
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const site = db.saveSite({ name: "A blog", domains: ["blog.test"] });
  const visitorId = randomUUID(),
    now = 1_800_000_000_000,
    geo = { country: "IN", region: "MH", city: "Mumbai" };
  const view = (
    fields: Partial<Extract<AnalyticsEvent, { type: "view" }>> = {},
    at = now,
  ) => {
    const event: Extract<AnalyticsEvent, { type: "view" }> = {
      type: "view",
      siteId: site.id,
      visitorId,
      viewId: randomUUID(),
      url: "https://blog.test/post",
      title: "A post",
      referrer: "https://friend.test/a/link?secret=1",
      utm: {},
      ...fields,
    };
    const result = db.ingest(event, "https://blog.test", geo, at);
    return { event, result };
  };
  return { db, site, visitorId, now, geo, view };
}
test("visitor pagination preserves identities sharing the same activity timestamp", (t) => {
  const { db, site, now, view } = fixture(t);
  for (let i = 0; i < 105; i++) view({ visitorId: randomUUID() });
  const first = db.activity(site.id, now - 1, now + 1);
  assert.equal(first.length, 100);
  const last = first.at(-1)!;
  const second = db.activity(
    site.id,
    now - 1,
    now + 1,
    last.lastSeen,
    last.visitorId,
  );
  assert.equal(second.length, 5);
  assert.equal(
    new Set([...first, ...second].map((row) => row.visitorId)).size,
    105,
  );
});
test("shared browser identity creates one visit across tabs and a new visit after inactivity", (t) => {
  const { db, site, now, view } = fixture(t);
  const first = view();
  view({}, now + 1000);
  view({}, now + 29 * 60_000);
  const r = db.report(site.id, now - 1, now + 60 * 60_000, now);
  assert.equal(r.totals.visitors, 1);
  assert.equal(r.totals.visits, 1);
  assert.equal(r.totals.views, 3);
  view({}, now + 60 * 60_000);
  assert.equal(
    db.report(site.id, now - 1, now + 61 * 60_000, now).totals.visits,
    2,
  );
  assert.equal(
    db.ingest(
      first.event,
      "https://blog.test",
      { country: null, region: null, city: null },
      now + 1,
    ),
    "duplicate",
  );
  assert.equal(
    db.report(site.id, now - 1, now + 61 * 60_000, now).totals.views,
    4,
  );
});
test("unconfigured origins, spoofed page URLs, and unknown view checkpoints are rejected", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  const first = view({ url: "https://evil.test/post" });
  assert.equal(first.result, "rejected");
  const valid = view();
  assert.equal(
    db.ingest(valid.event, "https://evil.test", geo, now),
    "rejected",
  );
  assert.equal(
    db.ingest(
      {
        type: "time",
        siteId: site.id,
        visitorId,
        viewId: randomUUID(),
        durationMs: 1000,
      },
      "https://blog.test",
      geo,
      now,
    ),
    "missing",
  );
  assert.equal(db.report(site.id, now - 1, now + 1, now).totals.views, 1);
});
test("cumulative reading checkpoints are idempotent, monotonic, and bounded by wall time", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  const { event } = view();
  const checkpoint = (durationMs: number, at: number) =>
    db.ingest(
      {
        type: "time",
        siteId: site.id,
        visitorId,
        viewId: event.viewId,
        durationMs,
      },
      "https://blog.test",
      geo,
      at,
    );
  checkpoint(25_000, now + 25_000);
  checkpoint(25_000, now + 30_000);
  checkpoint(10_000, now + 35_000);
  checkpoint(900_000, now + 40_000);
  const r = db.report(site.id, now - 1, now + 60_000, now);
  assert.equal(r.paths[0].duration, 40_000);
  assert.equal(r.totals.duration, 40_000);
});
test("path duration is time per visit containing that path, including zero-duration views", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  const first = view(),
    second = view({}, now + 1000);
  for (const p of [first, second])
    db.ingest(
      {
        type: "time",
        siteId: site.id,
        visitorId,
        viewId: p.event.viewId,
        durationMs: 30_000,
      },
      "https://blog.test",
      geo,
      now + 31_000,
    );
  view({ visitorId: randomUUID() }, now + 60_000);
  const r = db.report(site.id, now - 1, now + 120_000, now);
  assert.deepEqual(r.paths[0], {
    path: "/post",
    visitors: 2,
    visits: 2,
    views: 3,
    duration: 30_000,
  });
  assert.equal(r.referrers[0].name, "https://friend.test");
});
test("cross-day history is retained while report counts reflect the requested date range", (t) => {
  const { db, site, visitorId, now, view } = fixture(t);
  view();
  view({}, now + 86_400_000);
  const history = db.timeline(site.id, visitorId);
  assert.equal(history.visits.length, 2);
  assert.equal(history.views.length, 2);
  const nextDay = db.report(
    site.id,
    now + 86_400_000,
    now + 2 * 86_400_000,
    now,
  );
  assert.equal(nextDay.totals.visitors, 1);
  assert.equal(nextDay.totals.visits, 1);
  assert.equal(nextDay.totals.views, 1);
});
test("UTM labels combine values retroactively per dimension and conflicting rules roll back", (t) => {
  const { db, site, now, view } = fixture(t);
  view({ utm: { campaign: "abc", source: "abc" } });
  view({ visitorId: randomUUID(), utm: { campaign: "abc_group" } }, now + 1000);
  const label = db.saveLabel({
    siteId: site.id,
    dimension: "campaign",
    name: "ABC Group",
    values: ["abc", "abc_group"],
  });
  let r = db.report(site.id, now - 1, now + 2000, now);
  assert.deepEqual(r.utm.campaign, [
    { name: "ABC Group", raw: ["abc", "abc_group"], visits: 2 },
  ]);
  assert.equal(r.utm.source[0].name, "abc");
  assert.throws(() =>
    db.saveLabel({
      siteId: site.id,
      dimension: "campaign",
      name: "Conflict",
      values: ["abc"],
    }),
  );
  assert.equal(db.labels(site.id).length, 1);
  db.saveLabel({ ...label, name: "Friends" });
  r = db.report(site.id, now - 1, now + 2000, now);
  assert.equal(r.utm.campaign[0].name, "Friends");
  db.deleteLabel(site.id, label.id);
  assert.equal(
    db.report(site.id, now - 1, now + 2000, now).utm.campaign.length,
    2,
  );
});
test("outgoing links strip query strings and fragments; duplicate clicks do not inflate counts", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  const { event } = view();
  const click: AnalyticsEvent = {
    type: "click",
    siteId: site.id,
    visitorId,
    viewId: event.viewId,
    eventId: randomUUID(),
    kind: "link",
    destination: "https://friend.test/read?token=secret#part",
    includeQuery: false,
    includeHash: false,
  };
  db.ingest(click, "https://blog.test", geo, now + 1000);
  db.ingest(click, "https://blog.test", geo, now + 1001);
  const r = db.report(site.id, now - 1, now + 2000, now);
  assert.equal(r.outbound[0].destination, "https://friend.test/read");
  assert.equal(r.outbound[0].clicks, 1);
  assert.equal(r.outbound[0].visitors, 1);
  assert.equal(
    normalizeDestination("mailto:hello@example.test?subject=Hi", "mailto"),
    "mailto:hello@example.test",
  );
  assert.throws(() => normalizeDestination("javascript:alert(1)", "link"));
});
test("performance values update per document and preserve decimal CLS and nearest-rank percentiles", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  for (const value of [0.01, 0.02, 0.03, 0.08]) {
    const { event } = view();
    db.ingest(
      {
        type: "vital",
        siteId: site.id,
        visitorId,
        viewId: event.viewId,
        metric: "CLS",
        value: 0.001,
      },
      "https://blog.test",
      geo,
      now,
    );
    db.ingest(
      {
        type: "vital",
        siteId: site.id,
        visitorId,
        viewId: event.viewId,
        metric: "CLS",
        value,
      },
      "https://blog.test",
      geo,
      now,
    );
  }
  assert.deepEqual(db.report(site.id, now - 1, now + 1, now).performance[0], {
    path: "/post",
    metric: "CLS",
    samples: 4,
    p50: 0.02,
    p75: 0.03,
    p95: 0.08,
  });
});
test("site identities are isolated, exports are scoped, and retention never deletes the last year", (t) => {
  const { db, site, visitorId, now, view } = fixture(t);
  view({}, now - 380 * 86_400_000);
  view({}, now - 360 * 86_400_000);
  const other = db.saveSite({ name: "Second", domains: ["other.test"] });
  db.ingest(
    {
      type: "view",
      siteId: other.id,
      visitorId,
      viewId: randomUUID(),
      url: "https://other.test/",
      title: "Other",
      referrer: "",
      utm: {},
    },
    "https://other.test",
    { country: null, region: null, city: null },
    now,
  );
  assert.equal(db.exportRows(site.id, 0, now + 1, "views", "").length, 2);
  db.prune(10, now);
  assert.equal(db.timeline(site.id, visitorId).views.length, 1);
  assert.equal(db.report(other.id, now - 1, now + 1, now).totals.views, 1);
});

test("hourly series respect UTC boundaries, range limits, and distinct visits", (t) => {
  const { db, site, view } = fixture(t);
  const start = Date.parse("2026-11-06T09:45:00Z");
  view({}, start);
  view({}, start + 20 * 60_000); // Same visit spans the hour boundary.
  view({}, start + 70 * 60_000); // A new visit, in the second hourly bucket.
  view({}, start + 75 * 60_000); // Outside the requested range.
  const end = start + 75 * 60_000;
  const hourly = db.report(site.id, start, end, end, "hour");
  assert.deepEqual(hourly.series, [
    { date: "2026-11-06T09:00:00Z", visitors: 1, visits: 1, views: 1 },
    { date: "2026-11-06T10:00:00Z", visitors: 1, visits: 2, views: 2 },
  ]);
  assert.equal(hourly.totals.visits, 2); // Do not sum per-bucket unique counts.
  assert.equal(hourly.totals.visitors, 1);
  assert.deepEqual(db.report(site.id, start, end).series, [
    { date: "2026-11-06", visitors: 1, visits: 2, views: 3 },
  ]);
});

test("audience counts distinct visitors per dimension, scopes geography, and omits unknown buckets without changing totals", t => {
  const {db, site, now, visitorId, geo, view}=fixture(t);
  const ingest=(id:string, country:string, region:string, city:string, at:number)=>db.ingest({type:"view",siteId:site.id,visitorId:id,viewId:randomUUID(),url:"https://blog.test/post",title:"",referrer:"",utm:{}},"https://blog.test",{country,region,city},at,{browser:"Chrome",os:"Windows",device:"Desktop"});
  ingest(visitorId,"US","CA","Springfield",now);
  ingest(visitorId,"US","NY","Springfield",now+31*60_000);
  ingest(randomUUID(),"CA","ON","Springfield",now+32*60_000);
  // An old visit without environment fields is retained as Unknown.
  view({visitorId:randomUUID()},now+33*60_000);
  // Outside the requested range and on another website must not affect the breakdown.
  ingest(randomUUID(),"DE","BE","Berlin",now-1);
  const other=db.saveSite({name:"Other",domains:["other.test"]});
  db.ingest({type:"view",siteId:other.id,visitorId:randomUUID(),viewId:randomUUID(),url:"https://other.test/",title:"",referrer:"",utm:{}},"https://other.test",geo,now,{browser:"Firefox",os:"Linux",device:"Desktop"});
  const end=now+34*60_000;
  const country=db.audience(site.id,now,end,"country");
  assert.equal(country.visitors,3);
  assert.equal(country.rows.find(r=>r.name==="US")?.visitors,1); // A country's two city groups share a visitor.
  const browser=db.audience(site.id,now,end,"browser");
  assert.deepEqual(browser.rows.map(r=>[r.name,r.visitors]),[["Chrome",2]]);
  const cities=db.audience(site.id,now,end,"city").rows.filter(r=>r.name==="Springfield");
  assert.equal(cities.length,3); // Same city name in separate subdivisions/countries remains separate.
  assert.equal(db.audience(site.id,now,end,"os").rows[0].name,"Windows");
  assert.equal(db.audience(site.id,now,end,"device").rows[0].name,"Desktop");
  assert.equal(db.audience(site.id,now,end,"region").rows.length,4);
});

test("referrer lists omit direct and unknown sources while traffic totals retain them", t=>{
 const {db,site,now,view}=fixture(t);
 view({referrer:"",visitorId:randomUUID()});
 view({referrer:"https://blog.test/internal",visitorId:randomUUID()});
 view({referrer:"not-a-url",visitorId:randomUUID()});
 view({referrer:"https://source.test/article",visitorId:randomUUID()});
 const report=db.report(site.id,now,now+1);
 assert.equal(report.totals.views,4);
 assert.equal(report.totals.visits,4);
 assert.deepEqual(report.referrers.map(r=>r.name),["https://source.test"]);
});

test("performance overview ranks raw samples by time, title and environment without averaging path percentiles", (t) => {
  const { db, site, visitorId, now, geo, view } = fixture(t);
  for (const [index, value] of [100, 200, 300, 9000].entries()) {
    const at = now + (index === 3 ? 3600000 : 0);
    const { event } = view({ url: `https://blog.test/${index === 3 ? "slow" : "fast"}`, title: index === 3 ? "Slow page" : "Fast page" }, at);
    db.ingest({ type: "vital", siteId: site.id, visitorId, viewId: event.viewId, metric: "LCP", value }, "https://blog.test", geo, at);
  }
  const report = db.report(site.id, now - 1, now + 3600001, now, "hour");
  const summary = report.performanceOverview.find(row => row.group === "summary" && row.metric === "LCP")!;
  assert.deepEqual(summary, { group: "summary", name: "", metric: "LCP", samples: 4, p50: 200, p75: 300, p95: 9000 });
  const times = report.performanceOverview.filter(row => row.group === "time");
  assert.equal(times.length, 2);
  assert.deepEqual(times.map(row => row.samples), [3, 1]);
  assert.deepEqual(times.map(row => row.p75), [300, 9000]);
  assert.equal(report.performanceOverview.find(row => row.group === "title" && row.name === "Fast page")?.p75, 300);
  assert.equal(report.performanceOverview.find(row => row.group === "device")?.samples, 4);
  assert.equal(report.performanceOverview.find(row => row.group === "browser")?.p75, 300);
  assert.equal(report.performanceOverview.some(row => row.metric === "INP"), false);
  assert.deepEqual(db.report(site.id, now - 1000, now - 1, now).performanceOverview, []);
  const other = db.saveSite({ name: "Other", domains: ["other.test"] });
  assert.deepEqual(db.report(other.id, now - 1, now + 3600001, now).performanceOverview, []);
  const daily = db.report(site.id, now - 1, now + 3600001, now, "day").performanceOverview.filter(row => row.group === "time");
  assert.equal(daily.length, 1);
  assert.equal(daily[0].p75, 300);
});

test("country map totals deduplicate visitors across cities and include every country", (t) => {
  const { db, site, visitorId, now, view } = fixture(t);
  view();
  // The same visitor returns in another city in a new session.
  db.ingest({ type: "view", siteId: site.id, visitorId, viewId: randomUUID(), url: "https://blog.test/second", title: "Second", referrer: "", utm: {} }, "https://blog.test", { country: "IN", region: "DL", city: "Delhi" }, now + 31 * 60000);
  const countries = ["US", "GB", "FR", "DE", "JP", "AU", "BR", "CA", "ZA", "NZ", "Unknown"];
  for (const country of countries) {
    db.ingest({ type: "view", siteId: site.id, visitorId: randomUUID(), viewId: randomUUID(), url: "https://blog.test/", title: "Home", referrer: "", utm: {} }, "https://blog.test", { country: country === "Unknown" ? null : country, region: null, city: null }, now);
  }
  const report = db.report(site.id, now - 1, now + 32 * 60000, now);
  assert.deepEqual(report.countries.find(row => row.country === "IN"), { country: "IN", visitors: 1, visits: 2 });
  assert.equal(report.locations.filter(row => row.country === "IN").reduce((sum, row) => sum + row.visitors, 0), 2);
  assert.equal(report.countries.length, 12);
  assert.equal(report.countries.find(row => row.country === "Unknown")?.visitors, 1);
  const other = db.saveSite({ name: "Other", domains: ["other.test"] });
  assert.deepEqual(db.report(other.id, now - 1, now + 32 * 60000, now).countries, []);
  assert.deepEqual(db.report(site.id, now - 1000, now - 1, now).countries, []);
});
