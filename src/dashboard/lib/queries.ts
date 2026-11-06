import { QueryClient, queryOptions } from "@tanstack/react-query";
import type { Report, Site } from "../../shared/types";
import { api } from "./api";
import { dateRange, type Filters } from "./date-range";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
export const sitesQuery = queryOptions({
  queryKey: ["sites"],
  queryFn: () => api<Site[]>("/api/sites"),
});
export function reportQuery(siteId: string, filters: Filters) {
  return queryOptions({
    queryKey: ["analytics", siteId, "report", filters],
    queryFn: async ({ signal }) => {
      const range = dateRange(filters);
      const report = await api<Report>(
        `/api/sites/${siteId}/report?from=${range.from}&to=${range.to}&bucket=${range.bucket}`,
        undefined,
        "GET",
        signal,
      );
      return { report, ...range };
    },
  });
}
