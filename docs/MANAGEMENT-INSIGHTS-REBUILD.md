# Management Insights Rebuild

## Decision brief

Audience: NovaTrade senior management during a monthly or quarterly operating review.

Primary question: Which measurable sales, territory and replenishment exceptions require a management decision, where is the exposure, and who owns the follow-up?

The page is not a recap of Executive, Sales, Product and Inventory pages. It combines shared product and date context across both fact tables to identify cross-functional exceptions.

## Metric framework

| Role | Metric | Definition | Management use |
|---|---|---|---|
| Outcome | YoY Sales Growth | Selected-period sales versus the comparable prior-year period | Decide whether growth is accelerating or declining |
| Primary risk | Growing Products at Flow Risk | Count of products with positive YoY sales growth and negative net stock flow | Identify growing products needing replenishment investigation |
| Exposure | Revenue at Flow Risk % | Revenue from flow-risk products divided by selected revenue | Quantify how much revenue is linked to replenishment pressure |
| Governance | Cross-Region Exposure | Cross-region sales divided by selected revenue, with prior-year change in the tooltip | Review territory coordination and distributor coverage |
| Demand risk | Declining Revenue Exposure | Revenue from products with negative YoY growth divided by selected revenue | Quantify current revenue dependent on declining products |

Flow risk does not mean stockout. NovaTrade does not have authoritative opening stock or Stock on Hand in the semantic model. It means that a product is growing while outbound units exceed inward receipts during the same selected period.

## Decision rules

| Priority | Rule | Action label |
|---:|---|---|
| 1 | YoY product growth > 0 and Net Stock Flow < 0 | Replenish & protect growth |
| 2 | YoY product growth < 0 | Recover demand |
| 3 | Neither exception applies | Monitor |

These are deterministic triage rules, not invented targets. They identify what management should investigate first; they do not automatically authorize purchasing, pricing or territory reassignment.

## Chart map

| Visual | Analytical question | Evidence | Supported decision |
|---|---|---|---|
| Flow-Risk Revenue by Category | Where is replenishment-linked revenue exposure concentrated? | Revenue at Flow Risk by product category; risk share, growth, coverage and net flow in tooltips | Prioritize category-level replenishment review |
| YoY Sales Growth by Sales Head | Which owner is growing or declining? | YoY growth ranked by Sales Head; revenue, cross-region exposure and distributor productivity in tooltips | Coach, recognize or investigate Sales Head performance |
| Management Action Queue | Which products require follow-up and why? | Product, category, action, sales, YoY growth, inbound coverage and net flow | Assign product-level action with traceable proof |

## Filters and guardrails

- Year is strict single-select for comparable YoY evidence.
- Product Category filters both FactSales and FactInventoryMovement through DimProduct.
- Region and godown slicers are deliberately excluded because neither filters both facts consistently on this page.
- Closing stock, margin, target and forecast claims are excluded because the current model cannot prove them.
- Synthetic-data and decision-support-prototype labels remain visible.
