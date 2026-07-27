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
- Ranking colour: slicer-responsive light-to-dark teal tones based on Total Sales; each bar remains a solid shade, while bar length and direct labels remain the primary magnitude encoding
- Navigation labels: icon-free, 10.5 pt for reporting pages and 10 pt for reference pages
- Visual language: warm ivory surfaces, concise business titles, restrained borders and no decorative product imagery

## Business language

Field names are translated for business readers: Month, Product Category, Sales Head and Region. The territory comparison is described as sales inside versus outside the assigned region. Cross-region analysis appears once as a decision visual instead of being repeated across multiple KPIs and charts. Technical QA evidence remains in documentation rather than the report canvas.

## Interaction and accessibility

- Relevant tooltip fields on five KPI cards and six analytical charts
- Human-readable alt text on data and interactive visuals
- Logical keyboard tab order and keyboard-operable page navigation
- Decorative objects excluded from the tab sequence
- WCAG AA contrast for normal report text
- Teal and gold categories also named in titles, legends and alt text
- Year slicer requires exactly one year and does not expose Select All
