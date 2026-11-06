import { Page } from "@/features/utm/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/utm-tags")({ component: Page });
