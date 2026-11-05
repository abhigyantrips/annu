import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/server/app.js";

test("authenticated API: ingestion validation, geo trust, reports, export, and logout", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "annu-api-"));
  const app = await buildApp({
    databasePath: join(dir, "test.db"),
    adminPassword: "test-password-only",
    sessionSecret: "test-only-session-secret-with-32-characters",
    publicOrigin: "https://analytics.test",
    serveStatic: false,
  });
  t.after(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  assert.equal((await app.inject("/api/sites")).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/login",
        payload: { password: "wrong" },
      })
    ).statusCode,
    401,
  );
  const login = await app.inject({
    method: "POST",
    url: "/api/login",
    payload: { password: "test-password-only" },
  });
  assert.equal(login.statusCode, 200);
  assert.match(login.headers["set-cookie"] as string, /HttpOnly/);
  assert.match(login.headers["set-cookie"] as string, /Secure/);
  const cookie = (login.headers["set-cookie"] as string).split(";")[0];
  const create = await app.inject({
    method: "POST",
    url: "/api/sites",
    headers: { cookie, origin: "https://analytics.test" },
    payload: { name: "Blog", domains: ["blog.test"] },
  });
  assert.equal(create.statusCode, 200, create.body);
  const site = create.json();
  const blocked = await app.inject({
    method: "POST",
    url: "/api/sites",
    headers: { cookie, origin: "https://evil.test" },
    payload: { name: "Oops", domains: ["evil.test"] },
  });
  assert.equal(blocked.statusCode, 403);
  const visitorId = randomUUID(),
    viewId = randomUUID();
  const event = {
    type: "view",
    siteId: site.id,
    visitorId,
    viewId,
    url: "https://blog.test/a?private=secret",
    title: "=malicious formula",
    referrer: "https://referrer.test/private",
    utm: { campaign: "abc" },
  };
  const send = () =>
    app.inject({
      method: "POST",
      url: "/api/collect",
      headers: {
        origin: "https://blog.test",
        "content-type": "text/plain",
        "cf-ipcountry": "IN",
        "cf-ipcity": "Mumbai",
      },
      payload: JSON.stringify(event),
    });
  const collect = await send();
  assert.equal(collect.statusCode, 204);
  assert.equal(
    collect.headers["access-control-allow-origin"],
    "https://blog.test",
  );
  await send();
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/collect",
        headers: { origin: "https://wrong.test" },
        payload: event,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await app.inject({ method: "POST", url: "/api/collect", payload: event }))
      .statusCode,
    400,
  );
  const q = `from=0&to=${Date.now() + 1000}`; // API intentionally limits range length, so use a recent lower bound.
  assert.equal(
    (
      await app.inject({
        url: `/api/sites/${site.id}/report?${q}`,
        headers: { cookie },
      })
    ).statusCode,
    400,
  );
  const range = `from=${Date.now() - 60_000}&to=${Date.now() + 1000}`;
  const report = await app.inject({
    url: `/api/sites/${site.id}/report?${range}`,
    headers: { cookie },
  });
  assert.equal(report.statusCode, 200, report.body);
  assert.equal(report.json().totals.views, 1);
  assert.equal(report.json().locations[0].country, "Unknown");
  const json = await app.inject({
    url: `/api/sites/${site.id}/export?${range}&format=json`,
    headers: { cookie },
  });
  assert.equal(json.statusCode, 200, json.body);
  assert.equal(json.json().length, 1);
  assert.equal(json.json()[0].path, "/a");
  const csv = await app.inject({
    url: `/api/sites/${site.id}/export?${range}&format=csv`,
    headers: { cookie },
  });
  assert.match(csv.body, /'=malicious formula/);
  assert.ok(!csv.body.includes("private=secret"));
  const history = await app.inject({
    url: `/api/sites/${site.id}/visitors/${visitorId}`,
    headers: { cookie },
  });
  assert.equal(history.json().views.length, 1);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/logout",
        headers: { cookie },
      })
    ).statusCode,
    200,
  );
});

test("Cloudflare country, region and encoded city are used only when explicitly trusted", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "annu-geo-"));
  const app = await buildApp({
    databasePath: join(dir, "test.db"),
    adminPassword: "test-password-only",
    sessionSecret: "test-only-session-secret-with-32-characters",
    trustCloudflare: true,
    serveStatic: false,
  });
  t.after(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const login = await app.inject({
    method: "POST",
    url: "/api/login",
    payload: { password: "test-password-only" },
  });
  const cookie = (login.headers["set-cookie"] as string).split(";")[0];
  const site = (
    await app.inject({
      method: "POST",
      url: "/api/sites",
      headers: { cookie },
      payload: { name: "Blog", domains: ["blog.test"] },
    })
  ).json();
  const response = await app.inject({
    method: "POST",
    url: "/api/collect",
    headers: {
      origin: "https://blog.test",
      "cf-ipcountry": "BR",
      "cf-region-code": "SP",
      "cf-ipcity": "S%C3%A3o%20Paulo",
    },
    payload: {
      type: "view",
      siteId: site.id,
      visitorId: randomUUID(),
      viewId: randomUUID(),
      url: "https://blog.test/",
      utm: {},
    },
  });
  assert.equal(response.statusCode, 204);
  const report = (
    await app.inject({
      url: `/api/sites/${site.id}/report?from=${Date.now() - 60_000}&to=${Date.now() + 1000}`,
      headers: { cookie },
    })
  ).json();
  assert.deepEqual(report.locations[0], {
    country: "BR",
    region: "SP",
    city: "São Paulo",
    visitors: 1,
    visits: 1,
  });
});
