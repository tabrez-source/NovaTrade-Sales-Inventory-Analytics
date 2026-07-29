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

Product Coverage is displayed as `products sold of catalog / coverage rate`.
The catalog denominator ignores product-row filters so it remains a stable
portfolio benchmark.

### Diagnostics

- Category YoY Growth: signed year-over-year growth by category.
- Top 10 Products by Revenue: revenue ranking with portfolio share, growth,
  units, and average selling price in tooltips.
- Category Price–Volume Matrix: units on X, average selling price on Y, and
  revenue as bubble size.
- Product Portfolio Detail: product, category, revenue, units, average selling
  price, portfolio revenue share, and YoY growth.

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
3. Confirm Product Coverage shows the sold count, catalog count, and percent.
4. Confirm Top 10 Products contains ten ranked products without an unexpected
   recovery warning.
5. Confirm the price–volume matrix shows one labelled bubble per category and
   bubble size varies with revenue.
6. Confirm the portfolio table sorts by revenue descending and scrolls for
   lookup.
7. Confirm Product Performance is the active navigation item and the other
   report-page labels remain visible.
8. Confirm no clipping, blank KPI, or broken interaction appears.
