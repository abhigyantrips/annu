import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { ReadingClock } from "./core";

(() => {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;
  const siteId = script.dataset.siteId || script.dataset.websiteId;
  if (!siteId) return;
  const win = window as Window & {
    annu?: { version: string };
    __ANNU_TEST__?: unknown;
  };
  if (win.annu) return; // Astro persists this tracker across ClientRouter swaps.
  const domains = (script.dataset.domains || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (domains.length && !domains.includes(location.host)) return;
  const endpoint = new URL(script.dataset.hostUrl || script.src, location.href);
  endpoint.pathname = `${endpoint.pathname.replace(/\/[^/]*$/, "")}/api/collect`;
  endpoint.search = "";
  endpoint.hash = "";
  if (script.dataset.endpoint) {
    const configured = new URL(script.dataset.endpoint, script.src);
    endpoint.href = configured.href;
  }
  const heartbeat = script.dataset.heartbeat === "true";
  const performanceEnabled = script.dataset.performance !== "false";
  const linksEnabled = script.dataset.links === "true";
  const includeQuery = script.dataset.linkQuery === "true";
  const includeHash = script.dataset.linkHash === "true";
  const uuid = () => {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
  let memoryId: string | undefined;
  const disabled = () => {
    try {
      return localStorage.getItem("annu.disabled") === "true";
    } catch {
      return false;
    }
  };
  if (disabled()) return;
  const identity = () => {
    try {
      const key = `annu.visitor.${siteId}`;
      const existing = localStorage.getItem(key);
      if (
        existing &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          existing,
        )
      )
        return existing;
      const id = uuid();
      localStorage.setItem(key, id);
      return id;
    } catch {
      return (memoryId ||= uuid());
    }
  };
  let visitorId = identity(),
    viewId = "",
    lastUrl = "",
    pending = 0,
    unavailableUntil = 0;
  let ready: Promise<boolean> = Promise.resolve(false);
  let visible = document.visibilityState === "visible";
  const clock = new ReadingClock(performance.now());
  let sentDuration = 0;
  const allowed = () =>
    !disabled() && navigator.onLine !== false && Date.now() >= unavailableUntil;
  const packet = (type: string, fields: object, id = viewId) => ({
    type,
    siteId,
    visitorId,
    viewId: id,
    ...fields,
  });
  async function transmit(data: object): Promise<boolean> {
    if (!allowed() || pending >= 4) return false;
    pending++;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 1800);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(data),
        signal: controller.signal,
        mode: "cors",
      });
      // Opaque cross-origin responses cannot expose status. A completed request is sufficient.
      if (response.type !== "opaque" && !response.ok)
        throw new Error("Collection unavailable");
      return true;
    } catch {
      unavailableUntil = Date.now() + 60_000;
      return false;
    } finally {
      clearTimeout(deadline);
      pending--;
    }
  }
  function checkpoint(beacon = false) {
    const durationMs = clock.tick(performance.now(), visible);
    if (!viewId || durationMs <= sentDuration || !allowed()) return;
    sentDuration = durationMs;
    const data = packet("time", { durationMs });
    if (beacon && navigator.sendBeacon) {
      // No retry or fetch fallback: one bounded, best-effort browser-owned send.
      try {
        navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify(data)], {
            type: "text/plain;charset=UTF-8",
          }),
        );
      } catch {
        /* Dropped. */
      }
    } else {
      void ready.then((ok) => {
        if (ok) void transmit(data);
      });
    }
  }
  function page() {
    const current = location.origin + location.pathname + location.search;
    if (current === lastUrl) return;
    const initial = !viewId;
    if (viewId) checkpoint();
    visitorId = identity();
    viewId = uuid();
    lastUrl = current;
    clock.reset(performance.now());
    sentDuration = 0;
    visible = document.visibilityState === "visible";
    const search = new URLSearchParams(location.search);
    const utm = Object.fromEntries(
      ["source", "medium", "campaign"].map((key) => [
        key,
        search.get(`utm_${key}`)?.slice(0, 300) || undefined,
      ]),
    );
    ready = transmit(
      packet("view", {
        url: location.origin + location.pathname,
        title: document.title.slice(0, 500),
        referrer: (() => {
          try {
            return initial ? new URL(document.referrer).origin : "";
          } catch {
            return "";
          }
        })(),
        utm,
      }),
    );
  }
  function start() {
    if (win.annu) return;
    win.annu = { version: "0.1.0" };
    page();
    let navigationTimer: ReturnType<typeof setTimeout>;
    const navigate = () => {
      clearTimeout(navigationTimer);
      navigationTimer = setTimeout(page, 0);
    };
    for (const name of ["pushState", "replaceState"] as const) {
      const original = history[name];
      history[name] = function (...args: Parameters<History[typeof name]>) {
        const result = original.apply(this, args);
        navigate();
        return result;
      };
    }
    window.addEventListener("popstate", navigate);
    document.addEventListener("astro:page-load", navigate);
    document.addEventListener("astro:before-swap", () => checkpoint());
    document.addEventListener("visibilitychange", () => {
      clock.tick(performance.now(), visible);
      visible = document.visibilityState === "visible";
      if (!visible) checkpoint(true);
      else if (performance.now() - clock.lastActivity >= 30 * 60_000) {
        lastUrl = "";
        page();
      } else clock.interact(performance.now(), false);
    });
    window.addEventListener("pagehide", () => checkpoint(true));
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        lastUrl = "";
        page();
      }
    });
    let lastInput = 0;
    const activity = () => {
      const now = performance.now();
      if (now - lastInput < 1000) return;
      lastInput = now;
      if (now - clock.lastActivity >= 30 * 60_000) {
        lastUrl = "";
        page();
      }
      clock.interact(now, visible);
    };
    for (const name of ["pointerdown", "keydown", "scroll", "touchstart"])
      window.addEventListener(name, activity, { passive: true });
    if (heartbeat)
      setInterval(() => {
        clock.tick(performance.now(), visible);
        if (visible) checkpoint();
      }, 25_000);
    document.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        !(event.target instanceof Element) ||
        disabled()
      )
        return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.dataset.annuLink === "false" ||
        !(
          linksEnabled ||
          anchor.hasAttribute("data-annu-link") ||
          anchor.hasAttribute("data-links")
        )
      )
        return;
      try {
        const url = new URL(anchor.href, location.href);
        const kind =
          url.protocol === "mailto:"
            ? "mailto"
            : anchor.hasAttribute("download")
              ? "download"
              : "link";
        if (
          kind === "link" &&
          (!["http:", "https:"].includes(url.protocol) ||
            url.origin === location.origin)
        )
          return;
        if (kind === "download" && !["http:", "https:"].includes(url.protocol))
          return;
        if (!includeQuery) url.search = "";
        if (!includeHash) url.hash = "";
        // Never preventDefault, await delivery, or change the link's destination.
        const data = packet("click", {
          eventId: uuid(),
          destination: url.href,
          kind,
          includeQuery,
          includeHash,
        });
        if (allowed()) {
          try {
            navigator.sendBeacon(
              endpoint,
              new Blob([JSON.stringify(data)], {
                type: "text/plain;charset=UTF-8",
              }),
            );
          } catch {
            /* Dropped. */
          }
        }
      } catch {
        /* Unsupported href. */
      }
    });
    if (performanceEnabled) {
      // Standard Web Vitals describe a document load, not arbitrary SPA route paints.
      let documentView = viewId,
        documentVisitor = visitorId,
        documentReady = ready;
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
          documentView = viewId;
          documentVisitor = visitorId;
          documentReady = ready;
        }
      });
      const record = (metric: Metric) => {
        const data = {
          ...packet(
            "vital",
            { metric: metric.name, value: metric.value },
            documentView,
          ),
          visitorId: documentVisitor,
        };
        if (document.visibilityState === "hidden" && allowed()) {
          try {
            navigator.sendBeacon(
              endpoint,
              new Blob([JSON.stringify(data)], {
                type: "text/plain;charset=UTF-8",
              }),
            );
          } catch {
            /* Dropped. */
          }
        } else
          void documentReady.then((ok) => {
            if (ok) void transmit(data);
          });
      };
      try {
        onLCP(record);
        onINP(record);
        onCLS(record);
        onFCP(record);
        onTTFB(record);
      } catch {
        /* Unsupported browser. */
      }
    }
  }
  // Collection begins after load; the recommended loader also downloads this script after load.
  if (document.readyState === "complete") setTimeout(start, 0);
  else
    window.addEventListener("load", () => setTimeout(start, 0), { once: true });
})();
