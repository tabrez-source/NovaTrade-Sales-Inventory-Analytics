# Sales Performance repair

## Page purpose

Sales Performance is the commercial diagnostic page between the Executive Overview and Product Analysis. It answers:

- When did sales move relative to the prior year?
- Which reporting regions and Sales Heads drove the selected period?
- Which distributors create the greatest concentration?
- How much selling occurred inside versus outside the assigned region?

The page follows the shared hierarchy: filters and context, KPI status, monthly movement, then ranked drivers.

## Analytical decisions

| Area | Decision |
|---|---|
| KPI strip | Total Sales, Sales Orders, Average Order Value, YoY Sales Growth and Active Distributors |
| Time comparison | January–December selected-year sales versus prior-year sales |
| Territory diagnostic | Assigned-region and cross-region sales by month |
| Region ownership | Ranked sales by corrected reporting region |
| Sales ownership | Ranked Sales Heads with contribution, growth, orders and cross-region tooltips |
| Concentration | Top five distributors, responsive to Year and Reporting Region |
| Product analysis | Removed from this page; category concentration belongs on Product Analysis |

## Data-quality repairs

1. `Previous Year Sales` previously returned a value only when `YearMonth` was in scope. This made KPI-level YoY blank or unreliable. The measure now works in card, month, region, Sales Head and distributor contexts.
2. The synthetic master-data generator labelled Mumbai as `East`, while the assigned Sales Head and business geography identify it as `West`. The generator is corrected, and `DimDistributor[ReportingRegionName]` provides a deterministic West/South/North/East mapping for the current model.
3. The large Mosquito Bat share is an intentional result of the generator: higher selection weights, seasonal uplift and larger quantities. It is not treated as a rendering defect.
4. `FactSales` contains all order statuses, including cancelled-order lines. The page keeps the existing `Total Sales` definition so it reconciles with the locked Executive Overview. A future metric-governance decision should explicitly choose between gross order value and fulfilled sales before changing the foundation measure.

## Desktop acceptance gate

- The Sales Performance page opens without recovery warnings.
- The Year slicer allows exactly one year.
- Monthly sales shows selected year and prior year with a visible legend and distinct line styles.
- The reporting-region slicer contains West, South, North and East.
- Top five distributors do not scroll and respond to both slicers.
- Cards and rankings reconcile with Executive Overview under identical filters.
- Cross-highlighting, tooltips, navigation, tab order and alt text work as intended.
