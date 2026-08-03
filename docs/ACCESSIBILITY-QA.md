# Power BI accessibility QA

Applied to all eight report pages:

- Human-readable alt text for every data or interactive visual
- Logical, unique keyboard tab order on every page
- Decorative shapes and labels removed from the tab sequence
- Navigation buttons retain keyboard actions and descriptive tooltips
- Screen-reader reading order added to the Data Model architecture
- Text contrast meets WCAG AA for normal-size text in the report palette
- Teal and gold series are also identified by titles, legends and alt text
- Sales Performance selected-year and prior-year lines use solid and dashed
  styles in addition to color
- Inventory inward and outward series use different marker shapes in addition
  to color
- Plain business language is used in visual titles and explanatory notes

Automated evidence from `validate-final-polish-checkpoint.mjs`:

- Data or interactive visuals checked: 137
- Missing alt-text expressions: 0
- Duplicate tab-order values: 0
- Visuals outside the 1440 x 810 canvas: 0
- Data Model reading-order stops: 16
- Minimum palette contrast ratios: 5.81:1 for secondary text, 9.72:1 for
  active navigation and 14.52:1 for primary text

Final Desktop QA still required after rendering:

1. Use Tab and Shift+Tab to confirm focus order and visible focus indicators.
2. Use Enter or Space on navigation buttons in reading view.
3. Test Windows high-contrast mode and a screen reader if available.
4. Confirm tooltip values under Year, Product Category, Reporting Region and
   Operational Godown filters.
5. Confirm no text clipping or scrollbars at Fit to page and Actual size,
   especially in page subtitles and Data Model nodes.
