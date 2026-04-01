# Step-by-step: Auth workflow implementation (recommended plan)

This document is an ordered implementation checklist for Clover v2 OAuth + our app session, aligned with `docs/authorization-flow.md`, `docs/architecture-v1.md`, `oauth-rest-authorization-proposal.md`, and TypeScript conventions in `docs/typescript-guidelines.md`.

**Target architecture (summary):**

- **`oauth-api`**: Clover `code` exchange, `/oauth/v2/refresh`, encrypted token storage in Postgres, “valid Clover `access_token` for merchant” for trusted callers.
- **`client` (Next.js server)**: OAuth callback on our domain, mint **our** app-session JWTs, set cookies / respond with tokens per `docs/authorization-flow.md` §6.1 (Bearer access + HttpOnly refresh).
- **Workers / cron**: call `oauth-api` (or shared lib used only server-side) for Clover tokens; no browser.

---

## Phase 5 — Security, ops, and docs

1. **CSRF / Origin:** For mutating Next routes, validate `Origin` / `Host` where appropriate; refresh cookie route uses `SameSite` + optional CSRF token if you use cookie POST.

2. **Logging:** never log Clover tokens or JWTs; log merchant id + event types only.

3. **Update** `AGENTS.md` or `.env.example` with final env var names.

4. **Align** `docs/authorization-flow.md` only if behavior intentionally diverges (per repo rules).

5. **App Market billing (paid / trial / free tier):** OAuth proves API access; subscription state is separate. Plan pricing and post-OAuth **entitlement** checks using Clover’s billing docs — [Monetize your apps](https://docs.clover.com/dev/docs/monetizing-your-apps) (subscription vs metered, trials, handling lapsed merchants) and the Platform API **Get merchant app billing information** (`GET /v3/apps/{appId}/merchants/{mId}/billing_info`). Align with `docs/PRD.md` commercial model when you wire gating.

---

## Phase 6 — Verification checklist (manual)

1. Sandbox: install app → launch from dashboard → land on `/start` → complete OAuth → merchant row populated with ciphertext + expirations.
2. Call Clover REST with returned access token (worker or temporary script).
3. Force access expiry (short TTL in dev): confirm refresh path updates DB and does not double-consume refresh.
4. Revoke refresh in Clover (or simulate failure): `needs_reauth` set, user sees reconnect path.

---

## Related documents

- `oauth-rest-authorization-proposal.md` — rationale and architecture notes  
- `docs/authorization-flow.md` — session + OAuth hardening  
- `docs/clover-developer-setup.md` — Site URL, `redirect_uri`, authorize URL shape  
- [Monetize your apps](https://docs.clover.com/dev/docs/monetizing-your-apps) — Clover App Market pricing, trials, billing lifecycle (complements OAuth; use with billing_info API for entitlements)  
- `docs/typescript-guidelines.md` — JSDoc, `@since`, structure of new TS files  
