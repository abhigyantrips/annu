import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { AnalyticsDatabase } from "../src/server/database.js";
import { buildApp } from "../src/server/app.js";
const dir = mkdtempSync(join(tmpdir(), "annu-benchmark-")),
  path = join(dir, "bench.db");
const seed = new AnalyticsDatabase(path),
  site = seed.saveSite({ name: "Benchmark", domains: ["benchmark.test"] });
seed.close();
const app = await buildApp({
  databasePath: path,
  adminPassword: "benchmark-only-password",
  sessionSecret: "benchmark-only-session-key-with-32-characters",
  serveStatic: false,
});
const samples: number[] = [];
let failed = 0;
try {
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string")
    throw new Error("No benchmark address");
  const url = `http://127.0.0.1:${address.port}`;
  const login = await fetch(`${url}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "benchmark-only-password" }),
  });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  const count = Number(process.env.BENCH_EVENTS || 1000),
    concurrency = Number(process.env.BENCH_CONCURRENCY || 10);
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 100000 ||
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 100
  )
    throw new Error("Use 1–100000 events and 1–100 concurrent senders");
  const visitorIds = Array.from({ length: 100 }, () => randomUUID());
  let next = 0;
  const start = performance.now();
  const reportStart = Date.now();
  let reportActive = true,
    reportRequests = 0;
  const reportLoop = (async () => {
    while (reportActive) {
      const response = await fetch(
        `${url}/api/sites/${site.id}/report?from=${reportStart - 60000}&to=${Date.now() + 1}`,
        { headers: { cookie } },
      );
      await response.arrayBuffer();
      reportRequests++;
      await new Promise((r) => setTimeout(r, 50));
    }
  })();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        const index = next++;
        const at = performance.now();
        const response = await fetch(`${url}/api/send`, {
          method: "POST",
          headers: {
            origin: "https://benchmark.test",
            "content-type": "text/plain",
          },
          body: JSON.stringify({
            type: "view",
            siteId: site.id,
            visitorId: visitorIds[index % visitorIds.length],
            viewId: randomUUID(),
            url: `https://benchmark.test/post-${index % 20}`,
            title: "Benchmark",
            utm: {},
          }),
        });
        await response.arrayBuffer();
        if (response.status !== 204) failed++;
        samples.push(performance.now() - at);
      }
    }),
  );
  const elapsed = performance.now() - start;
  reportActive = false;
  await reportLoop;
  samples.sort((a, b) => a - b);
  const percentile = (p: number) =>
    Number(samples[Math.ceil(samples.length * p) - 1].toFixed(2));
  console.log(
    JSON.stringify(
      {
        note: "Local HTTP test with durable SQLite FULL commits and simultaneous report reads. Not a Raspberry Pi guarantee.",
        events: count,
        concurrency,
        failed,
        throughputPerSecond: Number((count / (elapsed / 1000)).toFixed(1)),
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        reportRequests,
        rssMiB: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(1)),
      },
      null,
      2,
    ),
  );
  if (failed) process.exitCode = 1;
} finally {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
}
