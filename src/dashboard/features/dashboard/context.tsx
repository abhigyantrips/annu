import type { Filters } from "@/lib/date-range";
import { createContext, useContext } from "react";
import type { Page } from "../../../shared/dashboard-routes";
import type { Site } from "../../../shared/types";
export type DashboardContext = {
  site: Site;
  filters: Filters;
  live: boolean;
  navigatePage: (page: Page) => void;
};
export const DashboardContext = createContext<DashboardContext | null>(null);
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("Dashboard layout required");
  return context;
}
