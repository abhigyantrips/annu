import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { Empty } from "@/components/empty";
import { Modal } from "@/components/modal";
import { SiteFavicon } from "@/components/site-favicon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logout } from "@/features/auth/session";
import { SiteSettings } from "@/features/settings/lazy-site-settings";
import { queryClient, reportQuery, sitesQuery } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Loader2, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import type { Site } from "../../../shared/types";
import { fmt } from "@/lib/format";
import { trafficPoints } from "@/lib/traffic-series";

function SiteRow({ site }: { site: Site }) {
  const analytics = useQuery(reportQuery(site.id, { range: "24h" }));
  const data = analytics.data;
  const points = data ? trafficPoints(data.report.series, data.from, data.to, data.bucket) : [];
  const peak = Math.max(1, ...points.map((point) => point.views));
  const line = points.map((point, index) => `${2 + index * 136 / Math.max(1, points.length - 1)},${34 - point.views / peak * 30}`).join(" ");
  const metric = (value?: number) => value === undefined ? "—" : fmt(value);
  return (
    <tr>
      <td>
        <Link className="site-table-name" to="/$siteId" params={{ siteId: site.id }} search={{ range: "24h" }}>
          <SiteFavicon domain={site.domains[0]} name={site.name} />
          <span><strong>{site.name}</strong><span className="site-table-domains">{site.domains.join(", ")}</span></span>
        </Link>
      </td>
      <td className="site-table-number">{metric(data?.report.totals.visitors)}</td>
      <td className="site-table-number">{metric(data?.report.totals.views)}</td>
      <td className="site-table-number">{metric(data?.report.totals.visits)}</td>
      <td className="site-table-traffic">
        {data ? (
          <svg viewBox="0 0 140 38" role="img" aria-label={`Hourly pages viewed over the last 24 hours for ${site.name}`}>
            <polygon points={`2,36 ${line} 138,36`} fill="currentColor" opacity="0.1" />
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ) : analytics.isError ? (
          <button className="site-traffic-retry" onClick={() => void analytics.refetch()}>Retry traffic</button>
        ) : <span className="muted" role="status">Loading…</span>}
      </td>
      <td><Link className="site-table-open" to="/$siteId" params={{ siteId: site.id }} search={{ range: "24h" }} aria-label={`Open ${site.name}`}><ChevronRight size={18} /></Link></td>
    </tr>
  );
}

export function SitePicker({ message }: { message?: string }) {
  const sites = useQuery(sitesQuery);
  const [adding, setAdding] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="site-picker">
      <header className="site-picker-header">
        <Brand />
        <div className="flex items-center gap-2">
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
          <div className="site-table-scroll">
            <table className="site-table">
              <caption><em>The activity of each site is listed from the last 24 hours.</em></caption>
              <thead><tr>
                <th scope="col">Website</th>
                <th scope="col" className="site-table-number">Visitors</th>
                <th scope="col" className="site-table-number">Pages Viewed</th>
                <th scope="col" className="site-table-number">Visits</th>
                <th scope="col">Traffic</th>
                <th scope="col"><span className="sr-only">Open website</span></th>
              </tr></thead>
              <tbody>{sites.data.map((site) => <SiteRow key={site.id} site={site} />)}</tbody>
            </table>
          </div>
        ) : (
          <Card className="panel">
            <Empty
              text="Your next chapter starts here. Add a website to welcome your first visitors."
            />
          </Card>
        )}
        <div className="flex justify-end mt-4">
          <Button
            variant="ghost"
            className="sign-out-button"
            onClick={() => void logout().catch((e) => setError(e.message))}
          >
            <LogOut size={14} />
            Sign Out
          </Button>
        </div>
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
