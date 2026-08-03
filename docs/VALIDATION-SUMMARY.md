# NovaTrade PBIP source checkpoint — validation summary

Validated on 2026-08-03.

## Microsoft PBIR validation

- Validator: `@microsoft/powerbi-report-authoring-cli` 0.1.4
- Result: succeeded
- Errors: 0
- Warnings: 0
- Visual definitions: 474
- Page definitions: 9

## Reproducible repository validation

- Command: `node scripts/qa/validate-pbip-repository.mjs .`
- Result: passed
- Issues: 0
- JSON files checked: 489
- Public pages: 5
- Hidden support pages: 4
- Registered report resources: 2

## Reproducible page checkpoints

- Executive command: `node scripts/qa/validate-executive-checkpoint.mjs . --no-write`
- Executive result: passed, 0 issues
- Sales command: `node scripts/qa/validate-sales-checkpoint.mjs .`
- Sales result: passed, 0 issues
- Product command: `node scripts/qa/validate-product-checkpoint.mjs .`
- Product result: passed, 0 issues
- Inventory command: `node scripts/qa/validate-inventory-checkpoint.mjs .`
- Inventory result: passed, 0 issues
- Management command: `node scripts/qa/validate-management-checkpoint.mjs .`
- Management result: passed, 0 issues
- Governance command: `node scripts/qa/validate-governance-checkpoint.mjs .`
- Governance result: passed, 0 issues
- Final-polish command: `node scripts/qa/validate-final-polish-checkpoint.mjs .`
- Final-polish result: passed, 0 issues
- Sales Performance visual definitions: 55
- Product Performance visual definitions: 54
- Inventory Operations visual definitions: 54
- Management Insights visual definitions: 53
- Measures & Validation visual definitions: 70
- Data Model Overview visual definitions: 73
- Business Logic & Notes visual definitions: 58
- Sales primary tab order: 11, 12, 20–24 and 30–34
- Sales interactive or data visuals missing alt text: 0
- Sales primary visual overlaps or out-of-canvas positions: 0

## Executive Overview checks

- Report Guide visuals present: no
- KPI cards: five equal 232 px cards
- KPI gutters: 12 px, 12 px, 12 px, 12 px
- KPI row right edge: x = 1416
- Executive visuals outside the 1440 x 810 canvas: 0
- Duplicate Executive tab-order values: 0
- Month display field: `MonthName`, sorted by `MonthNumber`
- Year slicer: strict single-select; Select All disabled
- Product-category ranking: Visual Top 5 by Total Sales
- Executive KPI coverage: Sales Revenue, Quantity Sold, Average Order Value, Sales Orders and Active Distributors
- Cross-region analytical visuals: 1, plus a plain-language definition strip
- Order-status visuals: 1
- Monthly visuals with scrollbar risk: 0
- Ranking visuals with compact one-decimal million labels: 3
- Ranking colour: slicer-responsive light-to-dark teal tones driven directly by Total Sales
- Navigation rail: decorative letter icons removed; reporting labels enlarged to 10.5 pt and reference labels to 10 pt
- Ranking grid: 374 / 440 / 370 px with exact 12 px gutters
- Territory color meaning: teal = assigned-region sales; gold = cross-region sales in the territory comparison
- Data disclosure: independent portfolio project using synthetic data
- Obsolete Executive draft, duplicate page, sample page and product-image assets: removed
- UI template, model, measure and business-rules support pages: hidden in view mode
- Unused generic `DimDate[Column]` artifact: removed

## Sales Performance checks

- Five KPIs: Sales Revenue, Sales Orders, Average Order Value, YoY Sales Growth and Active Distributors
- Month display field: `MonthName`, sorted by `MonthNumber`
- Selected-year versus prior-year series: present with solid and dashed line styles
- Year slicer: strict single-select; Select All disabled
- Corrected reporting-region slicer: `ReportingRegionName`
- Territory comparison: assigned-region versus cross-region sales by month
- Ranked drivers: Reporting Region YoY growth, Sales Head revenue and Top 5 Distributors
- Distributor ranking: Visual Top 5 by Sales Revenue
- Legacy donut and product-category duplication: removed
- `Previous Year Sales`: no longer blocked outside `YearMonth` scope
- First-year YoY state: KPI displays `N/A` when no prior-year sales exist
- Regional diagnostic: signed YoY percentage, sorted descending, with sales context in tooltips
- Mumbai reporting geography: corrected to West in the generator and semantic reporting field
- Cross-page navigation label: Sales Performance
- Rebuild script: deterministic and idempotent

## Product Performance checks

- Five KPIs: Sales Revenue, Units Sold, Product Coverage, Average Selling
  Price and Top Category Revenue Share
- Catalog audit: 125 approved products reach `DimProduct`; the earlier 200
  figure refers to distributors
- Product Coverage: compact `sold / catalog` value with the coverage rate in
  tooltip context
- Category growth: signed YoY comparison with solid teal bars
- Top products: Visual Top 10 using native visual-level million display units
  and increased vertical room
- Price-volume diagnostic: six category observations, units on X, ASP on Y,
  revenue bubble size and a readable category legend
- Portfolio table: seven retained fields, compact headers, fixed widths and
  visual-level million display units for revenue
- Footer: concise Product-specific guidance with stale Sales copy removed
- Executive and Sales regression checkpoints: passed
- Rebuild script: deterministic and idempotent

## Inventory Operations checks

- Five KPIs: Inward Units, Outward Units, Net Stock Flow, Inbound Coverage and Products with Flow Deficit
- Operational Godown slicer: fact-backed `MovementGodown`, retaining destination receipts and source outbound rows
- Monthly diagnostic: inward versus outward units across calendar-sorted months
- Product pressure: Visual Top 10 by Outward Units with enough vertical space for all ten bars
- Godown flow: Net Stock Flow ranked ascending so the largest deficit appears first
- Replenishment Watchlist: product–godown grain with inward, outward, net flow and coverage
- Source caveat: transfer rows and authoritative opening stock are unavailable
- Unsupported claims removed from the page: Transfer Quantity and Estimated Closing Stock
- Executive, Sales and Product regression checkpoints: passed
- Rebuild script: deterministic and idempotent

## Management Insights checks

- Five exception-oriented KPIs: YoY Sales Growth, Growing Products Under
  Pressure, Pressure-Exposed Revenue Share, Cross-Region Revenue Share and
  Declining Revenue Exposure
- Replenishment-pressure definition: positive product YoY growth plus negative
  Net Stock Flow
- Exposure location: pressure-exposed revenue ranked by Product Category
- Accountability: Sales Head YoY growth with territory and distributor context
- Action queue: product-level decision labels with sales, growth, inbound
  coverage and net-flow evidence
- Unsupported closing-stock and outside-assignment claims removed from the page
- Replenishment pressure is visibly disclosed as a signal, not proof of a
  stockout
- Executive, Sales, Product and Inventory regression checkpoints: passed
- Rebuild script: deterministic and idempotent

## Report governance checks

- Three reference pages remain hidden from standard tabs and accessible from
  the sidebar
- Six filter-aware validation tests cover sales partitioning, AOV identity,
  relationship-key integrity, net-flow identity, movement classification and
  product-coverage bounds
- Eighteen validation measures are grouped in `11_Report Validation`
- Data Model Overview documents two fact grains, eight dimensions, ten active
  one-to-many single-direction relationships and the reusable measures layer
- Business Logic & Notes defines the sales, time, territory, inventory and
  management exception contracts
- Source limitations explicitly cover synthetic data, no transfer rows,
  opening stock, Stock on Hand, COGS, margin, lead time, targets and service
  levels
- Unsupported semantic measures removed: `Assump Opening Stock`,
  `Estimated Closing Stock` and `Total COGS`
- Governance builder: deterministic and idempotent

## Final report polish checks

- Eight report pages have standardized titles, subtitles, navigation and
  page-specific footer guidance
- User-facing terminology consistently uses Sales Revenue, Inventory
  Operations, Net Stock Flow, Replenishment Pressure and Cross-Region Revenue
  Share
- Retired user-facing labels `Inventory Movement`, `Flow-Risk` and
  `Cross-Region Exposure`: 0
- Data or interactive visuals with alt text and a positive tab order: 137
- Data or interactive visuals missing alt text: 0
- Duplicate tab-order values: 0
- Visuals outside the 1440 x 810 canvas: 0
- Ranked visuals with compact display units: 9
- Data Model architecture reading-order stops: 16
- Minimum checked palette contrast ratio: 5.81:1
- Final-polish builder: deterministic and idempotent

## Final Desktop render gate

Microsoft schema validation confirms that the source is structurally valid, but Power BI Desktop remains the final visual and analytical runtime. Desktop must confirm that 2020 displays `N/A` for YoY growth, 2021 onward displays a percentage, both Sales monthly lines render, the prior-year Sales series is dashed, the Reporting Region slicer shows West/South/North/East, Product Top 10 and Inventory Top 10 do not scroll, compact display units are readable, the Operational Godown slicer retains both inward and outward values, Inventory net flow reconciles to inward minus outward, the replenishment table fits all six columns, all six validation tiles evaluate as expected under 2021 / All Products, reference navigation works, model and logic labels do not clip, tooltips and cross-highlighting behave as intended, card totals reconcile under identical filters, and no text clips or scrollbars appear at Fit to page or Actual size.
