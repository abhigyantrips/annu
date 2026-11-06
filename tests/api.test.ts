import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/server/app.js";

const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

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
  const hourlyReport = await app.inject({
    url: `/api/sites/${site.id}/report?from=0&to=3600000&bucket=hour`,
    headers: { cookie },
  });
  assert.equal(hourlyReport.statusCode, 200);
  assert.deepEqual(hourlyReport.json().series, []);
  assert.equal((await app.inject({
    url: `/api/sites/${site.id}/report?from=0&to=3600000&bucket=minute`,
    headers: { cookie },
  })).statusCode, 400);

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
      url: "/api/send",
      headers: {
        "user-agent": browserUserAgent,
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
        url: "/api/send",
        headers: { origin: "https://wrong.test", "user-agent": browserUserAgent },
        payload: event,
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await app.inject({ method: "POST", url: "/api/send", payload: event }))
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
  const audienceUrl = `/api/sites/${site.id}/audience?${range}`;
  assert.equal((await app.inject(`${audienceUrl}&dimension=browser`)).statusCode, 401);
  const audience = await app.inject({url:`${audienceUrl}&dimension=browser`, headers:{cookie}});
  assert.equal(audience.statusCode,200,audience.body);
  assert.deepEqual(audience.json(),{visitors:1,rows:[{name:"Chrome",country:null,region:null,visitors:1}]});
  assert.equal((await app.inject({url:`${audienceUrl}&dimension=invalid`,headers:{cookie}})).statusCode,400);
  assert.equal((await app.inject({url:audienceUrl,headers:{cookie}})).statusCode,400);

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
    url: "/api/send",
    headers: {
      origin: "https://blog.test",
      "user-agent": browserUserAgent,
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

test("login rate limits password attempts to five per minute", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "annu-login-rate-"));
  const app = await buildApp({
    databasePath: join(dir, "test.db"),
    adminPassword: "test-password-only",
    sessionSecret: "test-only-session-secret-with-32-characters",
    serveStatic: false,
  });
  t.after(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await app.inject({ method: "POST", url: "/api/login", payload: { password: "wrong" } });
    assert.equal(response.statusCode, 401);
  }
  const limited = await app.inject({ method: "POST", url: "/api/login", payload: { password: "wrong" } });
  assert.equal(limited.statusCode, 429);
  assert.ok(limited.headers["retry-after"]);
});

for (const disableBotCheck of [false, true]) {
  test(`bot filtering excludes all event types (disabled=${disableBotCheck})`, async (t) => {
    const dir = mkdtempSync(join(tmpdir(), "annu-bots-"));
    const app = await buildApp({
      databasePath: join(dir, "test.db"),
      adminPassword: "test-password-only",
      sessionSecret: "test-only-session-secret-with-32-characters",
      ...(disableBotCheck ? { disableBotCheck: true } : {}),
      serveStatic: false,
    });
    t.after(async () => {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    });
    const login = await app.inject({ method: "POST", url: "/api/login", payload: { password: "test-password-only" } });
    const cookie = (login.headers["set-cookie"] as string).split(";")[0];
    const site = (await app.inject({ method: "POST", url: "/api/sites", headers: { cookie }, payload: { name: "Blog", domains: ["blog.test"] } })).json();
    const send = (payload: object, userAgent?: string) => app.inject({
      method: "POST", url: "/api/send",
      headers: { origin: "https://blog.test", "content-type": "text/plain", "user-agent": userAgent ?? "" },
      payload: JSON.stringify(payload),
    });
    const browser = browserUserAgent;
    const base = { siteId: site.id, visitorId: randomUUID(), viewId: randomUUID() };
    // Seed a human view so bot follow-up events would otherwise update real data.
    assert.equal((await send({ ...base, type: "view", url: "https://blog.test/" }, browser)).statusCode, 204);
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "curl/8.7.1",
      "Mozilla/5.0 AppleWebKit/537.36 HeadlessChrome/130.0.0.0 Safari/537.36",
    ];
    for (const userAgent of bots) {
      const response = await send({ ...base, visitorId: randomUUID(), viewId: randomUUID(), type: "view", url: "https://blog.test/bot" }, userAgent);
      assert.equal(response.statusCode, 204);
      assert.equal(response.body, "");
      assert.equal(response.headers["access-control-allow-origin"], "https://blog.test");
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
    for (const event of [
      { ...base, type: "time", durationMs: 10 },
      { ...base, type: "click", eventId: randomUUID(), destination: "https://other.test/", kind: "link" },
      { ...base, type: "vital", metric: "LCP", value: 100 },
    ]) assert.equal((await send(event, bots[0])).statusCode, 204);
    // A missing UA is accepted, matching Umami/isbot's behavior.
    assert.equal((await send({ ...base, visitorId: randomUUID(), viewId: randomUUID(), type: "view", url: "https://blog.test/no-ua" })).statusCode, 204);
    const report = (await app.inject({ url: `/api/sites/${site.id}/report?from=${Date.now() - 60_000}&to=${Date.now() + 1000}`, headers: { cookie } })).json();
    assert.equal(report.totals.views, disableBotCheck ? 6 : 2);
    assert.equal(report.totals.visitors, disableBotCheck ? 6 : 2);
    assert.equal(report.totals.duration, disableBotCheck ? 10 / 6 : 0);
    assert.equal(report.totals.clicks, disableBotCheck ? 1 : 0);
    assert.equal(report.performance.length, disableBotCheck ? 1 : 0);
  });
}
