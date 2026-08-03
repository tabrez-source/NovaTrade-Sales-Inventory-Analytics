#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const managementPageId = "0833d451cbce4704acf3";
const managementRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
  "pages",
  managementPageId,
);
const visualsRoot = path.join(managementRoot, "visuals");
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
  return ["cardVisual", "clusteredBarChart", "tableEx", "slicer"].includes(
    visual.visual?.visualType,
  );
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
  const entries = await readdir(visualsRoot, { withFileTypes: true });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(visualsRoot, entry.name, "visual.json");
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
  const page = await readJson(path.join(managementRoot, "page.json"));
  if (page.displayName !== "Management Insights") {
    addIssue(
      "page-name",
      `Management page displayName must be Management Insights, found ${page.displayName}.`,
    );
  }
  if (page.width !== 1440 || page.height !== 810) {
    addIssue(
      "page-size",
      `Management Insights must remain 1440 x 810, found ${page.width} x ${page.height}.`,
    );
  }

  evidence.page = page.displayName;
  evidence.visuals = visuals.length;
  if (visuals.length !== 53) {
    addIssue(
      "visual-count",
      `Management Insights must contain 53 intentional visuals, found ${visuals.length}.`,
    );
  }

  const primary = visuals.filter(
    (visual) => dataVisual(visual) && (visual.position?.x ?? 0) >= 208,
  );
  for (const visual of primary) {
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
      "Primary Management Insights visuals must have unique tabOrder values.",
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
  const category = slicers.find((visual) =>
    hasField(visual, "Column", "dim DimProduct", "CategoryName"),
  );
  if (!year) addIssue("year-slicer", "YearNumber slicer is missing.");
  if (!category) {
    addIssue(
      "category-slicer",
      "Product Category slicer must use DimProduct[CategoryName].",
    );
  }
  if (year) {
    const selection = year.visual.objects?.selection?.[0]?.properties;
    if (
      literalValue(selection?.singleSelect) !== "true" ||
      literalValue(selection?.strictSingleSelect) !== "true"
    ) {
      addIssue("year-selection", "Year slicer must enforce strict single selection.");
    }
  }
  const serialized = JSON.stringify(slicers);
  for (const unsupported of [
    "PhysicalRegionName",
    "ReportingRegionName",
    "MovementGodown",
  ]) {
    if (serialized.includes(unsupported)) {
      addIssue(
        "inconsistent-slicer",
        `Management slicers must not use ${unsupported} because it does not filter both facts consistently.`,
      );
    }
  }
  evidence.slicers = "strict Year + shared Product Category";
}

function validateKpis(visuals) {
  const expected = new Map([
    ["YoY Sales Growth", "YoY Sales Change %"],
    ["Growing Products Under Pressure", "Growing Products at Flow Risk"],
    ["Pressure-Exposed Revenue Share", "Revenue at Flow Risk %"],
    ["Cross-Region Revenue Share", "Cross Region Sales %"],
    ["Declining Revenue Exposure", "Declining Product Revenue %"],
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

function validateFlowRiskChart(visuals) {
  const chart = findByTitle(
    visuals,
    "Revenue Under Replenishment Pressure by Category",
  );
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue(
      "flow-risk-type",
      "Replenishment-pressure revenue must be a clusteredBarChart.",
    );
  }
  for (const [kind, entity, property] of [
    ["Column", "dim DimProduct", "CategoryName"],
    ["Measure", "Measuress", "Revenue at Flow Risk"],
    ["Measure", "Measuress", "Revenue at Flow Risk %"],
    ["Measure", "Measuress", "Growing Products at Flow Risk"],
    ["Measure", "Measuress", "Inbound Coverage %"],
    ["Measure", "Measuress", "Net Movement Quantity"],
  ]) {
    if (!hasField(chart, kind, entity, property)) {
      addIssue(
        "flow-risk-field",
        `Flow-risk category chart is missing ${entity}[${property}].`,
      );
    }
  }
  const sort = chart.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "Revenue at Flow Risk" ||
    sort?.direction !== "Descending"
  ) {
    addIssue(
      "flow-risk-sort",
      "Flow-risk categories must sort Revenue at Flow Risk descending.",
    );
  }
  const color = literalValue(
    chart.visual?.objects?.dataPoint?.[0]?.properties?.fill?.solid?.color,
  );
  if (color !== "'#C9911A'" || JSON.stringify(chart).includes("FillRule")) {
    addIssue(
      "flow-risk-color",
      "Flow-risk categories must use one solid accessible gold without a gradient.",
    );
  }
  evidence.flowRisk = "category ranking of revenue linked to growing products with negative stock flow";
}

function validateSalesHeadChart(visuals) {
  const chart = findByTitle(visuals, "YoY Sales Growth by Sales Head");
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue(
      "sales-head-type",
      "YoY Sales Growth by Sales Head must be a clusteredBarChart.",
    );
  }
  for (const [kind, entity, property] of [
    ["Column", "dim DimSalesHead", "SalesHeadName"],
    ["Measure", "Measuress", "YoY Sales Change %"],
    ["Measure", "Measuress", "Total Sales"],
    ["Measure", "Measuress", "Cross Region Sales %"],
    ["Measure", "Measuress", "Previous Year Cross Region Sales %"],
    ["Measure", "Measuress", "Cross Region Exposure Change"],
    ["Measure", "Measuress", "Active Distributors"],
    ["Measure", "Measuress", "Sales per Active Distributor"],
  ]) {
    if (!hasField(chart, kind, entity, property)) {
      addIssue(
        "sales-head-field",
        `Sales Head growth chart is missing ${entity}[${property}].`,
      );
    }
  }
  const sort = chart.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "YoY Sales Change %" ||
    sort?.direction !== "Descending"
  ) {
    addIssue(
      "sales-head-sort",
      "Sales Heads must sort YoY Sales Change % descending.",
    );
  }
  evidence.ownership = "Sales Head YoY growth with territory and distributor-productivity tooltips";
}

function validateActionQueue(visuals) {
  const table = findByTitle(visuals, "Management Action Queue");
  if (!table) return;
  if (table.visual?.visualType !== "tableEx") {
    addIssue("queue-type", "Management Action Queue must be a tableEx visual.");
  }
  for (const [kind, entity, property] of [
    ["Column", "dim DimProduct", "ProductName"],
    ["Column", "dim DimProduct", "CategoryName"],
    ["Measure", "Measuress", "Management Action"],
    ["Measure", "Measuress", "Total Sales"],
    ["Measure", "Measuress", "YoY Sales Change %"],
    ["Measure", "Measuress", "Inbound Coverage %"],
    ["Measure", "Measuress", "Net Movement Quantity"],
  ]) {
    if (!hasField(table, kind, entity, property)) {
      addIssue(
        "queue-field",
        `Management Action Queue is missing ${entity}[${property}].`,
      );
    }
  }
  const sort = table.visual?.query?.sortDefinition?.sort ?? [];
  if (
    sort[0]?.field?.Measure?.Property !== "Management Action" ||
    sort[0]?.direction !== "Ascending" ||
    sort[1]?.field?.Measure?.Property !== "Total Sales" ||
    sort[1]?.direction !== "Descending"
  ) {
    addIssue(
      "queue-sort",
      "Management Action Queue must sort action priority ascending and sales descending.",
    );
  }
  const headers = table.visual?.objects?.columnHeaders?.[0]?.properties;
  if (
    literalValue(headers?.autoSizeColumnWidth) !== "false" ||
    literalValue(headers?.columnAdjustment) !== "'fixedWidth'" ||
    literalValue(headers?.customColumnWidth) !== "true"
  ) {
    addIssue(
      "queue-widths",
      "Management Action Queue must use controlled fixed column widths.",
    );
  }
  evidence.actionQueue = "product-level deterministic action labels with sales and inventory-flow evidence";
}

function validateLegacyRemoval(visuals) {
  const staleTitles = new Set([
    "Total Sales",
    "Outside Assignment %",
    "Closing Stock Estimate",
    "Sales / Distributor",
    "Monthly Sales Trend",
    "Sales Leadership",
    "Category Contribution",
  ]);
  const retained = visuals
    .map((visual) => titleOf(visual))
    .filter((title) => staleTitles.has(title));
  if (retained.length > 0) {
    addIssue(
      "legacy-management-visual",
      `Legacy summary visuals remain: ${retained.join(", ")}.`,
    );
  }
  const serialized = JSON.stringify(visuals);
  for (const unsupported of [
    "Estimated Closing Stock",
    "Assump Opening Stock",
    "Outside Assigned Sales Head Sales %",
    "donutChart",
    "lineChart",
  ]) {
    if (serialized.includes(unsupported)) {
      addIssue(
        "unsupported-management-claim",
        `Management page still references unsupported or duplicated content: ${unsupported}.`,
      );
    }
  }
  if (
    !serialized.includes("Replenishment pressure = positive product YoY growth + negative Net Stock Flow") ||
    !serialized.includes("It is not proof of stockout")
  ) {
    addIssue(
      "decision-rule-caveat",
      "Management page must visibly disclose the replenishment-pressure rule and stockout limitation.",
    );
  }
  evidence.legacyRemoval = "unsupported closing stock, blank outside-assignment KPI and repeated page summaries removed";
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
  for (const measure of [
    "Growing Products at Flow Risk",
    "Revenue at Flow Risk",
    "Revenue at Flow Risk %",
    "Declining Products",
    "Declining Product Revenue",
    "Declining Product Revenue %",
    "Previous Year Cross Region Sales %",
    "Cross Region Exposure Change",
    "Management Action",
  ]) {
    if (!measures.includes(`measure '${measure}' =`)) {
      addIssue(
        "missing-management-measure",
        `Required Management Decision Center measure is missing: ${measure}.`,
      );
    }
  }
  const riskCount = measures.match(
    /measure 'Growing Products at Flow Risk' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !riskCount?.includes("[@Growth] > 0") ||
    !riskCount.includes("[@NetFlow] < 0") ||
    !riskCount.includes("COUNTROWS")
  ) {
    addIssue(
      "risk-count-dax",
      "Growing Products at Flow Risk must count positive-growth products with negative net flow.",
    );
  }
  const riskRevenue = measures.match(
    /measure 'Revenue at Flow Risk' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !riskRevenue?.includes("[@Growth] > 0") ||
    !riskRevenue.includes("[@NetFlow] < 0") ||
    !riskRevenue.includes("SUMX")
  ) {
    addIssue(
      "risk-revenue-dax",
      "Revenue at Flow Risk must sum sales only for positive-growth products with negative net flow.",
    );
  }
  const decliningRevenue = measures.match(
    /measure 'Declining Product Revenue' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !decliningRevenue?.includes("[@Growth] < 0") ||
    !decliningRevenue.includes("SUMX")
  ) {
    addIssue(
      "declining-revenue-dax",
      "Declining Product Revenue must sum sales only for products with negative YoY growth.",
    );
  }
  const action = measures.match(
    /measure 'Management Action' =([\s\S]*?)\n\t\tdisplayFolder:/,
  )?.[1];
  for (const label of [
    "1 · Replenish & protect growth",
    "2 · Recover demand",
    "3 · Monitor",
  ]) {
    if (!action?.includes(label)) {
      addIssue(
        "management-action-dax",
        `Management Action must retain deterministic label: ${label}.`,
      );
    }
  }
  evidence.model = [
    "Growing Products at Flow Risk",
    "Revenue at Flow Risk",
    "Revenue at Flow Risk %",
    "Declining Products",
    "Declining Product Revenue",
    "Declining Product Revenue %",
    "Previous Year Cross Region Sales %",
    "Cross Region Exposure Change",
    "Management Action",
  ];
}

const visuals = await loadVisuals();
await validatePage(visuals);
validateSlicers(visuals);
validateKpis(visuals);
validateFlowRiskChart(visuals);
validateSalesHeadChart(visuals);
validateActionQueue(visuals);
validateLegacyRemoval(visuals);
await validateModel();

const result = {
  status: issues.length === 0 ? "passed" : "failed",
  validatedAt: new Date().toISOString(),
  issueCount: issues.length,
  evidence,
  issues,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = issues.length === 0 ? 0 : 1;
