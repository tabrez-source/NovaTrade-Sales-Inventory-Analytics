# NovaTrade Report Governance Pages

The NovaTrade reporting layer includes three hidden reference pages. They are
reachable from the sidebar and are intentionally excluded from the normal
report-tab sequence.

## Measures & Validation Center

Purpose: prove that the core semantic-model calculations remain internally
consistent under the selected Year and Product Category.

The page runs six filter-aware checks:

1. Sales region partition: Total Sales equals Assigned-Region Sales plus
   Cross-Region Sales.
2. Average order value identity: Total Sales equals Average Order Value times
   distinct Sales Orders.
3. Relationship key integrity: all active fact foreign keys resolve to their
   related dimensions.
4. Inventory net flow identity: Net Stock Flow equals Inward Units minus
   Outward Units.
5. Movement classification: raw movement quantity equals Inward plus Outward
   plus Transfer quantity.
6. Product coverage bounds: distinct sold products do not exceed the product
   catalog and coverage remains between zero and 100 percent.

Currency identities use a one-rupee tolerance for floating-point rounding.
Count and quantity identities require exact reconciliation. `N/A` means the
current filters contain no applicable rows. A pass confirms internal model
consistency; it does not certify the external source system.

## Data Model Overview

Purpose: show the report architecture, grain, relationship direction and
shared semantic layer without requiring the reader to inspect Power BI Model
view.

- `FactSales` grain: one sales-order line.
- `FactInventoryMovement` grain: one inventory movement.
- Shared dimensions: `DimDate` and `DimProduct`.
- Sales-specific dimensions: `DimDistributor`, `DimSalesHead`, `DimBranch`
  and fulfillment `DimGodown`.
- Inventory role-playing dimensions: `DimFromGodown` and `DimToGodown`.
- Relationship contract: ten active one-to-many, single-direction
  relationships from dimensions to facts.
- Measures are centralized in a dedicated reusable DAX table.

The page also displays live Sales row count, Inventory row count, product
catalog count and orphan fact-row count.

## Business Logic & Reporting Notes

Purpose: act as the definition contract for sales, time intelligence,
territory governance, inventory flow and management exception rules.

The page explicitly discloses that the portfolio dataset is synthetic, that
the current movement fact contains no `TRANSFER` rows, and that the available
sources do not contain authoritative opening stock, Stock on Hand, COGS,
margin, supplier lead time, targets or service levels. The report therefore
avoids claims about physical stockouts, profitability, target attainment and
forecasts.

## Semantic cleanup

The governance checkpoint removes three unused measures that could not be
defended from the available sources:

- `Assump Opening Stock`
- `Estimated Closing Stock`
- `Total COGS`

## Rebuild and validation

```bash
node scripts/powerbi/build-report-governance.mjs .
node scripts/qa/validate-pbip-repository.mjs .
node scripts/qa/validate-governance-checkpoint.mjs .
```

The builder is deterministic and should produce no Git diff when run again.
