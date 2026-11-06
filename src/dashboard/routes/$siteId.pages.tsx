import { Page } from "@/features/pages/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/pages")({ component: Page });
