import { AppWindow, Globe2, Monitor, Smartphone, Tablet, Tv } from "lucide-react";
import type { AudienceDimension } from "../../shared/types";

const assets = import.meta.glob<string>("../assets/environment/*.svg", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});
const logos = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => [path.split("/").pop()!.replace(".svg", ""), url]),
);
const browsers: Record<string, string> = {
  chrome: "chrome",
  "chrome mobile": "chrome",
  chromium: "chrome",
  firefox: "firefox",
  "firefox for ios": "firefox",
  safari: "safari",
  "mobile safari": "safari",
  "microsoft edge": "edge",
  edge: "edge",
  opera: "opera",
  "opera mobile": "opera",
  brave: "brave",
  "samsung internet for android": "samsung-internet",
  "samsung internet": "samsung-internet",
};
const systems: Record<string, string> = {
  windows: "windows",
  "windows phone": "windows",
  macos: "apple",
  "mac os": "apple",
  "os x": "apple",
  ios: "apple",
  ipados: "apple",
  android: "android",
  linux: "linux",
  ubuntu: "linux",
  "chrome os": "chrome",
  "chromium os": "chrome",
};
export function EnvironmentIcon({ name, dimension }: { name: string; dimension: AudienceDimension }) {
  const key = name.trim().toLowerCase();
  const logo = dimension === "browser" ? browsers[key] : dimension === "os" ? systems[key] : undefined;
  if (logo && logos[logo]) {
    return <img src={logos[logo]} width={20} height={20} alt="" loading="lazy" className="shrink-0 object-contain" />;
  }
  const Icon = dimension === "device"
    ? ({ mobile: Smartphone, tablet: Tablet, desktop: Monitor, tv: Tv }[key] || AppWindow)
    : dimension === "browser" ? Globe2 : Monitor;
  return <Icon size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />;
}
