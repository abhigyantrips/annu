export const dashboardPages = {
  overview: "",
  pages: "pages",
  referrers: "referrers",
  outgoing: "outgoing-links",
  utm: "utm-tags",
  visitors: "visitors",
  performance: "performance",
  locations: "locations",
  settings: "settings",
} as const;
export type Page = keyof typeof dashboardPages;
export type DashboardRoute = { siteId: string; page: Page; valid: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDashboardPath(pathname: string): DashboardRoute {
  if (pathname === "/") return { siteId: "", page: "overview", valid: true };
  const match = /^\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname);
  const page = Object.entries(dashboardPages).find(([, slug]) => slug === (match?.[2] ?? ""))?.[0] as Page | undefined;
  if (!match || !uuid.test(match[1]) || !page) return { siteId: "", page: "overview", valid: false };
  return { siteId: match[1], page, valid: true };
}

export function dashboardPath(siteId: string, page: Page = "overview") {
  return siteId ? `/${siteId}${dashboardPages[page] ? `/${dashboardPages[page]}` : ""}` : "/";
}
