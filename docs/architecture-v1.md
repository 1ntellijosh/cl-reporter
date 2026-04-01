# Architecture & technical specification — v1 (**locked**)

**Status:** **Final for v1 local + implementation target.** Aligns with [`PRD.md`](PRD.md) and [`data-model.md`](data-model.md). Update this file when technology choices change; do not duplicate long architecture prose in [`AGENTS.md`](../AGENTS.md).

**Related:** [`data-model.md`](data-model.md) · [`api-column-map.md`](api-column-map.md) *(create per `AGENTS.md` when mapping work runs)* · [`authorization-flow.md`](authorization-flow.md)

---

## 1. Principles

| Principle | Application |
|-------------|-------------|
| **Kind is the reference local environment** | All **main** v1 capabilities run as separate **Deployments** or **StatefulSets** in a **Kind** cluster, namespace **`cl-reporter`**, each with a clear responsibility. |
| **TypeScript end-to-end (Node)** | **Next.js (`client`)**, **Express (`oauth-api`)**, **report workers**, and **cron sweep** share **one** Drizzle schema (**`packages/src/drizzle-orm/`** in **`@reporter/middleware`**) and **direct** PostgreSQL access via **`DATABASE_URL`** — no separate HTTP database gateway. |
| **Internal HTTP with axios** | **`client`** and **`worker-report`** call **`oauth-api`** over ClusterIP for Clover OAuth/token operations (and anything you centralize there). **Data** reads/writes use **SQL** (Drizzle) in-process, not a second hop. The **browser** never talks to **`oauth-api`** or Postgres directly. |
| **PRD boundaries** | **RabbitMQ** for report + OAuth refresh jobs; **PostgreSQL** as system of record; **local PV** for report files in Kind; **S3 + presigned URLs** in production; OAuth/token rules per PRD §3. |

---

## 2. Local runtime topology (Kind) — main areas

Each **major function** maps to its **own** workload; StatefulSets for Postgres and RabbitMQ.

| # | Workload | K8s kind | Responsibility |
|---|----------|----------|----------------|
| **1** | **Client app (`client`)** | Deployment | **Merchant-facing** Next.js (App Router), **TypeScript**, **MUI** — typically lives in repo folder **`client/`**. **Server-side** Route Handlers / Server Actions use **`DATABASE_URL`** + **Drizzle** for definitions, jobs, merchants (per [`data-model.md`](data-model.md)); **axios** to **`oauth-api`** only where OAuth/token logic is centralized. **Enqueue:** insert **`report_generation_jobs`** + publish to **`reports.v1`** in one logical flow (same request or transactional outbox — implementation detail). **Does not** open RabbitMQ from the **browser** — only server code. |
| **2** | **Report file storage** | **PersistentVolume** (+ PVC) | **Local only:** mounted into **report worker** pods (e.g. `/data/exports`). **Production:** **S3** + presigned URLs. |
| **3** | **PostgreSQL (`postgres`)** | **StatefulSet** | **PostgreSQL 16** — single replica local v1. |
| **4** | **RabbitMQ (`rabbitmq`)** | **StatefulSet** (or Deployment + PVC) | Queues **`reports.v1`**, **`oauth.refresh.v1`**. |
| **5** | **Report generation (`worker-report`)** | Deployment (scale ≥1) | **Node + TypeScript** + **`amqplib`**: consume job → **Drizzle** load definition/job/merchant → **`oauth-api`** (or shared lib) for valid Clover **`access_token`** → **axios** to Clover REST → **exceljs** / **csv-stringify** → write **PV** (or S3 prod) → **Drizzle** update job + **`report_files`**; **`audit_events`** on failure. |
| **6** | **OAuth service (`oauth-api`)** | Deployment **`replicas: 1`** (v1) | **Express + TypeScript** — Clover **`/oauth/v2/token`**, **`/oauth/v2/refresh`**; **Drizzle** writes encrypted tokens / **`needs_reauth`** / **`audit_events`**. Internal HTTP for **`client`** (callback handoff) and **workers** (“ensure token for merchant”). AMQP consumer for **`oauth.refresh.v1`** may run **here** or as a thin **worker-oauth** — **one** refresh in flight per merchant (PRD §3). |
| **7** | **Token sweep (`cron-token-sweep`)** | **CronJob** | **`DATABASE_URL`** + **`RABBITMQ_URL`**: query merchants with **`refresh_token_expiration` ≤ now + 30 days**; publish **`oauth.refresh.v1`** only (no Clover call in cron). Image can share **`worker-report`** base or a minimal Node image. |

**Shared packages:** **`@reporter/middleware`** (`packages/middleware`) includes **Drizzle** tables under **`src/drizzle-orm/`**; generated migration SQL under **`ops/database/migrations`**. **`client`**, **`oauth-api`**, **`worker-report`**, **cron** import **`@reporter/middleware`** / **`@reporter/middleware/drizzle-orm`**. Planned: `packages/clover-client`, `packages/crypto`.

**Repo vs K8s names:** The logical workload is **`client`** (Next.js merchant app). Your **folder** can be **`client/`**; **Kubernetes** `Deployment` / `Service` names are often also **`client`** or **`cl-reporter-client`** — keep Service DNS aligned with **`OAUTH_API_URL`** / Ingress.

---

## 3. Request / data flows (high level)

1. **Merchant** → **Ingress** → **`client`**.
2. **`client`** (Next.js server): Drizzle **insert job** + **publish** `reports.v1` (ordering/idempotency per PRD §8).
3. **`worker-report`**: consume → **Postgres** (Drizzle) → **`oauth-api`** (token) → **Clover** → **PV/S3** → **Postgres** (job done + file metadata).
4. **`CronJob`**: **Postgres** (merchants due) → publish **`oauth.refresh.v1`** → **`oauth-api`** consumer → Clover refresh → **Postgres** (tokens / **`audit_events`** / **`needs_reauth`**).

---

## 4. Technology choices (libraries)

| Layer | Choice | Notes |
|-------|--------|--------|
| **Client** | **Next.js**, **MUI**, **axios** → **`oauth-api`** | **Drizzle** + **`DATABASE_URL`** on the server only. |
| **Data layer** | **Drizzle ORM** + **drizzle-kit** | Schema in **@reporter/middleware** (**packages/src/drizzle-orm/**); **packages/drizzle.config.ts**; migrations in CI or init Job. |
| **oauth-api** | **Express**, **axios**, **Drizzle** | Same schema as **`client`** / workers. |
| **worker-report** | **amqplib**, **axios** (Clover), **exceljs**, **csv-stringify**, **Drizzle** | Long-lived consumer + **pg** pooling. |
| **HTTP (Clover)** | **axios** | `packages/clover-client`. |
| **Queue** | **RabbitMQ**, **amqplib** | Routing keys **`reports.v1`**, **`oauth.refresh.v1`**. |
| **Tokens at rest** | **AES-256-GCM** | **`CLOVER_TOKEN_ENCRYPTION_KEY`**; writes via **`oauth-api`** / **`client`** OAuth callback paths — document **one** encryption path. |

---

## 5. Report generation: Node/TS in-cluster vs alternatives (decided)

| Option | Verdict |
|--------|---------|
| **Node.js + TypeScript workers in-cluster + RabbitMQ** | **✅ Adopted for v1.** Same as before — shared Drizzle schema with **`client`**. |
| **AWS Lambda** | **❌ Not v1.** |
| **Python + Celery** | **❌ Not v1.** |

---

## 6. Production (target)

| Topic | Specification |
|-------|----------------|
| **Cluster** | **AWS EKS** |
| **Files** | **S3** + IRSA; workers write object key via **Drizzle** into **`report_files`** |
| **Ingress** | ALB + ACM |

**`client` + `oauth-api` + workers + cron** deploy like Kind; **`DATABASE_URL`** from Secrets Manager / SSM.

---

## 7. Container images (naming)

| Image | Contents |
|-------|----------|
| **`cl-reporter-web`** | Next.js **standalone** |
| **`cl-reporter-oauth-api`** | Express + consumer optional |
| **`cl-reporter-worker-report`** | `worker-report` entrypoint |
| **`cl-reporter-cron`** *(optional)* | Sweep binary or same image with `CMD` |

---

## 8. Configuration & secrets (environment variables)

| Variable | Consumers | Purpose |
|----------|-----------|---------|
| **`DATABASE_URL`** | **`client`** (Next.js server), **`worker-report`**, **`oauth-api`**, **cron** | **PostgreSQL** — trusted services only; **never** in browser bundle. |
| **`OAUTH_API_URL`** | **`client`**, **`worker-report`** | Internal **`oauth-api`** base URL (optional if you route via ingress instead). |
| **`SERVER_API_BASE_URL`** | **`client`** (Next.js server, `@reporter/common` **`RequestMaker`**) | Base URL prepended to internal paths such as **`/api/oauth/...`**. **Ingress must forward `/api/oauth/*` to the `oauth-api` Service** (see **`ops/k8s/overlays/dev/ingress-srv.yml`**); otherwise SSR calls hit **`client`** only and return **404**. |
| **`RABBITMQ_URL`** | **`client`** (publish), **`worker-report`**, **`oauth-api`** (if publishing), **cron** | AMQP |
| **`CLOVER_*`**, **`JWT_*`**, **`CLOVER_TOKEN_ENCRYPTION_KEY`** | **`oauth-api`**, **`client`** (subset) | Per PRD / [`authorization-flow.md`](authorization-flow.md) |

**NetworkPolicy (optional):** restrict **`postgres:5432`** to namespace **`cl-reporter`** (or to specific pod labels).

---

## 8.1 Local cluster bootstrap & database migrations (agentic / ops)

**Goal:** One clear story for agents and humans: **stock Postgres** in Kubernetes + **Drizzle** as the **source of truth** for schema changes (aligned with [`data-model.md`](data-model.md)).

| Topic | Decision |
|-------|------------|
| **Postgres image in cluster** | **Official `postgres:16`** in **`ops/k8s/base/statefulsets/postgres-db.yml`**. **`make apply-postgres-db`** applies **Kind** `StorageClass` (`ops/k8s/overlays/dev/storageclass-local.yml`) then the StatefulSet. **`ops/ansible/setup-cluster.yml`** runs **`apply-postgres-db`** right after the local-path provisioner (so the StorageClass exists before the StatefulSet), then **`make wait-postgres-db`** immediately before **`make apply-deployments`** so Postgres is ready before app pods start. |
| **Custom `ops/docker/db/Dockerfile`** | **Optional** only (e.g. add `init-db.sql` to `/docker-entrypoint-initdb.d/`). Runs **once** on first empty volume — **not** a substitute for ongoing schema changes. If unused, **do not** build it in Skaffold; keep the StatefulSet on **`postgres:16`**. |
| **Tables, indexes, seeds** | **Drizzle Kit** migrations: generated SQL under **`ops/database/migrations`**, schema in **`packages/src/drizzle-orm/`**, **`packages/drizzle.config.ts`**, migrate runner **`ops/database/migrate.ts`**. Run **`make migrate`** (or **`DATABASE_URL=... npm run db:migrate -w @reporter/middleware`**) **after** Postgres is reachable — same flow in CI/prod with a reachable **`DATABASE_URL`**. **Avoid** maintaining parallel hand-written SQL in Ansible that duplicates Drizzle. |
| **Ansible** | **`ops/ansible/setup-cluster.yml`** orchestrates local Kind prep; it includes **`make apply-postgres-db`** to apply the Postgres **StatefulSet/Services**, then **`make wait-postgres-db`**, then **`make migrate`**, then app deployments. **`make migrate`** port-forwards to **`cl-reporter-db-srv`** when **`DATABASE_URL`** is unset (local bootstrap). |

**PRD:** High-level pointer only — [`PRD.md`](PRD.md) §10.

---

## 9. Observability (v1)

Structured logs to **stdout**; **`audit_events`** in Postgres. No mandatory APM for local v1.

---

## 10. Out of scope

- Wizard copy — **PRD §8**; Clover JSON paths — **`api-column-map.md`**.

---

## 11. Revision history

| Date | Change |
|------|--------|
| **2026-03-28** | Kind topology: **`client`**, PV, Postgres, RabbitMQ, workers, **`oauth-api`**. |
| **2026-03-28** | **Removed `db-api`:** **`client`**, **`worker-report`**, **`oauth-api`**, and **cron** use **Drizzle + `DATABASE_URL`** directly to Postgres; **`oauth-api`** remains for Clover OAuth/token HTTP surface. |
| **2026-03-28** | Renamed workload **`web`** → **`client`** (aligns with repo folder **`client/`**). |
| **2026-03-29** | §8.1: **`make migrate`**, Drizzle schema in **`@reporter/middleware`**, migrations in **`ops/database/migrations`**. |
| **2026-03-29** | Drizzle package moved from **`packages/db`** to **`ops/database/drizzle-orm`**; **`packages/`** reserved for runtime shared libraries only. |
| **2026-03-30** | Drizzle schema consolidated into **`packages/src/drizzle-orm/`** (**@reporter/middleware**); **`ops/database/drizzle-orm`** removed; migrate script **`ops/database/migrate.ts`**. |
| **2026-03-30** | §8.1: **Stock `postgres:16` + Drizzle migrations**; Ansible **`apply-postgres-db`**; optional custom DB Dockerfile; PRD §10 pointer. |
| **2026-03-30** | §8.1: **`make wait-postgres-db`** before app **`apply-deployments`**; **`apply-postgres-db`** moved earlier in **`setup-cluster.yml`** (after local-path provisioner). |
