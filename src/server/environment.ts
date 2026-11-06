import Bowser from "bowser";
import type { Environment } from "../shared/types.js";

/** Store broad categories only; never persist the raw User-Agent or its versions. */
export function detectEnvironment(userAgent = ""): Environment {
  if (!userAgent.trim()) return { browser: null, os: null, device: null };
  const parsed = Bowser.parse(userAgent.slice(0, 2048));
  const devices: Record<string, string> = {
    desktop: "Desktop",
    mobile: "Mobile",
    tablet: "Tablet",
    tv: "TV",
  };
  return {
    browser: parsed.browser.name || null,
    os: parsed.os.name || null,
    device: devices[parsed.platform.type || ""] || null,
  };
}
