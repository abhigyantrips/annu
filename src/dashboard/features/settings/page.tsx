import { useDashboard } from "@/features/dashboard/context";
import { queryClient } from "@/lib/queries";
import { SiteSettings } from "./site-settings";
export function Page() {
  const { site } = useDashboard();
  return (
    <SiteSettings
      key={site.id}
      site={site}
      onSaved={async () => {
        await queryClient.invalidateQueries({ queryKey: ["sites"] });
        await queryClient.invalidateQueries({
          queryKey: ["analytics", site.id],
        });
      }}
    />
  );
}
