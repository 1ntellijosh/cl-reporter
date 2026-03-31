# Clover developer setup — dashboard tasks & local dev

**Purpose:** Checklist for **you** (or ops) to get OAuth and app development unblocked: what happens in the **Clover Global Developer Dashboard** vs **this repo**. Conceptual background: **`docs/authorization-flow.md` §10**.

---

## 1. Clover Global Developer Dashboard

Complete these in the [Global Developer Dashboard](https://www.clover.com/developers) for your **sandbox** app first; repeat or mirror for **production** when you have a prod app.

### 1.1 App and environment

- [X] **Create or select** the cl-reporter app (sandbox).
- [X] Note **sandbox vs production** app IDs — use the correct **`client_id` / `client_secret`** per environment (never commit secrets).
- [X] Set **Site URL** / web app settings per [Clover app configuration](https://docs.clover.com/) (exact fields change over time — match current docs).

### 1.2 Site URL and `redirect_uri` (there is **no** separate “URL list” in Clover)

Clover’s dashboard does **not** show a multi-entry “redirect URI allowlist” like some other OAuth consoles. You configure web apps under **App Settings → REST Configuration → Edit REST Configuration** ([Manage app settings](https://docs.clover.com/dev/docs/app-settings)):

| Field | Role |
|--------|------|
| **Site URL** | Base URL for your app. After OAuth, Clover sends the merchant here by default; it is also what your registered **origin** is tied to. |
| **`redirect_uri` in code** | In the `/oauth/v2/authorize` request you may pass **`redirect_uri`**. Per [OAuth flow overview](https://docs.clover.com/dev/docs/oauth-flows-in-clover), that URL must be a **valid subpath of your registered Site URL**, with **same scheme and domain** (e.g. Site URL `https://example.com/app` → valid `https://example.com/app/oauth/callback`). |
| **Alternate Launch Path** | Optional path used when OAuth starts from the Merchant Dashboard nav or App Market; **same base domain as Site URL**. |

So: **set Site URL** to a base you control; implement your callback as a **subpath** under it; use that full URL as **`redirect_uri`** in authorize. **Not** a separate file in the repo — **REST Configuration** in the dashboard + your app’s authorize request must agree.

- [X] Set **Site URL** (sandbox) to the **base** URL that matches how you reach the app (e.g. `https://your-tunnel.example/api` or `https://127.0.0.1:8443` if allowed — **confirm scheme/host rules** in current Clover docs).
- [X] Choose one **callback path** under that base (e.g. `/auth/clover/callback`) and use the **full** URL as **`redirect_uri`** in code; it must stay a **subpath** of Site URL per Clover rules.
- [X] For **kind** / local dev, the browser must open the **same** host + scheme you put in Site URL; if you change domain or port, **update Site URL** (and any **Alternate Launch Path** you use).
- [ ] Repeat for **production** app settings when you have a prod app and hostname.

### 1.3 `state`, high-trust vs low-trust, PKCE — **not** Clover dashboard fields

You will **not** see **“state”**, **“high trust”**, or **“PKCE”** toggles on App Settings. Those phrases in our PRD/checklists mean **what you implement or confirm in docs**, not missing UI.

| Phrase | What it actually is |
|--------|----------------------|
| **`state`** | An OAuth **query parameter your app generates** and validates on the callback. **Zero** Clover dashboard configuration — only **code** (see §2.1). |
| **High-trust vs low-trust** | Industry shorthand: **confidential** client (server has **`client_secret`**, code exchange on server) vs **public** client (no secret; often **PKCE**). Clover shows **App ID / App Secret** for REST web apps — using the secret **only on the server** **is** the confidential / “high-trust” pattern. There is usually **no** separate “trust mode” switch. |
| **PKCE** | Extra OAuth steps **in code** if [Clover’s docs](https://docs.clover.com/dev/docs/oauth-flows-in-clover) require them for your flow — not a field next to Site URL. |

- [X] **`state`:** Implement generate + store + verify on callback — **§2.1** (not configured in Clover).
- [X] **Confidential client:** Keep **`client_secret`** on the server; exchange **`code`** for tokens **only** in server routes — matches **REST Clients** + secret in the dashboard.
- [X] **PKCE:** **Not required** for this repo’s flow. Clover’s **[high-trust auth code flow](https://docs.clover.com/dev/docs/high-trust-app-auth-flow)** exchanges `code` using **`client_id`** + **`client_secret`** on `/oauth/v2/token` (no **`code_challenge`** / **`code_verifier`**). **[PKCE](https://docs.clover.com/dev/docs/oauth-flow-for-low-trust-apps-pkce)** is for **low-trust** apps that cannot store a client secret. “[Online integration](https://docs.clover.com/dev/docs/select-an-integration)” picks REST/API building blocks; it does not override that split — a server-side confidential client still follows high-trust.

### 1.4 OAuth permissions (scopes) for v1

- [ ] List APIs needed for **Sales** and **Inventory** reports (**`docs/PRD.md` Appendix B**).
- [ ] In the dashboard, enable the **minimum** OAuth permissions that cover those endpoints (merchant consent shows these).
- [ ] After changing permissions, **re-install or re-consent** the app on a **test merchant** if Clover requires it so tokens include new scopes.

### 1.5 Test merchant

- [X] Create or use a **sandbox test merchant** (merchant credentials are separate from the developer login).
- [X] **Install** the app / complete OAuth once to verify redirect + token exchange end-to-end.

---

## 2. Our application (code & configuration)

### 2.1 Authorize URL — query parameters (Clover v2 / research summary)

**Sandbox `GET` endpoint (host per [OAuth flow overview — environment URLs](https://docs.clover.com/dev/docs/oauth-flows-in-clover)):**

`https://sandbox.dev.clover.com/oauth/v2/authorize`

*(Production: `www.clover.com`, `www.eu.clover.com`, or `www.la.clover.com` depending on region — same path `/oauth/v2/authorize`.)*

**Typical query string (authorization code flow, high-trust web app):**

| Parameter | Required | Notes |
|-----------|----------|--------|
| **`client_id`** | Yes | Your App ID from the dashboard. |
| **`redirect_uri`** | Yes | Where Clover sends the user **after** consent, with `code` (and your `state`). Must be a **valid subpath of your registered Site URL**; same scheme and domain — [terminology: `redirect_uri`](https://docs.clover.com/dev/docs/oauth-flows-in-clover). **URL-encode** the value. |
| **`response_type`** | Use `code` | Clover’s [example](https://docs.clover.com/dev/docs/oauth-flows-in-clover) uses `response_type=code` for the authorization code flow (expiring tokens). |
| **`state`** | Strongly recommended | Opaque random value; stored server-side; validated on callback — [terminology: `state`](https://docs.clover.com/dev/docs/oauth-flows-in-clover). |

**Minimal documented pair:** [High-trust — Step 1](https://docs.clover.com/dev/docs/high-trust-app-auth-flow) describes sending **`client_id`** and **`redirect_uri`** to `/oauth/v2/authorize`. Adding **`response_type=code`** and **`state`** matches Clover’s fuller example and OAuth 2.0 practice.

**Permissions:** Requested API access is configured under **Requested Permissions** in the Developer Dashboard; Clover’s `state` example does **not** add a `scope` query param. If a future doc revision requires extra authorize params, follow the current [OAuth flow overview](https://docs.clover.com/dev/docs/oauth-flows-in-clover) / [use OAuth](https://docs.clover.com/dev/docs/use-oauth) pages.

**Low-trust / PKCE:** [PKCE parameters](https://docs.clover.com/dev/docs/oauth-flow-for-low-trust-apps-pkce) (`code_challenge`, `code_challenge_method`, etc.) apply to **public** clients — not the default for a server-side Next.js app with **`client_secret`**.

**Host note:** Some older Clover pages show **`apisandbox.dev.clover.com`** for authorize in examples; the **environment table** for `/oauth/v2/authorize` lists **`sandbox.dev.clover.com`**. Use the table; if behavior differs, confirm against the latest doc or support.

Example (shape only):

`https://sandbox.dev.clover.com/oauth/v2/authorize?client_id=<APP_ID>&redirect_uri=<URL_ENCODED_CALLBACK>&response_type=code&state=<RANDOM>`

### 2.2 OAuth implementation (must match dashboard)

- [X] Build **authorize URL** as in §2.1; **`redirect_uri`** matches env and Site URL rules.
- [X] **Callback handler:** Validate **`state`**, exchange **`code`** with **`client_secret`** server-side only, persist Clover tokens per **`docs/authorization-flow.md`**.
- [ ] **Idempotency:** Do not process the same `code` twice.

### 2.3 Environment variables

- [X] Add **`client_id`** and **`client_secret`** (sandbox) to local/secret store — document names in **`.env.example`** when the app exists.
- [X] Base URL / **`redirect_uri`** in env matches **Site URL + subpath** from §1.2.

---

## 3. Local development — run the web app

- [X] **Node / package manager** installed per team standard.
- [X] **`npm install`** (or `pnpm` / `yarn`) at repo root once **`package.json`** exists.
- [X] **`npm run dev`** (or documented script) — see root **`AGENTS.md`**.
- [X] If OAuth **requires a public HTTPS URL** for callbacks, run a **tunnel** to your local port and set **Site URL** (§1.2) to a **base** that matches.

### 3.1 Optional: column mapping sandbox pass

When wiring reports, follow **`AGENTS.md`** (“investigate Clover JSON for report columns”) and create **`docs/api-column-map.md`** with sandbox-verified paths.

---

## 4. When this checklist is “done enough” for v1 OAuth

You can ship OAuth integration work when:

1. **§1.2** **Site URL** and **`redirect_uri`** (subpath) match the running app for each environment you test.
2. **`state`** is implemented and **§2.2** callback + token storage work on a test merchant.
3. **§1.4** permissions are sufficient for **Appendix B** column sources (adjust if API calls return **403**).

Remaining PRD Appendix C items (encryption at rest, uninstall behavior, etc.) are **separate** — track there.
