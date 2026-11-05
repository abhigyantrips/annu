import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
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
  Leaf,
  Link2,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
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
import "./style.css";

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
    throw new Error(error.error || "Request failed. Please try again.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
type Page =
  | "overview"
  | "pages"
  | "referrers"
  | "outgoing"
  | "utm"
  | "visitors"
  | "performance"
  | "locations"
  | "settings";
const navigation = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "pages", name: "Pages", icon: FileText },
  { id: "referrers", name: "Referrers", icon: ArrowDownLeft },
  { id: "outgoing", name: "Outgoing links", icon: ArrowUpRight },
  { id: "utm", name: "UTM tags", icon: Tag },
  { id: "visitors", name: "Visitors", icon: Users },
  { id: "performance", name: "Performance", icon: ActivityIcon },
  { id: "locations", name: "Locations", icon: Globe2 },
] as const;
const titles: Record<Page, [string, string]> = {
  overview: [
    "A little perspective.",
    "The people, places, and connections around your writing.",
  ],
  pages: [
    "Words that find readers.",
    "Understand which pages people visit, and where they spend their time.",
  ],
  referrers: [
    "How people find you.",
    "A small map of the websites sending readers your way.",
  ],
  outgoing: [
    "Where curiosity leads.",
    "The links your readers follow from your corner of the web.",
  ],
  utm: [
    "Give your sources a name.",
    "Understand the communities and conversations behind each visit.",
  ],
  visitors: [
    "Every visit has a story.",
    "Anonymous browser identities, with a history across visits.",
  ],
  performance: [
    "Make room for reading.",
    "Real-world page performance, measured in your readers’ browsers.",
  ],
  locations: [
    "A world of readers.",
    "Approximate locations supplied by your Cloudflare connection.",
  ],
  settings: [
    "Make yourself at home.",
    "Your websites, tracking preferences, and a little configuration.",
  ],
};

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Leaf size={24} strokeWidth={1.7} />
      </span>
      <span>
        annu<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      className="small"
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
  title = "A quiet corner, for now.",
  text = "Data will appear here as people visit your website.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Leaf size={25} strokeWidth={1.4} />
      </span>
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
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
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
            <input
              aria-label="Search table"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Find something…"
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
            <table>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
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
                      <button
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
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice(currentPage * 20, currentPage * 20 + 20)
                  .map((row, i) => (
                    <tr key={row.id || row.visitorId || `${currentPage}-${i}`}>
                      {columns.map((c) => (
                        <td key={c.key} className={c.numeric ? "numeric" : ""}>
                          {c.render
                            ? c.render(row)
                            : c.numeric
                              ? fmt(row[c.key])
                              : row[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 20 && (
            <div className="pagination">
              <span>
                Showing {currentPage * 20 + 1}–
                {Math.min(currentPage * 20 + 20, filtered.length)} of{" "}
                {fmt(filtered.length)}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={!currentPage}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={(currentPage + 1) * 20 >= filtered.length}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={17} />
                </button>
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
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>Readers over time</h2>
          <span className="subtle">
            A daily view of your corner of the web{" "}
            <span className="utc">· UTC</span>
          </span>
        </div>
        <div className="segmented">
          <button
            className={metric === "visitors" ? "active" : ""}
            onClick={() => setMetric("visitors")}
          >
            Visitors
          </button>
          <button
            className={metric === "views" ? "active" : ""}
            onClick={() => setMetric("views")}
          >
            Views
          </button>
        </div>
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
    </section>
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
    <section className="panel ranking">
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
      <button className="panel-link" onClick={onMore}>
        Explore {type === "referrer" ? "referrers" : "pages"}
        <ArrowUpRight size={14} />
      </button>
    </section>
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
          title: "Pageviews",
          value: fmt(t.views),
          icon: FileText,
          note: "Every page, every return",
        },
        {
          title: "Time per visit",
          value: duration(t.duration),
          icon: Clock3,
          note: "Visible reading time, best effort",
        },
      ].map(({ title, value, icon: Icon, note }) => (
        <section className="stat" key={title}>
          <div className="stat-label">
            {title}
            <Icon size={15} strokeWidth={1.6} />
          </div>
          <div className="stat-value">{value}</div>
          <div className="stat-note">{note}</div>
        </section>
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
      <section className="panel">
        <div className="panel-heading">
          <div className="segmented">
            {(["source", "medium", "campaign"] as const).map((d) => (
              <button
                key={d}
                className={dimension === d ? "active" : ""}
                onClick={() => setDimension(d)}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={() => setConfigure(true)}>
            <SlidersHorizontal size={15} />
            Configure labels
          </Button>
        </div>
        {!rows.length ? (
          <Empty
            title={`No ${dimension} tags yet.`}
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
                    name: dimension,
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
      </section>
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
    <Modal title="A name for every connection" onClose={onClose}>
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
        <label>
          Dimension
          <select
            value={dimension}
            disabled={!!editing}
            onChange={(e) => setDimension(e.target.value as Dimension)}
          >
            {["source", "medium", "campaign"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Display label
          <input
            required
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder="ABC WhatsApp Group"
          />
        </label>
        <label>
          Raw values{" "}
          <span className="subtle">one per line · exact, case-sensitive</span>
          <textarea
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
              Cancel edit
            </Button>
          )}
          <Button className="primary" disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}{" "}
            {editing ? "Save label" : "Add label"}
          </Button>
        </div>
      </form>
      <div className="label-list">
        {labels
          .filter((l) => l.dimension === dimension)
          .map((l) => (
            <div key={l.id}>
              <button
                className="text-button"
                onClick={() => {
                  setEditing(l.id);
                  setName(l.name);
                  setValues(l.values.join("\n"));
                }}
              >
                <strong>{l.name}</strong>
                <small>{l.values.join(", ")}</small>
              </button>
              <button
                className="icon-button"
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
              </button>
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
    <Modal title="A reader’s visits" onClose={onClose} wide>
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
          Loading history…
        </p>
      )}
      {data?.visits.map((v) => (
        <section className="visit-card" key={String(v.id)}>
          <div className="visit-heading">
            <strong>{dateTime(Number(v.started_at))}</strong>
            <span className="pill">
              {v.referrer ? siteName(String(v.referrer)) : "Direct / unknown"}
            </span>
          </div>
          <p className="subtle">
            {[v.country && countryName(String(v.country)), v.region, v.city]
              .filter(Boolean)
              .join(" · ") || "Location unknown"}
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
        </section>
      ))}
      {data && !data.visits.length && <Empty title="No retained visits." />}
      {data?.nextBefore && (
        <Button disabled={busy} onClick={() => void load(data.nextBefore!)}>
          {busy ? <Loader2 size={14} className="spin" /> : null}Load older
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
      <section className="panel setting-panel">
        <div className="panel-heading">
          <div>
            <h2>{newSite ? "Your first website" : "Website details"}</h2>
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
            Website name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="My corner of the web"
            />
          </label>
          <label>
            Allowed hostnames
            <input
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
            <Button disabled={busy} className="primary">
              {busy ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <Check size={15} />
              )}{" "}
              {site ? "Save changes" : "Add website"}
            </Button>
          </div>
        </form>
      </section>
      {site && (
        <>
          <section className="panel setting-panel">
            <div className="panel-heading">
              <div>
                <h2>Thoughtful by default</h2>
                <span className="subtle">
                  No IP storage. No fingerprinting. No retry queue.
                </span>
              </div>
              <Leaf size={19} />
            </div>
            <div className="privacy-copy">
              <p>
                A random UUID stays in each reader’s browser. Clearing browser
                storage creates a new identity.
              </p>
              <p>
                Detailed history and statistics are kept for 400 days by
                default. Retention is configured on your server.
              </p>
              <h3>Exclude your own visits</h3>
              <p>
                Run this on your <strong>blog’s origin</strong> in the browser
                console:
              </p>
              <div className="copy-field">
                <code>localStorage.setItem('annu.disabled', 'true')</code>
                <CopyButton value="localStorage.setItem('annu.disabled', 'true')" />
              </div>
              <p className="subtle">
                Reload the blog afterwards. Remove the key to track this browser
                again.
              </p>
            </div>
          </section>
          <section className="panel setting-panel embed-panel">
            <div className="panel-heading">
              <div>
                <h2>A small script. A little understanding.</h2>
                <span className="subtle">
                  This loader starts after page load. Requests are best effort.
                </span>
              </div>
              <Code2 size={19} />
            </div>
            <div className="tracking-options">
              {[
                {
                  label: "25-second heartbeats",
                  value: heartbeat,
                  set: setHeartbeat,
                },
                {
                  label: "Web Vitals",
                  value: performance,
                  set: setPerformance,
                },
                { label: "All outgoing links", value: links, set: setLinks },
                {
                  label: "Keep link query parameters",
                  value: query,
                  set: setQuery,
                },
                { label: "Keep link fragments", value: hash, set: setHash },
              ].map((option) => (
                <label className="checkbox" key={option.label}>
                  <input
                    type="checkbox"
                    checked={option.value}
                    onChange={(e) => option.set(e.target.checked)}
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
              <code>data-annu-link</code> or enable “All outgoing links” above
              with <code>data-links="true"</code> on the tracker. Downloads and
              mailto links are included. Astro ClientRouter is supported.
            </div>
          </section>
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
        <span className="eyebrow">YOUR CORNER OF THE WEB</span>
        <h1>
          A little understanding
          <br />
          goes a long way.
        </h1>
        <p className="muted">
          Thoughtful analytics for the independent web.
          <br />
          Sign in to see who your words are reaching.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/login", { password });
              onLogin();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Administrator password
            <input
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
          <Button className="primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : null}Step inside
            <ArrowUpRight size={16} />
          </Button>
        </form>
        <div className="login-foot">
          <Leaf size={14} />
          Self-hosted. Quietly yours.
        </div>
      </div>
    </div>
  );
}

function App() {
  const requestSequence = useRef(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null),
    [sites, setSites] = useState<Site[]>([]),
    [siteId, setSiteId] = useState(""),
    [page, setPage] = useState<Page>("overview"),
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
    setSiteId((previous) =>
      result.some((s) => s.id === previous) ? previous : result[0]?.id || "",
    );
  }, []);
  useEffect(() => {
    if (authenticated) void loadSites().catch((e) => setError(e.message));
  }, [authenticated, loadSites]);
  const refresh = useCallback(async () => {
    if (!siteId || !authenticated || document.visibilityState === "hidden")
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
  }, [siteId, authenticated, rangeKey, page]);
  useEffect(() => {
    setReport(undefined);
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
    setSiteId(s.id);
    setAddingSite(false);
  };
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
      name: "Time per visit",
      numeric: true,
      render: (r) => duration(r.duration),
    },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="site-selector">
          <span className="site-avatar">
            {site?.name[0]?.toUpperCase() || "+"}
          </span>
          <select
            aria-label="Current website"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            {!sites.length && <option value="">Add a website</option>}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">YOUR ANALYTICS</span>
        <nav>
          {navigation.map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              {name}
              {id === "referrers" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`settings-nav ${page === "settings" ? "active" : ""}`}
            onClick={() => setPage("settings")}
          >
            <Settings2 size={18} />
            Settings
          </button>
          <div className="sidebar-note">
            <span className="leaf-circle">
              <Leaf size={16} />
            </span>
            <p>
              For a more
              <br />
              <strong>connected web.</strong>
            </p>
          </div>
          <button
            className="sign-out"
            onClick={async () => {
              try {
                await api("/api/logout", {});
                setAuthenticated(false);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>{site?.domains[0] || "Your website"}</span>
            <ChevronRight size={13} />
            <strong>
              {page === "settings"
                ? "Settings"
                : navigation.find((n) => n.id === page)?.name}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="live-badge">
              <span />
              {report
                ? `${fmt(report.totals.live)} here now`
                : "Listening quietly"}
            </span>
            <div className="avatar" title="Administrator">
              A
            </div>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "overview" ? "THE BIG PICTURE" : "A CLOSER LOOK"}
              </span>
              <h1>{titles[page][0]}</h1>
              <p>{titles[page][1]}</p>
            </div>
            <div className="page-actions">
              {page === "settings" ? (
                <Button onClick={() => setAddingSite(true)}>
                  <Plus size={15} />
                  Add website
                </Button>
              ) : (
                <>
                  <label className="date-select">
                    <Clock3 size={14} />
                    <select
                      aria-label="Date range"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    >
                      <option value="1">Today</option>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                      <option value="365">Last 12 months</option>
                      <option value="custom">Custom range</option>
                    </select>
                    <ChevronDown size={13} />
                  </label>
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
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label>
                Through (UTC)
                <input
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
              <button className="text-button" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          )}
          {!sites.length ? (
            <SiteSettings onSaved={saved} newSite />
          ) : page === "settings" ? (
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
                      title="The paths they take"
                      subtitle="Your most-read pages"
                      rows={report.paths.map((p) => ({
                        name: p.path,
                        value: p.views,
                      }))}
                      type="path"
                      onMore={() => setPage("pages")}
                    />
                    <Ranking
                      title="Connections that count"
                      subtitle="Where your readers come from"
                      rows={report.referrers.map((r) => ({
                        name: r.name,
                        value: r.visits,
                      }))}
                      type="referrer"
                      onMore={() => setPage("referrers")}
                    />
                  </div>
                  <div className="connection-note">
                    <span className="leaf-circle">
                      <Leaf size={18} />
                    </span>
                    <p>
                      Behind every number, a little curiosity.
                      <span>
                        Your words found {fmt(report.totals.visitors)} browser{" "}
                        {report.totals.visitors === 1
                          ? "identity"
                          : "identities"}{" "}
                        in this period.
                      </span>
                    </p>
                    <span className="note-line" />
                  </div>
                </>
              )}
              {page === "pages" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Page breakdown</h2>
                      <span className="subtle">
                        Reading time on a path ÷ distinct visits to that path.
                      </span>
                    </div>
                    <FileText size={18} />
                  </div>
                  <DataTable rows={report.paths} columns={pathColumns} />
                </section>
              )}
              {page === "referrers" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Incoming connections</h2>
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
                        name: "Referring website",
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
                        name: "Time per visit",
                        numeric: true,
                        render: (r) => duration(r.duration),
                      },
                    ]}
                  />
                </section>
              )}
              {page === "outgoing" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Outgoing connections</h2>
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
                            <small className="pill">{r.kind}</small>
                          </div>
                        ),
                      },
                      {
                        key: "path",
                        name: "From page",
                        render: (r) => <span className="mono">{r.path}</span>,
                      },
                      { key: "clicks", name: "Clicks", numeric: true },
                      { key: "visitors", name: "Visitors", numeric: true },
                    ]}
                  />
                </section>
              )}
              {page === "utm" && site && (
                <Utm
                  report={report}
                  site={site}
                  reload={() => void refresh()}
                />
              )}
              {page === "visitors" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>A history of visits</h2>
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
                        name: "Browser identity",
                        render: (r) => (
                          <button
                            className="visitor-link mono"
                            onClick={() => setVisitor(r.visitorId)}
                          >
                            <span className="visitor-dot" />
                            {r.visitorId.slice(0, 8)}
                            <ArrowUpRight size={13} />
                          </button>
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
                        name: "Last seen",
                        render: (r) => dateTime(r.lastSeen),
                      },
                      { key: "visits", name: "Visits", numeric: true },
                      { key: "views", name: "Views", numeric: true },
                      {
                        key: "duration",
                        name: "Reading time",
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
                        Load older visitors
                      </Button>
                    </div>
                  )}
                </section>
              )}
              {page === "performance" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Real-world performance</h2>
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
                        render: (r) => <span className="pill">{r.metric}</span>,
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
                </section>
              )}
              {page === "locations" && (
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Where words travel</h2>
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
                      { key: "region", name: "Province / region" },
                      { key: "city", name: "City" },
                      { key: "visitors", name: "Visitors", numeric: true },
                      { key: "visits", name: "Visits", numeric: true },
                    ]}
                  />
                </section>
              )}
            </>
          )}
          {sites.length > 0 && page !== "settings" && (
            <footer>
              <span>
                <span className={`status-dot ${error ? "offline" : ""}`} />
                {error
                  ? "Connection interrupted"
                  : refreshing
                    ? "Refreshing…"
                    : updated
                      ? `Updated ${new Date(updated).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                      : "Waiting for data"}
                <button
                  className="icon-button"
                  aria-label="Refresh analytics"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                >
                  <RefreshCw size={12} className={refreshing ? "spin" : ""} />
                </button>
              </span>
              <span>
                Made for the independent web <Leaf size={12} />
              </span>
            </footer>
          )}
        </main>
      </div>
      {addingSite && (
        <Modal
          title="Another corner of the web"
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
          title="Take your data with you"
          onClose={() => setExporting(false)}
        >
          <p className="muted">
            Export raw records for the selected date range. Exports stream in
            small batches.
          </p>
          <label>
            Records
            <select
              value={exportKind}
              onChange={(e) => setExportKind(e.target.value)}
            >
              <option value="views">Pageviews and reading times</option>
              <option value="visits">
                Visits, entry sources, and location
              </option>
              <option value="clicks">Outgoing clicks</option>
              <option value="vitals">Performance samples</option>
            </select>
          </label>
          <label>
            Format
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <div className="form-actions">
            <a
              className="button primary"
              href={`/api/sites/${siteId}/export?from=${from}&to=${to}&kind=${exportKind}&format=${exportFormat}`}
              download
              onClick={() => setExporting(false)}
            >
              <Download size={15} />
              Download export
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
