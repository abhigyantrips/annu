import { Page } from "@/features/performance/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/performance")({
  component: Page,
});
