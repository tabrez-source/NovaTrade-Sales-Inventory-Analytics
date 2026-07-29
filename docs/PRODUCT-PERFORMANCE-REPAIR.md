# Product Performance Repair

## Page purpose

Product Performance is the portfolio decision page for NovaTrade. It answers:

- Which categories and products drive revenue?
- Is performance driven by unit volume or selling price?
- Which categories are growing or declining?
- How much of the catalog is generating sales?
- How concentrated is revenue in the leading category?
- Which products warrant promotion, review, or rationalization?

## Approved analytical contract

### Global filters

- Year: strict single selection.
- Reporting Region: corrected West, South, North, and East mapping.

### KPI row

1. Product Revenue
2. Units Sold
3. Product Coverage
4. Average Selling Price
5. Top Category Revenue Share

Product Coverage is displayed compactly as `products sold / catalog`; the
coverage percentage remains available in the card tooltip. The catalog
denominator ignores product-row filters so it remains a stable portfolio
benchmark.

### Catalog-count audit

- The seed contains 199 candidate product rows.
- Exactly 125 are approved for generation and all 125 reach `DimProduct`.
- No products were lost in the OLTP or warehouse loads.
- The earlier figure of 200 belongs to the distributor master, not the product
  catalog.

### Diagnostics

- Category YoY Growth: signed year-over-year growth by category using a single
  accessible teal encoding.
- Top 10 Products by Revenue: all ten products are given enough vertical room;
  native visual display units format revenue in millions.
- Category Price–Volume Matrix: six category bubbles, units on X, average
  selling price on Y, revenue as bubble size, and a category legend in place
  of overlapping direct labels.
- Product Portfolio Detail: product, category, revenue, units, average selling
  price, portfolio revenue share, and YoY growth. Compact headers, fixed widths,
  and visual-level revenue units preserve all seven columns.

## Deliberate removals

- Monthly Product Sales: duplicated Sales Performance.
- Sales Orders: already governed on Sales Performance.
- Sales by Product Category and Category Sales Mix: repeated the same
  contribution story.
- Unbounded Sales by Product: replaced by Top 10 plus a detail table.

## Desktop review checklist

1. Select 2020 and confirm Category YoY Growth is honestly blank because no
   2019 sales exist.
2. Select 2021 and confirm all category growth bars render.
3. Confirm Product Coverage shows `125 / 125` without clipping and its tooltip
   shows the coverage percentage.
4. Confirm all ten ranked products are visible without a vertical scrollbar and
   revenue labels render in millions.
5. Confirm the price–volume matrix shows six category bubbles, a readable
   legend, and no overlapping direct labels.
6. Confirm all seven portfolio columns fit, revenue renders in millions, and
   the table remains sorted by revenue descending.
7. Confirm Product Performance is the active navigation item and the other
   report-page labels remain visible.
8. Confirm no clipping, blank KPI, or broken interaction appears.
