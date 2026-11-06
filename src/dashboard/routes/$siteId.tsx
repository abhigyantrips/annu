import { DashboardLayout } from "@/features/dashboard/layout";
import { validateFilters } from "@/lib/date-range";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId")({
  validateSearch: validateFilters,
  component: DashboardLayout,
});
