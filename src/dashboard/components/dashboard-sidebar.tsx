import type { ReactNode } from "react";
import { type Page } from "../../shared/dashboard-routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  Users,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { LocationsIcon } from "@/components/locations-icon";
const navigation = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "pages", name: "Pages", icon: FileText },
  { id: "referrers", name: "Referrers", icon: ArrowDownLeft },
  { id: "outgoing", name: "Outgoing Links", icon: ArrowUpRight },
  { id: "utm", name: "UTM Tags", icon: Tag },
  { id: "visitors", name: "Visitors", icon: Users },
  { id: "performance", name: "Performance", icon: ActivityIcon },
  { id: "locations", name: "Locations", icon: LocationsIcon },
] as const;
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

export function DashboardSidebar({
  page,
  sitePicker,
  setPage,
  onLogout,
  onHome,
}: {
  page: Page;
  sitePicker: ReactNode;
  setPage: (page: Page) => void;
  onLogout: () => void;
  onHome: () => void;
}) {
  const { setOpenMobile, isMobile } = useSidebar();
  const navigate = (next: Page) => {
    setPage(next);
    setOpenMobile(false);
  };
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="sidebar-brand">
          <Brand />
        </div>
        {isMobile && <div className="sidebar-site-picker">{sitePicker}</div>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigation.map(({ id, name, icon: Icon }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  tooltip={name}
                  aria-label={name}
                  aria-current={page === id ? "page" : undefined}
                  isActive={page === id}
                  onClick={() => navigate(id)}
                >
                  <Icon />
                  <span>{name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="All Websites"
              aria-label="All Websites"
              onClick={onHome}
            >
              <Globe2 />
              <span>All Websites</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              aria-label="Settings"
              isActive={page === "settings"}
              onClick={() => navigate("settings")}
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              aria-label="Sign Out"
              onClick={onLogout}
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
