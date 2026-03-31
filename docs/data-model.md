# Glossary and data model (v1 spec)

**Purpose:** Shared vocabulary for agents and contributors, plus a **canonical view of persisted data** aligned with [`PRD.md`](PRD.md) §10. Exact SQL types, indexes, and migration filenames are decided at implementation time; this document is the **product/schema contract** to keep code and docs aligned.

**Sources of truth:** [`PRD.md`](PRD.md) (especially §8 wizard payload, §10 entities, OAuth/token maintenance §3). When implementation diverges, update **this file** and the PRD if the product intent changed.

**Runtime access:** Per [`architecture-v1.md`](architecture-v1.md), **trusted** server processes (**Next.js server** for the **`client`** app, **report workers**, **`oauth-api`**, **cron sweep**) connect to PostgreSQL with **`DATABASE_URL`** using a **shared** schema (**Drizzle** in **`packages/src/drizzle-orm/`**, imported via **`@reporter/middleware`** / **`@reporter/middleware/drizzle-orm`**). The **browser** never receives `DATABASE_URL`. The tables below are the **logical** model.

---

## Glossary

| Term | Meaning |
|------|--------|
| **Merchant** | A Clover business that has installed our app — one **tenant** in cl-reporter. Persists as a row in **`merchants`**. |
| **`mId`** | **Clover merchant id** — the identifier Clover uses in API paths (e.g. `GET /v3/merchants/{mId}/orders`). In our DB it is typically stored as **`clover_merchant_id`** (or similar); **not** necessarily our internal surrogate primary key. |
| **Location** | A Clover **store / site** under a merchant. Used when **`location_scope`** is **single location**; the wizard persists a Clover **`location_id`** (see PRD §8). |
| **Report definition** | A **saved wizard configuration**: report type, name, time span (Sales), `location_scope`, filters, columns, export format, etc. One merchant can have many definitions. |
| **Job (generation job)** | One **on-demand generation run**: enqueue → worker builds file → **`done`** or **`failed`**. Distinct from **report definition** and from **OAuth token refresh** work (refresh may not use the same table — see below). |
| **Run** | Informal synonym for a **generation job** attempt (“past runs” in the UI). |
| **Idempotency key** | Client/server-generated key so **duplicate Generate clicks** do not create duplicate jobs/files (PRD §8). Stored on the job row and on the queue message. |
| **File (artifact)** | The exported **CSV** or **XLSX** bytes; **metadata** in **`report_files`** (or equivalent), bytes in **S3** (prod) or **local volume** (dev). |
| **`needs_reauth`** | Merchant flag: Clover **refresh** no longer usable — user must complete **Reconnect Clover** / OAuth again (PRD §3, §7). |
| **Audit event** | A **row in `audit_events`** recording a notable failure or ops-relevant occurrence (failed report job, failed OAuth refresh, etc.). **v1** does not require an in-app UI to browse these rows (PRD Appendix C). |

---

## Database tables (v1)

Naming is **suggested**; adjust to match ORM conventions (`snake_case` vs `camelCase`). Columns list **logical** fields required by the PRD.

### `merchants`

One row per merchant using cl-reporter (Clover tenant).

| Column | Description |
|--------|-------------|
| **`id`** | Internal primary key (UUID or bigint). |
| **`clover_merchant_id`** | Clover’s merchant id (`mId` in API docs). Unique. |
| **`created_at`**, **`updated_at`** | UTC timestamps. |
| **Subscription / entitlement** | Fields as needed to gate **Generate** (Clover App Market subscription / install state — exact shape **TBD**; may be stubbed in early v1 — PRD Appendix C). |
| **`access_token_ciphertext`** | Encrypted Clover **access_token** (PRD §10, encryption checklist). |
| **`refresh_token_ciphertext`** | Encrypted Clover **refresh_token**. |
| **`access_token_expiration`** | Expiry for access token (Clover-returned; Unix seconds or timestamptz UTC). |
| **`refresh_token_expiration`** | Expiry for refresh token — drives **proactive refresh** when ≤ **now + ~30 days** (PRD §3). |
| **`needs_reauth`** | Boolean (or equivalent): **true** when refresh failed or tokens unusable. |
| **`timezone`** | IANA timezone id for **Sales** time-span interpretation and display (PRD §8, §10 time handling). |

Optional later: merchant display name cache, last successful Clover API call, etc. (not required by PRD v1).

---

### `report_definitions`

Saved **wizard** configuration per merchant.

| Column | Description |
|--------|-------------|
| **`id`** | Primary key. |
| **`merchant_id`** | FK → **`merchants.id`**. |
| **`name`** | User-visible label (validation rules — implementation). |
| **`report_type`** | **`Sales`** \| **`Inventory`** (v1 only). |
| **`definition`** | Structured payload: **`time_span`** (Sales — start/end + timezone reference), **`location_scope`** (`all` \| `{ location_id }`), **scope filters** (exclude test, voided, completed-only, employee; inventory hidden/deleted/category/tag — PRD §8), **selected columns** + Sales **period summary** toggles, **`export_format`** (`CSV` \| `XLSX`). **JSON** column or normalized child tables — implementation choice; must round-trip the wizard. |

Timestamps: **`created_at`**, **`updated_at`** (UTC).

---

### `report_generation_jobs`

One row per **enqueue** of a report build (PRD §10 “Jobs”).

| Column | Description |
|--------|-------------|
| **`id`** | Primary key. |
| **`merchant_id`** | FK → **`merchants`**. |
| **`report_definition_id`** | FK → **`report_definitions`**. |
| **`idempotency_key`** | Unique per logical run; prevents duplicate work (PRD §8). |
| **`status`** | **`in_process`** \| **`done`** \| **`failed`** (internal; UI only “waiting” vs “ready”). |
| **`created_at`**, **`updated_at`**, **`started_at`**, **`completed_at`** | UTC; use as needed for polling and ops. |
| **`audit_event_id`** | Nullable; set when **`status = failed`** links to **`audit_events`** (PRD §10). |

---

### `report_files`

Metadata for each **successful** generated artifact (bytes not in SQL — PRD §10 “Files”).

| Column | Description |
|--------|-------------|
| **`id`** | Primary key. |
| **`job_id`** | FK → **`report_generation_jobs.id`**; typically **one file per successful job**. |
| **`merchant_id`** | FK; denormalized for listing/filtering if useful. |
| **`storage_key`** | S3 object key, or **local path** (dev), or equivalent. |
| **`filename`** | Download-friendly name (and/or same info embedded in key). |
| **`size_bytes`** | File size. |
| **`content_type`** | e.g. `text/csv`, XLSX MIME type. |
| **`created_at`** | UTC. |

---

### `audit_events`

**Failed** report jobs, **failed** Clover OAuth refresh attempts (request-time or **queued refresh worker**), and other ops events (PRD §10).

| Column | Description |
|--------|-------------|
| **`id`** | Primary key. |
| **`merchant_id`** | FK; which tenant (nullable only if a future global event type requires it — default **not null** for v1 failures). |
| **`event_type`** | Discriminator, e.g. **`report_job_failed`**, **`oauth_refresh_failed`**. |
| **`summary`** | **Sanitized** human-readable / JSON summary safe for storage (no raw secrets). |
| **`related_job_id`** | Nullable FK → **`report_generation_jobs`** when the event is about a report run. **Null** for refresh-only failures. |
| **`created_at`** | UTC. |

---

## Non-table persisted concepts (v1)

| Concept | How it is stored |
|--------|------------------|
| **Report type catalog** | **`Sales`**, **`Inventory`** — code enum and/or small seed table (PRD §10). |
| **Column catalog (“report options”)** | Config, seed, or code — must match Appendix B; optional table if not embedded in app config. |
| **Clover `client_id` / `client_secret`** | **Not** in merchant tables — **application** env / secrets (PRD §10). |
| **Queue messages (RabbitMQ)** | **Report** jobs and **OAuth refresh** messages — payload references **`merchant_id`** / job id as designed; **failed refresh** outcomes land in **`audit_events`** + **`merchants.needs_reauth`** without requiring a separate **`oauth_refresh_jobs`** table unless you add one for idempotency/observability. |

---

## Related docs

- [`PRD.md`](PRD.md) §8 (wizard fields), §10 (entities), §3 (token maintenance), Appendix C (backlog).
- [`authorization-flow.md`](authorization-flow.md) (OAuth and session vocabulary).
