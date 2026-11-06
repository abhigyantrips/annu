import { Page } from "@/features/visitors/page";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/$siteId/visitors")({ component: Page });
