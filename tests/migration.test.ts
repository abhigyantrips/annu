import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { AnalyticsDatabase } from "../src/server/database";

test("environment migration preserves existing visits and is safe to reopen", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "annu-migration-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const legacy = join(dir, "legacy");
  mkdirSync(join(legacy, "meta"), { recursive: true });
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  journal.entries = journal.entries.slice(0, 2);
  writeFileSync(join(legacy, "meta/_journal.json"), JSON.stringify(journal));
  for (const entry of journal.entries)
    copyFileSync(`drizzle/${entry.tag}.sql`, join(legacy, `${entry.tag}.sql`));
  const path = join(dir, "analytics.db"),
    sql = new Database(path);
  migrate(drizzle(sql), { migrationsFolder: legacy });
  const site = randomUUID(),
    visitor = randomUUID(),
    visit = randomUUID(),
    view = randomUUID(),
    at = Date.now();
  sql
    .prepare("INSERT INTO sites(id,name,domains,created_at) VALUES(?,?,?,?)")
    .run(site, "Legacy", '["legacy.test"]', at);
  sql
    .prepare(
      "INSERT INTO visits(id,site_id,visitor_id,started_at,last_seen,country,region,city) VALUES(?,?,?,?,?,?,?,?)",
    )
    .run(visit, site, visitor, at, at, "IN", "MH", "Mumbai");
  sql
    .prepare(
      "INSERT INTO pageviews(id,site_id,visit_id,visitor_id,path,title,started_at,duration_ms,checkpoint_at) VALUES(?,?,?,?,?,?,?,?,?)",
    )
    .run(view, site, visit, visitor, "/", "Legacy", at, 0, at);
  sql.close();
  let db = new AnalyticsDatabase(path);
  try {
    assert.equal(db.report(site, at, at + 1).totals.views, 1);
    assert.deepEqual(db.audience(site, at, at + 1, "browser"), {
      rows: [],
      visitors: 1,
    });
    assert.equal(db.audience(site, at, at + 1, "city").rows[0].name, "Mumbai");
  } finally {
    db.close();
  }
  db = new AnalyticsDatabase(path);
  try {
    assert.equal(db.report(site, at, at + 1).totals.visits, 1);
  } finally {
    db.close();
  }
});
