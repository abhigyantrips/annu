# 1. Initialization: context, decisions, and handoff

Recorded on 2026-11-05 at the user's request so another thread can continue the project. This is a record of the initialization conversation and implementation, not a new feature brief. User requirements, implementation choices, and unverified assumptions are distinguished below. Read [the README](../README.md) for operating instructions and the source for current behavior if it changes after this handoff.

### Follow-up: package manager

The user subsequently instructed: **use pnpm instead of npm**. This supersedes the initialization's package-manager choice. Local development, validation, and Docker dependency installation now use pnpm; the commands below reflect that preference. `package.json` pins pnpm 12.14.0, `pnpm-lock.yaml` replaces the old lockfile, and `pnpm-workspace.yaml` declares the Drizzle tooling's esbuild override plus build permissions for better-sqlite3/esbuild. The Docker build copies that same pinned pnpm distribution from its official Debian image. The test script explicitly builds the worker before invoking tests rather than relying on an implicit pretest hook. Preserve pnpm in future tooling and documentation changes.

Migration verification passed: frozen-lockfile installation, TypeScript, all 19 tests, the production build, and `pnpm audit` with no known vulnerabilities. A separate clean temporary installation was pruned to production dependencies and successfully loaded Fastify, Drizzle, and the native SQLite binding. This validates the dependency/pruning flow locally; the Docker/ARM64 execution limitation below still applies. The existing patched `@fastify/static@10.1.10` has an exact minimum-release-age exception in workspace settings so converting the existing lockfile does not force a different version.

### Follow-up: Git repository

The user then requested a Git repository they can publish themselves. The project is initialized on `main` with an initial commit. Local environment files, database files/signing keys under `data/`, dependencies, and generated builds are excluded. No remote is configured and nothing is published or pushed by this thread. References below to having no commit describe the earlier implementation phase.

## Product purpose and user context

The project is **Annu**, an independently implemented, self-hosted analytics application for an indieweb website. Its purpose is to help a writer understand their content and connections: who sends readers, which writing they visit, how long they spend there, and which links they follow. Avoid turning it into a general marketing analytics suite.

The user is a professional developer, comfortable with TypeScript stacks and technical tradeoffs. They explicitly invited detailed clarification before implementation, answered the questions, and then authorized implementation. They suggested Astro or Fastify as reasonable stack options; neither was a mandatory choice.

Their blog is **abhi.now**, uses **Astro ClientRouter**, and currently uses self-hosted Umami at **ego.abhi.now**. Their installation uses an Umami-provided script tag, a site ID, a renamed script such as `/stroke.js`, and `data-domains`. Do not assume either real hostname has been migrated to Annu: no production deployment or blog integration was performed in this thread.

Their target machine is a **Raspberry Pi 4B with 8 GB RAM**, running a single application instance on one machine using Docker/Compose. They reported that their existing Umami installation reaches roughly 1 GB RAM. Actual traffic volume, spike size, storage device, and Pi operating-system architecture were not supplied.

### Why this exists

The user has experienced Prisma-related timeouts in their actual Umami installation, causing gateway failures, and has not experienced the same with Drizzle. They explicitly understand that changing an ORM does not by itself guarantee faster ingestion. Nevertheless, **using Drizzle instead of Prisma is a settled requirement**, not an invitation to revisit their diagnosis. Database-provider details were left open for a practical initial choice and later reassessment.

Umami's missing/insufficient view-time behavior also required them to add heartbeats. They dislike analytics requests causing loading issues or making visitors wonder why `ego.abhi.now` is taking so long to respond.

The highest-priority tradeoff is **visitor experience over analytics completeness**. The user said event loss during outages is acceptable, even welcome, and does not want browsers accumulating a backlog to send when the Pi returns. Do not introduce reliable-delivery queues or navigation delays as an unsolicited improvement.

## Scope agreed with the user

### Visitor identity and activity history

- Assign a random browser-generated UUID, persist it in localStorage, and associate activity across days with it.
- A new ID after storage clearance or in a separate private browsing context is acceptable.
- A visitor timeline should contain arrival source, visited pages with timestamps, time on those pages, and outgoing clicks.
- Multiple tabs should share a visit where appropriate.
- This activity timeline is required even though journey analysis and funnels are explicitly excluded.
- No logged-in identity, cross-device matching, or fingerprint-derived visitor identity was requested.

The user initially described Umami as using a localStorage UUID. We checked its tracker and documentation, explained the distinction, and retained **the user's explicitly chosen UUID behavior** rather than reproducing Umami's default identification mechanism. See the identity comparison below.

### Geographic information

- Country, province/region, and city come **only from Cloudflare-forwarded headers**, following Umami's self-hosting guidance.
- Unknown location is acceptable when headers are absent.
- No local GeoIP database, external geolocation service, or IP-based fallback is wanted.
- The actual analytics request must traverse the appropriately configured Cloudflare/proxy chain; putting only the blog behind Cloudflare is insufficient.

### Incoming referrers

- **Referrers are the user's most important analytics feature**: understanding which websites link to them.
- Origin alone is sufficient; exact referring article paths are unnecessary.
- Missing or suppressed referrers must remain direct/unknown, not be invented or inferred.
- We discussed browser referrer-policy limitations. Backlink discovery/Webmention was not requested for implementation.

### Time measurement and navigation

- Use visible page time, with an approximately **15-minute inactivity cutoff**.
- **25-second heartbeats are acceptable only as a user-enabled flag**.
- Best-effort measurement is acceptable; loading/navigation experience takes priority over final timing delivery.
- SPA support is required because the blog uses Astro ClientRouter.
- For a path, the requested average is **time spent per visit on that path**, not an average over individual views.
- A visit uses the accepted **30-minute inactivity boundary**. The 15-minute reading cutoff and 30-minute visit boundary serve different purposes.

### UTM attribution and labels

- A dedicated UTM page exposes **Source, Medium, and Campaign**, with pie/donut-style distribution charts similar in purpose to Umami.
- Each dimension independently supports configurable one-label-to-many-raw-values relationships.
- Example: campaign values `abc`, `abc_group`, and `abc_grp` all appear under the label **ABC Group** or **ABC WhatsApp Group**.
- The user corrected an initial interpretation involving combined source/campaign matching: **these are independent mappings within each UTM dimension**, not compound attribution rules.
- Exact, case-sensitive matching, raw-value preservation, retroactive display-label resolution, and visit-entry attribution are implementation choices made for the initial version. They were not all separately prescribed by the user.

### Per-path reporting, outgoing links, and performance

- Show per-path visitors, visits, views, and visit duration.
- Outgoing metrics include destination domain/path, originating path, total clicks, and distinct clicking visitor IDs.
- Downloads and `mailto:` links are included.
- Outgoing tracking must be explicitly opted into, either for marked links or via an explicit tracker flag. Do not silently track every link by default.
- Strip outgoing query parameters and fragments unless flags explicitly enable retaining them.
- Include standard performance analytics. The user accepted the proposed default metrics: LCP, INP, CLS, TTFB, and FCP.
- JavaScript error reporting was not added.

### Administration, data lifecycle, and deployment

- Multiple websites, **one administrator**.
- Users, roles, teams, and permission management are out of scope.
- Keep histories and statistics for **at least one year**.
- Provide CSV and JSON exports.
- Exclude owner traffic when localStorage contains `annu.disabled` with the string value `true`, on the tracked website's origin.
- A separate opt-out/consent UI is out of scope and would be implemented by the embedding website if desired.
- Self-hosting through Docker/Docker Compose is required.
- Umami import is possible future scope, not part of this initialization.

### Explicit exclusions

Do not implement goals, journey analysis, funnels, retention analysis, session replays, or heatmaps. Retention **of stored data** is still required and is distinct from a retention-analysis product feature.

## Architecture selected and reasoning

These are implemented starting choices. Drizzle and the user's behavior requirements are firm; the specific SQLite/provider arrangement can be reassessed against actual deployment evidence.

### Application stack

- **TypeScript + Fastify** for HTTP collection, authentication, and reporting APIs.
- **React + Vite + custom CSS + Lucide icons** for the private dashboard.
- **Drizzle + better-sqlite3 + SQLite WAL** for storage, with committed SQL migrations generated by drizzle-kit.
- **esbuild** bundles the tracker and server entry points.
- Google's **web-vitals** library measures standard browser performance metrics.

Fastify fits a small collector and a single Pi deployment. The dashboard is a separate browser bundle served by the same application in production. Astro remains supported as an embedding site; it was not selected as Annu's application framework.

### Database topology

One dedicated worker thread owns writes and migrations; a separate read-only worker serves reports and exports. Synchronous SQLite operations therefore do not execute on the HTTP event loop. The writer serializes visit creation, which allows simultaneous tabs with the same site/visitor identity to share a visit without a client-managed session race.

WAL permits readers alongside a writer, but this remains a **single-writer, single-machine** design. It is not a multi-replica deployment. Use local storage, not NFS/SMB. SSD storage is a recommendation, not a fact about the user's current hardware.

SQLite uses a 150 ms busy timeout, an approximately 8 MB page-cache budget per connection, and `synchronous=FULL` for durable commits. Each worker has a maximum of 128 outstanding jobs and a five-second caller deadline. Timed-out work remains counted until completed so deadlines do not create an unbounded hidden queue; a caller timeout does not cancel already executing SQL.

There is no Redis, event broker, persistent ingestion buffer, or remote database connection pool. A successful collection response acknowledges a committed transaction. Failures/overload may lose events, as authorized.

### Identity model and privacy tradeoff

Annu creates a random UUID per configured website and stores it at `annu.visitor.<site-id>` on the tracked site's origin. It does not derive identity from an IP address or User-Agent. With unavailable browser storage, it falls back to an in-memory ID for that document.

The user later asked specifically how this differs from Umami. The explanation was:

- Umami's documentation inspected on 2026-11-05 describes a default identifier derived from website ID, IP address, User-Agent, and a rotating salt, monthly by default and configurable when self-hosting.
- Network/IP changes or User-Agent changes can split a hash-based identity; matching inputs on shared networks can merge different browsers. Salt rotation breaks automatic linkage across rotation periods. Clearing storage does not necessarily change those hash inputs.
- Annu's UUID survives network changes and separates browser storage contexts, but storage clearance creates a new identity.
- Annu currently has **no visitor-ID expiration or rotation**. Data cleanup does not expire the UUID in the reader's browser.
- A stable random UUID avoids metadata-derived identification, but enables longer-lived linkage. It is a **pseudonym**, not a guarantee of anonymity or proof of a person. Separate devices/browsers are separate visitors; a shared browser can represent several people.

The user accepted the explanation and asked for this handoff. Do not accidentally replace the UUID with a hash under an assumption that it would reproduce an already agreed Umami mechanism.

### Tracker delivery policy

- Recommend a loader that downloads the tracker **after the window load event**. A normal async script tag is also supported, but its initial download may still participate in page loading.
- Normal sends use asynchronous `text/plain` POSTs, credentials omitted, CORS without a preflight, and a client abort after 1.8 seconds.
- At most four fetches are in flight. A failed fetch activates a 60-second circuit breaker.
- There is no durable browser queue, offline buffer, or retry loop.
- Hidden/pagehide timing, opted-in link clicks, and final hidden-page vitals use best-effort `sendBeacon`; no retry or fallback is added when it cannot queue.
- Beacons are browser-managed and have no application-controlled abort deadline. Do not promise that all browser network-status UI can be suppressed or that analytics requests are invisible in developer tools.
- Link tracking never prevents default navigation, rewrites destinations, or awaits delivery.
- If a view was lost, packets referring to that absent view are dropped rather than queued for reconciliation.

### Metric and attribution contracts

- **Visitor:** distinct site-scoped UUID in the report's observed views.
- **Visit:** server-side grouping of a matching site/visitor while its latest activity is less than 30 minutes old. Views, increasing reading checkpoints, and clicks extend activity; vitals do not.
- **View:** initial load/reload or pathname/search navigation. Fragment-only changes do not create views. BFCache restoration counts as a fresh view. Returning after 30 minutes of inactivity starts a new logical view on interaction or visibility restoration.
- **Path storage:** pathname without search/fragment. Selected UTM fields are extracted separately. Page titles are retained.
- **Reading time:** accrue while visible, stop at 15 minutes without input, resume on pointer/keyboard/scroll/touch activity. Two visible windows can each accrue time; this estimates visible reading opportunity, not actual attention.
- **Timing writes:** cumulative, monotonic, idempotent checkpoints bounded by elapsed server wall time. Duplicate/out-of-order checkpoints do not add time twice.
- **Path duration:** sum of observed time on that path divided by distinct visits containing the path. Repeated views within a visit contribute to that visit's path time; views without timing contribute zero.
- **Overall duration:** total observed page time divided by distinct visits represented in the selected view range.
- **Referrers/UTMs:** attached at visit entry. Internal SPA navigation does not keep reusing the document's original external referrer for a later visit. Missing source stays unknown.
- **UTM labels:** one raw value can belong to only one label per dimension/site. Query-time grouping applies edits to historical reports. Source, medium, and campaign rules are independent.
- **Outgoing clicks:** grouped by normalized destination, originating path, and kind. Clicks are not confirmation that the destination loaded. Retained mailto addresses may themselves be personal information.
- **Performance:** per-document standard Web Vitals, updated/deduplicated by view and metric, with nearest-rank P50/P75/P95 and actual sample counts. Do not claim LCP is automatically remeasured for each Astro route. Unsupported/unobserved values stay absent, not zero.
- **Dates:** charts/filters use UTC; activity timestamps use the administrator's browser timezone. Views are filtered by start time; clicks by click time; vitals by their associated view's start time.
- **Live count:** visitor IDs active in the last five minutes, independent of the selected historical date range. It is less complete without heartbeats.

Distinct visitor/visit counts must not be summed across daily buckets. A visit spanning midnight can appear in multiple daily reports.

### Cloudflare, access, retention, and exports

Location headers are `CF-IPCountry`, `CF-Region-Code`, and `CF-IPCity`, with encoded city handling. `TRUST_CLOUDFLARE_HEADERS` defaults to false. Enable it only when the operator restricts the origin/proxy chain to trusted Cloudflare traffic; the application does not independently authenticate a header's provenance. Missing geography stays unknown.

Server-side hostname and request-origin validation supplement the tracker's `data-domains` guard. A public site ID is not an authentication secret; non-browser clients can forge collection requests. This is not a complete bot/spam defense.

The dashboard uses one configured `ADMIN_PASSWORD` (minimum 12 characters) and signed, HttpOnly, SameSite=Strict cookies, Secure when PUBLIC_ORIGIN uses HTTPS. The application persists a random signing key beside the database unless SESSION_SECRET is provided. Login is rate-limited. Changing the password does not revoke already signed cookies; rotate the signing key to invalidate them. No production credentials were obtained or configured in this thread.

The initial **400-day retention default** is an implementation choice satisfying the user's minimum-year requirement. RETENTION_DAYS accepts 0 for indefinite retention or at least 366 days. Small cleanup batches run each minute, removing old visits and dependent events based on last activity. Long-lived visits can preserve older events beyond the nominal period.

CSV/JSON exports stream raw records in 1,000-record batches. CSV values are protected against formula injection. Exports during live collection are best effort, not transactional backups. A separate SQLite backup helper provides consistent online backups.

Reports cap path, referrer, location, outgoing, and per-dimension UTM groups at 1,000; performance groups at 5,000. Searches/sorts operate on returned groups. Visitor activity is paginated with a timestamp plus UUID cursor to avoid skipping equal-timestamp identities. Full histories are paginated separately.

## What was implemented

The workspace began empty. This thread created the application, tracker, authenticated dashboard, schema/migrations, test suite, Docker/Compose configuration, backup helper, demo seeder, benchmark, browser test fixture, and README. No changes were deployed to the user's Pi, Cloudflare, existing Umami, or blog. No PR or commit was created in this thread.

Key files:

- `src/server/app.ts`: Fastify setup, access control, collection, reports, label management, history, and export routes.
- `src/server/index.ts`: environment/configuration, persisted signing key, startup/shutdown.
- `src/server/database.ts`: Drizzle operations, server-side visit grouping, aggregation, labels, exports, and cleanup.
- `src/server/schema.ts` and `drizzle/`: schema and generated SQL migrations.
- `src/server/workers.ts` / `db-worker.ts`: bounded worker RPC and database ownership.
- `src/server/events.ts`: event validation, timing/session constants, destination/referrer normalization.
- `src/tracker/index.ts` / `core.ts`: browser tracker, SPA/lifecycle integration, UUIDs, delivery, and reading clock.
- `src/dashboard/main.tsx` / `style.css`: responsive dashboard and its settings/dialogs.
- `src/shared/types.ts`: report and shared data contracts.
- `scripts/dev.mjs`, `build.mjs`, `build-worker.mjs`: local development and builds.
- `scripts/bench.ts` / `run-bench.mjs`: isolated real-HTTP ingestion benchmark with simultaneous reporting.
- `scripts/seed.ts`: separate synthetic demo database; refuses an already nonempty destination.
- `scripts/serve-fixture.mjs` / `tests/fixtures/tracker.html`: manual real-browser tracker fixture.
- `scripts/backup.mjs`, `Dockerfile`, `compose.yaml`, `.env.example`, and `README.md`: deployment and operations.
- `tests/api.test.ts`, `database.test.ts`, `clock.test.ts`, `tracker.test.ts`: API/database and browser-runtime/clock verification.

Dashboard screens are Overview, Pages, Referrers, Outgoing links, UTM tags, Visitors, Performance, Locations, and Settings. It polls for fresh reports approximately every five seconds while visible. The dashboard uses muted green/cream styling and a responsive layout; this visual direction was an implementation choice, not a separately approved brand specification. There is no fabricated data in the default production database.

## Local development and continuing work

The README includes a dedicated **Local development** section and was expanded during this documentation handoff. Work from the repository root with Node.js 22 or newer and the pinned pnpm 12.14.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# Edit .env: choose ADMIN_PASSWORD (at least 12 characters), and set:
# PUBLIC_ORIGIN=http://127.0.0.1:5173
pnpm run dev
```

Open `http://127.0.0.1:5173`. Fastify runs on 3000 and Vite proxies the relevant requests. Do not mix `localhost` and `127.0.0.1` while expecting configured origin validation to consider them identical. The development process rebuilds the tracker and watches the HTTP server; restart the launcher after changes to the bundled database worker/operations/schema. Generate migrations after schema changes.

```sh
pnpm run check
pnpm test
pnpm run build
pnpm run bench
```

For the complete production build on localhost:3000, change PUBLIC_ORIGIN accordingly and use `pnpm run build && pnpm start`. For deployment, follow the README's Docker instructions and set the actual HTTPS PUBLIC_ORIGIN. Do not commit `.env`, signing keys, database files, or credentials.

For Astro integration, copy the after-load loader from Settings, use `<script is:inline>` in the shared layout, and do not add `data-astro-rerun`. `/script.js` and the `/stroke.js` alias are supported, as are `data-site-id` and `data-website-id`. Heartbeats default off; Web Vitals default on; all-link tracking and outgoing query/hash retention default off. Individual anchors use `data-annu-link` or `data-links`; `data-annu-link="false"` excludes an anchor. A same-origin proxy is supported but was not required or deployed.

Ignored local `data/demo.db` was created for QA. It contains synthetic analytics plus browser-verification records/sites/labels added during testing; it is not production data or a pristine seeder output. Normal application storage defaults to `data/annu.db`. Use a fresh DEMO_DATABASE_PATH to reseed rather than expecting the seeder to overwrite an existing demo. Preview passwords were disposable test values, not production configuration, and are intentionally not reproduced here. The owned application/fixture preview processes were stopped at the end of implementation.

## Verification evidence and limits

The last full verification before this documentation-only update completed:

- **19 tests passed**: authentication/origins, trusted versus untrusted Cloudflare geography, cross-tab visit grouping, cross-day history, equal-timestamp activity pagination, checkpoint idempotency/bounds, path-duration denominator, UTM grouping/conflict rollback, click normalization/deduplication, decimal CLS/percentiles, site isolation/cleanup/exports, UUID persistence, SPA deduplication, optional heartbeats/idle behavior, link opt-in, owner exclusion, and no retry backlog after failure.
- **TypeScript check passed** (`pnpm run check`).
- **Production build passed** (`pnpm run build`).
- **Dependency audit reported zero vulnerabilities** at that time (`pnpm audit`). This is dated evidence, not a permanent guarantee.
- Real-browser QA exercised login, dashboard rendering, UTM label creation, cross-day visitor timelines, and a 390px mobile viewport without horizontal page overflow.
- A real browser on a separate local origin sent accepted collector POSTs, recorded only the opted-in outgoing link with query/fragment stripped, generated one view for a history/Astro transition, and persisted heartbeat and performance records to SQLite.

The local real-HTTP benchmark sent 1,000 views at concurrency 10 with simultaneous report reads and durable FULL commits. The last measured run reported 0 failed events, approximately 3,782 events/second, p50 2.28 ms, p95 4.05 ms, and p99 8.04 ms. It reported approximately 589 MiB process RSS; a development-host RSS sample of the separate preview process was approximately 367 MiB. These observations vary with runtime/workload and are **not Pi memory budgets or Pi throughput guarantees**. Verification used the available macOS development host and Node 26.12.1, while the Dockerfile targets Node 22. Do not claim the Pi consumes less memory than Umami based on these results alone.

**Docker was not installed in the environment.** The Dockerfile/Compose setup is supplied, but no container build/run, ARM64 execution, or Raspberry Pi latency/memory validation occurred. The proposed Pi setup assumes a 64-bit OS; that was not confirmed with the user. A real Astro website integration, other browser engines, actual Cloudflare header routing, and production storage/traffic behavior remain unverified.

## Continuation guidance and remaining boundaries

No new feature request was specified for the next thread. Continue according to the user's next instructions; this list is context, not authorization to expand scope.

- Validate the Docker image and Compose startup on a Docker-capable host and then the actual Pi/ARM64 environment.
- Measure real ingestion latency, dashboard query cost, and memory on the Pi/storage before making performance claims or changing durability/topology.
- Verify the real Astro ClientRouter integration and Cloudflare collection path before replacing the existing Umami embed.
- Keep browser delivery best effort. An uptime/reliability feature must not silently add queues, retries, or blocking behavior against the user's explicit preference.
- Keep Drizzle. Reconsider SQLite only with an actual requirement or measurement; the user deliberately left provider details open.
- Persistent IDs, titles, UTM values, and mailto destinations have privacy implications. Avoid presenting UUID tracking as absolute anonymity or asserting legal compliance that was not established.
- There is no visitor-ID expiration, sophisticated bot filtering, error tracking, public dashboard, importer, role system, or excluded analysis product. Do not imply these exist.
- Reporting still competes for CPU/storage even though it uses a separate worker. Worker deadlines do not interrupt slow SQL. Streamed exports are not backups.
- Preserve raw UTMs and the per-visit duration denominator when refactoring. Preserve server-side shared-visit grouping across tabs.

## References inspected

The user explicitly considered referring to Umami's work important. Both the tracker and documentation were accessible and inspected; the web reader could not display the JavaScript MIME type, so the tracker was fetched directly for inspection. Annu is an independent implementation, not an Umami fork/runtime dependency.

- [Umami tracker](https://cloud.umami.is/script.js)
- [Umami Cloudflare headers](https://docs.umami.is/docs/enable-cloudflare-headers)
- [Umami metric and visitor definitions](https://docs.umami.is/docs/metric-definitions)
- [Cloudflare visitor location headers](https://developers.cloudflare.com/rules/transform/managed-transforms/reference/)
- [MDN sendBeacon and lifecycle guidance](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [MDN referrer policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [SQLite WAL concurrency/storage constraints](https://www.sqlite.org/wal.html)
- [Drizzle SQLite integration](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)
- [Google web-vitals](https://github.com/GoogleChrome/web-vitals)

Sources reflect what was inspected during initialization. Recheck external behavior against the relevant version before relying on it in future changes; do not treat Umami's evolving current documentation as proof of the user's older self-hosted version's exact behavior.
