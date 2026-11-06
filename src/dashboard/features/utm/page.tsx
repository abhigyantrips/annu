import { useDashboard } from "@/features/dashboard/context";
import { ReportPage } from "@/features/reports/report-page";
import { Utm } from "@/features/utm/utm";
export function Page() {
  const { site } = useDashboard();
  return (
    <ReportPage>
      {({ report }) => <Utm report={report} site={site} />}
    </ReportPage>
  );
}
