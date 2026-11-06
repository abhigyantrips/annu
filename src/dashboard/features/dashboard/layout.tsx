import { Brand } from "@/components/brand";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field";
import { SiteFavicon } from "@/components/site-favicon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { logout } from "@/features/auth/session";
import { SiteSettings } from "@/features/settings/lazy-site-settings";
import { dateRange, validateFilters, type Filters } from "@/lib/date-range";
import { queryClient, sitesQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { useState } from "react";
import {
  dashboardPath,
  parseDashboardPath,
  type Page,
} from "../../../shared/dashboard-routes";
import { DashboardContext } from "./context";
import { ExportDialog } from "./export-dialog";
import { SitePicker } from "./site-picker";
const titles: Record<Page, string> = {
  overview: "Overview",
  pages: "Pages",
  referrers: "Referrers",
  outgoing: "Outgoing Links",
  utm: "UTM Tags",
  visitors: "Visitors",
  performance: "Performance",
  locations: "Locations",
  settings: "Settings",
};
export function DashboardLayout() {
  const { siteId } = useParams({ strict: false });
  const { pathname } = useLocation();
  const { page } = parseDashboardPath(pathname);
  const navigate = useNavigate();
  const filters = validateFilters(useSearch({ strict: false }));
  const sites = useQuery(sitesQuery);
  const site = sites.data?.find((s) => s.id === siteId);
  const [live, setLive] = useState(false),
    [adding, setAdding] = useState(false),
    [exporting, setExporting] = useState(false),
    [error, setError] = useState("");
  const navigatePage = (next: Page) => {
    void navigate({ to: dashboardPath(siteId!, next), search: filters });
  };
  const setFilters = (patch: Partial<Filters>) => {
    void navigate({
      to: pathname,
      search: { ...filters, ...patch },
      replace: true,
    });
  };
  if (!site)
    return (
      <SitePicker
        message={
          sites.isPending
            ? undefined
            : "This website is unavailable. Choose another website below."
        }
      />
    );
  return (
    <DashboardContext.Provider value={{ site, filters, live, navigatePage }}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "222px",
            "--sidebar-width-icon": "56px",
          } as React.CSSProperties
        }
        className="app-shell"
        open
      >
        <DashboardSidebar
          page={page}
          setPage={navigatePage}
          onHome={() => void navigate({ to: "/" })}
          onLogout={() => void logout().catch((e) => setError(e.message))}
        />
        <div className="main-area">
          <header className="topbar">
            <div className="mobile-nav flex items-center gap-2 md:hidden">
              <SidebarTrigger />
              <Brand />
            </div>
            <div className="topbar-right">
              {page !== "settings" && (
                <Button
                  variant={live ? "secondary" : "ghost"}
                  aria-pressed={live}
                  onClick={() => setLive(!live)}
                >
                  {live ? "Live On" : "Live Off"}
                </Button>
              )}
              <SelectField
                label="Current Website"
                value={site.id}
                onValueChange={(id) =>
                  void navigate({
                    to: dashboardPath(id, page),
                    search: filters,
                  })
                }
                className="topbar-site-picker"
                options={(sites.data || []).map((s) => ({
                  value: s.id,
                  label: s.name,
                  icon: <SiteFavicon domain={s.domains[0]} name={s.name} />,
                }))}
              />
            </div>
          </header>
          <main>
            <div className="page-heading">
              <h1>{titles[page]}</h1>
              <div className="page-actions">
                {page === "settings" ? (
                  <Button onClick={() => setAdding(true)}>
                    <Plus size={15} />
                    Add Website
                  </Button>
                ) : (
                  <>
                    <div className="w-40">
                      <SelectField
                        label="Date Range"
                        value={filters.range}
                        onValueChange={(range) =>
                          setFilters({ range: range as Filters["range"] })
                        }
                        options={[
                          { value: "1", label: "Today" },
                          { value: "24h", label: "Last 24 Hours" },
                          { value: "7", label: "Last 7 Days" },
                          { value: "30", label: "Last 30 Days" },
                          { value: "90", label: "Last 90 Days" },
                          { value: "365", label: "Last 12 Months" },
                          { value: "custom", label: "Custom Range" },
                        ]}
                      />
                    </div>
                    <Button onClick={() => setExporting(true)}>
                      <Download size={15} />
                      Export
                    </Button>
                  </>
                )}
              </div>
            </div>
            {filters.range === "custom" && page !== "settings" && (
              <div className="custom-range">
                <label>
                  From (UTC)
                  <Input
                    type="date"
                    value={filters.start || ""}
                    onChange={(e) => setFilters({ start: e.target.value })}
                  />
                </label>
                <label>
                  Through (UTC)
                  <Input
                    type="date"
                    value={filters.end || ""}
                    onChange={(e) => setFilters({ end: e.target.value })}
                  />
                </label>
              </div>
            )}
            {error && (
              <div role="alert" className="error-banner">
                {error}
              </div>
            )}
            <Outlet />
          </main>
        </div>
        {adding && (
          <Modal title="Add Website" onClose={() => setAdding(false)}>
            <SiteSettings
              newSite
              onSaved={async () => {
                await queryClient.invalidateQueries({ queryKey: ["sites"] });
                setAdding(false);
              }}
            />
          </Modal>
        )}
        {exporting && (
          <ExportDialog
            siteId={site.id}
            range={dateRange(filters)}
            onClose={() => setExporting(false)}
          />
        )}
      </SidebarProvider>
    </DashboardContext.Provider>
  );
}
