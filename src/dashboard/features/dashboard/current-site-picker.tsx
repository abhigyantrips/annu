import { SelectField } from "@/components/select-field";
import { SiteFavicon } from "@/components/site-favicon";
import { useSidebar } from "@/components/ui/sidebar";
import { useDashboard } from "@/features/dashboard/context";
import { sitesQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { dashboardPath, parseDashboardPath } from "../../../shared/dashboard-routes";

export function CurrentSitePicker({ placement }: { placement: "sidebar" | "topbar" }) {
  const { site, filters } = useDashboard();
  const { isMobile, setOpenMobile } = useSidebar();
  const sites = useQuery(sitesQuery);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if ((placement === "sidebar") !== isMobile) return null;
  const { page } = parseDashboardPath(pathname);
  return (
    <SelectField
      label="Current Website"
      value={site.id}
      className="current-site-picker"
      onValueChange={(id) => {
        void navigate({ to: dashboardPath(id, page), search: filters });
        if (isMobile) setOpenMobile(false);
      }}
      options={(sites.data || []).map((s) => ({
        value: s.id,
        label: s.name,
        icon: (
          <span className="site-picker-favicon">
            <SiteFavicon domain={s.domains[0]} name={s.name} />
          </span>
        ),
      }))}
    />
  );
}
