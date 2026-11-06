import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEnvironment } from "../src/server/environment";
test("environment categorizes desktop, mobile, and tablet User-Agents without storing versions", () => {
  assert.deepEqual(
    detectEnvironment(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    ),
    { browser: "Chrome", os: "Windows", device: "Desktop" },
  );
  assert.deepEqual(
    detectEnvironment(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    ),
    { browser: "Safari", os: "iOS", device: "Mobile" },
  );
  assert.deepEqual(
    detectEnvironment(
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    ),
    { browser: "Safari", os: "iOS", device: "Tablet" },
  );
  assert.deepEqual(detectEnvironment(), {
    browser: null,
    os: null,
    device: null,
  });
  assert.deepEqual(detectEnvironment("unrecognized"), {
    browser: null,
    os: null,
    device: null,
  });
});
