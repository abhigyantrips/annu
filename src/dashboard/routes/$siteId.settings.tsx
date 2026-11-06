import { Page } from "@/features/settings/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/settings")({ component: Page });
