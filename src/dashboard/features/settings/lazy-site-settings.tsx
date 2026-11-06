import { lazy, Suspense, type ComponentProps } from "react";
const Settings = lazy(() =>
  import("./site-settings").then((module) => ({
    default: module.SiteSettings,
  })),
);
export function SiteSettings(props: ComponentProps<typeof Settings>) {
  return (
    <Suspense
      fallback={<div className="loading">Loading Website Settings…</div>}
    >
      <Settings {...props} />
    </Suspense>
  );
}
