# Stage 2 final Executive Overview — validation summary

Validated on 2026-07-21.

## Microsoft PBIR validation

- Validator: `@microsoft/powerbi-report-authoring-cli` 0.1.4
- Result: succeeded
- Errors: 0
- Warnings: 0
- Visual definitions: 243
- Page definitions: 12

## Report and semantic integrity

- Semantic references checked: 182
- Unknown report-to-model fields or measures: 0
- Page-navigation actions checked: 33 across the report
- Invalid navigation targets: 0
- Tooltip-enabled Executive visuals: 11
- Public data or interactive visuals missing alt text: 0
- External company brand or website references: 0

## Executive Overview checks

- Report Guide visuals present: no
- KPI cards: five equal 232 px cards
- KPI gutters: 12 px, 12 px, 12 px, 12 px
- KPI row right edge: x = 1416
- Executive visuals outside the 1440 x 810 canvas: 0
- Duplicate Executive tab-order values: 0
- Month display field: `MMM yy`, sorted chronologically
- Product-category ranking: Visual Top 5 by Total Sales
- Executive KPI coverage: Total Sales, Quantity Sold, Average Order Value, Sales Orders and Active Distributors
- Cross-region analytical visuals: 1, plus a plain-language definition strip
- Order-status visuals: 1
- Monthly visuals with scrollbar risk: 0
- Ranking visuals with compact billion labels: 3
- Territory color meaning: teal = assigned-region sales; gold = cross-region sales in the territory comparison
- Data disclosure: independent portfolio project using synthetic data

## Final Desktop render gate

Source-level validation is complete. Power BI Desktop must still confirm the rendered month labels, Top 5 filter, data-label spacing, tooltips, keyboard focus indicators and absence of text clipping before Stage 2 is frozen in Git.
