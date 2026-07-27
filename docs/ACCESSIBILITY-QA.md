# Power BI accessibility QA

Applied to the five public analytical pages:

- Human-readable alt text for interactive and data visuals
- Logical keyboard tab order
- Decorative shapes and labels removed from the tab sequence
- Navigation buttons retain keyboard actions and descriptive tooltips
- Text contrast meets WCAG AA for normal-size text in the report palette
- Teal and gold series are also identified by text labels and legends
- Executive chart and KPI titles use plain business language

Final Desktop QA still required after rendering:

1. Use Tab and Shift+Tab to confirm focus order and visible focus indicators.
2. Use Enter or Space on navigation buttons in reading view.
3. Test Windows high-contrast mode and a screen reader if available.
4. Confirm tooltip values under Year and Physical Region filters.
5. Confirm no text clipping at Fit to page and Actual size.