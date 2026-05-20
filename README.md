# cl-reporter

Custom Report App for Clover Marketplace.

**Docs:** Product intent lives in [`docs/PRD.md`](docs/PRD.md). **Glossary + DB schema (v1 spec):** [`docs/data-model.md`](docs/data-model.md). **Architecture (Kind/K8s, services, infra choices):** [`docs/architecture-v1.md`](docs/architecture-v1.md). Agent and contributor workflow is in [`AGENTS.md`](AGENTS.md). **Clover dashboard + local OAuth setup:** [`docs/clover-developer-setup.md`](docs/clover-developer-setup.md). **Full auth narrative:** [`docs/authorization-flow.md`](docs/authorization-flow.md).

## Authorization flow (Merchant Dashboard launch)

When a merchant opens the app from the **Clover Merchant Dashboard**, our **server** starts OAuth: it puts **`state`** on the authorize redirect and later checks it on the callback. **`client_secret`** is used **only** on the **token** request from the server to Clover (never in the browser). Details and tables: [`docs/authorization-flow.md`](docs/authorization-flow.md) (section **§3.1**).

```mermaid
sequenceDiagram
    participant B as Merchant browser
    participant CloverUI as Clover OAuth UI
    participant S as Our App (client, oauth-api)
    participant T as Clover token API

    B->>CloverUI: Open Merchant Dashboard, click our app
    CloverUI->>B: Redirect to Site URL or Alternate Launch Path
    B->>S: GET entry page (/start in client)
    Note over S: No session found in our app -> client /clover-callback: Generate random state and store it in an HttpOnly cookie
    S->>B: 302 to Clover oauth v2 authorize with state
    B->>CloverUI: GET authorize, state in query string
    CloverUI->>B: Sign in or consent if needed
    CloverUI->>B: 302 to our callback with code and state
    B->>S: GET callback with code and state (/complete-clover in client)
    Note over S: Reject if state does not match stored cookie value OR -> oauth-api /exchange-clover-code
    S->>T: POST oauth v2 token with code and client_secret
    Note over S,T: client_secret only here, never in browser
    T->>S: access_token and refresh_token
    S->>S: oauth-api /exchange-clover-code: Persist Clover tokens -> client /complete-clover: mint our JWT
    S->>B: Redirect to app UI (client /dashboard) logged in
```
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace