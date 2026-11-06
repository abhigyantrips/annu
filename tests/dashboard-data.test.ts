import { test } from "node:test";
import assert from "node:assert/strict";
import { dateRange, validateFilters } from "../src/dashboard/lib/date-range";
import { trafficPoints } from "../src/dashboard/lib/traffic-series";
const now = Date.parse("2026-11-06T10:37:00Z");
test("Today is UTC midnight while Last 24 Hours is a rolling window; other ranges stay daily", () => {
  assert.deepEqual(dateRange({ range: "1" }, now), {
    from: Date.parse("2026-11-06T00:00:00Z"),
    to: now,
    bucket: "hour",
  });
  assert.deepEqual(dateRange({ range: "24h" }, now), {
    from: now - 86400000,
    to: now,
    bucket: "hour",
  });
  assert.equal(dateRange({ range: "7" }, now).bucket, "day");
  assert.deepEqual(
    dateRange({ range: "custom", start: "2026-10-01", end: "2026-10-02" }, now),
    {
      from: Date.parse("2026-10-01"),
      to: Date.parse("2026-10-03"),
      bucket: "day",
    },
  );
});
test("missing URL filters default to a rolling 24-hour window", () => {
  const filters = validateFilters({});
  assert.equal(filters.range, "24h");
  assert.equal(dateRange(filters, now).from, now - 86400000);
});
test("URL filters reject unknown presets and invalid calendar dates", () => {
  assert.deepEqual(
    validateFilters({ range: "bad", start: "2026-02-30", end: "bad" }),
    { range: "24h", start: undefined, end: undefined },
  );
});
test("hourly charts fill missing buckets without losing partial edge hours or confusing days", () => {
  const start = Date.parse("2026-11-05T23:37:00Z"),
    end = Date.parse("2026-11-06T02:37:00Z");
  const points = trafficPoints(
    [{ date: "2026-11-06T00:00:00Z", visitors: 2, visits: 3, views: 4 }],
    start,
    end,
    "hour",
  );
  assert.equal(points.length, 4);
  assert.equal(points[0].at, Date.parse("2026-11-05T23:00:00Z"));
  assert.deepEqual(
    points.map((p) => p.views),
    [0, 4, 0, 0],
  );
  const daily = trafficPoints(
    [{ date: "2026-11-06", visitors: 1, visits: 2, views: 3 }],
    Date.parse("2026-11-05"),
    Date.parse("2026-11-07"),
    "day",
  );
  assert.deepEqual(
    daily.map((p) => p.visits),
    [0, 2],
  );
});
