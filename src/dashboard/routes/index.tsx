import { SitePicker } from "@/features/dashboard/site-picker";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: SitePicker });
