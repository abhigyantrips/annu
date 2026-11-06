import { Session } from "@/features/auth/session";
import { SitePicker } from "@/features/dashboard/site-picker";
import { createRootRoute } from "@tanstack/react-router";
export const Route = createRootRoute({
  component: Session,
  notFoundComponent: () => (
    <SitePicker message="This page could not be found. Choose a website below." />
  ),
});
