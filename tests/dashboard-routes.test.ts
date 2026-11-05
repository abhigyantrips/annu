import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboardPages, dashboardPath, parseDashboardPath } from "../src/shared/dashboard-routes.js";
const siteId = "4c916983-dfc5-42e7-9dc7-d408aeb2041a";

test("root is the site picker and never selects a website implicitly", () => {
  assert.deepEqual(parseDashboardPath("/"), { siteId: "", page: "overview", valid: true });
  assert.equal(dashboardPath(""), "/");
});
test("every dashboard page has a round-trippable site-scoped URL", () => {
  for (const page of Object.keys(dashboardPages) as (keyof typeof dashboardPages)[]) {
    const path = dashboardPath(siteId, page);
    assert.deepEqual(parseDashboardPath(path), { siteId, page, valid: true });
    assert.deepEqual(parseDashboardPath(path + "/"), { siteId, page, valid: true });
  }
  assert.equal(dashboardPath(siteId), `/${siteId}`);
  assert.equal(dashboardPath(siteId, "outgoing"), `/${siteId}/outgoing-links`);
  assert.equal(dashboardPath(siteId, "utm"), `/${siteId}/utm-tags`);
});
test("invalid paths do not resolve to an analytics dashboard or SPA fallback", () => {
  for (const path of ["/pages", "/not-a-site", `/${siteId}/missing`, `/${siteId}/pages/extra`, "/api/missing", "/assets/missing.js", "/script.js", `//${siteId}`]) {
    assert.equal(parseDashboardPath(path).valid, false, path);
  }
});
