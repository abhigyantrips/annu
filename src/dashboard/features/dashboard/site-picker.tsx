import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { Empty } from "@/components/empty";
import { Modal } from "@/components/modal";
import { SiteFavicon } from "@/components/site-favicon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logout } from "@/features/auth/session";
import { SiteSettings } from "@/features/settings/lazy-site-settings";
import { queryClient, sitesQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, LogOut, Plus } from "lucide-react";
import { useState } from "react";
export function SitePicker({ message }: { message?: string }) {
  const sites = useQuery(sitesQuery);
  const [adding, setAdding] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="site-picker">
      <header className="site-picker-header">
        <Brand />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => void logout().catch((e) => setError(e.message))}
          >
            <LogOut size={14} />
            Sign Out
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main className="site-picker-main">
        <div className="page-heading">
          <h1>Websites</h1>
          <Button onClick={() => setAdding(true)}>
            <Plus size={15} />
            Add Website
          </Button>
        </div>
        {message && (
          <p role="status" className="muted">
            {message}
          </p>
        )}
        {(error || sites.error) && (
          <div className="error-banner" role="alert">
            {error || sites.error?.message}
            <Button variant="link" onClick={() => void sites.refetch()}>
              Try Again
            </Button>
          </div>
        )}
        {sites.isPending ? (
          <div className="loading">
            <Loader2 className="spin" size={20} />
            Loading Your Websites…
          </div>
        ) : sites.data?.length ? (
          <div className="site-picker-grid">
            {sites.data.map((site) => (
              <Card
                className="site-picker-card"
                key={site.id}
                render={
                  <Link
                    to="/$siteId"
                    params={{ siteId: site.id }}
                    search={{ range: "24h" }}
                  />
                }
              >
                <SiteFavicon domain={site.domains[0]} name={site.name} />
                <div>
                  <h2>{site.name}</h2>
                  <p>{site.domains.join(", ")}</p>
                </div>
                <ChevronRight size={18} />
              </Card>
            ))}
          </div>
        ) : (
          <Card className="panel">
            <Empty
              text="Your next chapter starts here. Add a website to welcome your first visitors."
            />
          </Card>
        )}
      </main>
      {adding && (
        <Modal title="Add Website" onClose={() => setAdding(false)}>
          <SiteSettings
            newSite
            onSaved={async () => {
              await queryClient.invalidateQueries({ queryKey: ["sites"] });
              setAdding(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
