#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const inventoryPageId = "6e63e51a13c0cbcb29b1";
const reportRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
);
const pagesRoot = path.join(reportRoot, "pages");
const inventoryRoot = path.join(pagesRoot, inventoryPageId);
const inventoryVisuals = path.join(inventoryRoot, "visuals");
const issues = [];
const evidence = {};

function addIssue(code, message, file = null) {
  issues.push({ code, message, ...(file ? { file } : {}) });
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function literalValue(property) {
  return property?.expr?.Literal?.Value;
}

function titleOf(visual) {
  return literalValue(
    visual.visual?.visualContainerObjects?.title?.[0]?.properties?.text,
  )?.replace(/^'|'$/g, "");
}

function altTextOf(visual) {
  return literalValue(
    visual.visual?.visualContainerObjects?.general?.[0]?.properties?.altText,
  )?.replace(/^'|'$/g, "");
}

function collectFields(value, fields = []) {
  if (!value || typeof value !== "object") return fields;
  if (value.Measure?.Property) {
    fields.push({
      kind: "Measure",
      entity: value.Measure.Expression?.SourceRef?.Entity,
      property: value.Measure.Property,
    });
  }
  if (value.Column?.Property) {
    fields.push({
      kind: "Column",
      entity: value.Column.Expression?.SourceRef?.Entity,
      property: value.Column.Property,
    });
  }
  for (const item of Object.values(value)) collectFields(item, fields);
  return fields;
}

function queryFields(visual) {
  return collectFields(visual.visual?.query);
}

function hasField(visual, kind, entity, property) {
  return queryFields(visual).some(
    (field) =>
      field.kind === kind &&
      field.entity === entity &&
      field.property === property,
  );
}

function dataVisual(visual) {
  return [
    "cardVisual",
    "lineChart",
    "clusteredBarChart",
    "tableEx",
    "slicer",
  ].includes(visual.visual?.visualType);
}

function overlaps(left, right) {
  const leftRight = left.position.x + left.position.width;
  const leftBottom = left.position.y + left.position.height;
  const rightRight = right.position.x + right.position.width;
  const rightBottom = right.position.y + right.position.height;
  return !(
    leftRight <= right.position.x ||
    rightRight <= left.position.x ||
    leftBottom <= right.position.y ||
    rightBottom <= left.position.y
  );
}

async function loadVisuals() {
  const entries = await readdir(inventoryVisuals, {
    withFileTypes: true,
  });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(inventoryVisuals, entry.name, "visual.json");
    const visual = await readJson(file);
    if (visual.name !== entry.name) {
      addIssue(
        "visual-id",
        `Visual directory ${entry.name} does not match visual.name ${visual.name}.`,
        path.relative(root, file),
      );
    }
    visuals.push(visual);
  }
  return visuals;
}

function findByTitle(visuals, title) {
  const matches = visuals.filter((visual) => titleOf(visual) === title);
  if (matches.length !== 1) {
    addIssue(
      "visual-title",
      `Expected exactly one visual titled "${title}", found ${matches.length}.`,
    );
    return null;
  }
  return matches[0];
}

async function validatePage(visuals) {
  const page = await readJson(path.join(inventoryRoot, "page.json"));
  if (page.displayName !== "Inventory Operations") {
    addIssue(
      "page-name",
      `Inventory page displayName must be Inventory Operations, found ${page.displayName}.`,
    );
  }
  if (page.width !== 1440 || page.height !== 810) {
    addIssue(
      "page-size",
      `Inventory Operations must remain 1440 x 810, found ${page.width} x ${page.height}.`,
    );
  }

  evidence.page = page.displayName;
  evidence.visuals = visuals.length;
  if (visuals.length !== 54) {
    addIssue(
      "visual-count",
      `Inventory Operations must contain 54 intentional visuals, found ${visuals.length}.`,
    );
  }

  const dataVisuals = visuals.filter(dataVisual);
  for (const visual of dataVisuals) {
    const { x, y, width, height, tabOrder } = visual.position;
    if (x < 0 || y < 0 || x + width > page.width || y + height > page.height) {
      addIssue("visual-bounds", `${visual.name} falls outside the page canvas.`);
    }
    if (!altTextOf(visual)) {
      addIssue(
        "alt-text",
        `${visual.name} (${titleOf(visual) || visual.visual.visualType}) has no alt text.`,
      );
    }
    if (!Number.isInteger(tabOrder)) {
      addIssue(
        "tab-order",
        `${visual.name} (${titleOf(visual) || visual.visual.visualType}) has no integer tabOrder.`,
      );
    }
  }

  const primary = dataVisuals.filter(
    (visual) => (visual.position?.x ?? 0) >= 208,
  );
  for (let left = 0; left < primary.length; left += 1) {
    for (let right = left + 1; right < primary.length; right += 1) {
      if (overlaps(primary[left], primary[right])) {
        addIssue(
          "primary-overlap",
          `${titleOf(primary[left]) || primary[left].name} overlaps ${titleOf(primary[right]) || primary[right].name}.`,
        );
      }
    }
  }

  const tabOrders = primary.map((visual) => visual.position.tabOrder);
  if (new Set(tabOrders).size !== tabOrders.length) {
    addIssue(
      "duplicate-tab-order",
      "Primary Inventory Operations visuals must have unique tabOrder values.",
    );
  }
  evidence.primaryTabOrder = tabOrders.sort((a, b) => a - b);
}

function validateSlicers(visuals) {
  const slicers = visuals.filter(
    (visual) => visual.visual?.visualType === "slicer",
  );
  const year = slicers.find((visual) =>
    hasField(visual, "Column", "dim DimDate", "YearNumber"),
  );
  const godown = slicers.find((visual) =>
    hasField(
      visual,
      "Column",
      "fact FactInventoryMovement",
      "MovementGodown",
    ),
  );

  if (!year) {
    addIssue("year-slicer", "YearNumber slicer is missing.");
  } else {
    const selection = year.visual.objects?.selection?.[0]?.properties;
    if (
      literalValue(selection?.singleSelect) !== "true" ||
      literalValue(selection?.strictSingleSelect) !== "true"
    ) {
      addIssue("year-selection", "Year slicer must enforce strict single selection.");
    }
  }
  if (!godown) {
    addIssue(
      "godown-slicer",
      "Operational Godown slicer must use FactInventoryMovement[MovementGodown].",
    );
  }
  if (
    slicers.some((visual) =>
      hasField(visual, "Column", "dim DimFromGodown", "GodownName"),
    )
  ) {
    addIssue(
      "legacy-godown-slicer",
      "Inventory Operations must not filter only DimFromGodown because that removes inward rows.",
    );
  }
  evidence.slicers = "strict Year + fact-backed Operational Godown";
}

function validateKpis(visuals) {
  const expected = new Map([
    ["Inward Units", "Total Inward Quantity"],
    ["Outward Units", "Total Outward Quantity"],
    ["Net Stock Flow", "Net Movement Quantity"],
    ["Inbound Coverage", "Inbound Coverage %"],
    ["Products with Flow Deficit", "Products with Flow Deficit"],
  ]);

  for (const [title, measure] of expected) {
    const card = findByTitle(visuals, title);
    if (!card) continue;
    if (card.visual?.visualType !== "cardVisual") {
      addIssue("kpi-type", `${title} must be a cardVisual.`);
    }
    const primary =
      card.visual?.query?.queryState?.Data?.projections?.[0]?.field?.Measure
        ?.Property;
    if (primary !== measure) {
      addIssue(
        "kpi-measure",
        `${title} must bind to ${measure}, found ${primary}.`,
      );
    }
  }
  evidence.kpis = [...expected.keys()];
}

function validateTrend(visuals) {
  const chart = findByTitle(visuals, "Monthly Inward vs Outward Trend");
  if (!chart) return;
  if (chart.visual?.visualType !== "lineChart") {
    addIssue("trend-type", "Monthly Inward vs Outward Trend must be a lineChart.");
  }
  if (!hasField(chart, "Column", "dim DimDate", "MonthName")) {
    addIssue("trend-month", "Inventory trend must use sorted DimDate[MonthName].");
  }
  for (const measure of [
    "Total Inward Quantity",
    "Total Outward Quantity",
    "Net Movement Quantity",
    "Inbound Coverage %",
  ]) {
    if (!hasField(chart, "Measure", "Measuress", measure)) {
      addIssue("trend-measure", `Inventory trend is missing ${measure}.`);
    }
  }
  const lineStyles = chart.visual?.objects?.lineStyles ?? [];
  const selectors = new Set(lineStyles.map((style) => style.selector?.metadata));
  for (const metadata of [
    "Measuress.Total Inward Quantity",
    "Measuress.Total Outward Quantity",
  ]) {
    if (!selectors.has(metadata)) {
      addIssue("trend-style", `Inventory trend lacks an explicit style for ${metadata}.`);
    }
  }
  evidence.trend = "12-month inward versus outward comparison with net flow and coverage tooltips";
}

function validateTopProducts(visuals) {
  const chart = findByTitle(visuals, "Top 10 Products by Outward Units");
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue("top-products-type", "Top 10 outward products must be a clusteredBarChart.");
  }
  if (
    !hasField(chart, "Column", "dim DimProduct", "ProductName") ||
    !hasField(chart, "Measure", "Measuress", "Total Outward Quantity")
  ) {
    addIssue(
      "top-products-fields",
      "Top 10 outward products must use ProductName and Total Outward Quantity.",
    );
  }
  for (const measure of [
    "Total Inward Quantity",
    "Net Movement Quantity",
    "Inbound Coverage %",
  ]) {
    if (!hasField(chart, "Measure", "Measuress", measure)) {
      addIssue("top-products-tooltip", `Top 10 outward products must expose ${measure}.`);
    }
  }
  const topN =
    chart.filterConfig?.filters?.[0]?.filter?.Where?.[0]?.Condition
      ?.VisualTopN?.ItemCount;
  if (topN !== 10) {
    addIssue("top-products-filter", `Top 10 outward products must enforce Top 10, found ${topN}.`);
  }
  const axis = chart.visual?.objects?.categoryAxis?.[0]?.properties;
  if (
    chart.position?.height < 284 ||
    Number.parseFloat(literalValue(axis?.preferredCategoryWidth)) > 8 ||
    Number.parseInt(literalValue(axis?.innerPadding), 10) > 8
  ) {
    addIssue(
      "top-products-density",
      "Top 10 outward products must reserve enough space and compact padding for ten visible bars.",
    );
  }
  const color = literalValue(
    chart.visual?.objects?.dataPoint?.[0]?.properties?.fill?.solid?.color,
  );
  if (color !== "'#C97A2B'" || JSON.stringify(chart.visual.objects.dataPoint).includes("FillRule")) {
    addIssue(
      "top-products-color",
      "Top 10 outward products must use a solid accessible orange without a gradient legend.",
    );
  }
  evidence.topProducts = "Top 10 outward-unit replenishment pressure with receipts and coverage context";
}

function validateGodownFlow(visuals) {
  const chart = findByTitle(visuals, "Net Stock Flow by Operational Godown");
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue("godown-type", "Net Stock Flow by Operational Godown must be a clusteredBarChart.");
  }
  if (
    !hasField(chart, "Column", "fact FactInventoryMovement", "MovementGodown") ||
    !hasField(chart, "Measure", "Measuress", "Net Movement Quantity")
  ) {
    addIssue(
      "godown-fields",
      "Godown flow must use MovementGodown and Net Movement Quantity.",
    );
  }
  const sort = chart.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "Net Movement Quantity" ||
    sort?.direction !== "Ascending"
  ) {
    addIssue(
      "godown-sort",
      "Godown flow must rank the most negative net flow first.",
    );
  }
  for (const measure of [
    "Total Inward Quantity",
    "Total Outward Quantity",
    "Inbound Coverage %",
  ]) {
    if (!hasField(chart, "Measure", "Measuress", measure)) {
      addIssue("godown-tooltip", `Godown flow must expose ${measure}.`);
    }
  }
  evidence.godownFlow = "operational-godown net flow ranked by largest deficit";
}

function validateWatchlist(visuals) {
  const table = findByTitle(visuals, "Replenishment Watchlist");
  if (!table) return;
  if (table.visual?.visualType !== "tableEx") {
    addIssue("watchlist-type", "Replenishment Watchlist must be a tableEx visual.");
  }
  const required = [
    ["Column", "dim DimProduct", "ProductName"],
    ["Column", "fact FactInventoryMovement", "MovementGodown"],
    ["Measure", "Measuress", "Total Inward Quantity"],
    ["Measure", "Measuress", "Total Outward Quantity"],
    ["Measure", "Measuress", "Net Movement Quantity"],
    ["Measure", "Measuress", "Inbound Coverage %"],
  ];
  for (const [kind, entity, property] of required) {
    if (!hasField(table, kind, entity, property)) {
      addIssue("watchlist-field", `Replenishment Watchlist is missing ${entity}[${property}].`);
    }
  }
  const sort = table.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "Net Movement Quantity" ||
    sort?.direction !== "Ascending"
  ) {
    addIssue("watchlist-sort", "Replenishment Watchlist must sort Net Movement Quantity ascending.");
  }
  const headers = table.visual?.objects?.columnHeaders?.[0]?.properties;
  if (
    literalValue(headers?.autoSizeColumnWidth) !== "false" ||
    literalValue(headers?.columnAdjustment) !== "'fixedWidth'" ||
    literalValue(headers?.customColumnWidth) !== "true"
  ) {
    addIssue("watchlist-widths", "Replenishment Watchlist must use controlled fixed column widths.");
  }
  const unitColumns = new Set(
    (table.visual?.objects?.columnFormatting ?? []).map(
      (instance) => instance.selector?.metadata,
    ),
  );
  for (const metadata of [
    "Measuress.Total Inward Quantity",
    "Measuress.Total Outward Quantity",
    "Measuress.Net Movement Quantity",
  ]) {
    if (!unitColumns.has(metadata)) {
      addIssue("watchlist-units", `Watchlist lacks visual-level million formatting for ${metadata}.`);
    }
  }
  evidence.watchlist = "product–godown detail sorted by largest flow deficit";
}

function validateLegacyRemoval(visuals) {
  const staleTitles = new Set([
    "Transfer Quantity",
    "Estimated Closing Stock",
    "Monthly Inventory Movement",
    "Movement by Type",
    "Inventory Movement Mix",
    "Movement by Product",
  ]);
  const retained = visuals
    .map((visual) => titleOf(visual))
    .filter((title) => staleTitles.has(title));
  if (retained.length > 0) {
    addIssue("legacy-inventory-visual", `Legacy Inventory visuals remain: ${retained.join(", ")}.`);
  }
  const serialized = JSON.stringify(visuals);
  for (const unsupported of [
    "Estimated Closing Stock",
    "Assump Opening Stock",
    "Total Transfer Quantity",
    "dim DimFromGodown",
  ]) {
    if (serialized.includes(unsupported)) {
      addIssue("unsupported-inventory-claim", `Inventory page still references ${unsupported}.`);
    }
  }
  if (visuals.some((visual) => visual.visual?.visualType === "donutChart")) {
    addIssue("legacy-inventory-donut", "Inventory Operations must not retain the duplicated movement-mix donut.");
  }
  const caveat = visuals.find((visual) =>
    JSON.stringify(visual).includes("authoritative opening stock are unavailable"),
  );
  if (!caveat) {
    addIssue("source-caveat", "Inventory Operations must visibly disclose the missing transfer and opening-stock sources.");
  }
  evidence.legacyRemoval = "transfer, closing-stock estimate, duplicate mix and source-only godown filter removed";
}

async function validateModel() {
  const measures = await readFile(
    path.join(
      root,
      "powerbi",
      "NovaTrade.SemanticModel",
      "definition",
      "tables",
      "Measuress.tmdl",
    ),
    "utf8",
  );
  for (const measure of ["Inbound Coverage %", "Products with Flow Deficit"]) {
    if (!measures.includes(`measure '${measure}' =`)) {
      addIssue("missing-inventory-measure", `Required Inventory Operations measure is missing: ${measure}.`);
    }
  }
  const coverage = measures.match(
    /measure 'Inbound Coverage %' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !coverage?.includes("[Total Inward Quantity]") ||
    !coverage.includes("[Total Outward Quantity]") ||
    !coverage.includes("DIVIDE")
  ) {
    addIssue("coverage-dax", "Inbound Coverage % must divide inward units by outward units.");
  }
  const deficit = measures.match(
    /measure 'Products with Flow Deficit' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !deficit?.includes("VALUES ( 'dim DimProduct'[ProductKey] )") ||
    !deficit.includes("[@NetFlow] < 0") ||
    !deficit.includes("COUNTROWS")
  ) {
    addIssue("deficit-dax", "Products with Flow Deficit must count products whose contextual net flow is below zero.");
  }
  evidence.model = ["Inbound Coverage %", "Products with Flow Deficit"];
}

async function validateNavigationRename() {
  const pageEntries = await readdir(pagesRoot, { withFileTypes: true });
  const stale = [];
  for (const pageEntry of pageEntries) {
    if (!pageEntry.isDirectory()) continue;
    const visualRoot = path.join(pagesRoot, pageEntry.name, "visuals");
    let entries = [];
    try {
      entries = await readdir(visualRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const file = path.join(visualRoot, entry.name, "visual.json");
      const content = await readFile(file, "utf8");
      if (content.includes("Inventory Movement Analysis")) {
        stale.push(path.relative(root, file));
      }
    }
  }
  if (stale.length > 0) {
    addIssue("stale-navigation", `Inventory Movement Analysis remains in ${stale.length} visual definitions.`);
  }
  evidence.navigation = "Inventory Operations across report navigation";
}

const visuals = await loadVisuals();
await validatePage(visuals);
validateSlicers(visuals);
validateKpis(visuals);
validateTrend(visuals);
validateTopProducts(visuals);
validateGodownFlow(visuals);
validateWatchlist(visuals);
validateLegacyRemoval(visuals);
await validateModel();
await validateNavigationRename();

const result = {
  status: issues.length === 0 ? "passed" : "failed",
  validatedAt: new Date().toISOString(),
  issueCount: issues.length,
  evidence,
  issues,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = issues.length === 0 ? 0 : 1;
