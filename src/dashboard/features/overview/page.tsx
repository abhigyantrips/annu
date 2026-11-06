import { useDashboard } from "@/features/dashboard/context";
import { AudiencePanel } from "./audience-panel";
import { Chart } from "@/features/overview/chart";
import { Ranking } from "@/features/overview/ranking";
import { Stats } from "@/features/overview/stats";
import { ReportPage } from "@/features/reports/report-page";
export function Page() {
  const { navigatePage: setPage } = useDashboard();
  return (
    <ReportPage>
      {({ report, from, to }) => (
        <>
          <Stats report={report} />
          <Chart report={report} from={from} to={to} />
          <div className="two-columns">
            <Ranking
              title="Top Pages"
              subtitle="Pages with the most views"
              rows={report.paths.map((p) => ({
                name: p.path,
                value: p.views,
              }))}
              type="path"
              onMore={() => setPage("pages")}
            />
            <Ranking
              title="Top Referrers"
              subtitle="Websites sending visitors to your site"
              rows={report.referrers.map((r) => ({
                name: r.name,
                value: r.visits,
              }))}
              type="referrer"
              onMore={() => setPage("referrers")}
            />
          </div>
          <div className="two-columns audience-grid">
            <AudiencePanel kind="environment" from={from} to={to} />
            <AudiencePanel kind="location" from={from} to={to} />
          </div>
        </>
      )}
    </ReportPage>
  );
}
