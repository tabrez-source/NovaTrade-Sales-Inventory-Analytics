# NovaTrade Power BI UI system

## Design contract

- Identity: NovaTrade only; no third-party branding
- Data disclosure: synthetic and illustrative
- Audience: nontechnical business leaders, analysts and recruiters
- Canvas: 1440 x 810, Fit to page
- Navigation rail: 196 px deep navy
- Main content: x = 208 through x = 1416
- KPI row: five 232 px cards with four exact 12 px gutters
- Palette: navy for structure, teal for primary analysis, gold for secondary emphasis
- Time view: Jan–Dec when exactly one year is selected; `YearMonth` for multi-year trends on deeper analysis pages
- Ranking colour: slicer-responsive light-to-dark teal tones based on Sales Revenue; each bar remains a solid shade, while bar length and direct labels remain the primary magnitude encoding
- Navigation labels: icon-free, 10.5 pt for reporting pages and 10 pt for reference pages
- Visual language: warm ivory surfaces, concise business titles, restrained borders and no decorative product imagery

## Business language

Field names are translated for business readers: Month, Product Category, Sales Head and Region. Revenue terminology is consistent across pages. Inventory analysis uses units and Net Stock Flow. The territory comparison is described as assigned-region versus cross-region revenue. Management exceptions use replenishment pressure rather than implying a confirmed stockout. Technical QA evidence remains in the hidden governance pages and repository documentation rather than competing with decision visuals.

## Interaction and accessibility

- Relevant tooltip fields provide measure context without crowding the canvas
- Human-readable alt text on all 137 data and interactive visuals
- Logical, unique keyboard tab order and keyboard-operable page navigation
- Screen-reader reading order for the Data Model architecture
- Decorative objects excluded from the tab sequence
- WCAG AA contrast for normal report text
- Teal and gold categories also named in titles, legends and alt text
- Year slicer requires exactly one year and does not expose Select All

## Final-polish rules

- Page titles, subtitles, navigation labels and footer instructions are
  page-specific and generated deterministically.
- Header subtitles remain a single 10 pt text run, use the standard 420 x 34 px
  container and stay within the verified 64-character no-scroll contract.
- Ranked revenue visuals display compact millions; ranked unit visuals display
  compact thousands or millions as appropriate.
- Tables retain short headers while visual titles and tooltips carry the full
  business definition.
- Hidden governance pages use the same navigation rail, typography, contrast
  and accessibility contract as the five public analytical pages.
