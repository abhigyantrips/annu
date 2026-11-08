# annu

Thoughtful, self-hosted analytics for the independent web. Annu focuses on who finds your writing, what they read, how long they stay, and which links they follow.

Built with **Fastify, TypeScript, Drizzle, SQLite WAL, and React**. One application instance, one local database file, no Redis, no remote geolocation service. All database work runs in dedicated worker threads: a writer for short transactions and a read-only worker for dashboard queries.

## Run with Docker Compose

Use a **64-bit operating system** on the Raspberry Pi (ARM64), with Docker and Compose installed. The Dockerfile also supports AMD64. SQLite requires a local filesystem; use a named Docker volume on local storage, preferably an SSD. Do not put the database on NFS or SMB.

```sh
cp .env.example .env
# Set ADMIN_PASSWORD in .env to a unique password of at least 12 characters.
# Set PUBLIC_ORIGIN to the browser-facing URL, e.g. https://ego.abhi.now.
docker compose up -d --build
```

Open `http://localhost:3000` locally, or configure your existing HTTPS proxy to forward `ego.abhi.now` to `127.0.0.1:3000`. Sign in with `ADMIN_PASSWORD`, add your website, and copy the loader from **Settings**. There are no default credentials. The cookie is HttpOnly, SameSite=Strict, and Secure when PUBLIC_ORIGIN uses HTTPS. The dashboard is private; site IDs are public collection identifiers.

Compose binds to loopback by default. To place an existing proxy in another Docker container, attach it and Annu to a shared Docker network and proxy to `annu:3000`, or explicitly change the port binding for your environment. Do not expose a plain HTTP dashboard directly on the internet.

The app generates a session signing key on first startup and persists it alongside the database. Preserve this file across restarts. Changing `ADMIN_PASSWORD` requires a container restart; existing login cookies remain valid for up to seven days. Remove/rotate `session.key` (or change SESSION_SECRET) and restart to invalidate all existing sessions.

## Local development

From the repository root, with Node.js 22 or later and **pnpm 12.14.0** (pinned in `package.json`). If needed, install pnpm using its [official installation instructions](https://pnpm.io/installation). Use `pnpm-lock.yaml` for reproducible installs:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env before starting:
# ADMIN_PASSWORD: choose a unique password of at least 12 characters.
# PUBLIC_ORIGIN=http://127.0.0.1:5173
pnpm run dev
```

Open `http://127.0.0.1:5173` and sign in with the password you set. Use this exact origin when PUBLIC_ORIGIN is configured as above; `localhost` and `127.0.0.1` are different origins. Vite serves the dashboard and proxies API, tracker, and health requests to Fastify on port 3000. Keep both ports available; the development launcher starts both processes and Ctrl+C stops them.

The dashboard uses Vite hot reload, the tracker rebuilds on edits, and the HTTP server uses Node's watch mode. **Database worker code is bundled at development startup**, so stop and restart `pnpm run dev` after changing the worker, database operations, or schema. Drizzle migrations are applied at server startup; after changing the schema, run `pnpm run db:generate` and restart development. The default database is `data/annu.db`; `.env`, database files, and generated builds are ignored by Git.

`pnpm-workspace.yaml` keeps dependency overrides and native-build permissions in version control. Install scripts are allowed for `better-sqlite3` and `esbuild`, which need native bindings/platform binaries. The test command explicitly builds the database worker first, so it does not depend on implicit pre/post script behavior.

To try the production build locally, set PUBLIC_ORIGIN to `http://localhost:3000`, then run `pnpm run build && pnpm start` and open that URL. Set PUBLIC_ORIGIN back to the Vite origin before returning to development. No Docker installation is required for local development.

```sh
pnpm run check
pnpm test
pnpm run build
pnpm run bench
```

### Optional synthetic demo

The real application starts empty. Demo data lives in a **separate** database and is never injected into the normal database:

```sh
pnpm run seed:demo
DATABASE_PATH=./data/demo.db pnpm start
```

Start only after configuring ADMIN_PASSWORD in `.env`. The seeder refuses to add data to an existing nonempty demo database. Set `DEMO_DATABASE_PATH` to choose a different demo database. Demo records are synthetic, including the example referrers and outgoing destinations.

## Dashboard structure

The dashboard uses React and Vite with TanStack Router file-based routes in `src/dashboard/routes`. Each route delegates to a feature in `src/dashboard/features`; shared layout/UI belongs in `components`, and API/date utilities belong in `lib`. Keep `main.tsx` limited to application providers. The Vite router plugin generates `routeTree.gen.ts`; commit this generated file so type checking works on a fresh checkout, and run `pnpm build` after adding routes.

TanStack Query owns fetched reports, websites, visitor pagination/history, and labels. Query keys include the website and relevant filters; mutations invalidate affected caches. Temporary UI state stays in React. Site IDs and page names are route parameters; date presets and custom dates are validated URL search parameters. Adding a page should not require adding rendering branches or fetching state to the layout.

Analytics load on navigation/filter changes, with a 60-second freshness window for cached results. Window focus and reconnect do not trigger refreshes. Use Refresh for a new snapshot, or enable **Live** for five-second polling while the dashboard is visible. Live is off by default. Visitors fetch their own paginated activity; settings do not load analytics reports. Report views currently share the existing report endpoint and cache.

Recharts provides traffic and UTM hover tooltips. **Today** means UTC midnight to the fetch time; **Last 24 Hours** is a rolling window. These use hourly buckets, including partial edge hours. Other presets and custom ranges use daily buckets. Empty intervals display as zero. The traffic chart overlays darker visitor counts on lighter page-view bars for each time bucket, with both values in the hover tooltip. Distinct visitors/visits across buckets overlap; range totals are computed separately.

Umami's [metric definitions](https://docs.umami.is/docs/metric-definitions) distinguish visitors/session identities from visits, with visit IDs based on an hourly rotating salt and visits able to span hourly intervals. Annu uses distinct visit IDs too, but retains its existing 30-minute inactivity grouping and localStorage visitor identities; this dashboard refactor does not change collection or reinterpret historical records.

The Overview also has Environment (Browsers / OS / Devices) and Location (Countries / Regions / Cities) panels. They fetch the selected dimension on demand for the same snapshot range as the traffic report, with distinct visitors per group and shares of total visitors. A visitor can appear in multiple groups. Country/region/city counts are queried independently; counts are never obtained by adding child locations. Regions and cities are scoped by country (and cities by region). Locations still require trusted Cloudflare headers. Unknown buckets, including older visits without environment data, are omitted from breakdown lists; overall visitor totals still include them.

New visits store broad browser, operating system, and device categories parsed server-side with Bowser from the request User-Agent. Raw User-Agent strings and version details are not stored. Device detection is approximate (for example, an iPad using a desktop User-Agent can look like a desktop). Existing records are preserved by the nullable-column migration and cannot be backfilled with environment data.

`GET /api/sites/:siteId/audience?from=<ms>&to=<ms>&dimension=<browser|os|device|country|region|city>` uses the existing session authentication and range validation. `dimension` is required. It returns `{rows: [{name, country, region, visitors}], visitors}` with the top ten known groups in descending visitor order; country/region are nullable context, and `visitors` is the distinct total before the top-ten limit. Invalid dimensions/ranges return 400; unauthenticated requests return 401. Empty ranges return an empty list and zero visitors.

Flags use the MIT-licensed HatScripts `circle-flags` SVG set, pinned to an upstream Git commit. Vite emits local SVG assets and loads the flags actually displayed, without a CDN or a flag CSS sheet. Unknown or unsupported codes use a globe. Country flags accompany regions/cities; subdivision flags are not inferred. The flag package's license is retained in the dependency.

## Tracker installation

The recommended loader downloads and starts the tracker **after the page's load event**, so an unavailable analytics server cannot hold up the initial page load. Copy a site-specific version from Settings. In an Astro `.astro` layout, use **`<script is:inline>`** for the loader; keep it in the shared layout, without `data-astro-rerun`. The tracker survives ClientRouter swaps, hooks history navigation and Astro lifecycle events, and avoids duplicate pageviews for the same URL.

For a conventional script installation (the script download itself can participate in browser loading):

```html
<script
  async
  src="https://ego.abhi.now/script.js"
  data-site-id="YOUR_SITE_UUID"
  data-domains="abhi.now,www.abhi.now"
  data-heartbeat="true"
  data-performance="true"
></script>
```

`/stroke.js` is an alias for the tracker. Both `data-site-id` and `data-website-id` are accepted. Add every tracked hostname to the site's server-side allowlist, including `www` variants or local development ports. The browser-side data-domains attribute is an additional guard, not an authentication mechanism. Origin checks prevent accidental collection from other sites; arbitrary clients can still forge analytics packets, as with other public analytics collectors.

| Attribute          | Default                           | Behavior                                                                                      |
| ------------------ | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `data-heartbeat`   | `false`                           | `true`: cumulative reading checkpoint every 25 seconds while visible and still accruing time. |
| `data-performance` | `true`                            | Web Vitals LCP, INP, CLS, TTFB and FCP where supported.                                       |
| `data-links`       | `false`                           | `true`: all outgoing HTTP(S), download and mailto links.                                      |
| `data-link-query`  | `false`                           | Retain query parameters on opted-in links.                                                    |
| `data-link-hash`   | `false`                           | Retain fragments on opted-in links.                                                           |
| `data-endpoint`    | script directory + `/api/send` | Override the collection URL, including same-origin proxy paths.                               |

Individual links are opt-in even when automatic outgoing tracking is disabled:

```html
<a href="https://friend.example/post" data-annu-link>A friend's writing</a>
<a href="/files/essay.pdf" download data-annu-link>Download this essay</a>
<a href="mailto:hello@example.com" data-annu-link>Say hello</a>
```

`data-links` on an individual anchor is also accepted. `data-annu-link="false"` excludes an anchor, including when all-link tracking is enabled. Same-origin regular navigation links are not outgoing clicks. An outgoing click does not mean that the destination loaded successfully. The tracker never cancels clicks, changes hrefs, or waits for analytics before navigation.

For owner exclusion, run this on the **tracked site's origin**, then reload:

```js
localStorage.setItem("annu.disabled", "true");
// Undo:
localStorage.removeItem("annu.disabled");
```

### Delivery and page experience

Pageviews, optional heartbeats and vitals use small, asynchronous `text/plain` POSTs with an 1.8-second client abort deadline. Cross-origin requests avoid preflight; the collector returns only a 204. A failed fetch opens a 60-second circuit breaker. There is **no persistent queue, offline buffer, or retry**. At most four fetches can be in flight. Browser navigation does not wait for these requests.

On visibility-hidden/pagehide and opted-in clicks, one `sendBeacon` is attempted. There is no fallback or retry if queuing fails. Beacons are browser-managed and have no JavaScript cancellation deadline, so timing is intentionally best effort. Annu cannot control every browser's network-status UI, and any request remains visible in developer tools. The after-load loader and absence of blocking handlers protect the page's actual load/navigation path.

If the initial pageview is lost, dependent packets are dropped server-side. If the visitor leaves before a checkpoint, measured time may be zero. Heartbeats reduce loss; they do not make delivery guaranteed. No server-side durable queue is added: successful responses acknowledge a committed SQLite transaction; overload or write failure returns promptly with an error. Worker queues are bounded to 128 jobs; SQLite busy timeout is 150 ms and operation deadline is 5 seconds. Production latency on your Pi should be measured rather than inferred from development results.

### Same-origin proxy, if desired

You can proxy the script and collector through your blog's domain instead of a separate analytics hostname. For example, forward `/a/script.js` to `/script.js` and `/a/api/send` to `/api/send` on Annu. The tracker derives `/a/api/send` automatically from `/a/script.js`; `data-endpoint` can override it. Preserve the browser's `Origin` and trusted Cloudflare location headers. Set your site's CSP to allow the chosen script and collection endpoint. Cache the script, **never** the collection endpoint or authenticated APIs.

## Metrics and privacy contract

- **Visitor:** a random, site-scoped UUID stored at `annu.visitor.<site-id>` in localStorage. Clearing storage or a separate private browsing context creates a different identity. If storage is unavailable, an in-memory UUID lasts only for that document. IDs are not linked across sites or devices; this is pseudonymous activity, not proof of a person's identity.
- **Visit:** the server groups a site's matching visitor UUID while its latest activity is less than 30 minutes old. Tabs share visits. Returning after 30 minutes of inactivity starts a fresh logical pageview on interaction/visibility restoration. Views, accruing reading checkpoints and clicks extend visit activity; vitals do not.
- **View:** initial page load, reload, or a pathname/search navigation. Fragment-only changes are not new views. Paths are stored without query strings or fragments; only explicitly selected UTM fields are retained. Back/forward-cache restoration counts as a fresh view.
- **Reading time:** visible page time, capped after 15 minutes without input. Pointer, keyboard, scroll and touch input resume accrual. Hidden tabs never accrue time. Two visible windows may each accrue time; this is an estimate of visible reading opportunity, not measured human attention.
- **Per-path time per visit:** sum of measured time on views of that path divided by distinct visits containing it. Repeated reads in a visit are summed; missing timing remains zero. Overall time per visit sums page time and divides by visits in the report.
- **Referrer:** the external origin of the visit's entry page. Internal navigation never overwrites it. Missing referrers are omitted from referrer lists but remain in overall traffic totals; chat apps and privacy controls can suppress them. Exact referring article URLs are intentionally not stored.
- **UTM:** source, medium and campaign captured at visit entry. A label maps several exact, case-sensitive raw values **within one dimension**. Each raw value belongs to at most one label per dimension/site. Reports group at query time, so edits and deletion apply retroactively. Raw values are preserved; matching is not regex-based.
- **Outgoing clicks:** explicitly selected links, grouped by destination, originating path and link kind, with total clicks and distinct clicking visitor UUIDs. Query strings and fragments are stripped by default. Mailto destinations retain the email address deliberately present in the link, which may be personal information; collect only links you intend to store.
- **Performance:** Google's `web-vitals` library, deduplicated and updated by pageview and metric. Standard metrics describe the document's initial route, not invented SPA-route LCP measurements. Nearest-rank P50/P75/P95 and actual sample counts are shown. Unsupported or unobserved metrics stay absent. BFCache restores start a fresh document-metric association.
- **Geography:** Cloudflare country/region-code/city headers only. No IP lookup and no IP addresses stored in analytics. Missing values stay Unknown. Data is approximate. Full URLs, referrer paths, IPs, raw user agents, keystrokes, and page contents are not collected. Page titles and UTM values are collected and may contain personal information if your site puts it there.

Reports filter views by their start time, clicks by click time, and performance by the associated view's start time. A visit that crosses midnight can appear in both daily reports; distinct visitor/visit totals cannot be obtained by summing daily counts. Charts and date filters use UTC; activity timestamps display in the administrator's local timezone. The live count is UUIDs active during the last five minutes, independent of the selected reporting period. With heartbeat disabled, “live” is necessarily less complete.

Reports display up to 1,000 paths/referrer origins/location groups/outgoing groups and UTM groups per dimension, and 5,000 performance groups. Tables search and sort the returned groups; use raw exports for complete event data. CSV/JSON exports are streamed in 1,000-record batches. Treat exports during active collection as a best-effort view, not a transactional database backup. CSV cells are protected against spreadsheet-formula injection.

There are no goals, funnels, journeys, retention analysis, replays, heatmaps, user-management, consent UI, automatic opt-out UI, or Umami importer. Known bots are excluded at collection using the `isbot` User-Agent detector, following [Umami’s approach](https://github.com/umami-software/umami/blob/master/src/app/api/send/route.ts). This applies to views, reading time, clicks and vitals before any database writes; ignored requests receive the usual empty 204 response. Set `DISABLE_BOT_CHECK=true` and restart to collect bot events too. Missing User-Agent headers remain accepted, matching `isbot` behavior. User-Agent strings are inspected without being stored. Bots that spoof normal browser User-Agents can still be counted; this does not remove historical bot traffic. Owner exclusion is available, and any additional privacy controls are the embedding site's responsibility.

## Cloudflare location configuration

Following [Umami's Cloudflare guidance](https://docs.umami.is/docs/enable-cloudflare-headers), enable **Rules → Settings → Managed Transforms → Add visitor location headers** for the hostname handling analytics collection, then set:

```dotenv
TRUST_CLOUDFLARE_HEADERS=true
```

The collector reads `CF-IPCountry`, `CF-Region-Code`, and `CF-IPCity`. Putting only the blog behind Cloudflare does not attach these headers to requests made to an unrelated collector hostname. Ensure your trusted proxy forwards them to Annu:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header Origin $http_origin;
    proxy_set_header CF-IPCountry $http_cf_ipcountry;
    proxy_set_header CF-Region-Code $http_cf_region_code;
    proxy_set_header CF-IPCity $http_cf_ipcity;
    proxy_connect_timeout 2s;
    proxy_read_timeout 6s;
}
```

**Only enable header trust when your proxy/origin is restricted to trusted Cloudflare traffic.** Otherwise a direct caller can forge location headers. Annu does not interpret arbitrary forwarded IP headers or need visitor IPs. Configure your reverse proxy and Cloudflare logs separately if you also want them to avoid retaining IPs. Annu disables automatic request logging; its errors log operation names and database errors, without request bodies or visitor addresses.

## Retention, backups, updates

Default retention is **400 days**, based on the last activity of each visit. Cleanup runs in small batches every minute and cascades to its views, clicks and vitals. Set RETENTION_DAYS to 0 for indefinite retention, or any integer >=366. Visitor IDs with no retained visits are removed. Long-lived visits can retain earlier views longer than the configured period.

Create a consistent online backup with SQLite's backup API:

```sh
docker compose exec annu node scripts/backup.mjs /app/data/backup.db
docker compose cp annu:/app/data/backup.db ./annu-backup.db
```

Preserve `session.key` separately if you want existing logins to survive restoration. To restore, stop the container, replace the database with the backup (owned by UID 1000), remove the old database's `-wal` and `-shm` files **while stopped**, then restart. Don't copy only a live SQLite main file and assume it includes WAL commits. Don't use `docker compose down -v` unless you intend to delete all analytics data.

Updates: back up, pull source changes, then `docker compose up -d --build`. Migrations run before the HTTP server starts; do not run multiple Annu writer instances against the same file.

## Reference and implementation notes

The initialization handoff, including the user's requirements, decisions, reasoning, verification results, and remaining limitations, is in [slopdocs/1_INITIALIZATION.md](slopdocs/1_INITIALIZATION.md).

Umami is the behavioral reference, not a runtime dependency. The tracker at [cloud.umami.is/script.js](https://cloud.umami.is/script.js), its [metric definitions](https://docs.umami.is/docs/metric-definitions), and [Cloudflare guide](https://docs.umami.is/docs/enable-cloudflare-headers) were inspected during development. Annu is an independent implementation. Umami's current documentation describes a hashed default identifier; Annu deliberately uses the persistent browser UUID requested for this project.

Ingestion uses Drizzle with prepared, parameterized SQLite operations and indexed lookups. It performs no geolocation network calls, migrations, or dashboard aggregations on the request path. WAL readers run separately from the single writer; reporting can still compete for CPU and storage, so this is not a claim of unlimited throughput. Retention is bounded, writes are durable, and overload is allowed to lose events. No ingestion performance guarantee is claimed without testing on the target Raspberry Pi and storage.

`pnpm run bench` starts a temporary server/database, sends 1,000 pageviews at concurrency 10 while fetching reports, then removes its temporary data. It reports HTTP latency percentiles, errors, throughput, and process RSS. Override BENCH_EVENTS and BENCH_CONCURRENCY to test your hardware. The benchmark does not modify the application database. To manually verify the tracker in a real browser, run `node scripts/serve-fixture.mjs` and open `http://localhost:3100/?site=SITE_UUID` using a site that allows `localhost:3100`; the fixture records outgoing packets and prevents test-link navigation after the tracker observes each click.

## Credits

The “annu.” logo uses [Architects Daughter](https://fonts.google.com/specimen/Architects+Daughter) by Kimberly Geswein, converted to SVG outlines. The font is licensed under the [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/architectsdaughter/OFL.txt).


- Browser icons come from [Browser Logos](https://github.com/alrra/browser-logos): [Chrome](https://github.com/alrra/browser-logos/blob/main/src/chrome/chrome.svg), [Firefox](https://github.com/alrra/browser-logos/blob/main/src/firefox/firefox.svg), [Safari](https://github.com/alrra/browser-logos/blob/main/src/safari/safari.svg), [Edge](https://github.com/alrra/browser-logos/blob/main/src/edge/edge.svg), [Opera](https://github.com/alrra/browser-logos/blob/main/src/opera/opera.svg), [Brave](https://github.com/alrra/browser-logos/blob/main/src/brave/brave.svg), and [Samsung Internet](https://github.com/alrra/browser-logos/blob/main/src/samsung-internet/samsung-internet.svg). See the [project license](https://github.com/alrra/browser-logos/blob/main/LICENSE.txt) and [logo/trademark notice](https://github.com/alrra/browser-logos#legal); logos remain the property of their respective owners.
- Operating-system icons come from [Devicon](https://github.com/devicons/devicon): [Android](https://github.com/devicons/devicon/blob/master/icons/android/android-original.svg), [Apple (macOS/iOS)](https://github.com/devicons/devicon/blob/master/icons/apple/apple-original.svg), [Linux](https://github.com/devicons/devicon/blob/master/icons/linux/linux-plain.svg), and [Windows](https://github.com/devicons/devicon/blob/master/icons/windows11/windows11-original.svg). See the [MIT license](https://github.com/devicons/devicon/blob/master/LICENSE).
- Interface and device icons use [Lucide (ISC license)](https://github.com/lucide-icons/lucide/blob/main/LICENSE) and [Hugeicons Free (MIT license)](https://cdn.jsdelivr.net/npm/@hugeicons/core-free-icons@4.4.0/LICENSE.md).
- Country icons use [circle-flags (MIT license)](https://github.com/HatScripts/circle-flags/blob/379588b5da95482d6bbf10bd45644a35b0609ea6/LICENSE.md).
- Visitor avatars use [Adventurer Neutral](https://www.dicebear.com/styles/adventurer-neutral/) by [Lisa Wischofsky](https://www.figma.com/community/file/1184595184137881796), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), rendered locally with DiceBear and recolored using its Sepia preset. Each site/browser ID pair deterministically generates the same avatar; no avatar service or image storage is used.
