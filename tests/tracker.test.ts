import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { buildSync } from "esbuild";

const code = buildSync({
  entryPoints: ["src/tracker/index.ts"],
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
}).outputFiles[0].text;
class Events {
  listeners = new Map<string, ((event: any) => void)[]>();
  addEventListener(name: string, fn: (event: any) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) || []), fn]);
  }
  dispatch(name: string, fields: Record<string, unknown> = {}) {
    const event = { defaultPrevented: false, ...fields };
    for (const fn of this.listeners.get(name) || []) fn(event);
    return event;
  }
}
function browser(
  options: {
    heartbeat?: boolean;
    links?: boolean;
    disabled?: boolean;
    fail?: boolean;
    storage?: Map<string, string>;
  } = {},
) {
  let now = 0,
    seq = 0,
    url = new URL("https://blog.test/first?utm_campaign=abc"),
    failed = options.fail;
  const timers = new Map<
    number,
    { at: number; fn: () => void; interval?: number }
  >();
  const schedule = (fn: () => void, ms = 0, interval?: number) => {
    const id = ++seq;
    timers.set(id, { at: now + ms, fn, interval });
    return id;
  };
  const advance = (ms: number) => {
    const until = now + ms;
    let n = 0;
    while (true) {
      const next = [...timers]
        .filter(([, v]) => v.at <= until)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      if (++n > 10000) throw new Error("Timer loop");
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
      if (next[1].interval)
        timers.set(next[0], { ...next[1], at: now + next[1].interval });
    }
    now = until;
  };
  const storage = options.storage || new Map<string, string>();
  if (options.disabled) storage.set("annu.disabled", "true");
  class Element {
    closest() {
      return this;
    }
  }
  class Anchor extends Element {
    href: string;
    dataset: Record<string, string> = {};
    attrs = new Set<string>();
    constructor(href: string, attrs: string[] = []) {
      super();
      this.href = href;
      this.attrs = new Set(attrs);
    }
    hasAttribute(name: string) {
      return this.attrs.has(name);
    }
  }
  const document = Object.assign(new Events(), {
    currentScript: {
      dataset: {
        siteId: "b4c74bc7-1d87-455c-b9a7-47b01c5e3b27",
        performance: "false",
        heartbeat: String(!!options.heartbeat),
        links: String(!!options.links),
      },
      src: "https://analytics.test/script.js",
    },
    referrer: "https://friend.test/article",
    title: "First essay",
    readyState: "complete",
    visibilityState: "visible",
  });
  const window = Object.assign(new Events(), {} as { annu?: unknown });
  const sent: { data: any; options: any }[] = [],
    beacons: { url: unknown; blob: Blob }[] = [];
  const navigator = {
    onLine: true,
    sendBeacon: (address: unknown, blob: Blob) => {
      beacons.push({ url: address, blob });
      return true;
    },
  };
  const history = {
    pushState(_data: unknown, _unused: string, value: string) {
      url = new URL(value, url);
    },
    replaceState(_data: unknown, _unused: string, value: string) {
      url = new URL(value, url);
    },
  };
  const context = {
    window,
    document,
    navigator,
    history,
    Element,
    URL,
    URLSearchParams,
    Blob,
    crypto: webcrypto,
    AbortController,
    Date: class extends Date {
      static now() {
        return 1_800_000_000_000 + now;
      }
    },
    performance: { now: () => now },
    localStorage: {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
    },
    setTimeout: (fn: () => void, ms: number) => schedule(fn, ms),
    clearTimeout: (id: number) => timers.delete(id),
    setInterval: (fn: () => void, ms: number) => schedule(fn, ms, ms),
    fetch: async (_url: unknown, opts: any) => {
      sent.push({ data: JSON.parse(opts.body), options: opts });
      if (failed) throw new Error("Offline");
      return { ok: true, type: "basic" };
    },
  };
  Object.defineProperty(context, "location", { get: () => url });
  runInNewContext(code, context);
  advance(0);
  const settle = async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  };
  return {
    sent,
    beacons,
    storage,
    document,
    window,
    history,
    navigator,
    Anchor,
    advance,
    settle,
    setFail: (v: boolean) => {
      failed = v;
    },
  };
}
test("tracker persists a UUID, strips page queries, and preserves only selected UTM values", async () => {
  const b = browser();
  await b.settle();
  assert.equal(b.sent.length, 1);
  assert.equal(b.sent[0].data.url, "https://blog.test/first");
  assert.equal(b.sent[0].data.utm.campaign, "abc");
  assert.equal(b.sent[0].data.referrer, "https://friend.test");
  const id = b.sent[0].data.visitorId;
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(b.sent[0].options.credentials, "omit");
  assert.ok(!b.sent[0].options.keepalive);
  const second = browser({ storage: b.storage });
  await second.settle();
  assert.equal(second.sent[0].data.visitorId, id);
});
test("history and Astro lifecycle signals deduplicate a single SPA navigation", async () => {
  const b = browser();
  await b.settle();
  b.history.pushState({}, "", "/second");
  b.document.dispatch("astro:page-load");
  b.advance(0);
  await b.settle();
  assert.equal(b.sent.filter((p) => p.data.type === "view").length, 2);
  assert.equal(
    b.sent.filter((p) => p.data.type === "view")[1].data.url,
    "https://blog.test/second",
  );
  assert.equal(
    b.sent.filter((p) => p.data.type === "view")[1].data.referrer,
    "",
  );
  b.history.replaceState({}, "", "/second#section");
  b.advance(0);
  await b.settle();
  assert.equal(b.sent.filter((p) => p.data.type === "view").length, 2);
});
test("heartbeats are opt-in, hidden time is excluded, and idle tabs stop sending", async () => {
  const off = browser();
  await off.settle();
  off.advance(50_000);
  await off.settle();
  assert.equal(off.sent.length, 1);
  const b = browser({ heartbeat: true });
  await b.settle();
  b.advance(25_000);
  await b.settle();
  assert.equal(b.sent.at(-1)!.data.durationMs, 25_000);
  b.document.visibilityState = "hidden";
  b.document.dispatch("visibilitychange");
  b.advance(100_000);
  await b.settle();
  assert.equal(b.sent.filter((p) => p.data.type === "time").length, 1);
  b.document.visibilityState = "visible";
  b.document.dispatch("visibilitychange");
  b.advance(25_000);
  await b.settle();
  assert.equal(b.sent.at(-1)!.data.durationMs, 50_000);
  for (let i = 0; i < 48; i++) {
    b.advance(25_000);
    await b.settle();
  }
  assert.equal(b.sent.at(-1)!.data.durationMs, 925_000);
  const count = b.sent.length;
  b.advance(60_000);
  await b.settle();
  assert.equal(b.sent.length, count);
});
test("outgoing tracking requires explicit opt-in and never prevents normal navigation", async () => {
  const b = browser();
  await b.settle();
  const unmarked = new b.Anchor("https://friend.test/read?secret=yes#part");
  b.document.dispatch("click", { target: unmarked });
  assert.equal(b.beacons.length, 0);
  const marked = new b.Anchor("https://friend.test/read?secret=yes#part", [
    "data-annu-link",
  ]);
  let cancelled = false;
  b.document.dispatch("click", {
    target: marked,
    preventDefault: () => {
      cancelled = true;
    },
  });
  assert.equal(cancelled, false);
  assert.equal(b.beacons.length, 1);
  const data = JSON.parse(await b.beacons[0].blob.text());
  assert.equal(data.destination, "https://friend.test/read");
  assert.equal(data.kind, "link");
  b.document.dispatch("click", {
    target: new b.Anchor("mailto:hello@friend.test?subject=Hi", ["data-links"]),
  });
  assert.equal(JSON.parse(await b.beacons[1].blob.text()).kind, "mailto");
  b.document.dispatch("click", {
    target: new b.Anchor("https://blog.test/file.pdf", [
      "data-annu-link",
      "download",
    ]),
  });
  assert.equal(JSON.parse(await b.beacons[2].blob.text()).kind, "download");
});
test("owner exclusion sends nothing and creates no identifier; outages never queue or retry", async () => {
  const excluded = browser({ disabled: true });
  await excluded.settle();
  assert.equal(excluded.sent.length, 0);
  assert.equal(excluded.storage.size, 1);
  const b = browser({ heartbeat: true, fail: true });
  await b.settle();
  assert.equal(b.sent.length, 1);
  b.advance(5 * 60_000);
  await b.settle();
  assert.equal(b.sent.length, 1);
  b.setFail(false);
  b.history.pushState({}, "", "/new-page");
  b.advance(0);
  await b.settle();
  assert.equal(b.sent.length, 2);
  assert.equal(b.sent[1].data.type, "view");
});
