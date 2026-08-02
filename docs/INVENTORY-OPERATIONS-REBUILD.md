# Inventory Operations rebuild

## Page purpose

Inventory Operations is NovaTrade's replenishment and warehouse-flow page. It answers:

- When did outbound inventory flow exceed receipts?
- Which operational godowns show the largest flow deficit?
- Which products create the greatest outbound pressure?
- What product–godown combinations should operations review first?

## Metric contract

- **Inward Units:** units received at the operational destination godown.
- **Outward Units:** units moved outward from the operational source godown.
- **Net Stock Flow:** inward units minus outward units. It is a movement result, not Stock on Hand.
- **Inbound Coverage:** inward units divided by outward units in the current filter context.
- **Products with Flow Deficit:** products whose contextual Net Stock Flow is below zero.

The Operational Godown filter uses `FactInventoryMovement[MovementGodown]`. This field maps inward rows to their destination godown and outward rows to their source godown, preventing the source-only filter from dropping receipts.

## Source limitations

- The generated and loaded movement fact contains `INWARD` and `OUTWARD` rows only; no `TRANSFER` rows are available.
- An inventory snapshot was generated upstream but is not loaded into the warehouse or semantic model.
- No authoritative opening-stock balance is available.
- `Assump Opening Stock` and `Estimated Closing Stock` are therefore excluded from this page.

## Chart map

| Section | Analytical question | Family / visual | Fields | Supported takeaway | Palette |
|---|---|---|---|---|---|
| Monthly flow | When did receipts and outbound movement diverge? | Trend / two-series line | Month, Inward Units, Outward Units; Net Flow and Coverage tooltips | Timing and persistence of the flow imbalance | Teal inward; orange outward; marker-shape distinction |
| Product pressure | Which products drive outbound demand? | Ranking / Top 10 horizontal bar | Product, Outward Units; Inward, Net Flow and Coverage tooltips | Highest replenishment pressure | Solid orange |
| Godown deficit | Where does outbound flow exceed receipts most? | Signed comparison / horizontal bar | Operational Godown, Net Stock Flow; Inward, Outward and Coverage tooltips | Location-level flow deficit | Solid slate-blue with signed labels and zero context |
| Watchlist | Which product–godown combinations require review? | Detail / ranked table | Product, Godown, Inward, Outward, Net Flow, Coverage | Exact operational follow-up | Neutral table with visual-level million units |

## Desktop review checklist

1. Select each year and confirm the trend always shows January through December in calendar order.
2. Confirm the Operational Godown slicer retains both inward and outward values for the selected location.
3. Confirm Net Stock Flow equals Inward Units minus Outward Units under the same filters.
4. Confirm Inbound Coverage equals inward divided by outward.
5. Confirm all ten product bars are visible without a vertical scrollbar.
6. Confirm the godown ranking and watchlist show the most negative Net Stock Flow first.
7. Confirm table headers and all six columns fit without horizontal scrolling at Fit to page.
8. Confirm the footer clearly states that Net Stock Flow is not Stock on Hand.
9. Confirm Executive Overview, Sales Performance and Product Performance remain unchanged apart from the Inventory navigation label.
