# Agent guide — cl-reporter

How to work in this repository. **Read `docs/PRD.md` first** before implementing features or changing product behavior.

## Product source of truth

| Document | Use |
|----------|-----|
| `docs/PRD.md` | What we build, for whom, core jobs, integrations, constraints, success criteria, non-goals |
| `docs/data-model.md` | **Glossary** (`mId`, job vs definition, …) and **canonical DB tables/columns** (v1 spec; update when migrations exist) |
| `docs/architecture-v1.md` | **Engineering architecture** — Kind/K8s local topology, services, DB/queue choices, secrets; **research → decided** specs live here (not in the PRD) |
| This file | **How** to build and run: stack, commands, agent conventions |
| `docs/api-column-map.md` *(when created)* | Clover column → endpoint / `expand` / JSON path (sandbox-verified) |
| `docs/authorization-flow.md` | OAuth, **our** app session vs Clover tokens (**§6.1** — **JWT** access + Bearer, refresh cookie, TTL, logout, CSRF), **§10** OAuth hardening (redirect, `state`, scopes, trust model) |
| `docs/clover-developer-setup.md` | **Your checklist:** Clover Developer Dashboard (redirect URIs, permissions, sandbox merchant) + **local dev** steps to run the app and wire OAuth |
| `ops/ansible/setup-cluster.yml` | Local Kind bootstrap; calls **`make apply-postgres-db`** among other targets — see **`docs/architecture-v1.md` §8.1** |

When product intent changes, update `docs/PRD.md` in the same change as behavior, or note follow-ups under **Open questions** there.

## Project context

Custom Reports oriented toward the **Clover marketplace** (see root `README.md`).

**Monorepo (npm workspaces):** Shared library is **`@reporter/core`** (`packages/` — valid scoped name; bare `@reporter` is not allowed on npm). Import as `from '@reporter/core'`. Root **`package.json`** `workspaces` lists **`packages`** and **`oauth-api`**; add **`client`** when the Next.js app exists.

## Tech stack (web client — decided)

**Full v1 architecture (Kind, workers, Postgres, RabbitMQ, images, env vars):** [`docs/architecture-v1.md`](docs/architecture-v1.md).

| Layer | Choice | Notes |
|-------|--------|--------|
| Framework | **Next.js** | App Router assumed unless the repo template says otherwise; SSR/SSG choices per feature (OAuth callbacks, dashboard). |
| UI / styling | **Material UI (MUI)** | Use MUI components for layout, forms, tables, dialogs, progress, and theme — avoid parallel CSS frameworks unless necessary. |
| API | Next.js Route Handlers / BFF; **Drizzle** + **`DATABASE_URL`** on server only; **`oauth-api`** via **axios** for OAuth/token ops | **Postgres** reachable from **`client`** app (e.g. repo **`client/`**), **`worker-report`**, **`oauth-api`** (shared schema); see `docs/architecture-v1.md`. |

**UI behaviors** called out in the PRD backlog (e.g. generate **progress**, **cancel**, **retry**, **idempotency**) are **product requirements**; **MUI** is the default **implementation** path (e.g. `LinearProgress`, `CircularProgress`, snackbars for errors). Keep product intent in `docs/PRD.md`; put component-level patterns here or in `docs/ui-patterns.md` only if they grow beyond a short paragraph.

**Why not only the PRD?** The PRD should stay **what** merchants get; **Next.js + MUI** is **how** engineers implement — belongs here so agents do not re-debate the stack every session.

**Downloads:** **Production** uses **S3** + **presigned URLs** (TTL in env, e.g. 15 minutes — document when implemented). **Local** uses app/session-authenticated file serving — see `docs/PRD.md` §8.

## Commands

After the Next.js app exists in this repo (e.g. `create-next-app` with MUI added):

```bash
npm install
npm run dev
npm run lint
npm test
```

*(Adjust if the repo uses `pnpm` or `yarn`.)*

## Conventions

- Prefer small, reviewable changes tied to a clear goal from the PRD.
- When adding or changing **external API usage** (Clover or others), update the **Integrations** table (and environment notes) in `docs/PRD.md` or add `docs/api-contracts.md` if the team splits API detail out of the PRD.
- Do not commit secrets; use env vars and document required names in `AGENTS.md` or `.env.example` when the stack exists.

## Cursor rules

Scoped guidance lives in `.cursor/rules/` (e.g. PRD alignment, API/integration updates).

## Task: investigate Clover JSON for report columns (subagent / focused session)

Use a **dedicated agent chat or task** when **locking** `docs/PRD.md` Appendix B dropdown labels to real API data. This complements product work in the PRD; output belongs in a **separate mapping doc** (not the PRD body).

**Goal:** For each v1 **Sales** / **Inventory** column option, record **endpoint**, **`expand`** (if any), and **concrete JSON path** (or jq-style hint) verified against **sandbox** responses.

**Inputs (env — never commit):**

- `CLOVER_SANDBOX_TOKEN` — merchant OAuth `access_token` for a test merchant
- `CLOVER_MERCHANT_ID` — `mId`
- Base URL: `https://apisandbox.dev.clover.com` (adjust for region if needed)

**Process:**

1. Read **Appendix B.3–B.4** in `docs/PRD.md` for the list of user-facing labels.
2. For each label, call the smallest Clover request that exposes the field (e.g. `GET /v3/merchants/{mId}/orders`, `GET .../orders/{orderId}`, `GET .../items` with documented `expand` limits — max 3 expands per request per Clover).
3. Save a **redacted** sample JSON snippet or note shape (`id` vs nested object, `elements` arrays).
4. Write one row per column in **`docs/api-column-map.md`** (create when this task starts) with columns: `wizard_label | http_method path | expand | json_path | verified (y/n) | notes`.

**Deliverable:** PR titled or described as “Clover column map — sandbox verified” with updates only to `docs/api-column-map.md` (and code when wiring the exporter).

**Automation (optional later):** A small script under `scripts/` that curls sandbox with env vars and prints `jq` paths speeds repeat runs; still require human sign-off on edge cases (payments, voids, multi-location).
