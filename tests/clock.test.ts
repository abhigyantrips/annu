import { test } from "node:test";
import assert from "node:assert/strict";
import { ReadingClock, IDLE_MS } from "../src/tracker/core.js";
test("visible reading is capped at fifteen minutes without interaction", () => {
  const c = new ReadingClock(0);
  assert.equal(c.tick(25_000, true), 25_000);
  assert.equal(c.tick(IDLE_MS + 60_000, true), IDLE_MS);
  assert.equal(c.tick(IDLE_MS + 120_000, true), IDLE_MS);
});
test("background time is excluded and input resumes the clock without charging idle time", () => {
  const c = new ReadingClock(0);
  c.tick(10_000, true);
  c.tick(500_000, false);
  c.interact(500_000, false);
  assert.equal(c.tick(510_000, true), 20_000);
  c.tick(2_000_000, true);
  const before = c.total;
  c.interact(3_000_000, true);
  assert.equal(c.total, before);
  assert.equal(c.tick(3_010_000, true), before + 10_000);
});
