# NovaTrade final report polish

## Scope

The unified polish pass covers the five public analytical pages and the three
hidden governance pages. Approved measures, relationships, filter behaviour
and analytical structures remain unchanged.

## Business-language contract

| Retired wording | Final wording |
|---|---|
| Total Sales / Product Revenue | Sales Revenue |
| Inventory Movement | Inventory Operations |
| Flow risk | Replenishment pressure |
| Flow-Risk Revenue Share | Pressure-Exposed Revenue Share |
| Cross-Region Exposure | Cross-Region Revenue Share |
| Total Inward / Outward Quantity | Inward / Outward Units |
| Net Movement Quantity | Net Stock Flow |

Replenishment pressure means positive product YoY sales growth combined with
negative Net Stock Flow. It does not prove a stockout because opening stock,
Stock on Hand, lead time and service-level data are unavailable.

## UI, accessibility and integrity changes

- Standardized all page titles, subtitles and navigation labels
- Shortened header subtitles to the verified no-scroll length while retaining
  the accessible 10 pt type size and the approved business meaning
- Replaced inherited footer copy with page-specific decision guidance
- Applied compact display units to ranked revenue, unit and stock-flow values
- Stored display-unit selections as typed numeric PBIR literals so Desktop
  honours the requested millions, thousands and one-decimal percentage labels
- Added a visible category legend to the Product price-volume matrix
- Standardized value-axis terminology with the approved business-language
  contract
- Preserved concise table headers where full labels would reduce readability
- Added safe textbox height and reading order to Data Model architecture nodes
- Verified alt text and unique keyboard order for all 137 data or interactive
  visuals
- Verified all visual bounds against the 1440 x 810 canvas
- Verified the minimum checked text contrast ratio exceeds WCAG AA
- Added `build-final-report-polish.mjs` as the deterministic presentation layer
- Kept the Product builder compatible with both pre-polish and polished Sales
  template titles so page-level regeneration remains safe
- Added `validate-final-polish-checkpoint.mjs` to prevent terminology,
  accessibility, layout and display-unit regressions

## Power BI Desktop acceptance gate

Review at Fit to page, using 2021 and All Products where those filters exist:

1. Inspect all eight pages for clipping, scrollbars, alignment and readable
   compact units.
2. Confirm all sidebar destinations, including the three hidden reference
   pages, work in reading mode.
3. Confirm selected-year and prior-year lines remain solid and dashed on Sales
   Performance.
4. Confirm inward and outward inventory series remain distinguishable by marker
   shape as well as colour.
5. Confirm the Management Action Queue defaults to a useful priority and the
   revenue and Net Stock Flow values remain readable.
6. Confirm the Validation Center reports 6 run, 6 passed, 0 failed and PASS;
   confirm Data Model Overview reports 0 orphan fact rows.
7. Use Tab and Shift+Tab to inspect focus order and Enter or Space to activate
   navigation controls.
8. Exercise slicers, cross-highlighting and tooltips and confirm totals
   reconcile under identical filters.

Power BI Desktop is the final rendering and DAX-runtime authority. The report
must not be published until this gate is complete.
