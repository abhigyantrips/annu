import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import * as schema from "./schema.js";
import {
  normalizeDestination,
  referrerOrigin,
  visitTimeout,
  type AnalyticsEvent,
  type Geo,
} from "./events.js";
import type {
  Activity,
  Dimension,
  Label,
  Report,
  Row,
  Site,
  Timeline,
} from "../shared/types.js";

export class AnalyticsDatabase {
  sqlite: Database.Database;
  db;
  constructor(path: string, readonly = false) {
    mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path, { readonly, timeout: 150 });
    this.sqlite.pragma("foreign_keys = ON");
    this.sqlite.pragma("busy_timeout = 150");
    this.sqlite.pragma("cache_size = -8000");
    if (!readonly) {
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("synchronous = FULL");
    }
    this.db = drizzle(this.sqlite, { schema });
    if (!readonly) migrate(this.db, { migrationsFolder: resolve("drizzle") });
  }
  close() {
    this.sqlite.close();
  }
  sites(): Site[] {
    return this.db
      .select()
      .from(schema.sites)
      .orderBy(schema.sites.createdAt)
      .all();
  }
  saveSite(
    input: { id?: string; name: string; domains: string[] },
    now = Date.now(),
  ) {
    if (input.id) {
      const existing = this.db
        .select()
        .from(schema.sites)
        .where(eq(schema.sites.id, input.id))
        .get();
      if (!existing) throw new Error("Site not found");
      this.db
        .update(schema.sites)
        .set({ name: input.name, domains: input.domains })
        .where(eq(schema.sites.id, input.id))
        .run();
      return { ...existing, name: input.name, domains: input.domains };
    }
    const site = { ...input, id: randomUUID(), createdAt: now };
    this.db.insert(schema.sites).values(site).run();
    return site;
  }
  ingest(event: AnalyticsEvent, origin: string, geo: Geo, now = Date.now()) {
    const { db } = this;
    const site = db
      .select()
      .from(schema.sites)
      .where(eq(schema.sites.id, event.siteId))
      .get();
    if (!site) return "rejected";
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch {
      return "rejected";
    }
    if (
      !["http:", "https:"].includes(originUrl.protocol) ||
      !site.domains.includes(originUrl.host)
    )
      return "rejected";
    return db.transaction((tx) => {
      if (event.type === "view") {
        const url = new URL(event.url);
        if (url.origin !== originUrl.origin || url.username || url.password)
          return "rejected";
        // A repeated view packet must not create another visit or overwrite a different visitor's page.
        if (
          tx
            .select({ id: schema.pageviews.id })
            .from(schema.pageviews)
            .where(eq(schema.pageviews.id, event.viewId))
            .get()
        )
          return "duplicate";
        const existing = tx
          .select()
          .from(schema.visits)
          .where(
            and(
              eq(schema.visits.siteId, site.id),
              eq(schema.visits.visitorId, event.visitorId),
              gt(schema.visits.lastSeen, now - visitTimeout),
            ),
          )
          .orderBy(desc(schema.visits.lastSeen))
          .limit(1)
          .get();
        const visitId = existing?.id || randomUUID();
        tx.insert(schema.visitors)
          .values({
            siteId: site.id,
            id: event.visitorId,
            firstSeen: now,
            lastSeen: now,
          })
          .onConflictDoUpdate({
            target: [schema.visitors.siteId, schema.visitors.id],
            set: { lastSeen: now },
          })
          .run();
        if (existing)
          tx.update(schema.visits)
            .set({ lastSeen: now })
            .where(eq(schema.visits.id, visitId))
            .run();
        else
          tx.insert(schema.visits)
            .values({
              id: visitId,
              siteId: site.id,
              visitorId: event.visitorId,
              startedAt: now,
              lastSeen: now,
              referrer: referrerOrigin(event.referrer, site.domains),
              ...geo,
              source: event.utm.source || null,
              medium: event.utm.medium || null,
              campaign: event.utm.campaign || null,
            })
            .run();
        tx.insert(schema.pageviews)
          .values({
            id: event.viewId,
            siteId: site.id,
            visitId,
            visitorId: event.visitorId,
            path: url.pathname,
            title: event.title,
            startedAt: now,
            checkpointAt: now,
          })
          .run();
        return "accepted";
      }
      const page = tx
        .select()
        .from(schema.pageviews)
        .where(
          and(
            eq(schema.pageviews.id, event.viewId),
            eq(schema.pageviews.siteId, site.id),
            eq(schema.pageviews.visitorId, event.visitorId),
          ),
        )
        .get();
      if (!page) return "missing"; // No queue or retries: a lost initial view stays lost.
      if (event.type === "time") {
        // Cumulative checkpoints are idempotent and cannot exceed elapsed server wall time.
        const durationMs = Math.min(
          event.durationMs,
          Math.max(0, now - page.startedAt),
        );
        if (durationMs > page.durationMs) {
          tx.update(schema.pageviews)
            .set({ durationMs, checkpointAt: now })
            .where(eq(schema.pageviews.id, page.id))
            .run();
          tx.update(schema.visits)
            .set({ lastSeen: now })
            .where(eq(schema.visits.id, page.visitId))
            .run();
          tx.update(schema.visitors)
            .set({ lastSeen: now })
            .where(
              and(
                eq(schema.visitors.siteId, site.id),
                eq(schema.visitors.id, event.visitorId),
              ),
            )
            .run();
        }
      } else if (event.type === "click") {
        let destination: string;
        try {
          destination = normalizeDestination(
            event.destination,
            event.kind,
            event.includeQuery,
            event.includeHash,
          );
        } catch {
          return "rejected";
        }
        tx.insert(schema.clicks)
          .values({
            id: event.eventId,
            siteId: site.id,
            visitId: page.visitId,
            viewId: page.id,
            visitorId: event.visitorId,
            path: page.path,
            destination,
            kind: event.kind,
            at: now,
          })
          .onConflictDoNothing()
          .run();
        tx.update(schema.visits)
          .set({ lastSeen: now })
          .where(eq(schema.visits.id, page.visitId))
          .run();
        tx.update(schema.visitors)
          .set({ lastSeen: now })
          .where(
            and(
              eq(schema.visitors.siteId, site.id),
              eq(schema.visitors.id, event.visitorId),
            ),
          )
          .run();
      } else {
        tx.insert(schema.vitals)
          .values({ viewId: page.id, metric: event.metric, value: event.value })
          .onConflictDoUpdate({
            target: [schema.vitals.viewId, schema.vitals.metric],
            set: { value: event.value },
          })
          .run();
      }
      return "accepted";
    });
  }
  labels(siteId: string): Label[] {
    const labels = this.db
      .select()
      .from(schema.labels)
      .where(eq(schema.labels.siteId, siteId))
      .all();
    const values = this.db
      .select()
      .from(schema.labelValues)
      .where(eq(schema.labelValues.siteId, siteId))
      .all();
    return labels.map((l) => ({
      ...l,
      dimension: l.dimension as Dimension,
      values: values.filter((v) => v.labelId === l.id).map((v) => v.value),
    }));
  }
  saveLabel(input: Omit<Label, "id"> & { id?: string }) {
    return this.db.transaction((tx) => {
      const id = input.id || randomUUID();
      if (
        input.id &&
        !tx
          .select()
          .from(schema.labels)
          .where(
            and(
              eq(schema.labels.id, id),
              eq(schema.labels.siteId, input.siteId),
            ),
          )
          .get()
      )
        throw new Error("Label not found");
      tx.insert(schema.labels)
        .values({
          id,
          siteId: input.siteId,
          dimension: input.dimension,
          name: input.name,
        })
        .onConflictDoUpdate({
          target: schema.labels.id,
          set: { name: input.name, dimension: input.dimension },
        })
        .run();
      tx.delete(schema.labelValues)
        .where(eq(schema.labelValues.labelId, id))
        .run();
      for (const value of new Set(input.values))
        tx.insert(schema.labelValues)
          .values({
            siteId: input.siteId,
            dimension: input.dimension,
            labelId: id,
            value,
          })
          .run();
      return { ...input, id };
    });
  }
  deleteLabel(siteId: string, id: string) {
    this.db
      .delete(schema.labels)
      .where(and(eq(schema.labels.siteId, siteId), eq(schema.labels.id, id)))
      .run();
  }
  report(siteId: string, from: number, to: number, now = Date.now()): Report {
    const { db } = this;
    const totals = db.get<Report["totals"]>(sql`
      SELECT count(DISTINCT visitor_id) AS visitors, count(DISTINCT visit_id) AS visits,
        count(*) AS views, coalesce(sum(duration_ms),0) * 1.0 / nullif(count(DISTINCT visit_id),0) AS duration,
        (SELECT count(DISTINCT visitor_id) FROM visits WHERE site_id=${siteId} AND last_seen >= ${now - 5 * 60_000}) AS live,
        (SELECT count(*) FROM clicks WHERE site_id=${siteId} AND at >= ${from} AND at < ${to}) AS clicks
      FROM pageviews WHERE site_id=${siteId} AND started_at >= ${from} AND started_at < ${to}`)!;
    totals.duration ||= 0;
    const series = db.all<Report["series"][number]>(
      sql`SELECT strftime('%Y-%m-%d',started_at/1000,'unixepoch') AS date, count(DISTINCT visitor_id) AS visitors, count(*) AS views FROM pageviews WHERE site_id=${siteId} AND started_at >= ${from} AND started_at < ${to} GROUP BY date ORDER BY date`,
    );
    const paths = db.all<Report["paths"][number]>(
      sql`SELECT path, count(DISTINCT visitor_id) AS visitors, count(DISTINCT visit_id) AS visits, count(*) AS views, sum(duration_ms) * 1.0 / count(DISTINCT visit_id) AS duration FROM pageviews WHERE site_id=${siteId} AND started_at >= ${from} AND started_at < ${to} GROUP BY path ORDER BY views DESC, path LIMIT 1000`,
    );
    const referrers = db.all<Report["referrers"][number]>(
      sql`WITH scoped AS (SELECT p.visitor_id,p.visit_id,p.duration_ms,coalesce(v.referrer,'Direct / unknown') AS name FROM pageviews p JOIN visits v ON v.id=p.visit_id WHERE p.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to}) SELECT name,count(DISTINCT visitor_id) AS visitors,count(DISTINCT visit_id) AS visits,sum(duration_ms)*1.0/count(DISTINCT visit_id) AS duration FROM scoped GROUP BY name ORDER BY visits DESC LIMIT 1000`,
    );
    const locations = db.all<Report["locations"][number]>(
      sql`SELECT coalesce(v.country,'Unknown') AS country, coalesce(v.region,'Unknown') AS region, coalesce(v.city,'Unknown') AS city,count(DISTINCT p.visitor_id) AS visitors,count(DISTINCT p.visit_id) AS visits FROM pageviews p JOIN visits v ON v.id=p.visit_id WHERE p.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to} GROUP BY country,region,city ORDER BY visitors DESC LIMIT 1000`,
    );
    const outbound = db.all<Report["outbound"][number]>(
      sql`SELECT destination,kind,path,count(*) AS clicks,count(DISTINCT visitor_id) AS visitors FROM clicks WHERE site_id=${siteId} AND at >= ${from} AND at < ${to} GROUP BY destination,kind,path ORDER BY clicks DESC LIMIT 1000`,
    );
    const utm = {} as Report["utm"];
    for (const dimension of ["source", "medium", "campaign"] as const) {
      const column = sql.identifier(dimension);
      const grouped = db.all<{ name: string; raw: string; visits: number }>(sql`
        SELECT coalesce(l.name,v.${column}) AS name,json_group_array(DISTINCT v.${column}) AS raw,count(DISTINCT v.id) AS visits
        FROM visits v JOIN pageviews p ON p.visit_id=v.id
        LEFT JOIN label_values lv ON lv.site_id=v.site_id AND lv.dimension=${dimension} AND lv.value=v.${column}
        LEFT JOIN labels l ON l.id=lv.label_id
        WHERE v.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to} AND v.${column} IS NOT NULL
        GROUP BY CASE WHEN l.id IS NULL THEN 'raw:' || v.${column} ELSE 'label:' || l.id END
        ORDER BY visits DESC,name LIMIT 1000`);
      utm[dimension] = grouped.map((row) => ({
        ...row,
        raw: (JSON.parse(row.raw) as string[]).sort(),
      }));
    }
    // Exact nearest-rank percentiles inside SQLite; no large raw sample arrays in the HTTP process.
    const performance = db.all<
      Report["performance"][number]
    >(sql`WITH ranked AS (
      SELECT p.path,v.metric,v.value,row_number() OVER (PARTITION BY p.path,v.metric ORDER BY v.value) AS rn,count(*) OVER (PARTITION BY p.path,v.metric) AS n
      FROM vitals v JOIN pageviews p ON p.id=v.view_id WHERE p.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to})
      SELECT path,metric,max(n) AS samples,
        max(CASE WHEN rn=cast((n*50+99)/100 AS integer) THEN value END) AS p50,
        max(CASE WHEN rn=cast((n*75+99)/100 AS integer) THEN value END) AS p75,
        max(CASE WHEN rn=cast((n*95+99)/100 AS integer) THEN value END) AS p95
      FROM ranked GROUP BY path,metric ORDER BY path,metric LIMIT 5000`);
    return {
      totals,
      series,
      paths,
      referrers,
      locations,
      outbound,
      utm,
      performance,
    };
  }
  activity(
    siteId: string,
    from: number,
    to: number,
    before = Number.MAX_SAFE_INTEGER,
    beforeId = "",
  ): Activity[] {
    return this.db
      .all<Activity>(sql`SELECT p.visitor_id AS visitorId,min(p.started_at) AS firstSeen,max(p.checkpoint_at) AS lastSeen,count(DISTINCT p.visit_id) AS visits,count(*) AS views,sum(p.duration_ms) AS duration,
      (SELECT country FROM visits WHERE site_id=${siteId} AND visitor_id=p.visitor_id ORDER BY started_at DESC LIMIT 1) AS country,
      (SELECT city FROM visits WHERE site_id=${siteId} AND visitor_id=p.visitor_id ORDER BY started_at DESC LIMIT 1) AS city
      FROM pageviews p WHERE p.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to} GROUP BY p.visitor_id HAVING max(p.checkpoint_at) < ${before} OR (max(p.checkpoint_at) = ${before} AND p.visitor_id > ${beforeId}) ORDER BY lastSeen DESC,p.visitor_id LIMIT 100`);
  }
  timeline(
    siteId: string,
    visitorId: string,
    before = Number.MAX_SAFE_INTEGER,
  ): Timeline {
    const visits = this.db.all<Row>(
      sql`SELECT * FROM visits WHERE site_id=${siteId} AND visitor_id=${visitorId} AND started_at < ${before} ORDER BY started_at DESC,id LIMIT 50`,
    );
    const totalVisits = this.db.get<{ count: number }>(
      sql`SELECT count(*) AS count FROM visits WHERE site_id=${siteId} AND visitor_id=${visitorId}`,
    )!.count;
    if (!visits.length)
      return {
        visits: [],
        views: [],
        clicks: [],
        totalVisits,
        nextBefore: null,
      };
    const ids = sql.join(
      visits.map((v) => sql`${v.id}`),
      sql`, `,
    );
    return {
      visits,
      views: this.db.all<Row>(
        sql`SELECT * FROM pageviews WHERE visit_id IN (${ids}) ORDER BY started_at`,
      ),
      clicks: this.db.all<Row>(
        sql`SELECT * FROM clicks WHERE visit_id IN (${ids}) ORDER BY at`,
      ),
      totalVisits,
      nextBefore:
        visits.length === 50
          ? Number(visits[visits.length - 1].started_at)
          : null,
    };
  }
  exportRows(
    siteId: string,
    from: number,
    to: number,
    kind: string,
    after: string,
  ) {
    // Bounded, keyset-paginated exports avoid holding a year's events in RAM.
    if (kind === "clicks")
      return this.db.all<Row>(
        sql`SELECT * FROM clicks WHERE site_id=${siteId} AND at >= ${from} AND at < ${to} AND id > ${after} ORDER BY id LIMIT 1000`,
      );
    if (kind === "visits")
      return this.db.all<Row>(
        sql`SELECT * FROM visits WHERE site_id=${siteId} AND started_at >= ${from} AND started_at < ${to} AND id > ${after} ORDER BY id LIMIT 1000`,
      );
    if (kind === "vitals")
      return this.db.all<Row>(
        sql`SELECT p.id || ':' || v.metric AS id,p.path,p.visitor_id,p.visit_id,p.started_at,v.metric,v.value FROM vitals v JOIN pageviews p ON p.id=v.view_id WHERE p.site_id=${siteId} AND p.started_at >= ${from} AND p.started_at < ${to} AND p.id || ':' || v.metric > ${after} ORDER BY id LIMIT 1000`,
      );
    return this.db.all<Row>(
      sql`SELECT * FROM pageviews WHERE site_id=${siteId} AND started_at >= ${from} AND started_at < ${to} AND id > ${after} ORDER BY id LIMIT 1000`,
    );
  }
  prune(retentionDays: number, now = Date.now()) {
    if (!retentionDays) return;
    const cutoff = now - Math.max(366, retentionDays) * 86_400_000;
    // Delete a small batch per pass, including its child events through foreign keys.
    this.db.run(
      sql`DELETE FROM visits WHERE id IN (SELECT id FROM visits WHERE last_seen < ${cutoff} LIMIT 100)`,
    );
    this.db.run(
      sql`DELETE FROM visitors WHERE last_seen < ${cutoff} AND NOT EXISTS (SELECT 1 FROM visits WHERE visits.site_id=visitors.site_id AND visits.visitor_id=visitors.id)`,
    );
  }
}
