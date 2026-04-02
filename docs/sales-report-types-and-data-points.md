# Sales report types and data points (research)

**Status:** Draft — evolves with Clover sandbox verification (`docs/api-column-map.md` when created) and inventory research.

**Purpose:** Catalog common **sales** report patterns merchants expect, split into **essential** vs **secondary** metrics, note **time-span** applicability, and flag **Clover API feasibility**. This complements the **v1 wizard** in [`PRD.md`](PRD.md) §8 and Appendix B (column picker + period summary), which implements a **flexible export** rather than a fixed list of named templates.

**Industry references (categories and KPI framing):** [Cynoteck — examples of sales reports](https://www.cynoteck.com/blog-post/examples-of-sales-report), [Smartsheet — sales report templates](https://www.smartsheet.com/content/sales-report-form-templates), [monday.com — sales report template guide](https://monday.com/blog/crm-and-sales/sales-report-template/).

**Time spans:** All types below can be produced for **daily, weekly, monthly, quarterly, yearly**, or **custom** date ranges, subject to Clover’s **90-day max filter window per request** for many order/payment filters (chunk longer ranges in the worker — see [`PRD.md`](PRD.md) Appendix B.5). Interpret boundaries in the **merchant timezone** ([`data-model.md`](data-model.md) `merchants.timezone`).

---

## How this maps to v1 product

| Concept here | v1 product shape |
|--------------|------------------|
| Row-level “detail” metrics | [`PRD.md`](PRD.md) Appendix B.3 **Sales detail columns** (multi-select) |
| Rollups / KPIs | Appendix B.3.1 **Period summary** checkboxes |
| Filters (employee, voids, test, completed-only, location) | §8 **Report scope filters** + **location scope** |
| Named “report types” below | **Presets** or **documentation** — implementation may start as one **Sales** export with column/filter choices |

---

## Legend

- **Essential:** Minimum data to make the report credible for that use case.
- **Secondary:** Useful for richer analysis; optional in MVP or later columns.
- **Clover:** Whether Clover **Orders / Line items / Payments / Refunds** (and related) can supply the data **without** a separate non-Clover system. See [`sales-report-clover-apis.md`](sales-report-clover-apis.md) for endpoint list.

---

## 1. Transaction detail (line-item grain)

**Use:** Accounting reconciliation, audit trail, “every line sold.”

| | Data points |
|--|-------------|
| **Essential** | Order id; line id; line name; quantity; line revenue (after discounts/modifiers); order date/time; order state; currency |
| **Secondary** | Item id (inventory link); modifiers; per-line tax/discounts; order type; employee; customer id; device id; payment id / tender (if row shape allows); notes |

**Clover:** **Yes** — core v1 path ([`PRD.md`](PRD.md) B.2). Payment columns alongside line columns need an explicit **row shape** rule (PRD B.3 note).

---

## 2. Order-level summary (one row per order)

**Use:** Faster high-level export without line explosion.

| | Data points |
|--|-------------|
| **Essential** | Order id; order datetime; order total; state; payment state |
| **Secondary** | Employee; customer id; order type; tax removed flag; test flag; device |

**Clover:** **Yes** — from order list / order payload; totals are order-level.

---

## 3. Period KPIs (sales dashboard in a file)

**Use:** “How much did we sell this week?” without reading thousands of lines.

| | Data points |
|--|-------------|
| **Essential** | Gross sales (period); order count |
| **Secondary** | Net sales; line/item count; total tax; total tips; total payments; refund/void summary |

**Clover:** **Yes** — matches Appendix B.3.1; exact **net sales** definition depends on which Clover fields we sum (document one method).

---

## 4. Sales by tender / payment type

**Use:** Reconciliation with processor statements; cash vs card mix.

| | Data points |
|--|-------------|
| **Essential** | Tender / payment type; payment amount; payment time; order id |
| **Secondary** | Tip, tax on payment; card brand / last4 (non-PCI); result (success/voided); offline flag |

**Clover:** **Yes** — payments on order or merchant payments collection; expand `tender`, `cardTransaction` as allowed (max 3 expands per request — split calls).

---

## 5. Tips and service charges

**Use:** Payroll allocation, hospitality.

| | Data points |
|--|-------------|
| **Essential** | Tip amount; payment or order reference; date |
| **Secondary** | Employee on payment; tender; service charge name/amount |

**Clover:** **Yes** — `tipAmount` on payments; service charge objects on orders when present.

---

## 6. Tax collected summary

**Use:** Sales tax filing helpers.

| | Data points |
|--|-------------|
| **Essential** | Tax amount; taxable base; tax rate name/id; period total |
| **Secondary** | Per-jurisdiction breakdown (only if Clover exposes it on line/payment tax objects) |

**Clover:** **Partial / verify** — tax on lines and payment `taxRates` exist; **multi-jurisdiction** reporting depends on merchant setup and **sandbox-verified** shapes.

---

## 7. Discounts and promotions

**Use:** Promotion effectiveness.

| | Data points |
|--|-------------|
| **Essential** | Discount amount; line or order association; date |
| **Secondary** | Discount name/rule id (if exposed) |

**Clover:** **Partial** — order/line discounts via expands (`discounts`, `lineItems.discounts` on orders per Clover docs); exact naming/ids need `api-column-map` verification.

---

## 8. Refunds and voids

**Use:** Net revenue, loss analysis.

| | Data points |
|--|-------------|
| **Essential** | Refund amount; time; linked payment/order; status |
| **Secondary** | Line-level refund linkage; void reason (if any) |

**Clover:** **Partial** — refunds expand on orders/payments; **“reason codes”** may be limited vs CRM-style loss reasons ([Smartsheet “deal loss” style](https://www.smartsheet.com/content/sales-report-form-templates) is not POS-native).

---

## 9. Sales by employee

**Use:** Shift performance, coaching.

| | Data points |
|--|-------------|
| **Essential** | Employee id/name; revenue or order count in period |
| **Secondary** | Average order value; tips attributed; void rate |

**Clover:** **Yes** — orders reference **employee**; v1 wizard already includes optional **employee** filter (PRD §8). **Name resolution** may need [`GET /v3/merchants/{mId}/employees/{empId}`](https://docs.clover.com/dev/reference/) or expanded employee object — confirm expands allowed.

---

## 10. Sales by location (multi-store)

**Use:** Roll-up vs per-store comparison.

| | Data points |
|--|-------------|
| **Essential** | Location id/name; revenue; order count |
| **Secondary** | Same KPIs by tender |

**Clover:** **Partial / confirm** — PRD requires **location scope** (all vs single). Implementation must confirm **how** Clover ties orders to locations and which **filter** fields apply on `GET .../orders` (see PRD open question on `location_scope` vs API). Not a fundamental blocker if the platform stores location per order.

---

## 11. Sales by item / SKU

**Use:** Product mix, purchasing.

| | Data points |
|--|-------------|
| **Essential** | Item id; item name/SKU; units sold; line revenue |
| **Secondary** | Category (from item master); modifiers; returns |

**Clover:** **Yes** — line items link to inventory **item**; may require `GET .../items` or item expand for SKU/name consistency.

---

## 12. Sales by category / tag

**Use:** Category performance (retail/restaurant).

| | Data points |
|--|-------------|
| **Essential** | Category (or tag); units; revenue |
| **Secondary** | Margin (needs cost — **not** standard in Clover sales APIs) |

**Clover:** **Partial** — categories/tags live on **inventory items**; derive by joining line item → item → categories/tags. **Not** a first-class dimension on the order line alone.

---

## 13. Sales by order type

**Use:** Dine-in vs takeout vs delivery style splits.

| | Data points |
|--|-------------|
| **Essential** | Order type label/id; revenue; count |
| **Secondary** | Average prep time (if available) |

**Clover:** **Yes** — `orderType` on order (expand on order list).

---

## 14. Time-of-day / day-of-week patterns

**Use:** Staffing, hourly sales ([Smartsheet hourly template](https://www.smartsheet.com/content/sales-report-form-templates)).

| | Data points |
|--|-------------|
| **Essential** | Timestamp bucket (hour or DOW); sales; transaction count |
| **Secondary** | By tender; by location |

**Clover:** **Yes** — derived from `createdTime` / payment times; no special endpoint.

---

## 15. Customer / repeat purchase (lightweight)

**Use:** Simple “who bought” lists, not full CRM ([monday.com CLV / pipeline](https://monday.com/blog/crm-and-sales/sales-report-template/) goes beyond POS).

| | Data points |
|--|-------------|
| **Essential** | Customer id; order total; date |
| **Secondary** | Customer name; order frequency in period (computed) |

**Clover:** **Partial** — customer on orders when linked; **marketing attribution**, **MQL/SQL**, **pipeline stages** are **not** in Clover orders.

---

## 16. “Department” or cost-center reporting

**Use:** Enterprise org structure.

| | Data points |
|--|-------------|
| **Essential** | Department; revenue |
| **Secondary** | Budget vs actual |

**Clover:** **No (native)** — Clover does not standardize a **department** dimension on orders/lines. Possible only via **custom workarounds** (e.g. item naming, external mapping table keyed by item id, or third-party apps writing `note`/`externalReferenceId` — fragile and not v1).

---

## 17. B2B sales funnel / opportunity / forecast reports

**Use:** Pipeline, win rate, forecast ([Cynoteck funnel / forecast](https://www.cynoteck.com/blog-post/examples-of-sales-report)).

| | Data points |
|--|-------------|
| **Essential** | Stage; deal value; close date; win/loss |
| **Secondary** | Rep quota; lead source |

**Clover:** **No** — Clover **orders** are POS transactions, not CRM opportunities. **Out of scope** for Clover-only sales reporting unless integrated with another system (post–v1 / non-goal).

---

## 18. Commission / complex payroll rules

**Use:** Rep payouts from sales.

| | Data points |
|--|-------------|
| **Essential** | Attributable revenue per employee; returns; tier rules |
| **Secondary** | Split commissions; draws |

**Clover:** **Partial** — **raw sales attribution** by employee is feasible; **commission rules** are business logic **outside** Clover (our app or merchant payroll).

---

## Summary table

| # | Report pattern | Clover (native) |
|---|----------------|-----------------|
| 1 | Transaction detail | Yes |
| 2 | Order summary | Yes |
| 3 | Period KPIs | Yes |
| 4 | By tender | Yes |
| 5 | Tips / service charges | Yes |
| 6 | Tax summary | Partial — verify |
| 7 | Discounts | Partial — verify |
| 8 | Refunds/voids | Partial |
| 9 | By employee | Yes |
| 10 | By location | Partial — confirm filters |
| 11 | By item/SKU | Yes |
| 12 | By category/tag | Partial (via items) |
| 13 | By order type | Yes |
| 14 | Hourly / DOW | Yes (derived) |
| 15 | Customer light | Partial |
| 16 | Department | No |
| 17 | CRM funnel/forecast | No |
| 18 | Commission engine | Partial (inputs only) |

---

## Related docs

- [`PRD.md`](PRD.md) §8, Appendix B (v1 columns and period summary)
- [`sales-report-clover-apis.md`](sales-report-clover-apis.md) (endpoint list)
- [`sales-reporting-erd-sketch.md`](sales-reporting-erd-sketch.md) (DB direction)
- [`data-model.md`](data-model.md) (persisted entities)
