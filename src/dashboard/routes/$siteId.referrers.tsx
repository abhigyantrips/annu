import { Page } from "@/features/referrers/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/referrers")({ component: Page });
