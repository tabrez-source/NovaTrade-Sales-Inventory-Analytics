# NovaTrade remaining reporting pages — calculated build plan

## Current gate

Executive Overview, Sales Performance and Product Performance are locked as the golden design and interaction contract. Inventory Operations is the active rebuild; Management Insights remains pending. Complete one page at a time so accepted pages cannot regress.

## Stage 3A — Sales Performance (locked)

Business questions: When did sales change? Which regions, Sales Heads and distributors drove it? Is cross-region activity healthy or concentrated?

Recommended content:
- KPIs: Total Sales, Sales Orders, Average Order Value, Active Distributors, YoY Sales Change %
- Monthly sales trend with prior-year comparison
- Sales by Sales Head with cross-region tooltip context
- Sales by Region
- Top distributors ranked by sales
- Assigned-region versus cross-region mix
- Drillthrough target: Distributor / Sales Head detail

Completion gate: totals reconcile to Executive Overview under identical filters; month sorting is correct; Top N responds to filters; cross-highlighting is intentional; tooltips, alt text, tab order and navigation pass; Desktop screenshot approved.

## Stage 3B — Product Performance (locked)

Business questions: Which categories and products create value and volume? Is performance concentrated? Which products are gaining or losing momentum?

Recommended content:
- KPIs: Total Sales, Quantity Sold, Products Sold, Average Selling Price, Sales Orders
- Monthly product sales trend
- Top products and Top categories
- Sales contribution and quantity contribution
- Category-to-product drilldown
- Drillthrough target: Product detail

Completion gate: category totals reconcile to sales; product ranks change correctly with filters; contribution measures total correctly; no scrolling in the primary Top N visual; accessible QA and screenshot approved.

## Stage 3C — Inventory Operations

Business questions: When did outbound movement exceed receipts? Which operational godowns and products show the greatest flow deficit? Where should replenishment review begin?

Approved content:
- KPIs: Inward Units, Outward Units, Net Stock Flow, Inbound Coverage and Products with Flow Deficit
- Monthly inward-versus-outward trend
- Net Stock Flow by Operational Godown
- Top 10 Products by Outward Units
- Replenishment Watchlist at product–godown grain
- Drillthrough target: Godown / Product movement detail

Source contract: Net Stock Flow is inward minus outward and must not be interpreted as Stock on Hand. The current warehouse contains no transfer movements and no authoritative opening-stock or inventory snapshot fact, so transfer and closing-stock claims are excluded rather than estimated.

## Stage 3D — Management Insights

Business questions: What changed, why, where is the risk, and what should management review first?

Recommended content:
- KPIs: Total Sales, YoY Change %, Sales per Distributor, Cross-Region % and Inbound Coverage or Products with Flow Deficit
- Trend versus previous year
- Sales leadership and regional opportunity ranking
- Category concentration
- Cross-region exposure
- Small management action panel containing only evidence-backed observations

Completion gate: every observation links to a visible measure or drill path; no duplicated Executive visuals without a different decision purpose; assumptions and synthetic-data status remain visible; accessibility and screenshot approved.

## Stage 4 — Drillthrough, tooltips and hidden validation

- Product Detail, Distributor / Sales Head Detail and Inventory Movement Detail pages
- Report-page tooltips only where they add context beyond default tooltips
- Hidden Data Quality page covering row counts, missing keys, date coverage, reconciliation and inventory assumptions
- Final interaction matrix, performance check and cross-page accessibility review

## Execution rule

Lock the Sales Performance screenshot and validation evidence before Product Analysis. This keeps each approval small, prevents defects from multiplying and lets the report grow as a coherent decision platform rather than four copied dashboards.
