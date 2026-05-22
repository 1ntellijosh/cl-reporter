# Sales reporting — Clover API reference list

**Status:** Draft — verify `filter` / `expand` allowances per endpoint against live **`X-Clover-Allowed-Filter-Fields`** and sandbox responses before locking workers.

**Purpose:** Single checklist of **Clover REST** operations needed to populate the **sales** report patterns in [`sales-report-types-and-data-points.md`](sales-report-types-and-data-points.md) and the v1 column catalog in [`PRD.md`](PRD.md) Appendix B.

**Auth:** Merchant OAuth **Bearer** token; base URL e.g. `https://apisandbox.dev.clover.com` (region-specific hosts per Clover).

**Cross-cutting constraints (from PRD B.5):**

- At most **three** `expand` values per request (or use dotted expands as documented); split work across calls if needed.
- **90-day maximum** time window per request for many order/payment/refund filters — **chunk** longer merchant-selected ranges in the report worker.

---

## Core reads (almost every Sales export)

| HTTP | Path | Operation (Clover ref) | Typical use |
|------|------|-------------------------|-------------|
| GET | `/v3/merchants/{mId}/orders` | [Get orders](https://docs.clover.com/dev/reference/ordergetorders) | List/filter orders by time, state, employee, test mode, etc.; expand line items, payments, employee, orderType, discounts as allowed |
| GET | `/v3/merchants/{mId}/orders/{orderId}/line_items` | *(Line items on order — see [Working with orders](https://docs.clover.com/dev/docs/working-with-orders))* | Line-level revenue, item link, modifiers, line tax/discounts when not fully expanded on list |
| GET | `/v3/merchants/{mId}/orders/{orderId}/payments` | [Get all payments for an order](https://docs.clover.com/dev/reference/paygetorderpayments) | Tender, amounts, tips, tax, card metadata, refunds expand, employee on payment |

**Note:** [Create atomic order](https://docs.clover.com/dev/reference/ordercreateatomicorder) is **write**; not used for reporting. Listed only because it defines **order payload shapes** useful when reading fields.

---

## Payment-centric pulls (tender mix, payment-time reporting)

When the merchant cares about **payment time** and tender totals, a **payments** collection can reduce joins (PRD B.5 example).

| HTTP | Path | Notes |
|------|------|--------|
| GET | `/v3/merchants/{mId}/payments` | Filter by `createdTime` (and others per **Allowed-Filter-Fields**); expand `order`, `employee`, `tender`, `cardTransaction` within the 3-expand rule |

*Exact path and parameters:* confirm in [Clover API Reference](https://docs.clover.com/dev/reference/api-reference-overview) — naming may vary slightly by API version.

---

## Refunds

| HTTP | Path | Notes |
|------|------|--------|
| GET | `/v3/merchants/{mId}/orders` with `expand=refunds` | Refunds on orders |
| GET | `/v3/merchants/{mId}/refunds` | If used: time-filtered refund lists (verify filters) |

Use refund objects linked from **payments** ([pay.GetOrderPayments](https://docs.clover.com/dev/reference/paygetorderpayments) documents `refunds` expand).

---

## Inventory joins (item, SKU, category, tag)

Needed for **sales by item/SKU** and **by category/tag** (line item carries `item` id).

| HTTP | Path | Notes |
|------|------|--------|
| GET | `/v3/merchants/{mId}/items` | [Get all inventory items](https://docs.clover.com/dev/reference/inventorygetitems) with `expand` e.g. `categories`, `tags`, `itemStock` (inventory report uses more; sales may need categories/tags only) |

---

## Employee display names

| HTTP | Path | Notes |
|------|------|--------|
| GET | `/v3/merchants/{mId}/employees` or `.../employees/{empId}` | Resolve id → name if not expanded on order/payment |

*(v1 PRD lists Employees as post–v1 REST “area” for some features, but **employee id** on orders is already in scope for filters/columns.)*

---

## Customers (optional columns)

| HTTP | Path | Notes |
|------|------|--------|
| GET | `/v3/merchants/{mId}/orders` with `expand=customers` | When customer columns selected (per B.3) |

---

## Locations (multi-store)

| HTTP | Path | Notes |
|------|------|--------|
| GET | Merchant **locations** endpoints (Clover merchant/location APIs) | Resolve `location_id` for UI + confirm order→location mapping |

*Specific path:* confirm under Merchant in [API Reference](https://docs.clover.com/dev/reference/api-reference-overview); align with PRD **location_scope** implementation note.

---

## Data point → API quick map

| Data point | Primary sources |
|------------|-----------------|
| Order header (id, times, state, total, type, employee, customer, device, test, note) | `GET .../orders` (+ expands) |
| Line revenue, qty, item link, modifiers | `lineItems` on order or `GET .../line_items` |
| Payment amount, tip, tax, tender, card brand/last4 | `GET .../orders/{orderId}/payments` or `payments` on order / merchant payments |
| Refunds | `refunds` on payment or order |
| Item name, SKU, categories, tags | `GET .../items` (+ expand) joined by line `item.id` |
| Period KPIs | Aggregate in worker from same fetched set (B.3.1) |

---

## Not available from Clover sales APIs

- **Department / cost center** as a native key (see sales-report-types doc).
- **CRM pipeline, opportunity stage, forecast categories** — not in orders.
- **Item cost / margin** — not in standard sales line export without cost data elsewhere.
- **Marketing campaign / lead source** — not on order unless custom conventions.

---

## Next step (engineering)

Build **`docs/api-column-map.md`** (per `AGENTS.md`) with one row per Appendix B column: method, path, `expand`, JSON path, sandbox verified (y/n).
