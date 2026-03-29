# Product Requirements Document — cl-reporter

**Status:** Draft (from brain dump + research pass)  
**Last updated:** 2026-03-28

Single source of truth for *what* we build. Implementation and runbooks: root `AGENTS.md` and code.

---

## 1. Problem and users

**Problem:** Clover App Market reporting tools are often limited in customization. Many can send reports, but merchants **cannot reliably automate** generation and delivery on a **schedule** (e.g. every Saturday at midnight).

**Product intent:** A Clover marketplace app that lets merchants **define custom reports** and download **CSV** or **XLSX** (v1). **V1:** **download on demand** only. **Post–v1:** **email** delivery and **scheduled** generation (daily/weekly/etc. at a chosen time).

**Primary users:** Clover merchants / business owners (single role for access).

**Secondary users:** None for now — only the business owner uses the app.

---

## 2. Product vision (full — beyond v1)

1. Merchant opens the app from the Clover App Market and lands on the **self-hosted web UI**. They configure **custom reports**; v1 output is **CSV** or **XLSX** (post–v1: optional **HTML/markdown** in email body).
2. **On-demand:** Generate and **download** immediately, and (post–v1) **email** to a chosen address.
3. **Scheduled (post–v1):** System tracks schedule; at the due time, **generates and emails** the report.
4. **Clover data access:** Uses **OAuth (v2)** per merchant. **Access tokens** are short-lived; **refresh tokens** are stored securely and rotated. **Background jobs** use refresh to obtain valid access tokens without the merchant being online; if refresh is no longer valid, merchant must **re-authorize** via OAuth (Clover cannot grant indefinite unattended access without a valid refresh chain).

---

## 3. Core jobs — **v1 (in scope)**

1. Merchant discovers the app in the **Clover App Market**, launches it, and completes **Clover OAuth** as required so the app can call the **Clover REST API** for that merchant.
2. Merchant uses a **wizard** to define a **custom report** (order: **type** → **name** → **time span** (Sales) → **location scope** → … — §8), then **saves** the definition; see **§8 “Generate, list, and download (v1)”** for listing, on-demand generation, and download.
3. From the **report list**, merchant requests **generate** for a saved definition; the system **enqueues** work (**RabbitMQ**), merchant sees **spinner + poll** until ready, then **downloads** via link (**§8**). The file is built as **CSV** or **XLSX** per the definition.

4. **OAuth token maintenance (v1):** A **daily** scheduled job (e.g. Kubernetes **`CronJob`**) **scans** all merchants with stored Clover tokens. **Selection rule:** any merchant whose persisted **`refresh_token_expiration`** (Unix seconds from Clover — **API-driven**, not a hard-coded lifetime; [Clover: use refresh token](https://docs.clover.com/dev/docs/use-refresh-token-to-generate-new-expiring-token)) is **within the next ~30 days (one month) or sooner** (`refresh_token_expiration` ≤ **now** + 30 days) is **eligible**. **Enqueue** each eligible merchant onto the **message queue** (same **RabbitMQ** infrastructure as report jobs, **distinct** message type / routing key for **OAuth refresh**) so **workers** perform **`POST /oauth/v2/refresh`**, then **atomically** persist the new **`access_token`**, **`refresh_token`**, and both expirations. **No double refresh for the same merchant:** Clover’s model is **single-use refresh rotation** — two concurrent **`POST /oauth/v2/refresh`** calls can leave one attempt with a **dead** token chain. **v1** does **not** require distributed locks or cluster-specific machinery; **correctness** is the bar. Acceptable patterns include: **one OAuth-refresh worker process**; **at most one refresh message per merchant** unconsumed / in flight; and/or **DB-level** sequencing such as **`UPDATE … WHERE refresh_token = $expected`** (optimistic) or a **row lock** around read → Clover → write. On failure, mark **`needs_reauth`** (or equivalent) and **insert an `audit_events` row** (merchant, event type for OAuth refresh failure, **sanitized** error summary, UTC timestamp) — **§10**. **Forwarding** those outcomes to a **hosted external observability** service (log aggregation, APM, alerting) is **post–v1** (Appendix C). **Cadence** = **daily scan**; **who** is refreshed = **dynamic** from DB timestamps, not a fixed wall-clock per merchant. Refine the **30-day** margin after sandbox/prod observation if needed (§13). This is **not** post–v1 **report scheduling** (§4).

**Explicitly not required for v1:** **scheduled report generation** (business-time cron), **outbound email** of reports, subscription payment integration (may be stubbed or manual for early access — confirm before launch).

**Forward-compatible implementation (v1):** Even though v1 is **download-only** for **reports**, design and build so **report-schedule cron** and **email** can be added without a rewrite. Concretely: keep **report generation** on a **shared async job pipeline** (e.g. queue + workers) that both on-demand and future scheduled runs can enqueue; model **report definitions** and **jobs** so schedule metadata and **email recipients** can be added later (nullable / unused in v1); avoid baking “only synchronous HTTP generation” into the core path if it would block a headless report scheduler or email sender later.

---

## 4. Core jobs — **post–v1**

1. **Email** report to configured address(es).
2. **Schedule** reports (e.g. weekly Saturday 00:00 merchant timezone or configured timezone — **decision needed**).
3. **Scheduler process** (e.g. periodic job every ~5 minutes) enqueueing due reports to the same pipeline as on-demand.
4. **Subscription billing** wired to production policy (prefer Clover App Market billing when listing on the market — see §7).

---

## 5. Integrations (vendor / external)

| System | Purpose | Touchpoint | Notes |
|--------|---------|------------|--------|
| **Clover** | Merchant data for reports; app identity on market | REST API, **v2 OAuth** (`/oauth/v2/authorize`, `/oauth/v2/token`, `/oauth/v2/refresh`) | Sandbox vs prod hosts differ by region. Apps created after **Oct 2023** use **expiring tokens** (access + refresh). Refresh tokens are **single-use** when rotated; store new pair atomically. **Rate limits** (see §9): per app ~**50 req/s**, per token ~**16 req/s**; concurrent caps apply — use backoff, batching, caching. |
| **Clover App Market billing** | Recurring subscription revenue | Clover-managed app subscription | Clover documents **monetization** and **billing for apps** (monthly billing cycle, trials, developer share). **Prefer this** for marketplace-listed subscription apps; validate latest terms in [Monetize your apps](https://docs.clover.com/docs/monetizing-your-apps) and [Handle app billing](https://docs.clover.com/dev/docs/billing-for-apps). **Stripe** (or similar) is a fallback if a use case falls outside Clover billing — then **webhooks** for payment state. |
| **Email provider (post–v1)** | Send reports as attachments | SMTP or provider API (e.g. SES, SendGrid) | TBD |
| **Generated report files** | Byte storage for exports | **Local:** StatefulSet / app-attached volume or DB-adjacent blob store (Kind). **Production (AWS):** **S3** | **Metadata always in DB:** job id, merchant id, storage key / path, size, content-type, `createdAt`, link to report definition. **Download:** **presigned S3 URL** (prod) or **authenticated file URL** / stream from app for local StatefulSet — §8. |
| **Message queue** | Decouple UI from report generation | e.g. RabbitMQ | In scope for v1 if architecture uses async workers |

**Environment (vendor):** Sandbox merchants and keys in Clover Developer Dashboard; production app credentials per region. **Secrets:** Kind/EKS + GitHub Actions as in your ops plan; never commit secrets.

---

## 6. Session, login, and OAuth (research summary)

- **Clover marketplace / dashboard** redirects merchants to your **Site URL** (and **Alternate Launch Path** when launched from nav/market). Your app must implement the **documented OAuth flow**; merchants authenticate **with Clover**, then you receive an **authorization `code`** to exchange for tokens.
- **Separate app password login** is **not required** by Clover for API access; many apps treat **merchant_id + OAuth tokens** as the binding. You still add an **app-local session after OAuth** (here: **JWT** — see **`docs/authorization-flow.md` §6.1**) so the UI and our APIs know the merchant without mixing that with Clover’s dashboard cookie.
- **“Use Clover session only”:** The merchant’s Clover dashboard session is **not** a substitute for your app holding **API tokens**; your backend must store and refresh **OAuth tokens** for server-side API calls.
- **Proactive refresh (v1):** Implement the **token maintenance job** in §3 so refresh chains are renewed **before** `refresh_token_expiration` where possible. **Request-time refresh** (when handling generate/download) still applies for access tokens as needed.
- **Unattended scheduled report jobs (post–v1):** Same refresh model; if refresh fails, **user must re-auth**. Plan monitoring/alerts for auth failures.

**SDK vs REST:** Clover provides platform docs and flows for **REST + OAuth**. A **web SDK does not remove OAuth** for server-side merchant data; use official docs for your stack. Device-focused SDKs are not a substitute for this web + REST architecture.

**End-to-end process (launch, session, refresh, reconnect, lockout avoidance):** See **`docs/authorization-flow.md`** — readable **default** for implementation and agents. **Clover Developer Dashboard tasks + local dev checklist:** **`docs/clover-developer-setup.md`**.

- **Our app session (v1):** **JWT** — **access JWT** via **`Authorization: Bearer`** (memory in SPA, not `localStorage`); **refresh** via **HttpOnly cookie** to our refresh route (or equivalent); **TTL** — short-lived access, **absolute max ~30 days** via refresh policy (tunable); **logout** revokes refresh + optional access **`jti`** denylist; **CSRF** — Bearer APIs differ from cookie sessions; still validate **Origin** / protect refresh cookie path — see **`docs/authorization-flow.md` §6.1**.

---

## 7. Constraints

- **Platform:** **Web only** for v1 — no Clover device app, no native mobile. App is listed on Clover App Market but **hosted on your domain** (configure Site URL / CORS per Clover). **Client implementation:** **Next.js** with **Material UI (MUI)** for the merchant-facing UI — details and commands in root **`AGENTS.md`** (not every UI dependency belongs in the PRD).
- **Compliance / data:** Store **tokens encrypted at rest**, minimal PII, retention policy for generated files and audit logs. **Legal/commercial:** Review Clover **developer agreement**, app review requirements, and **billing** docs; this PRD does not provide legal advice.
- **Billing:** Research conclusion to carry forward: **use Clover’s app subscription / monetization** for App Market distribution unless a specific gap forces **Stripe** + webhooks.
- **Performance / offline:** Document **product-facing** targets when known (e.g. “typical on-demand report &lt; N minutes”). **Engineering:** Respect Clover **rate limits**; implement **queue + workers**, **exponential backoff** on `429`, **paginate through Clover list endpoints** when APIs require it, optional **caching** where safe. **Offline** not a v1 requirement. (**Product**-level export pagination / “report too large” — v2+, Appendix C.)
- **Merchant-facing v1 (branding / flows):** Ship a **Reconnect Clover** experience (dedicated page or modal **plus** copy) when **re-authorization** is required (e.g. refresh token invalid). **Support URL**, **general error pages**, and wider branding — **post–v1** unless promoted early.

---

## 8. Report model and Clover API surface (direction)

**Reference:** [Clover API reference overview](https://docs.clover.com/dev/reference/api-reference-overview).

**v1 report types (decided):** Only **Sales** and **Inventory**. **Customers** and **Employees** (and other domains) are **post–v1** report types.

**Post–v1 types:** **Customers**, **Employees**, and any additional domains follow the same pattern (type → curated columns); not in v1 scope.

**Recommendation:** Within each type, merchants pick **columns** from curated API-backed fields (see **Appendix B**). **Exclude** APIs that don’t help reporting (e.g. **Notifications**).

**v1 simplification:** One **Sales** report pulls from **orders**, **line items**, and **payments** (and related expands as needed). One **Inventory** report pulls from **items** (and expands such as `tags`, `categories`, `itemStock`, etc.). **Cross-domain** reports (e.g. Sales + Inventory in one file) are **out of scope** for v1.

**Report definitions — lifecycle (v1, decided):** Merchants can **create**, **edit**, and **delete** saved report definitions. **Duplicate / clone** is **not** required in v1. **Archive** is **not** required — removal is by **delete**. There is **no limit** on how many saved reports a merchant may have (engineering may add fair-use / abuse safeguards later without changing this product intent).

### Wizard — required fields (v1, decided)

**Step order (v1):** **Report type** → **Report name** → **Time span** (Sales only) → **Location scope** → **Scope filters** → **Columns** → **Export format**.

1. **Report type** — **`Sales`** or **`Inventory`** only (v1). Shown first so column and filter options follow immediately from type.
2. **Report name** — user-provided label for the saved definition (required, validated for length/characters in implementation).
3. **Time span (report scope)** — **Sales only:** required **start** and **end** (dates or datetimes in the **merchant’s timezone** — store timezone id or offset with the definition). Backend maps this to Clover **`filter`** on the appropriate time fields and applies **90-day chunking** when needed (Appendix B.5). **Inventory (v1):** **no** time-span step — the report is a **current inventory snapshot** (items/stock as of **generate time**; optional “generated at” timestamp in the file or metadata). **Post–v1:** optional “modified in range” or movement-style reports if needed.
4. **Location scope** — **Required** choice (no implicit default to aggregate): **All locations** (**aggregate** Clover data across every location for this merchant) **or** **Single location** (choose **one** Clover `location` from a dropdown populated from the merchant’s locations API). Persisted on the report definition as **`location_scope`**: `all` \| `{ location_id }`. Workers apply the matching Clover query filters; **do not** aggregate unless the merchant explicitly selected **All locations**.
5. **Scope filters** — **Sales** and **Inventory** each have the **additional filters** listed in **“Report scope filters (v1)”** below (friendly UI; backend maps to Clover `filter=` per endpoint; verify allowed fields with **`X-Clover-Allowed-Filter-Fields`**).
6. **Columns** — after **type** (and prior steps), show the **v1 column dropdown lists** (**Appendix B.3–B.4**). Merchants **multi-select** which columns appear in the **detail rows**. **Sales** also includes **period summary** options (**Appendix B.3.1**) so merchants can see **cumulative sales and other totals** for the selected time span (not just line-by-line data). **Preview** before generate is **not** required for v1 — backlog **Appendix C**.
7. **Export format** — **`CSV`** or **`XLSX`** only (v1). No other formats in v1.

### Generate, list, and download (v1)

**Saved definitions:** After the wizard completes, the **custom report definition** is **persisted** in the database. Merchants see a **list of all saved report definitions**.

**Past runs:** Under each definition, show **previously generated files** as a list of **generation date/timestamp** (and optional short label). Each row represents one completed export for that definition.

**On-demand generate / download**

1. User chooses **Generate** (or **Download**) for a **specific saved report definition**. The client sends a **new generation request** (report definition id + parameters as needed; server creates a **unique job/run** with a **timestamp** identity for this attempt).
2. The app enqueues work on **RabbitMQ** (or equivalent). The message includes an **idempotency key**; the same key is **stored in the database** when the job is accepted so **duplicate submits** for the same logical run do not create duplicate files.
3. **UI while pending:** For that definition’s **in-flight** request, show a **spinner** (or equivalent) **instead of** the download control. **No multi-step job status** (queued / running / failed) is required in v1 — only **“waiting”** vs **“file ready.”** The browser **polls** the app API until the generated file record exists for that **report definition + run** (implementation may use internal job states in the DB for polling; they need not be surfaced as rich UX).
4. **Done:** When the file is ready, add a new row under that definition with **date/timestamp** and a **download link** (or button). The spinner clears.

**Cancel / retry (v1):** Not specified as required; **retry** may be “request generate again” (idempotency prevents double work for the same key). **Cancel** can be **post–v1** unless added later.

**Download path (decided)**

| Environment | File bytes | How the user downloads |
|-------------|------------|-------------------------|
| **Local (e.g. Kind)** | Stored on **StatefulSet / app volume** (or DB blob if chosen); not S3 | App issues an **authenticated** link or **streams** the file (cookie/session). **Metadata** still in DB: job id, merchant id, **storage path or key**, size, content-type, `createdAt`. |
| **Production (AWS EKS)** | **Amazon S3** | **Report generator workers** write the object, persist metadata in DB, then expose download via **short-lived presigned S3 URL** and/or **session-authenticated proxy** — pick one per implementation; presigned is typical for large files. |

**Idempotency:** One **logical** download job per user-triggered run; **idempotency key** on the queue message **and** stored on the job row prevents double generation from double-clicks.

**Zero matching rows:** If Clover returns **no** orders/lines/items for the filters and time span, still **produce a successful export** (same rule for **Sales** and **Inventory**): **all requested detail column headers** with **no data rows** (header-only **CSV** / **XLSX** sheet). **Period summary** (Appendix B.3.1), when enabled, should still output with **zeros** / **empty counts** as appropriate. Do **not** treat “no data” as a failed job. Optional in-app messaging (“No rows in this period”) is **not** required for v1.

### Report scope filters (v1)

**Location scope** is its own wizard step (§8 step **4**) — see **Location scope** table first. Remaining filters are **besides** **Sales** time span and **location scope**. Raw `filter` syntax stays **hidden** from merchants (Appendix B.5). Implementation picks **orders vs payments vs line items** as the primary fetch path and applies consistent filters so totals match the period summary.

**Location scope (Sales & Inventory — v1)**

| Choice | Purpose |
|--------|---------|
| **All locations** | **Aggregate** data across **every** Clover location for this merchant (explicit merchant choice — **not** applied unless this option is selected). |
| **Single location** | Restrict the report to **one** location; merchant picks from a **dropdown** of Clover locations (from merchant locations API). Workers pass the corresponding **`location_id`** (or Clover’s equivalent) on API calls. |

**Single-location merchants:** UI may show only one row in the dropdown or pre-select that location — merchant still confirms **Single location** (or **All locations** if they treat the business as one site).

**Not in v1 (deferred):** **Device** / **register**-level filters — post–v1 unless a clear merchant need appears.

**Sales**

| Control | Default | Purpose |
|---------|---------|---------|
| **Exclude test transactions** | On | Real-world revenue only (e.g. `testMode=false` or equivalent on the resource used). |
| **Exclude voided from revenue** | On | Do not count voided orders/payments in detail rows or period totals; map to Clover **void** / **voided** / **state** semantics for the chosen endpoint. |
| **Completed / finalized orders only** | On | Exclude **open** carts and unfinished checks; only include orders that represent **completed** sales for the reporting grain (confirm **`state`** or payment-complete logic in sandbox). |
| **Employee** | All | Optional: restrict to a **single employee** (e.g. shift/cashier reporting) or **All employees**. Maps to **`employee.id`** (or equivalent) when filterable on the endpoint used. |

**Inventory** (current snapshot)

| Control | Default | Purpose |
|---------|---------|---------|
| **Include hidden items** | Off | Typical **active / customer-facing** catalog; set **On** to include hidden items in the export. |
| **Include deleted items** | Off | **Current** inventory; set **On** for audit/cleanup views that need deleted rows. |
| **Category or tag** | All | Optional: narrow to **one category** or **one tag**, or **All**. Omit from v1 UI only if implementation cost is high — otherwise include as optional. |

**Implementation note:** Large reports may require **many paginated API calls**; workers should **merge** pages into one dataset before export. Validate every column against **live sandbox responses**; Clover may add fields or require `expand` for nested objects.

---

## 9. Reliability and Clover API usage

- **Rate limits (typical — confirm current docs):** ~**50 requests/s per app**, ~**16/s per token**; **concurrent** limits also apply. Handle **`429`** with backoff and `retry-after` when present.
- **Prefer webhooks** over blind polling where Clover supports them for freshness (post–v1 / selective use).
- **Stagger** heavy jobs across merchants where possible.

---

## 10. Target technical architecture (summary)

Your brain dump described a **Kubernetes** deployment on **Kind** (local) and **AWS EKS** (prod), **GitHub Actions** deploy, secrets via K8s secrets / **AWS Secrets Manager**. Logical components:

| Component | Role |
|-----------|------|
| **Client / app** | Web UI + API for wizard, download, auth handoff |
| **Workers** | Consume queue; call Clover; build **CSV** or **XLSX** export |
| **Queue** | e.g. **RabbitMQ** for on-demand **report** jobs (v1), **OAuth token refresh** jobs (daily sweep → enqueue), and later scheduled reports |
| **Database** | Merchants, report **definitions**, **generation jobs / runs** (idempotency key, timestamps, link to file metadata), **file metadata** (job id, merchant id, S3 key or local path, size, content-type, `createdAt`), token metadata (encrypted) |
| **OAuth/token service** | Can be a library inside the API/worker process **or** a dedicated service — split only if needed for scale/ownership |
| **Token refresh job (v1)** | **Daily** `CronJob`: find merchants with **`refresh_token_expiration`** ≤ **now** + **30 days**; **enqueue** refresh messages; **workers** call `/oauth/v2/refresh` and persist new pair atomically. **Concurrency:** **one refresh in flight per merchant** (single-use rotation — §3). **Failures:** **`needs_reauth`** + **`audit_events`**. **Separate** from report scheduling. |
| **Report schedule cron (post–v1)** | Enqueues **due report definitions** at business times — **not** in v1; job/queue design assumes it will enqueue the **same** report job type as on-demand |

**File storage:** **Production:** S3 + DB metadata (§8). **Local:** StatefulSet/volume or small blob; same metadata shape as prod for portability.

**“OAuth pod”:** Token refresh must be **transactionally safe** under Clover’s **single-use refresh rotation** — see §3 for **v1** concurrency patterns (single worker, queue discipline, **`UPDATE … WHERE refresh_token = $expected`** / row lock). Separate deployment vs shared worker code is an implementation choice.

**Local Kind / DB bootstrap (engineering):** How Postgres is deployed on the cluster, how **`setup-cluster.yml`** fits in, and how **Drizzle migrations** (not ad hoc `init-db.sql` as the primary schema source) apply — see **`docs/architecture-v1.md` §8.1** (Local cluster bootstrap & database migrations).

### Data model — canonical entities (v1)

These are the **core persisted concepts** (typically **database tables** + object storage). **Clover app** `client_id` / `client_secret` are **not** listed here — they are **application** credentials (env / secrets manager), shared by all merchants.

1. **Merchants** — One row per **subscribed** merchant using cl-reporter. Includes **Clover `merchant_id`**, **subscription / entitlement** state as required for billing gating, and **per-merchant OAuth tokens** (encrypted) + expirations. Represents “this Clover business as a tenant of our app.”

2. **Report types (catalog)** — Product enum of definition **types**: **Sales**, **Inventory** (v1). **Customer**, **Employee** (post–v1). Stored as reference data or code enum; must match §8 and Appendix B.

3. **Column catalog (“report options”)** — Per **report type**, the **API-backed column and summary options** the wizard exposes (aligned with Appendix B). May be **config / seed / code**; must stay in sync with Clover field mapping (`docs/api-column-map.md` when built).

4. **Report definitions** — **Saved custom reports** per merchant: wizard payload (**type**, **name**, **time span** if Sales, **`location_scope`** (`all` \| single `location_id`), **scope filters**, **columns**, **export format**, etc.) — §8.

5. **Jobs** — **Generation runs** consumed from **RabbitMQ**: **idempotency key**, link to **report definition** and **merchant**, timestamps. **Internal status:** **`in_process`**, **`done`**, **`failed`** (§8 **UI** may only distinguish **waiting vs file ready**). **`done`** associates **file metadata**; **`failed`** associates an **audit event** id (and/or error detail) for investigation.

6. **Files** — **Metadata** for each generated artifact (not necessarily the bytes in SQL): location (**S3** key in production, **local / StatefulSet path** in dev), **filename** or object key, size, content-type, `createdAt`, links to **job** and **merchant**. Matches §8 **Generate, list, and download**.

7. **Audit events** — **Failed report-generation jobs**, **failed Clover OAuth token refresh** attempts (**request-time** and **queued refresh jobs** / worker outcomes), and other **notable events** for ops/support. **v1:** persist failures to this store; **an in-app UI to browse or filter** these events (failure history, ops console) is **post–v1** — until then, investigation uses the **database** (or ad hoc queries). **Do not** require shipping the same events to a **hosted external logging/metrics** product until **post–v1** (Appendix C).

---

## 11. Success criteria — **v1**

- Merchant can **install/launch** from sandbox (then production) and complete **OAuth**.
- Merchant can **create** at least one **custom report definition** via the wizard (**type** → **name** → … — §8): **report type**, **report name**, **time span** for **Sales** (required — §8), **location scope** (all locations vs single location — §8), **scope filters** (§8), **column selection** (Appendix B), **export format** (**CSV** or **XLSX**). **Inventory** definitions **omit** a time-span step (current snapshot — §8).
- Merchant sees **saved definitions** in a **list**, **past generated runs** per definition, can **request a new generation** (queue + **spinner** + **poll** — §8), then **download** when ready (**S3 presigned** or **local authenticated** link — §8).
- **Customers** and **Employees** (and other domains) are **not** offered as report types in v1; only **Sales** and **Inventory**.
- Merchant can **generate** and **download** a **CSV** or **XLSX** file **on demand** without scheduling or email. **Sales** reports can show **cumulative period totals** (e.g. gross sales for the time span — Appendix B.3.1) as well as detail columns.
- System respects Clover **auth and rate-limit** behavior without data corruption (stable token storage, safe refresh, **single-use refresh** handling).
- **OAuth token maintenance** runs in production: **daily** job enqueues merchants whose **`refresh_token_expiration`** is within **~30 days**; workers refresh via Clover (see §3); failures set **`needs_reauth`**, **`audit_events`** in DB (§10), including **failed refresh jobs**; **Reconnect** and other **merchant-facing** surfacing per §7 (a dedicated **audit/failure list page** is **post–v1** — Appendix C).

---

## 12. Non-goals — **v1**

- **No** **Customers** or **Employees** (or other) **report types** beyond **Sales** and **Inventory** — see §8 and Appendix B.
- **No** user-facing **scheduled report** runs (no “every Saturday generate this report” **business** scheduler) and **no** **email delivery** of reports in v1.
- **Not** a non-goal: a **scheduled OAuth token refresh** workload (§3, §10) — that is **in scope** for v1 and is **distinct** from report scheduling.
- **No** requirement for **Stripe** until Clover billing is ruled out for your exact model.
- **No** mobile or Clover device clients.
- **No** **report size limits**, **max row** handling, or **“report too large”** UX/policy in v1 — treat as **v2+** (Appendix C).

**Not a non-goal:** Internal architecture (queue, job records, extensible report schema) should **anticipate** report-schedule cron + email so later iterations are additive — see §3 “Forward-compatible implementation.”

*(These follow your explicit v1 scope; the longer “success” paragraph in the raw dump that mentioned schedule/email is treated as **post–v1** vision in §2 and §4.)*

---

## 13. Open questions

- **Token refresh safety window:** initial **~30 days** before `refresh_token_expiration` (§3) — refine after observing Clover’s dynamic expirations in sandbox/prod.
- **Timezone** for future schedules: merchant vs UTC vs named timezone.
- **Exact v1 billing:** ship free / beta / Clover subscription — confirm before public listing.
- **Report wizard — preview:** optional **sample-row preview** before generate (not required for v1; see §8).
- **Retention:** how long to keep generated files and audit logs.
- **Multi-location (implementation):** Clover **API** query details for **`location_scope=all`** vs **`location_id=…`** (orders, inventory items/stock — confirm filters and `expand` per endpoint in sandbox / `docs/api-column-map.md`).

---

## Appendix A — REST areas (historical / post–v1)

**v1 column detail:** See **Appendix B** (Sales & Inventory only).

| Report type | API families |
|-------------|--------------|
| **Sales (v1)** | Orders, line items, payments — Appendix B |
| **Inventory (v1)** | Items (`expand` tags, categories, itemStock, …) — Appendix B |
| Customers *(post–v1)* | Customers, customer metadata |
| Employees *(post–v1)* | Employees |
| Merchant / settings *(optional later)* | Merchant profile, hours — use sparingly |

**Usually low value for periodic reports:** Notifications, print jobs, device-centric APIs — omit unless a specific merchant story appears.

---

## Appendix B — v1 wizard and column catalogs (Sales & Inventory)

**Sources:** Clover **Orders** and related objects ([Working with orders](https://docs.clover.com/dev/docs/working-with-orders)), **GET** `/v3/merchants/{mId}/orders`, `/orders/{orderId}/line_items`, payments on orders; **Inventory** **GET** `/v3/merchants/{mId}/items` ([Get all inventory items](https://docs.clover.com/dev/reference/inventorygetitems)) with `expand` as needed. **Re-validate** field names and nesting in **sandbox** before locking code.

### B.1 Wizard (v1)

| Step | Input |
|------|--------|
| 1 | **Report type** — `Sales` \| `Inventory` |
| 2 | **Report name** |
| 3 | **Time span** — **Sales:** required **start** / **end** (merchant timezone). **Inventory:** *(skip — v1 is **current snapshot** only.)* |
| 4 | **Location scope** — **All locations (aggregate)** \| **Single location** (dropdown). Persisted as **`location_scope`**. §8 **Report scope filters (v1)**. |
| 5 | **Scope filters** — **Sales:** exclude test, exclude voided from revenue, completed orders only (defaults On); optional **employee**. **Inventory:** include hidden, include deleted (defaults Off); optional **category** or **tag**. Full table §8 **Report scope filters (v1)**. |
| 6 | **Columns** — **Sales:** detail columns (B.3) + **period summary** toggles (B.3.1). **Inventory:** detail columns (B.4). |
| 7 | **Export format** — `CSV` \| `XLSX` |

**After save:** **List UI**, **generate + poll + download** — §8 **Generate, list, and download (v1)**.

### B.2 Sales — API sources

| Source | Typical endpoints | Purpose |
|--------|---------------------|--------|
| Orders | `GET .../orders` (filter by time / state as implemented) | Order header: totals, state, times, type, links to customer/employee/device |
| Line items | `GET .../orders/{orderId}/line_items` (expand modifiers, discounts, taxRates as needed) | Per-line revenue, item linkage, modifiers |
| Payments | Payments under order (per Clover order/payment model) | Tender amounts, tips, payment types |

*Row grain for export:* **Line-item grain** is the **default** (one row per order line, order header fields repeated). That matches common POS **transaction detail** exports and avoids double-counting when summing line amounts for **period totals** (B.3.1). Alternative grains (order-only, payment-only) are **post–v1** unless engineering proves trivial.

### B.3 Sales — v1 **detail** column dropdown (multi-select)

Labels below are **user-facing**; implementation maps each to Clover **Order**, **Line item**, and/or **Payment** fields (with `expand` as needed). See [API Reference](https://docs.clover.com/dev/reference/api-reference-overview).

**Order (header) — typical retail / accounting needs**

| # | Dropdown label | Typical source (conceptual) |
|---|----------------|------------------------------|
| 1 | Order ID | `order.id` |
| 2 | Order date/time (created) | `createdTime` or `clientCreatedTime` |
| 3 | Order last modified | `modifiedTime` |
| 4 | Order state | `state` |
| 5 | Currency | `currency` |
| 6 | Order total | `total` |
| 7 | Pay type | `payType` |
| 8 | Order type | `orderType` (name/id) |
| 9 | Employee (ID or name) | `employee` |
| 10 | Customer ID | `customer` |
| 11 | Device ID | `device` |
| 12 | Order title | `title` |
| 13 | Order note | `note` |
| 14 | Tax removed (flag) | `taxRemoved` |
| 15 | Test transaction (flag) | `testMode` |

**Line item — itemized sales (industry-standard detail)**

| # | Dropdown label | Typical source (conceptual) |
|---|----------------|------------------------------|
| 16 | Line item ID | `lineItems[].id` |
| 17 | Item / line name | `lineItems[].name` |
| 18 | Alternate name | `lineItems[].alternateName` |
| 19 | Linked inventory item ID | `lineItems[].item` |
| 20 | Quantity | `lineItems[].unitQty` (or equivalent) |
| 21 | Unit price | `lineItems[].price` |
| 22 | Line extended (before discounts) | `lineItems[].price` × qty or Clover-calculated fields |
| 23 | Line total (after modifiers/discounts) | `priceWithModifiers`, `priceWithModifiersAndItemAndOrderDiscounts` (per docs) |
| 24 | Line discount amount | From `discounts` on line |
| 25 | Line tax | From `taxRates` / line tax fields |

**Payment — tender breakdown (common in daily sales summaries)**

| # | Dropdown label | Typical source (conceptual) |
|---|----------------|------------------------------|
| 26 | Payment ID | `payment.id` |
| 27 | Payment date/time | `payment.createdTime` |
| 28 | Payment amount | `payment.amount` |
| 29 | Tip | `tipAmount` |
| 30 | Tax amount (payment) | `taxAmount` |
| 31 | Cash back | `cashBackAmount` |
| 32 | Tender / payment type | `tender` / payment type (expand `tender` as allowed) |
| 33 | Card brand / last4 (non-PCI) | Only fields Clover exposes on payment / `cardTransaction` — **no** raw PAN |

*Note:* If **payment** columns are selected alongside **line** columns, implementation must define **row shape** (e.g. duplicate line rows per payment, or payment columns only on payment-level export — **default:** line-grain export; payment fields blank or repeated from primary payment — **spike** in implementation).

### B.3.1 Sales — **period summary** (cumulative totals for the time span)

Merchants need to see **how much was sold in total** over the selected period, not only line detail. **v1** includes a **separate “Period summary”** block (top of **XLSX** sheet or header rows in **CSV**; format TBD) controlled by **checkboxes** (default **on** for **Gross sales** and **Order count**).

| Checkbox label | Meaning | How computed (conceptual) |
|----------------|---------|---------------------------|
| **Gross sales (period)** | Sum of revenue in scope | Sum of **line net** amounts (recommended: `priceWithModifiersAndItemAndOrderDiscounts` or equivalent line revenue) **or** sum of **order totals** if grain is order-level — **one method only**, documented to avoid double-count |
| **Net sales (period)** | Gross minus returns/discounts (if data allows) | Per Clover fields available in v1 |
| **Order count** | Distinct orders in period | Count distinct `order.id` in filtered set |
| **Line item count** | Rows / units | Count or sum of qty |
| **Total tax (period)** | Taxes collected | Sum from line/payment tax fields as available |
| **Total tips (period)** | Tips | Sum of `tipAmount` on payments in period |
| **Total payments (period)** | Cash/card totals | Sum of `payment.amount` |
| **Refund / void summary** | If voided/refunds in scope | Only if columns/endpoints support in v1 |

**Required for v1:** At least **Gross sales (period)** and **Order count** must be implementable from the same dataset used for the detail export. Merchants who only care about “how much did we sell this week?” can select **only** the period summary checkboxes and minimal detail columns — product may allow **summary-only** export (no detail rows) in implementation.

**Zero detail rows:** If there are **no** matching lines in the period, **period summary** values should be **0** (or equivalent) where sums/counts apply; the summary block still generates when those options are selected.

### B.4 Inventory — v1 **detail** column dropdown (multi-select)

**Current snapshot** only (§8). Labels are user-facing; map to `GET .../items` with `expand` (e.g. `itemStock`, `tags`, `categories`) per [Get all inventory items](https://docs.clover.com/dev/reference/inventorygetitems).

| # | Dropdown label | Typical source (conceptual) |
|---|----------------|------------------------------|
| 1 | Item ID | `id` |
| 2 | Name | `name` |
| 3 | Alternate name | `alternateName` |
| 4 | SKU | `sku` |
| 5 | Item code | `itemCode` |
| 6 | Price | `price` |
| 7 | Price type | `priceType` |
| 8 | Unit name | `unitName` (if present) |
| 9 | Stock quantity (on hand) | `itemStock.quantity` (`expand=itemStock`) |
| 10 | Available (flag) | `available` |
| 11 | Auto-manage stock (flag) | `autoManage` |
| 12 | Hidden (flag) | `hidden` |
| 13 | Categories | `categories` (names or ids) |
| 14 | Tags | `tags` |
| 15 | Taxable / default tax (flag) | `defaultTaxRates` |
| 16 | Revenue item (flag) | `isRevenue` |
| 17 | Last modified | `modifiedTime` |
| 18 | Item group | `itemGroup` (if used) |

*Optional post–v1:* modifier groups, options, age-restricted fields — omit from v1 dropdown unless needed.

Wizard **scope filters** for items are defined in §8 and **step 5** above (**step 4** is **location scope**); backend maps to `filter=` — see **B.5**.

### B.5 `expand` and `filter` — UX vs implementation (Clover)

**How they work (Clover Platform REST):**

- **`expand`** — Includes nested/related objects in the response so you avoid extra round-trips. Multiple fields use **percent-encoded commas**: `expand=tags%2Ccategories`. **Nested** expansion uses dotted paths (e.g. `expand=lineItems.taxRates`). Clover asks you to **limit to a maximum of three expanded fields per request** for performance ([Expanding fields](https://docs.clover.com/dev/docs/expanding-fields)).
- **`filter`** — Restricts which rows a **collection** endpoint returns (`=`, `>=`, `!=`, `AND`, `in (...)` , etc.). Which fields are allowed depends on the endpoint; responses can include **`X-Clover-Allowed-Filter-Fields`** ([Applying filters](https://docs.clover.com/dev/docs/applying-filters)). For **orders**, **payments**, **refunds**, **time-based filters** are subject to a **90-day maximum span per request**; longer history requires **multiple requests** with shifted date windows.

**What merchants should see:**

| Concern | Merchant-facing? | Notes |
|--------|------------------|--------|
| Raw `expand` names | **No** (usually) | Backend **derives** required `expand` values from the user’s **selected columns** (and may split work across several calls if more than three expands are needed, or fetch nested resources separately). |
| Raw `filter` syntax | **No** (usually) | Backend maps **friendly report filters** (e.g. date range, employee, include voids) to `filter=` parameters. Power-user “advanced filter” could be post–v1. |
| Report **scope** filters | **Yes** | Expose as normal UI: **date range**, optional **employee**, **voided** / non-voided, etc., as product decisions — these **translate** to `filter` under the hood. |
| **90-day** chunking | **Hidden** | If the user picks a range &gt; 90 days, implementation **loops** API calls in 90-day slices (or warns/limit — product decision). |

**Example — Sales report (payments-oriented columns):**

Merchant wants **last month’s** sales with columns: **payment time**, **amount**, **card type**, **order id**, **employee**.

1. **User sets:** “From / To” dates (business dates → Unix ms for `filter`).
2. **Backend** might call `GET /v3/merchants/{mId}/payments` with e.g.  
   `filter=createdTime>={startMs}&filter=createdTime<={endMs}`  
   and `expand=order%2Cemployee%2CcardTransaction` (example only — **verify** allowed `expand` / `filter` fields on the **Payments** endpoint in the [API Reference](https://docs.clover.com/dev/reference); respect **max 3 expands** or split calls).
3. **Column mapping** pulls `createdTime`, `amount`, `cardType` (or nested card transaction fields), `order.id`, employee name from expanded objects.
4. Merchants **never** type `expand=` or `filter=`; they only set **scope** (dates, etc.) and **columns**.

---

## Appendix C — Specification backlog (tick when done)

Use Markdown checkboxes: `- [ ]` open, `- [x]` done. Move resolved items into the main PRD or linked specs when appropriate; keep this list as the master backlog until empty.

### Product & UX

- [x] Report definition lifecycle: **create**, **edit**, **delete**; no duplicate/clone; no archive (delete only); **no cap** on saved reports per merchant — see §8.
- [x] Wizard **required steps** (v1): **type** → **name** → **time span** (Sales) → **location scope** (all vs single) → **scope filters** (§8) → **columns** + Sales period summary (Appendix B) → **export** (`CSV` \| `XLSX`) — §8 & Appendix B. **Validation rules** (length, required fields): refine in implementation.
- [ ] Wizard **preview:** optional **sample rows** before generate (not required for v1 — §8).
- [x] Additional **filters** beyond **time span** — **Location scope** (all vs single) — §8 step 4; **Sales:** exclude test, exclude voided, completed orders only, optional employee; **Inventory:** include hidden/deleted, optional category/tag; **not** v1: device/register — §8 **Report scope filters (v1)**.
- [x] Export format (v1): **CSV** and **XLSX** only — §8. **Sheet naming** (XLSX) — refine in implementation (**one sheet per report** — Appendix C **Workbook layout**).
- [ ] **Report too large** (max rows, file size, messaging) — **v2+**; intentionally **not** specified in v1 (§12 non-goals). **Explicit v2+ steps:** Appendix C **“v2+ (explicit — large reports & export pagination)”** below.
- [x] **Generate flow** — §8: saved-definition **list**, **past runs** by timestamp, **Generate** → **RabbitMQ**, **spinner + poll** (no rich job-status UX in v1), **idempotency key** on message + DB; **cancel** not required v1; **retry** = generate again with idempotency.
- [x] **Download path** — §8 & §5: **local** = StatefulSet/volume (or blob) + **session-auth** download; **prod** = **S3** + **presigned URL** (typical) and/or authenticated proxy; DB **metadata** (job id, merchant id, key/path, size, content-type, `createdAt`). **Presigned TTL** — set in implementation (document in `AGENTS.md` or env).
- [x] **Zero matching rows:** export file with **all requested column headers**, **no data rows**; period summary **zeros** where applicable — §8 & Appendix B.3.1. No failure solely for empty data; optional UI copy post–v1.
- [x] **Reconnect Clover** page or modal + copy for **re-auth** when tokens cannot be refreshed — §7. **Support URL** and **general error pages** — post–v1.

### Data model & domain (v1)

- [x] **Canonical entities** — §10: **merchants**, **report types**, **column catalog**, **report definitions**, **jobs**, **files** (metadata), **audit events**.
- [x] **Report definition schema** — wizard fields in §8 + Appendix B; **machine-readable JSON** / ORM shape in implementation.
- [x] **Job** states — **internal:** `in_process` \| `done` \| `failed` (§10); **UI:** pending vs ready only (§8).
- [x] **Idempotency** — §8: key on **RabbitMQ** message + **DB** for accepted jobs.

### Auth, session, security

- [x] App session mechanism (cookie vs JWT), TTL, logout, CSRF for state-changing routes — **`docs/authorization-flow.md` §6.1** (**JWT** access + Bearer; refresh via HttpOnly cookie; max ~30d via refresh; logout + CSRF notes).
- [x] OAuth: **Site URL** / **`redirect_uri`** (Clover subpath rules), **`state`** usage; **high-trust vs low-trust** / PKCE — **Decided:** **`redirect_uri`** must be a **subpath of Site URL** (same scheme + host); **authorize** `GET` `https://sandbox.dev.clover.com/oauth/v2/authorize` with `client_id`, URL-encoded **`redirect_uri`**, `response_type=code`, **`state`** (see `docs/clover-developer-setup.md` §2.1). **`state`:** generate cryptographically random server-side, **store** (e.g. HttpOnly cookie or server session), **validate** on callback, then **invalidate** — Clover only echoes `state`; we persist it (`docs/authorization-flow.md` §3.1). **Trust model:** **Confidential / server-side** — `client_secret` only on **`/oauth/v2/token`**; **PKCE not required** for default Next.js BFF (use PKCE only if Clover mandates low-trust flow). **Refs:** `docs/clover-developer-setup.md` §1–2, `docs/authorization-flow.md` §3.1 & §10.
- [x] Clover **OAuth permission** set for v1 report types — **Sandbox app (Custom Business Reports):** dashboard **Requested Permissions** = **Read:** Employees, Inventory, Merchant, Orders, Payments — aligned with **Appendix B** Sales (orders, payments, …) and Inventory (items/stock, …). **Re-verify** at implementation if any column needs an additional permission.
- [x] **Encryption at rest + JWT signing (v1):** **Clover `access_token` and `refresh_token`** (and any persisted material needed to use them) are **encrypted before** they are written to the **database**; decryption only on the app servers. **Encryption key:** supplied as a **static secret** via **Kubernetes secret / environment** in the app cluster (no KMS in v1). **App-session JWTs:** **signed** on the server (integrity — e.g. HS256 or asymmetric) with a **JWT signing key** from a **separate** Kubernetes secret / env — delivery to the browser over **HTTPS**; we do **not** treat “sign the JWT” as “encrypt Clover tokens.” **Scope beyond Clover tokens:** minimal PII and other secrets as implemented; **report file** blobs follow object-store / volume encryption posture — refine in ops docs. **KMS + automated key rotation** for encryption and for JWT signing keys — explicit **Post–v1** items below.
- [ ] **Uninstall / revoke:** behavior when merchant removes app (token invalidation, data retention vs deletion).
- [ ] Optional: **recovery token** flow if app qualifies as high-trust (per Clover docs).

### Clover API & reporting (implementation)

- [x] **Curated v1 column catalogs** (Sales & Inventory) and API sources — Appendix B; **finalize field paths** in sandbox before release.
- [x] **Time handling:** **Storage:** raw timestamps (**e.g.** report/job `generatedAt`, audit fields) are **always UTC** in the database. **Presentation:** **convert** UTC for **UI**, **exported column** datetimes, and **download file names** (readable local date/time in the chosen zone). **Primary:** **merchant’s configured timezone** (IANA id per §8 / merchant profile — aligns Sales **time span** filters with displayed times). **Fallback** when unset: **client/browser local timezone**. Filenames and column formatting use the **same** timezone rule as the rest of the screen for that session.
- [x] **Pagination** plan (page size limits, cursor vs offset, totals) — **not a v1 deliverable:** assume **moderate** report size in v1 (same spirit as **Report too large** — v2+, §12). Workers still **follow Clover API pagination** when calling list endpoints; full **export-scale** pagination design — **v2+ explicit steps** below.
- [x] **Workbook layout (v1):** **One sheet per report** export (**CSV** is inherently single “sheet”; **XLSX** = **one worksheet** per file). Detail rows + **period summary** (Sales — Appendix B.3.1) live on that single sheet. **Multi-sheet workbooks** (e.g. separate tabs per API resource) — **v2+** unless promoted. **Merging rows** from multiple Clover endpoints into one sheet is an **implementation** concern (join/flatten — Appendix B); no separate workbook spec for v1.
- [x] **Multi-location** rule for v1 — **Decided:** wizard **Location scope** step — merchant **explicitly** chooses **All locations (aggregate)** or **Single location** (one `location_id`); **no** implicit aggregate. **Schema:** **`location_scope`**: `all` \| `{ location_id }` on report definitions; workers branch Clover queries accordingly (validate in sandbox / `docs/api-column-map.md`).

### v2+ (explicit — large reports & export pagination)

*Deferred from v1; v1 assumes moderate-sized reports (see **Pagination** [x] above and §12 non-goals).*

- [ ] **Report too large (product):** max rows / file size limits, user messaging, and policy — same theme as open **Product & UX** item above; ship when v2+ addresses scale.
- [ ] **Export pagination & worker strategy:** page size limits, **cursor vs offset**, totals handling, **streaming or chunked** CSV/XLSX generation, memory bounds when aggregating multi-page Clover API results — **not** required for v1; design when **Report too large** is in scope.

### Token refresh job (operations)

**v1 (decided):** **Daily** **`CronJob`** (or equivalent) queries merchants whose **`refresh_token_expiration`** is **≤ now + 30 days** (one month or less remaining). **Enqueue** each to **RabbitMQ** (dedicated refresh queue / message type); **workers** execute **`POST /oauth/v2/refresh`** and **atomically** save the new token pair. Expirations remain **Clover-returned** Unix timestamps — [Clover docs](https://docs.clover.com/dev/docs/use-refresh-token-to-generate-new-expiring-token).

- [x] **Cadence** — **daily** scan; **safety window** — refresh when **`refresh_token_expiration`** within **~30 days**; **delivery** — **queue** then workers (not inline in cron).
- [x] **Failed refresh → DB audit (v1):** each failed **`POST /oauth/v2/refresh`** — **request-time** or from a **dequeued refresh job** — **persists** an **`audit_events`** row (merchant, event type, **sanitized** error summary, UTC timestamp) and sets **`needs_reauth`** (§3, §10).
- [x] **One refresh in flight per merchant (v1):** **single-use rotation** — concurrent refreshes for the same tenant can break the chain. **v1** options (any sufficient combination): **one OAuth-refresh worker process**; **≤1 unconsumed / in-flight refresh message per merchant**; **DB `UPDATE … WHERE refresh_token = $expected`** or **row lock** around refresh. **No** distributed lock required for v1 — **correctness** over production-scale infra; tighten (e.g. stricter caps, multi-worker safe queueing) when scaling.
- [ ] Refine **30-day** window if sandbox/prod data suggests a tighter or looser margin.
- [ ] **In-app UI** to **browse / filter** **`audit_events`** (failed token refreshes, failed report jobs, etc.) — **post–v1**; **v1** = rows in DB + **`needs_reauth`**; investigation via **SQL** or direct DB access is acceptable for local / early ops. **Merchant-facing `needs_reauth`** handling (**Reconnect Clover** — §7) stays in scope per existing Appendix checklist; this item is **not** a substitute for that flow.
- [ ] **External observability (post–v1):** emit token refresh **failures** (and optionally successes / latency) as **structured logs or events** to a **hosted** service (e.g. log aggregation, APM, metrics backend) — **separate** from **`audit_events`** in the app DB.
- [ ] **Metrics/alerts** (dashboards / SLO-style): refresh success rate, failure counts, latency — may build on external observability when that ships.

### Infrastructure & operations

- [ ] **Regions:** EKS + Clover base URLs (NA / EU / LATAM) per deployment and merchant.
- [ ] **Observability:** structured logs, traces, metrics (queue depth, job duration, Clover `429` rate).
- [ ] **Health checks** for web API, workers, queue, DB.
- [ ] **Backups / DR** targets for DB (and object storage if used).
- [ ] **Environments:** dev / staging / prod naming and promotion path (e.g. GitHub Actions).

### Reliability & fairness

- [ ] Product-facing **target** for typical on-demand report duration (even if soft).
- [ ] **Overload:** fair queueing / caps when many merchants generate at once.

### Compliance & legal (non-exhaustive)

- [ ] **Data residency** expectations if serving EU or other regions.
- [ ] **Export / delete** merchant data path (privacy requests).
- [ ] **Privacy policy** and **terms** URLs; in-app links.
- [ ] **PCI scope** statement (e.g. no cardholder data stored — confirm with counsel).

### Billing & monetization

- [ ] **v1 commercial model:** free, beta, or paid via Clover App Market.
- [ ] **Entitlement check** before generate: how subscription / install state is read from Clover (or stubbed for beta).

### Post–v1 (capture early if it affects v1 schema)

- [ ] **KMS + key rotation** for **Clover token encryption** at rest (replace v1 static cluster secret for DB field encryption).
- [ ] **KMS + key rotation** for **app-session JWT signing** keys (replace v1 static cluster secret).
- [ ] Email: provider choice, attachment limits, bounces, transactional vs marketing rules.
- [ ] Schedule: DST, missed windows, duplicate-send prevention; cron granularity vs user expectations.
- [ ] Webhooks for billing or data freshness (if not polling).

### Document / process

- [x] Short **glossary** + **canonical DB tables/columns** — [`docs/data-model.md`](data-model.md) (living document; refine when migrations/ORM land).
- [ ] **Definition of done** / acceptance tests reference for v1 milestones (link to test plan or ticket).
