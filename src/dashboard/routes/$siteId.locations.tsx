import { Page } from "@/features/locations/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/locations")({ component: Page });
