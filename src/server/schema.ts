import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domains: text("domains", { mode: "json" }).$type<string[]>().notNull(),
  createdAt: integer("created_at").notNull(),
});
export const visitors = sqliteTable(
  "visitors",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    firstSeen: integer("first_seen").notNull(),
    lastSeen: integer("last_seen").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.siteId, t.id] }),
    index("visitors_last_seen").on(t.siteId, t.lastSeen),
  ],
);
export const visits = sqliteTable(
  "visits",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    startedAt: integer("started_at").notNull(),
    lastSeen: integer("last_seen").notNull(),
    referrer: text("referrer"),
    country: text("country"),
    region: text("region"),
    city: text("city"),
    source: text("source"),
    medium: text("medium"),
    campaign: text("campaign"),
    browser: text("browser"),
    os: text("os"),
    device: text("device"),
  },
  (t) => [
    index("visits_identity").on(t.siteId, t.visitorId, t.lastSeen),
    index("visits_started").on(t.siteId, t.startedAt),
  ],
);
export const pageviews = sqliteTable(
  "pageviews",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    path: text("path").notNull(),
    title: text("title").notNull(),
    startedAt: integer("started_at").notNull(),
    durationMs: integer("duration_ms").notNull().default(0),
    checkpointAt: integer("checkpoint_at").notNull(),
  },
  (t) => [
    index("pageviews_site_time").on(t.siteId, t.startedAt),
    index("pageviews_visit_path").on(t.visitId, t.path),
    index("pageviews_visitor").on(t.siteId, t.visitorId, t.startedAt),
  ],
);
export const clicks = sqliteTable(
  "clicks",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    viewId: text("view_id")
      .notNull()
      .references(() => pageviews.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    path: text("path").notNull(),
    destination: text("destination").notNull(),
    kind: text("kind").notNull(),
    at: integer("at").notNull(),
  },
  (t) => [
    index("clicks_site_time").on(t.siteId, t.at),
    index("clicks_view").on(t.viewId),
  ],
);
export const vitals = sqliteTable(
  "vitals",
  {
    viewId: text("view_id")
      .notNull()
      .references(() => pageviews.id, { onDelete: "cascade" }),
    metric: text("metric").notNull(),
    value: real("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.viewId, t.metric] })],
);
export const labels = sqliteTable(
  "labels",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("labels_name").on(t.siteId, t.dimension, t.name)],
);
export const labelValues = sqliteTable(
  "label_values",
  {
    siteId: text("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    dimension: text("dimension").notNull(),
    value: text("value").notNull(),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.siteId, t.dimension, t.value] })],
);
