export type Dimension = "source" | "medium" | "campaign";
export type Site = {
  id: string;
  name: string;
  domains: string[];
  createdAt: number;
};
export type Label = {
  id: string;
  siteId: string;
  dimension: Dimension;
  name: string;
  values: string[];
};
export type Row = Record<string, string | number | null>;
export type Report = {
  totals: {
    visitors: number;
    visits: number;
    views: number;
    duration: number;
    live: number;
    clicks: number;
  };
  series: { date: string; visitors: number; views: number }[];
  paths: {
    path: string;
    visitors: number;
    visits: number;
    views: number;
    duration: number;
  }[];
  referrers: {
    name: string;
    visitors: number;
    visits: number;
    duration: number;
  }[];
  locations: {
    country: string;
    region: string;
    city: string;
    visitors: number;
    visits: number;
  }[];
  outbound: {
    destination: string;
    kind: string;
    path: string;
    clicks: number;
    visitors: number;
  }[];
  utm: Record<Dimension, { name: string; raw: string[]; visits: number }[]>;
  performance: {
    path: string;
    metric: string;
    p50: number;
    p75: number;
    p95: number;
    samples: number;
  }[];
};
export type Activity = {
  visitorId: string;
  firstSeen: number;
  lastSeen: number;
  visits: number;
  views: number;
  duration: number;
  country: string | null;
  city: string | null;
};
export type Timeline = {
  visits: Row[];
  views: Row[];
  clicks: Row[];
  totalVisits: number;
  nextBefore: number | null;
};
