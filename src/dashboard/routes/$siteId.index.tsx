import { Page } from "@/features/overview/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/")({ component: Page });
