import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { MapingIcon } from "@hugeicons/core-free-icons";
import {
  Activity as ActivityIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  Activity,
  Dimension,
  Label,
  Report,
  Site,
  Timeline,
} from "../shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { parseDashboardPath, dashboardPath, type Page } from "../shared/dashboard-routes";
import "@/style.css";

const fmt = (n: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n || 0);
const duration = (ms: number) => {
  const s = Math.round((ms || 0) / 1000);
  return s >= 3600
    ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
    : s >= 60
      ? `${Math.floor(s / 60)}m ${s % 60}s`
      : `${s}s`;
};
const dateTime = (n: number) =>
  new Date(n).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const colors = [
  "#397b68",
  "#83a893",
  "#b6c8a6",
  "#d2b783",
  "#b39399",
  "#8b9aaf",
  "#b7c6ca",
  "#d4c8b9",
];
const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};
const siteName = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function api<T>(url: string, body?: object, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method: body !== undefined || method === "DELETE" ? method : "GET",
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 && url !== "/api/login")
    window.dispatchEvent(new Event("annu:unauthorized"));
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(error.error || "Request failed. Please try again.", response.status);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
function LocationsIcon() {
  return <HugeiconsIcon icon={MapingIcon} size={18} strokeWidth={2} />;
}
const navigation = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "pages", name: "Pages", icon: FileText },
  { id: "referrers", name: "Referrers", icon: ArrowDownLeft },
  { id: "outgoing", name: "Outgoing Links", icon: ArrowUpRight },
  { id: "utm", name: "UTM Tags", icon: Tag },
  { id: "visitors", name: "Visitors", icon: Users },
  { id: "performance", name: "Performance", icon: ActivityIcon },
  { id: "locations", name: "Locations", icon: LocationsIcon },
] as const;
const titles: Record<Page, string> = {
  overview: "Overview",
  pages: "Pages",
  referrers: "Referrers",
  outgoing: "Outgoing Links",
  utm: "UTM Tags",
  visitors: "Visitors",
  performance: "Performance",
  locations: "Locations",
  settings: "Settings",
};

const logoUrl = new URL("./assets/annu-logo.svg", import.meta.url).href;
function Brand() {
  return <div className="brand"><img className="brand-logo" src={logoUrl} alt="annu." width={110} height={40} /></div>;
}
function SiteFavicon({ domain, name }: { domain?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  let hostname = "";
  try {
    if (domain) hostname = new URL(domain.includes("://") ? domain : `https://${domain}`).hostname;
  } catch { /* Missing or invalid hostnames use the site's initial. */ }
  return <span className="site-favicon" aria-hidden="true">
    {hostname && !failed ? <img src={`https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`} width={16} height={16} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : name[0]?.toUpperCase() || "+"}
  </span>;
}
function SelectField({ value, onValueChange, options, label, disabled, className }: {
  value: string; onValueChange: (value: string) => void; options: { value: string; label: string; icon?: React.ReactNode }[];
  label: string; disabled?: boolean; className?: string;
}) {
  return <Select items={options} value={value} onValueChange={(next) => { if (next !== null) onValueChange(next); }} disabled={disabled}>
    <SelectTrigger aria-label={label} className={cn("w-full", className)}>{options.find((option) => option.value === value)?.icon}<SelectValue placeholder={label} data-initial={options.find((option) => option.value === value)?.label[0]?.toUpperCase() || "+"} /></SelectTrigger>
    <SelectContent alignItemWithTrigger={false} className={options.some((option) => option.icon) ? "site-picker-options" : undefined}><>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.icon}{option.label}</SelectItem>)}</></SelectContent>
  </Select>;
}
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline" size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* Code remains selectable. */
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
function Empty({
  title = "No Data Yet",
  text = "Data will appear here as people visit your website.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent data-wide={wide} className={`app-dialog ${wide ? "sm:max-w-4xl" : ""}`} aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}

type Column = {
  key: string;
  name: string;
  render?: (row: any) => React.ReactNode;
  numeric?: boolean;
};
function DataTable({
  rows,
  columns,
  search = true,
  emptyText,
}: {
  rows: any[];
  columns: Column[];
  search?: boolean;
  emptyText?: string;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState<{ key: string; asc: boolean } | null>(null);
  const filtered = rows
    .filter(
      (row) =>
        !query ||
        Object.values(row)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      !sort
        ? 0
        : (typeof a[sort.key] === "number"
            ? a[sort.key] - b[sort.key]
            : String(a[sort.key]).localeCompare(String(b[sort.key]))) *
          (sort.asc ? 1 : -1),
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(filtered.length / 20) - 1),
  );
  return (
    <>
      {search && rows.length > 0 && (
        <div className="table-toolbar">
          <label className="search">
            <Search size={15} />
            <Input
              aria-label="Search Table"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Find Something…"
            />
          </label>
          <span className="muted small-text">
            {fmt(filtered.length)} results
            {rows.length >= 1000 ? " · top 1,000 shown" : ""}
          </span>
        </div>
      )}
      {!filtered.length ? (
        <Empty text={query ? "No results match your search." : emptyText} />
      ) : (
        <>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead
                      key={c.key}
                      className={c.numeric ? "numeric" : ""}
                      aria-sort={
                        sort?.key === c.key
                          ? sort.asc
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <Button
                        onClick={() => {
                          setSort({
                            key: c.key,
                            asc: sort?.key === c.key ? !sort.asc : !c.numeric,
                          });
                          setPage(0);
                        }}
                      >
                        {c.name}
                        {sort?.key === c.key && (
                          <span>{sort.asc ? " ↑" : " ↓"}</span>
                        )}
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .slice(currentPage * 20, currentPage * 20 + 20)
                  .map((row, i) => (
                    <TableRow key={row.id || row.visitorId || `${currentPage}-${i}`}>
                      {columns.map((c) => (
                        <TableCell key={c.key} className={c.numeric ? "numeric" : ""}>
                          {c.render
                            ? c.render(row)
                            : c.numeric
                              ? fmt(row[c.key])
                              : row[c.key]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 20 && (
            <div className="pagination">
              <span>
                Showing {currentPage * 20 + 1}–
                {Math.min(currentPage * 20 + 20, filtered.length)} of{" "}
                {fmt(filtered.length)}
              </span>
              <div>
                <Button
                  variant="ghost" size="icon-sm"
                  aria-label="Previous Page"
                  disabled={!currentPage}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </Button>
                <Button
                  variant="ghost" size="icon-sm"
                  aria-label="Next Page"
                  disabled={(currentPage + 1) * 20 >= filtered.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
function Chart({
  report,
  from,
  to,
}: {
  report: Report;
  from: number;
  to: number;
}) {
  const [metric, setMetric] = useState<"visitors" | "views">("visitors");
  const start = new Date(from);
  start.setUTCHours(0, 0, 0, 0);
  const points: { date: string; value: number }[] = [];
  for (let at = start.getTime(); at < to; at += 86_400_000) {
    const day = new Date(at).toISOString().slice(0, 10);
    points.push({
      date: day,
      value: report.series.find((p) => p.date === day)?.[metric] || 0,
    });
  }
  const max = Math.max(4, ...points.map((p) => p.value));
  const w = 1000,
    h = 205,
    x = (i: number) =>
      45 + (points.length <= 1 ? 0 : (i / (points.length - 1)) * 930),
    y = (n: number) => 174 - (n / max) * 150;
  const line = points
    .map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`)
    .join(" ");
  const labels = [
    ...new Set([
      0,
      Math.floor((points.length - 1) / 4),
      Math.floor((points.length - 1) / 2),
      Math.floor(((points.length - 1) * 3) / 4),
      points.length - 1,
    ]),
  ].filter((i) => i >= 0);
  return (
    <Card className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Traffic Over Time</h2>
          <span className="subtle">
            Daily visitors and page views{" "}
            <span className="utc">· UTC</span>
          </span>
        </div>
        <Tabs value={metric} onValueChange={(value) => setMetric(value as "visitors" | "views")}><TabsList><TabsTrigger value="visitors">Visitors</TabsTrigger><TabsTrigger value="views">Views</TabsTrigger></TabsList></Tabs>
      </div>
      <svg
        className="timeseries"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`Daily ${metric}: ${points.map((p) => `${p.date}: ${p.value}`).join(", ")}`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#397b68" stopOpacity=".17" />
            <stop offset="100%" stopColor="#397b68" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="45"
              x2="975"
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="#e9ece6"
              strokeDasharray={t ? "3 5" : undefined}
            />
            <text
              x="30"
              y={y(max * t) + 4}
              textAnchor="end"
              className="chart-label"
            >
              {fmt(max * t)}
            </text>
          </g>
        ))}
        <path
          d={`${line} L${x(points.length - 1)},174 L45,174 Z`}
          fill="url(#chart-fill)"
        />
        <path
          d={line}
          fill="none"
          stroke="#397b68"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {points.length < 45 &&
          points.map((p, i) => (
            <circle
              key={p.date}
              cx={x(i)}
              cy={y(p.value)}
              r="3"
              stroke="#397b68"
              strokeWidth="1.5"
              fill="#fff"
            >
              <title>
                {p.date}: {fmt(p.value)} {metric}
              </title>
            </circle>
          ))}
        {labels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y="199"
            textAnchor={
              i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
            }
            className="chart-label"
          >
            {new Date(points[i].date + "T12:00:00Z").toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </text>
        ))}
      </svg>
    </Card>
  );
}
function Ranking({
  title,
  subtitle,
  rows,
  onMore,
  type,
}: {
  title: string;
  subtitle: string;
  rows: { name: string; value: number }[];
  onMore: () => void;
  type: "path" | "referrer";
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="panel ranking">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <span className="subtle">{subtitle}</span>
        </div>
        <span className="tiny-label">
          {type === "referrer" ? "VISITS" : "VIEWS"}
        </span>
      </div>
      {!rows.length ? (
        <Empty />
      ) : (
        <div className="ranking-rows">
          {rows.slice(0, 5).map((r, i) => (
            <div className="ranking-row" key={r.name}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <div className="ranking-track">
                <div
                  className="ranking-bar"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
                <span className={type === "path" ? "mono" : ""}>
                  {type === "referrer" ? siteName(r.name) : r.name}
                </span>
              </div>
              <strong>{fmt(r.value)}</strong>
            </div>
          ))}
        </div>
      )}
      <Button variant="link" className="w-full border-t rounded-none" onClick={onMore}>
        Explore {type === "referrer" ? "Referrers" : "Pages"}
        <ArrowUpRight size={14} />
      </Button>
    </Card>
  );
}
function Stats({ report }: { report: Report }) {
  const t = report.totals;
  return (
    <div className="stats">
      {[
        {
          title: "Visitors",
          value: fmt(t.visitors),
          icon: Users,
          note: "Distinct browser identities",
        },
        {
          title: "Visits",
          value: fmt(t.visits),
          icon: ArrowDownLeft,
          note: "30-minute activity windows",
        },
        {
          title: "Page Views",
          value: fmt(t.views),
          icon: FileText,
          note: "Total page views",
        },
        {
          title: "Average Visit Duration",
          value: duration(t.duration),
          icon: Clock3,
          note: "Estimated active time",
        },
      ].map(({ title, value, icon: Icon, note }) => (
        <Card className="stat" key={title}>
          <div className="stat-label">
            {title}
            <Icon size={15} strokeWidth={1.6} />
          </div>
          <div className="stat-value">{value}</div>
          <div className="stat-note">{note}</div>
        </Card>
      ))}
    </div>
  );
}

function Utm({
  report,
  site,
  reload,
}: {
  report: Report;
  site: Site;
  reload: () => void;
}) {
  const [dimension, setDimension] = useState<Dimension>("campaign"),
    [configure, setConfigure] = useState(false);
  const rows = report.utm[dimension],
    total = rows.reduce((n, r) => n + r.visits, 0);
  let cursor = 0;
  const slices = rows.slice(0, 7).map((r, i) => {
    const start = cursor;
    cursor += total ? (r.visits / total) * 100 : 0;
    return `${colors[i]} ${start}% ${cursor}%`;
  });
  if (cursor < 100) slices.push(`${colors[7]} ${cursor}% 100%`);
  return (
    <>
      <Card className="panel">
        <div className="panel-heading">
          <Tabs value={dimension} onValueChange={(value) => setDimension(value as Dimension)}><TabsList>{(["source", "medium", "campaign"] as const).map((d) => <TabsTrigger key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</TabsTrigger>)}</TabsList></Tabs>
          <Button onClick={() => setConfigure(true)}>
            <SlidersHorizontal size={15} />
            Configure Labels
          </Button>
        </div>
        {!rows.length ? (
          <Empty
            title={`No ${dimension[0].toUpperCase() + dimension.slice(1)} Tags Yet`}
            text={`Share a link with utm_${dimension} to see where visits come from.`}
          />
        ) : (
          <div className="utm-layout">
            <div className="donut-wrap">
              <div
                className="donut"
                role="img"
                aria-label={`${dimension} distribution: ${rows.map((r) => `${r.name} ${r.visits} visits`).join(", ")}`}
                style={{ background: `conic-gradient(${slices.join(",")})` }}
              >
                <div>
                  <strong>{fmt(total)}</strong>
                  <span>tagged visits</span>
                </div>
              </div>
              <p className="subtle">Grouped by {dimension}</p>
            </div>
            <div>
              <DataTable
                rows={rows.map((r, index) => ({
                  ...r,
                  share: r.visits / total,
                  color: colors[Math.min(index, 7)],
                }))}
                search={false}
                columns={[
                  {
                    key: "name",
                    name: dimension[0].toUpperCase() + dimension.slice(1),
                    render: (r) => (
                      <div className="label-cell">
                        <span
                          className="legend-dot"
                          style={{
                            background: r.color,
                          }}
                        />
                        <div>
                          <strong>{r.name}</strong>
                          <small>{r.raw.join(", ")}</small>
                        </div>
                      </div>
                    ),
                  },
                  { key: "visits", name: "Visits", numeric: true },
                  {
                    key: "share",
                    name: "Share",
                    numeric: true,
                    render: (r) => `${((r.visits / total) * 100).toFixed(1)}%`,
                  },
                ]}
              />
            </div>
          </div>
        )}
        <div className="panel-note">
          Tags belong to the entry page of a visit. Label changes also apply to
          historical reports.
        </div>
      </Card>
      {configure && (
        <LabelSettings
          site={site}
          initialDimension={dimension}
          onClose={() => setConfigure(false)}
          reload={reload}
        />
      )}
    </>
  );
}
function LabelSettings({
  site,
  initialDimension,
  onClose,
  reload,
}: {
  site: Site;
  initialDimension: Dimension;
  onClose: () => void;
  reload: () => void;
}) {
  const [labels, setLabels] = useState<Label[]>([]),
    [dimension, setDimension] = useState(initialDimension),
    [name, setName] = useState(""),
    [values, setValues] = useState(""),
    [editing, setEditing] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      api<Label[]>(`/api/sites/${site.id}/labels`)
        .then(setLabels)
        .catch((e) => setError(e.message)),
    [site.id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Modal title="UTM Labels" onClose={onClose}>
      <p className="muted">
        Combine several raw UTM values under one readable label. Each dimension
        has its own labels.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(`/api/sites/${site.id}/labels`, {
              id: editing,
              dimension,
              name,
              values: values
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            });
            setName("");
            setValues("");
            setEditing(undefined);
            await load();
            reload();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-2"><span className="text-sm font-medium">Dimension</span><SelectField label="Dimension" value={dimension} disabled={!!editing} onValueChange={(value) => setDimension(value as Dimension)} options={["source", "medium", "campaign"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} /></div>
        <label>
          Display Label
          <Input
            required
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="ABC WhatsApp Group"
          />
        </label>
        <label>
          Raw Values{" "}
          <span className="subtle">one per line · exact, case-sensitive</span>
          <Textarea
            required
            rows={4}
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder={"abc\nabc_group\nabc_grp"}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {editing && (
            <Button
              type="button"
              onClick={() => {
                setEditing(undefined);
                setName("");
                setValues("");
              }}
            >
              Cancel Edit
            </Button>
          )}
          <Button type="submit" variant="default" disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}{" "}
            {editing ? "Save Label" : "Add Label"}
          </Button>
        </div>
      </form>
      <div className="label-list">
        {labels
          .filter((l) => l.dimension === dimension)
          .map((l) => (
            <div key={l.id}>
              <Button
                variant="link"
                onClick={() => {
                  setEditing(l.id);
                  setName(l.name);
                  setValues(l.values.join("\n"));
                }}
              >
                <strong>{l.name}</strong>
                <small>{l.values.join(", ")}</small>
              </Button>
              <Button
                variant="ghost" size="icon-sm"
                aria-label={`Delete ${l.name}`}
                onClick={async () => {
                  try {
                    await api(
                      `/api/sites/${site.id}/labels/${l.id}`,
                      undefined,
                      "DELETE",
                    );
                    await load();
                    reload();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Trash2 size={15} />
              </Button>
            </div>
          ))}
      </div>
    </Modal>
  );
}

function VisitorHistory({
  site,
  visitor,
  onClose,
}: {
  site: Site;
  visitor: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Timeline>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = useCallback(
    async (before?: number) => {
      setBusy(true);
      try {
        const result = await api<Timeline>(
          `/api/sites/${site.id}/visitors/${visitor}${before ? `?before=${before}` : ""}`,
        );
        setData((previous) =>
          before && previous
            ? {
                ...result,
                visits: [...previous.visits, ...result.visits],
                views: [...previous.views, ...result.views],
                clicks: [...previous.clicks, ...result.clicks],
              }
            : result,
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [site.id, visitor],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <Modal title="Visitor Activity" onClose={onClose} wide>
      <p className="visitor-id mono">{visitor}</p>
      <p className="muted">
        History across all retained dates · {data?.totalVisits ?? "…"} visits.
        This ID identifies a browser, not a person.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && busy && (
        <p className="loading">
          <Loader2 size={18} className="spin" />
          Loading History…
        </p>
      )}
      {data?.visits.map((v) => (
        <Card className="visit-card" key={String(v.id)}>
          <div className="visit-heading">
            <strong>{dateTime(Number(v.started_at))}</strong>
            <Badge variant="secondary">
              {v.referrer ? siteName(String(v.referrer)) : "Direct / Unknown"}
            </Badge>
          </div>
          <p className="subtle">
            {[v.country && countryName(String(v.country)), v.region, v.city]
              .filter(Boolean)
              .join(" · ") || "Location Unknown"}
            {v.campaign ? ` · Campaign: ${v.campaign}` : ""}
          </p>
          <div className="timeline">
            {[
              ...data.views
                .filter((p) => p.visit_id === v.id)
                .map((p) => ({
                  id: p.id,
                  at: Number(p.started_at),
                  path: String(p.path),
                  title: String(p.title),
                  duration: Number(p.duration_ms),
                  click: false,
                })),
              ...data.clicks
                .filter((c) => c.visit_id === v.id)
                .map((c) => ({
                  id: c.id,
                  at: Number(c.at),
                  path: String(c.destination),
                  title: `${c.kind} from ${c.path}`,
                  duration: 0,
                  click: true,
                })),
            ]
              .sort((a, b) => a.at - b.at)
              .map((item) => (
                <div className="timeline-event" key={String(item.id)}>
                  <span
                    className={`event-icon ${item.click ? "outbound" : ""}`}
                  >
                    {item.click ? (
                      <ArrowUpRight size={14} />
                    ) : (
                      <FileText size={14} />
                    )}
                  </span>
                  <div>
                    <strong className="mono">{item.path}</strong>
                    <small>{item.title}</small>
                  </div>
                  <span className="event-time">
                    {new Date(item.at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                    {!item.click && <small>{duration(item.duration)}</small>}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ))}
      {data && !data.visits.length && <Empty title="No Retained Visits" />}
      {data?.nextBefore && (
        <Button disabled={busy} onClick={() => void load(data.nextBefore!)}>
          {busy ? <Loader2 size={14} className="spin" /> : null}Load Older
          visits
        </Button>
      )}
    </Modal>
  );
}

function SiteSettings({
  site,
  onSaved,
  newSite = false,
}: {
  site?: Site;
  onSaved: (site: Site) => void;
  newSite?: boolean;
}) {
  const [name, setName] = useState(site?.name || ""),
    [domains, setDomains] = useState(site?.domains.join(", ") || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [heartbeat, setHeartbeat] = useState(false),
    [links, setLinks] = useState(false),
    [performance, setPerformance] = useState(true),
    [query, setQuery] = useState(false),
    [hash, setHash] = useState(false);
  const src = `${location.origin}/script.js`;
  const embed = `<script>\n(() => {\n  const load = () => {\n    const s = document.createElement('script');\n    s.src = ${JSON.stringify(src)};\n    s.async = true;\n    s.dataset.siteId = ${JSON.stringify(site?.id || "YOUR_SITE_ID")};\n    s.dataset.domains = ${JSON.stringify(site?.domains.join(",") || domains)};\n    s.dataset.heartbeat = '${heartbeat}';\n    s.dataset.performance = '${performance}';\n    s.dataset.links = '${links}';${query ? "\n    s.dataset.linkQuery = 'true';" : ""}${hash ? "\n    s.dataset.linkHash = 'true';" : ""}\n    document.head.appendChild(s);\n  };\n  if (document.readyState === 'complete') setTimeout(load, 0);\n  else window.addEventListener('load', load, { once: true });\n})();\n<\/script>`;
  return (
    <div className="settings-grid">
      <Card className="panel setting-panel">
        <div className="panel-heading">
          <div>
            <h2>{newSite ? "Your First Website" : "Website Details"}</h2>
            <span className="subtle">
              Only your configured hostnames can send data.
            </span>
          </div>
          <Globe2 size={18} />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setSaved(false);
            try {
              const result = await api<Site>("/api/sites", {
                id: site?.id,
                name,
                domains: domains.split(/[,\s]+/).filter(Boolean),
              });
              onSaved(result);
              setSaved(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Website Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="My Website"
            />
          </label>
          <label>
            Allowed Hostnames
            <Input
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              required
              placeholder="abhi.now, www.abhi.now"
            />
            <span className="subtle">
              Comma-separated, without https:// or a path. Ports are supported
              for development.
            </span>
          </label>
          {site && (
            <label>
              Website ID
              <div className="copy-field">
                <code>{site.id}</code>
                <CopyButton value={site.id} />
              </div>
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            {saved && (
              <span className="success">
                <Check size={14} />
                Saved
              </span>
            )}
            <Button type="submit" disabled={busy} variant="default">
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Check size={15} />
              )}{" "}
              {site ? "Save Changes" : "Add Website"}
            </Button>
          </div>
        </form>
      </Card>
      {site && (
        <>
          <Card className="panel setting-panel">
            <div className="panel-heading">
              <div>
                <h2>Privacy</h2>
                <span className="subtle">
                  No IP storage. No fingerprinting. No retry queue.
                </span>
              </div>
            </div>
            <div className="privacy-copy">
              <p>
                A random UUID stays in each visitor’s browser. Clearing browser
                storage creates a new identity.
              </p>
              <p>
                Detailed history and statistics are kept for 400 days by
                default. Retention is configured on your server.
              </p>
              <h3>Exclude Your Own Visits</h3>
              <p>
                Run this on your <strong>website’s origin</strong> in the browser
                console:
              </p>
              <div className="copy-field">
                <code>localStorage.setItem('annu.disabled', 'true')</code>
                <CopyButton value="localStorage.setItem('annu.disabled', 'true')" />
              </div>
              <p className="subtle">
                Reload the website afterwards. Remove the key to track this browser
                again.
              </p>
            </div>
          </Card>
          <Card className="panel setting-panel embed-panel">
            <div className="panel-heading">
              <div>
                <h2>Tracking Script</h2>
                <span className="subtle">
                  This loader starts after page load. Requests are best effort.
                </span>
              </div>
              <Code2 size={19} />
            </div>
            <div className="tracking-options">
              {[
                {
                  label: "25-Second Heartbeats",
                  value: heartbeat,
                  set: setHeartbeat,
                },
                {
                  label: "Web Vitals",
                  value: performance,
                  set: setPerformance,
                },
                { label: "All Outgoing Links", value: links, set: setLinks },
                {
                  label: "Keep Link Query Parameters",
                  value: query,
                  set: setQuery,
                },
                { label: "Keep Link Fragments", value: hash, set: setHash },
              ].map((option) => (
                <label className="checkbox" key={option.label}>
                  <Checkbox
                    checked={option.value}
                    onCheckedChange={(checked) => option.set(checked)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="code-header">
              <span>
                Paste into your site layout · for Astro, add{" "}
                <code>is:inline</code> to the opening script tag
              </span>
              <CopyButton value={embed} />
            </div>
            <pre>
              <code>{embed}</code>
            </pre>
            <div className="panel-note">
              Outgoing links are opt-in: mark individual links with{" "}
              <code>data-annu-link</code> or enable “All Outgoing Links” above
              with <code>data-links="true"</code> on the tracker. Downloads and
              mailto links are included. Astro ClientRouter is supported.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <div className="login-card">
        <Brand />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/login", { password });
              onLogin();
            } catch (e) {
              if (e instanceof ApiError && e.status === 401) {
                window.location.assign("https://www.youtube.com/watch?v=cw9FIeHbdB8");
                return;
              }
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Password
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button type="submit" variant="default" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : null}Continue
            <ArrowUpRight size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function DashboardSidebar({ page, setPage, onLogout, onHome }: {
  page: Page; setPage: (page: Page) => void; onLogout: () => void; onHome: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  const navigate = (next: Page) => { setPage(next); setOpenMobile(false); };
  return <Sidebar collapsible="icon">
    <SidebarHeader>
      <div className="sidebar-brand"><Brand /></div>
    </SidebarHeader>
    <SidebarContent><SidebarGroup>
      <SidebarMenu>{navigation.map(({ id, name, icon: Icon }) => <SidebarMenuItem key={id}>
        <SidebarMenuButton tooltip={name} aria-label={name} aria-current={page === id ? "page" : undefined} isActive={page === id} onClick={() => navigate(id)}>
          <Icon /><span>{name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>)}</SidebarMenu>
    </SidebarGroup></SidebarContent>
    <SidebarFooter><SidebarMenu>
      <SidebarMenuItem><SidebarMenuButton tooltip="All Websites" aria-label="All Websites" onClick={onHome}><Globe2 /><span>All Websites</span></SidebarMenuButton></SidebarMenuItem>
      <SidebarMenuItem><SidebarMenuButton tooltip="Settings" aria-label="Settings" isActive={page === "settings"} onClick={() => navigate("settings")}><Settings /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>
      <SidebarMenuItem><SidebarMenuButton tooltip="Sign Out" aria-label="Sign Out" onClick={onLogout}><LogOut /><span>Sign Out</span></SidebarMenuButton></SidebarMenuItem>
    </SidebarMenu></SidebarFooter>
  </Sidebar>;
}
function App() {
  const requestSequence = useRef(0);
  const [route, setRoute] = useState(() => parseDashboardPath(window.location.pathname));
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const siteId = route.siteId;
  const page = route.page;
  const navigate = useCallback((nextSiteId: string, nextPage: Page = "overview") => {
    const path = dashboardPath(nextSiteId, nextPage);
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setRoute(parseDashboardPath(path));
  }, []);
  const setSiteId = (id: string) => navigate(id);
  const setPage = (next: Page) => navigate(siteId, next);
  useEffect(() => {
    const back = () => setRoute(parseDashboardPath(window.location.pathname));
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null),
    [sites, setSites] = useState<Site[]>([]),
    [days, setDays] = useState("7"),
    [customFrom, setCustomFrom] = useState(""),
    [customTo, setCustomTo] = useState(""),
    [report, setReport] = useState<Report>(),
    [activity, setActivity] = useState<Activity[]>([]),
    [activityHasMore, setActivityHasMore] = useState(true),
    [error, setError] = useState(""),
    [refreshing, setRefreshing] = useState(false),
    [updated, setUpdated] = useState<number>(),
    [addingSite, setAddingSite] = useState(false),
    [visitor, setVisitor] = useState<string>(),
    [exporting, setExporting] = useState(false),
    [exportKind, setExportKind] = useState("views"),
    [exportFormat, setExportFormat] = useState("csv");
  const site = sites.find((s) => s.id === siteId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const from =
    days === "custom" && customFrom
      ? Date.parse(customFrom + "T00:00:00Z")
      : today.getTime() -
        (Number(days === "custom" ? 7 : days) - 1) * 86_400_000;
  const to =
    days === "custom" && customTo
      ? Date.parse(customTo + "T00:00:00Z") + 86_400_000
      : Date.now();
  const rangeKey = `${from}-${days === "custom" && customTo ? to : "now"}`;
  useEffect(() => {
    const unauthorized = () => setAuthenticated(false);
    window.addEventListener("annu:unauthorized", unauthorized);
    void api("/api/session")
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
    return () => window.removeEventListener("annu:unauthorized", unauthorized);
  }, []);
  const loadSites = useCallback(async () => {
    const result = await api<Site[]>("/api/sites");
    setSites(result);
    setSitesLoaded(true);
  }, []);
  useEffect(() => {
    if (authenticated) void loadSites().catch((e) => setError(e.message));
    else setSitesLoaded(false);
  }, [authenticated, loadSites]);
  const refresh = useCallback(async () => {
    if (!site || !authenticated || document.visibilityState === "hidden")
      return;
    const sequence = ++requestSequence.current;
    setRefreshing(true);
    try {
      const q = `from=${from}&to=${days === "custom" ? to : Date.now()}`;
      const [r, a] = await Promise.all([
        api<Report>(`/api/sites/${siteId}/report?${q}`),
        page === "visitors"
          ? api<Activity[]>(`/api/sites/${siteId}/activity?${q}`)
          : Promise.resolve(null),
      ]);
      if (sequence !== requestSequence.current) return;
      setReport(r);
      if (a)
        setActivity((previous) => {
          const last = a.at(-1);
          if (!last) return a;
          const ids = new Set(a.map((row) => row.visitorId));
          return [
            ...a,
            ...previous.filter(
              (row) =>
                !ids.has(row.visitorId) &&
                (row.lastSeen < last.lastSeen ||
                  (row.lastSeen === last.lastSeen &&
                    row.visitorId > last.visitorId)),
            ),
          ];
        });
      setUpdated(Date.now());
      setError("");
    } catch (e) {
      if (sequence === requestSequence.current) setError((e as Error).message);
    } finally {
      if (sequence === requestSequence.current) setRefreshing(false);
    }
    // Stable range key prevents a moving 'now' from triggering an infinite refresh loop.
  }, [siteId, site, authenticated, rangeKey, page]);
  useEffect(() => {
    requestSequence.current++;
    setReport(undefined);
    setUpdated(undefined);
    setVisitor(undefined);
    setExporting(false);
    setActivity([]);
    setActivityHasMore(true);
  }, [siteId, rangeKey]);
  useEffect(() => {
    void refresh();
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!active) return;
      await refresh();
      if (active) timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      requestSequence.current++;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  if (authenticated === null)
    return (
      <div className="splash">
        <Brand />
        <Loader2 className="spin" size={20} />
      </div>
    );
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;
  const saved = async (s: Site) => {
    await loadSites();
    if (site) navigate(s.id, siteId === s.id ? page : "overview");
    else navigate("");
    setAddingSite(false);
  };
  if (!sitesLoaded || !site || !route.valid) return (
    <div className="site-picker">
      <header className="site-picker-header"><Brand /><Button variant="ghost" onClick={async () => {
        try { await api("/api/logout", {}); setAuthenticated(false); setSitesLoaded(false); }
        catch (e) { setError((e as Error).message); }
      }}><LogOut size={14} />Sign Out</Button></header>
      <main className="site-picker-main">
        <div className="page-heading"><div><h1>Websites</h1></div>
          {sitesLoaded && <Button onClick={() => setAddingSite(true)}><Plus size={15} />Add Website</Button>}
        </div>
        {error && <div className="error-banner" role="alert">{error}<Button variant="link" onClick={() => void loadSites().catch((e) => setError(e.message))}>Try Again</Button></div>}
        {!route.valid && <p className="muted" role="status">This page could not be found. Choose a website below.</p>}
        {sitesLoaded && siteId && !site && <p className="muted" role="status">This website is unavailable. Choose another website below.</p>}
        {!sitesLoaded ? <div className="loading"><Loader2 className="spin" size={20} />Loading Your Websites…</div> : sites.length ? (
          <div className="site-picker-grid">{sites.map((website) => <Card className="site-picker-card" key={website.id} render={<a href={dashboardPath(website.id)} onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault(); navigate(website.id);
            }} />}><SiteFavicon domain={website.domains[0]} name={website.name} /><div><h2>{website.name}</h2><p>{website.domains.join(", ")}</p></div><ChevronRight size={18} />
          </Card>)}</div>
        ) : <Card className="panel"><Empty title="No Websites Yet" text="Add a website to start collecting analytics." /><div className="site-picker-empty-action"><Button variant="default" onClick={() => setAddingSite(true)}><Plus size={15} />Add Your First Website</Button></div></Card>}
      </main>
      {addingSite && <Modal title="Add Website" onClose={() => setAddingSite(false)}><SiteSettings onSaved={saved} newSite /></Modal>}
    </div>
  );
  const pathColumns: Column[] = [
    {
      key: "path",
      name: "Page",
      render: (r) => <span className="mono path-text">{r.path}</span>,
    },
    { key: "visitors", name: "Visitors", numeric: true },
    { key: "visits", name: "Visits", numeric: true },
    { key: "views", name: "Views", numeric: true },
    {
      key: "duration",
      name: "Average Visit Duration",
      numeric: true,
      render: (r) => duration(r.duration),
    },
  ];
  return (
    <SidebarProvider style={{ "--sidebar-width": "222px", "--sidebar-width-icon": "56px" } as React.CSSProperties} className="app-shell" open>
      <DashboardSidebar page={page} setPage={setPage} onHome={() => navigate("")} onLogout={async () => {
        try { await api("/api/logout", {}); setAuthenticated(false); }
        catch (e) { setError((e as Error).message); }
      }} />
      <div className="main-area">
        <header className="topbar">
          <div className="mobile-nav flex items-center gap-2 md:hidden">
            <SidebarTrigger />
            <Brand />
          </div>
          <div className="topbar-right">
            <span className="live-badge">
              <span />
              {report
                ? `${fmt(report.totals.live)} Online`
                : "Connecting…"}
            </span>
            <SelectField label="Current Website" value={siteId} onValueChange={setSiteId} className="topbar-site-picker" options={sites.map((site) => ({ value: site.id, label: site.name, icon: <SiteFavicon key={site.domains[0] || site.id} domain={site.domains[0]} name={site.name} /> }))} />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <h1>{titles[page]}</h1>
            </div>
            <div className="page-actions">
              {page === "settings" ? (
                <Button onClick={() => setAddingSite(true)}>
                  <Plus size={15} />
                  Add Website
                </Button>
              ) : (
                <>
                  <div className="w-40">
                    <SelectField label="Date Range" value={days} onValueChange={setDays} options={[{"value": "1", "label": "Today"}, {"value": "7", "label": "Last 7 Days"}, {"value": "30", "label": "Last 30 Days"}, {"value": "90", "label": "Last 90 Days"}, {"value": "365", "label": "Last 12 Months"}, {"value": "custom", "label": "Custom Range"}]} />
                  </div>
                  <Button disabled={!site} onClick={() => setExporting(true)}>
                    <Download size={15} />
                    <span>Export</span>
                  </Button>
                </>
              )}
            </div>
          </div>
          {days === "custom" && page !== "settings" && (
            <div className="custom-range">
              <label>
                From (UTC)
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                Through (UTC)
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <Button variant="link" onClick={() => void refresh()}>
                Try Again
              </Button>
            </div>
          )}
          {page === "settings" ? (
            <SiteSettings key={siteId} site={site} onSaved={saved} />
          ) : !report ? (
            <div className="loading">
              <Loader2 className="spin" size={20} />
              Gathering a little perspective…
            </div>
          ) : (
            <>
              {page === "overview" && (
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
                </>
              )}
              {page === "pages" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Page Breakdown</h2>
                      <span className="subtle">
                        Reading time on a path ÷ distinct visits to that path.
                      </span>
                    </div>
                    <FileText size={18} />
                  </div>
                  <DataTable rows={report.paths} columns={pathColumns} />
                </Card>
              )}
              {page === "referrers" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Referrers</h2>
                      <span className="subtle">
                        Origins only. Missing referrers stay direct / unknown.
                      </span>
                    </div>
                    <ArrowDownLeft size={19} />
                  </div>
                  <DataTable
                    rows={report.referrers}
                    columns={[
                      {
                        key: "name",
                        name: "Referring Website",
                        render: (r) => (
                          <span className="referrer-cell">
                            <span className="domain-icon">
                              <Link2 size={15} />
                            </span>
                            {r.name.startsWith("http") ? (
                              <a href={r.name} target="_blank" rel="noreferrer">
                                {siteName(r.name)}
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              r.name
                            )}
                          </span>
                        ),
                      },
                      { key: "visitors", name: "Visitors", numeric: true },
                      { key: "visits", name: "Visits", numeric: true },
                      {
                        key: "duration",
                        name: "Time per Visit",
                        numeric: true,
                        render: (r) => duration(r.duration),
                      },
                    ]}
                  />
                </Card>
              )}
              {page === "outgoing" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Outgoing Links</h2>
                      <span className="subtle">
                        Only explicitly opted-in links are measured.
                      </span>
                    </div>
                    <ArrowUpRight size={19} />
                  </div>
                  <DataTable
                    rows={report.outbound}
                    emptyText="Add data-annu-link to the links you’d like to understand, or enable all outgoing links in your tracker."
                    columns={[
                      {
                        key: "destination",
                        name: "Destination",
                        render: (r) => (
                          <div className="destination">
                            <span className="mono">{r.destination}</span>
                            <Badge variant="secondary">{r.kind}</Badge>
                          </div>
                        ),
                      },
                      {
                        key: "path",
                        name: "From Page",
                        render: (r) => <span className="mono">{r.path}</span>,
                      },
                      { key: "clicks", name: "Clicks", numeric: true },
                      { key: "visitors", name: "Visitors", numeric: true },
                    ]}
                  />
                </Card>
              )}
              {page === "utm" && site && (
                <Utm
                  report={report}
                  site={site}
                  reload={() => void refresh()}
                />
              )}
              {page === "visitors" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Visit History</h2>
                      <span className="subtle">
                        Open a browser identity to see its retained activity
                        across days.
                      </span>
                    </div>
                    <Users size={19} />
                  </div>
                  <DataTable
                    rows={activity}
                    columns={[
                      {
                        key: "visitorId",
                        name: "Browser Identity",
                        render: (r) => (
                          <Button
                            variant="link" className="font-mono"
                            onClick={() => setVisitor(r.visitorId)}
                          >
                            <span className="visitor-dot" />
                            {r.visitorId.slice(0, 8)}
                            <ArrowUpRight size={13} />
                          </Button>
                        ),
                      },
                      {
                        key: "city",
                        name: "Location",
                        render: (r) =>
                          [r.city, r.country && countryName(r.country)]
                            .filter(Boolean)
                            .join(", ") || "Unknown",
                      },
                      {
                        key: "lastSeen",
                        name: "Last Seen",
                        render: (r) => dateTime(r.lastSeen),
                      },
                      { key: "visits", name: "Visits", numeric: true },
                      { key: "views", name: "Views", numeric: true },
                      {
                        key: "duration",
                        name: "Reading Time",
                        numeric: true,
                        render: (r) => duration(r.duration),
                      },
                    ]}
                  />
                  {activity.length >= 100 && activityHasMore && (
                    <div className="panel-note">
                      <Button
                        onClick={async () => {
                          try {
                            const more = await api<Activity[]>(
                              `/api/sites/${siteId}/activity?from=${from}&to=${to}&before=${activity[activity.length - 1].lastSeen}&beforeId=${activity[activity.length - 1].visitorId}`,
                            );
                            setActivity([...activity, ...more]);
                            setActivityHasMore(more.length === 100);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Load Older Visitors
                      </Button>
                    </div>
                  )}
                </Card>
              )}
              {page === "performance" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Real-World Performance</h2>
                      <span className="subtle">
                        Standard Web Vitals belong to the initial document
                        route. Unsupported metrics stay absent.
                      </span>
                    </div>
                    <ActivityIcon size={19} />
                  </div>
                  <DataTable
                    rows={report.performance}
                    columns={[
                      {
                        key: "path",
                        name: "Page",
                        render: (r) => <span className="mono">{r.path}</span>,
                      },
                      {
                        key: "metric",
                        name: "Metric",
                        render: (r) => <Badge variant="secondary">{r.metric}</Badge>,
                      },
                      ...(["p50", "p75", "p95"] as const).map((key) => ({
                        key,
                        name: key.toUpperCase(),
                        numeric: true,
                        render: (r: any) =>
                          r.metric === "CLS"
                            ? r[key].toFixed(3)
                            : `${fmt(r[key])} ms`,
                      })),
                      { key: "samples", name: "Samples", numeric: true },
                    ]}
                  />
                  <div className="panel-note">
                    LCP · INP · CLS · TTFB · FCP. Percentiles use observed
                    samples; missing measurements are never treated as zero.
                  </div>
                </Card>
              )}
              {page === "locations" && (
                <Card className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Visitor Locations</h2>
                      <span className="subtle">
                        Cloudflare headers only. No IP lookup or location
                        inference.
                      </span>
                    </div>
                    <Globe2 size={19} />
                  </div>
                  <DataTable
                    rows={report.locations}
                    columns={[
                      {
                        key: "country",
                        name: "Country",
                        render: (r) => countryName(r.country),
                      },
                      { key: "region", name: "Province / Region" },
                      { key: "city", name: "City" },
                      { key: "visitors", name: "Visitors", numeric: true },
                      { key: "visits", name: "Visits", numeric: true },
                    ]}
                  />
                </Card>
              )}
            </>
          )}
          {sites.length > 0 && page !== "settings" && (
            <footer className="status-footer">
              <div className="status-pill rounded-lg">
                <span className="status-pill-label">
                <span className={`status-dot ${error ? "offline" : ""}`} />
                {error
                  ? "Connection Interrupted"
                  : refreshing
                    ? "Refreshing…"
                    : updated
                      ? `Updated ${new Date(updated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).toUpperCase()}`
                      : "Waiting for Data"}
                </span>
                <Button
                  variant="ghost" size="icon-sm"
                  aria-label="Refresh Analytics"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                >
                  <RefreshCw size={12} className={refreshing ? "spin" : ""} />
                </Button>
              </div>
            </footer>
          )}
        </main>
      </div>
      {addingSite && (
        <Modal
          title="Add Website"
          onClose={() => setAddingSite(false)}
        >
          <SiteSettings onSaved={saved} newSite />
        </Modal>
      )}
      {visitor && site && (
        <VisitorHistory
          site={site}
          visitor={visitor}
          onClose={() => setVisitor(undefined)}
        />
      )}
      {exporting && (
        <Modal
          title="Export Data"
          onClose={() => setExporting(false)}
        >
          <p className="muted">
            Export raw records for the selected date range. Exports stream in
            small batches.
          </p>
          <div className="grid gap-2"><span className="text-sm font-medium">Records</span><SelectField label="Records" value={exportKind} onValueChange={setExportKind} options={[{"value": "views", "label": "Pageviews and Reading Times"}, {"value": "visits", "label": "Visits, Entry Sources, and Location"}, {"value": "clicks", "label": "Outgoing Clicks"}, {"value": "vitals", "label": "Performance Samples"}]} /></div>
          <div className="grid gap-2"><span className="text-sm font-medium">Format</span><SelectField label="Format" value={exportFormat} onValueChange={setExportFormat} options={[{"value": "csv", "label": "CSV"}, {"value": "json", "label": "JSON"}]} /></div>
          <div className="form-actions">
            <Button variant="default" nativeButton={false} render={<a
              download
              href={`/api/sites/${siteId}/export?from=${from}&to=${to}&kind=${exportKind}&format=${exportFormat}`} /> }
              onClick={() => setExporting(false)}
            >
              <Download size={15} />
              Download Export
            </Button>
          </div>
        </Modal>
      )}
    </SidebarProvider>
  );
}
createRoot(document.getElementById("root")!).render(<TooltipProvider><App /></TooltipProvider>);
