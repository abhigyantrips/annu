import { Page } from "@/features/outgoing/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/outgoing-links")({
  component: Page,
});
