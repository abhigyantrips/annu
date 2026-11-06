export const fmt = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n || 0);
export const duration = (ms: number) => {
  const s = Math.round((ms || 0) / 1000);
  return s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;
};
export const dateTime = (n: number) =>
  new Date(n).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const colors = [
  "#397b68",
  "#83a893",
  "#b6c8a6",
  "#d2b783",
  "#b39399",
  "#8b9aaf",
  "#b7c6ca",
  "#d4c8b9",
];
export const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};
export const siteName = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
