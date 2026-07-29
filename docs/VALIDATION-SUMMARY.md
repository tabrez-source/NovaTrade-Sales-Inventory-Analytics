# NovaTrade PBIP source checkpoint — validation summary

Validated on 2026-07-28.

## Microsoft PBIR validation

- Validator: `@microsoft/powerbi-report-authoring-cli` 0.1.4
- Result: succeeded
- Errors: 0
- Warnings: 0
- Visual definitions: 202
- Page definitions: 9

## Reproducible repository validation

- Command: `node scripts/qa/validate-pbip-repository.mjs .`
- Result: passed
- Issues: 0
- JSON files checked: 217
- Public pages: 5
- Hidden support pages: 4
- Registered report resources: 2

## Reproducible page checkpoints

- Executive command: `node scripts/qa/validate-executive-checkpoint.mjs . --no-write`
- Executive result: passed, 0 issues
- Sales command: `node scripts/qa/validate-sales-checkpoint.mjs .`
- Sales result: passed, 0 issues
- Sales Performance visual definitions: 55
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
- Executive KPI coverage: Total Sales, Quantity Sold, Average Order Value, Sales Orders and Active Distributors
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

- Five KPIs: Total Sales, Sales Orders, Average Order Value, YoY Sales Growth and Active Distributors
- Month display field: `MonthName`, sorted by `MonthNumber`
- Selected-year versus prior-year series: present with solid and dashed line styles
- Year slicer: strict single-select; Select All disabled
- Corrected reporting-region slicer: `ReportingRegionName`
- Territory comparison: assigned-region versus cross-region sales by month
- Ranked drivers: Reporting Region YoY growth, Sales Head sales and Top 5 Distributors
- Distributor ranking: Visual Top 5 by Total Sales
- Legacy donut and product-category duplication: removed
- `Previous Year Sales`: no longer blocked outside `YearMonth` scope
- First-year YoY state: KPI displays `N/A` when no prior-year sales exist
- Regional diagnostic: signed YoY percentage, sorted descending, with sales context in tooltips
- Mumbai reporting geography: corrected to West in the generator and semantic reporting field
- Cross-page navigation label: Sales Performance
- Rebuild script: deterministic and idempotent

## Final Desktop render gate

Microsoft schema validation confirms that the source is structurally valid, but Power BI Desktop remains the final visual and analytical runtime. Desktop must confirm that 2020 displays `N/A` for YoY growth, 2021 onward displays a percentage, both monthly lines render, the prior-year series is dashed, the regional YoY chart renders signed percentages, the Reporting Region slicer shows West/South/North/East, Top 5 distributors do not scroll, tooltips and cross-highlighting behave as intended, card totals reconcile with Executive Overview under identical filters, and no text clips at Fit to page or Actual size.
