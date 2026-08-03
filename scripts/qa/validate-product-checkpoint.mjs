#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const productPageId = "0c293fb867ead9beb4cc";
const reportRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
);
const productRoot = path.join(reportRoot, "pages", productPageId);
const productVisuals = path.join(productRoot, "visuals");
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
    "clusteredBarChart",
    "scatterChart",
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
  const entries = await readdir(productVisuals, {
    withFileTypes: true,
  });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(productVisuals, entry.name, "visual.json");
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
  const page = await readJson(path.join(productRoot, "page.json"));
  if (page.displayName !== "Product Performance") {
    addIssue(
      "page-name",
      `Product page displayName must be Product Performance, found ${page.displayName}.`,
    );
  }
  if (page.width !== 1440 || page.height !== 810) {
    addIssue(
      "page-size",
      `Product Performance must remain 1440 x 810, found ${page.width} x ${page.height}.`,
    );
  }

  evidence.page = page.displayName;
  evidence.visuals = visuals.length;
  if (visuals.length !== 54) {
    addIssue(
      "visual-count",
      `Product Performance must contain 54 intentional visuals, found ${visuals.length}.`,
    );
  }

  const dataVisuals = visuals.filter(dataVisual);
  for (const visual of dataVisuals) {
    const { x, y, width, height, tabOrder } = visual.position;
    if (x < 0 || y < 0 || x + width > page.width || y + height > page.height) {
      addIssue(
        "visual-bounds",
        `${visual.name} falls outside the page canvas.`,
      );
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
      "Primary Product Performance visuals must have unique tabOrder values.",
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
  const region = slicers.find((visual) =>
    hasField(
      visual,
      "Column",
      "dim DimDistributor",
      "ReportingRegionName",
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
      addIssue(
        "year-selection",
        "Year slicer must enforce strict single selection.",
      );
    }
  }
  if (!region) {
    addIssue(
      "region-slicer",
      "ReportingRegionName slicer is missing.",
    );
  }
  if (
    slicers.some((visual) =>
      hasField(
        visual,
        "Column",
        "dim DimDistributor",
        "PhysicalRegionName",
      ),
    )
  ) {
    addIssue(
      "legacy-region-slicer",
      "Product Performance must not use PhysicalRegionName.",
    );
  }
  evidence.slicers = "strict Year + corrected Reporting Region";
}

function validateKpis(visuals) {
  const expected = new Map([
    ["Sales Revenue", "Total Sales"],
    ["Units Sold", "Total Quantity Sold"],
    ["Product Coverage", "Product Coverage Display"],
    ["Average Selling Price", "Average Selling Price"],
    ["Top Category Revenue Share", "Top Category Revenue Share"],
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

function validateCategoryGrowth(visuals) {
  const chart = findByTitle(
    visuals,
    "YoY Sales Growth by Product Category",
  );
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue(
      "category-growth-type",
      "Product-category YoY growth must be a clusteredBarChart.",
    );
  }
  if (
    !hasField(
      chart,
      "Column",
      "dim DimProduct",
      "CategoryName",
    ) ||
    !hasField(chart, "Measure", "Measuress", "YoY Sales Change %")
  ) {
    addIssue(
      "category-growth-fields",
      "Product-category YoY growth must use CategoryName and YoY Sales Change %.",
    );
  }
  const primary =
    chart.visual?.query?.queryState?.Y?.projections?.[0]?.field?.Measure
      ?.Property;
  if (primary !== "YoY Sales Change %") {
    addIssue(
      "category-growth-measure",
      `Product-category YoY growth must use YoY Sales Change %, found ${primary}.`,
    );
  }
  const sort = chart.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "YoY Sales Change %" ||
    sort?.direction !== "Descending"
  ) {
    addIssue(
      "category-growth-sort",
      "Product-category YoY growth must sort descending.",
    );
  }
  const dataPoint = chart.visual?.objects?.dataPoint?.[0];
  const color = literalValue(
    dataPoint?.properties?.fill?.solid?.color,
  );
  if (color !== "'#0B6F6A'" || JSON.stringify(dataPoint).includes("FillRule")) {
    addIssue(
      "category-growth-color",
      "Product-category YoY growth must use a solid teal mark color without a gradient legend.",
    );
  }
  evidence.categoryGrowth =
    "signed YoY growth by CategoryName with solid teal marks";
}

function validateTopProducts(visuals) {
  const chart = findByTitle(visuals, "Top 10 Products by Revenue");
  if (!chart) return;
  if (chart.visual?.visualType !== "clusteredBarChart") {
    addIssue(
      "top-products-type",
      "Top 10 Products must be a clusteredBarChart.",
    );
  }
  if (
    !hasField(chart, "Column", "dim DimProduct", "ProductName") ||
    !hasField(chart, "Measure", "Measuress", "Total Sales")
  ) {
    addIssue(
      "top-products-fields",
      "Top 10 Products must use ProductName and Total Sales.",
    );
  }
  const topN =
    chart.filterConfig?.filters?.[0]?.filter?.Where?.[0]?.Condition
      ?.VisualTopN?.ItemCount;
  if (topN !== 10) {
    addIssue(
      "top-products-filter",
      `Top 10 Products must enforce Top 10, found ${topN}.`,
    );
  }
  for (const measure of [
    "Product Portfolio Contribution %",
    "YoY Sales Change %",
    "Total Quantity Sold",
    "Average Selling Price",
  ]) {
    if (!hasField(chart, "Measure", "Measuress", measure)) {
      addIssue(
        "top-products-tooltip",
        `Top 10 Products must expose ${measure}.`,
      );
    }
  }
  const categoryAxis =
    chart.visual?.objects?.categoryAxis?.[0]?.properties;
  const labels = chart.visual?.objects?.labels?.[0]?.properties;
  if (
    chart.position?.height < 284 ||
    Number.parseFloat(literalValue(categoryAxis?.preferredCategoryWidth)) >
      8 ||
    Number.parseInt(literalValue(categoryAxis?.innerPadding), 10) > 8
  ) {
    addIssue(
      "top-products-density",
      "Top 10 Products must reserve enough vertical room and compact category spacing for all ten bars.",
    );
  }
  if (
    literalValue(labels?.labelDisplayUnits) !== "1000000D" ||
    literalValue(labels?.labelPrecision) !== "1L" ||
    labels?.valueCustomFormatString
  ) {
    addIssue(
      "top-products-units",
      "Top 10 Products must use native visual-level million display units without a custom format string.",
    );
  }
  const dataPoint = chart.visual?.objects?.dataPoint?.[0];
  if (
    literalValue(dataPoint?.properties?.fill?.solid?.color) !==
      "'#0B6F6A'" ||
    JSON.stringify(dataPoint).includes("FillRule")
  ) {
    addIssue(
      "top-products-color",
      "Top 10 Products must use solid teal marks.",
    );
  }
  evidence.topProducts =
    "Top 10 revenue with native million units and compact density";
}

function validatePriceVolume(visuals) {
  const chart = findByTitle(
    visuals,
    "Category Price–Volume Matrix",
  );
  if (!chart) return;
  if (chart.visual?.visualType !== "scatterChart") {
    addIssue(
      "price-volume-type",
      "Category Price–Volume Matrix must be a scatterChart.",
    );
  }

  const expectedRoles = new Map([
    ["Category", ["Column", "CategoryName"]],
    ["Series", ["Column", "CategoryName"]],
    ["X", ["Measure", "Total Quantity Sold"]],
    ["Y", ["Measure", "Average Selling Price"]],
    ["Size", ["Measure", "Total Sales"]],
  ]);
  for (const [role, [kind, property]] of expectedRoles) {
    const projection =
      chart.visual?.query?.queryState?.[role]?.projections?.[0]?.field;
    const actual =
      kind === "Column"
        ? projection?.Column?.Property
        : projection?.Measure?.Property;
    if (actual !== property) {
      addIssue(
        "price-volume-role",
        `${role} must use ${property}, found ${actual}.`,
      );
    }
  }
  const legend = chart.visual?.objects?.legend?.[0]?.properties;
  const labels =
    chart.visual?.objects?.categoryLabels?.[0]?.properties;
  const bubbles = chart.visual?.objects?.bubbles?.[0]?.properties;
  if (
    literalValue(legend?.show) !== "true" ||
    literalValue(legend?.position) !== "'RightCenter'" ||
    literalValue(labels?.show) !== "false"
  ) {
    addIssue(
      "price-volume-labels",
      "Category Price–Volume Matrix must use a right-side legend and suppress overlapping direct labels.",
    );
  }
  if (literalValue(bubbles?.bubbleSize) !== "42L") {
    addIssue(
      "price-volume-bubbles",
      "Category Price–Volume Matrix must use the controlled bubble-size multiplier.",
    );
  }
  evidence.priceVolume =
    "six category points; units x ASP; sales-revenue bubble size; visible category legend";
}

function validatePortfolioTable(visuals) {
  const table = findByTitle(visuals, "Product Portfolio Detail");
  if (!table) return;
  if (table.visual?.visualType !== "tableEx") {
    addIssue(
      "portfolio-table-type",
      "Product Portfolio Detail must be a tableEx visual.",
    );
  }
  const required = [
    ["Column", "dim DimProduct", "ProductName"],
    ["Column", "dim DimProduct", "CategoryName"],
    ["Measure", "Measuress", "Total Sales"],
    ["Measure", "Measuress", "Total Quantity Sold"],
    ["Measure", "Measuress", "Average Selling Price"],
    [
      "Measure",
      "Measuress",
      "Product Portfolio Contribution %",
    ],
    ["Measure", "Measuress", "YoY Sales Change %"],
  ];
  for (const [kind, entity, property] of required) {
    if (!hasField(table, kind, entity, property)) {
      addIssue(
        "portfolio-table-field",
        `Product Portfolio Detail is missing ${entity}[${property}].`,
      );
    }
  }
  const sort = table.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Measure?.Property !== "Total Sales" ||
    sort?.direction !== "Descending"
  ) {
    addIssue(
      "portfolio-table-sort",
      "Product Portfolio Detail must sort Total Sales descending.",
    );
  }
  const projections =
    table.visual?.query?.queryState?.Values?.projections ?? [];
  const displayNames = projections.map(
    (projection) => projection.displayName,
  );
  for (const name of ["Revenue", "Units", "ASP", "Share", "YoY"]) {
    if (!displayNames.includes(name)) {
      addIssue(
        "portfolio-table-header",
        `Product Portfolio Detail is missing compact header ${name}.`,
      );
    }
  }
  const headers =
    table.visual?.objects?.columnHeaders?.[0]?.properties;
  if (
    literalValue(headers?.autoSizeColumnWidth) !== "false" ||
    literalValue(headers?.columnAdjustment) !== "'fixedWidth'" ||
    literalValue(headers?.customColumnWidth) !== "true"
  ) {
    addIssue(
      "portfolio-table-widths",
      "Product Portfolio Detail must use controlled fixed column widths.",
    );
  }
  const revenueFormatting =
    table.visual?.objects?.columnFormatting?.find(
      (instance) =>
        instance.selector?.metadata === "Measuress.Total Sales",
    )?.properties;
  if (
    literalValue(revenueFormatting?.labelDisplayUnits) !==
      "1000000D" ||
    literalValue(revenueFormatting?.labelPrecision) !== "2L"
  ) {
    addIssue(
      "portfolio-table-units",
      "Product Portfolio Detail must format revenue in millions at the visual-column level.",
    );
  }
  const requiredWidths = new Set([
    "dim DimProduct.ProductName",
    "dim DimProduct.CategoryName",
    "Measuress.Total Sales",
    "Measuress.Total Quantity Sold",
    "Measuress.Average Selling Price",
    "Measuress.Product Portfolio Contribution %",
    "Measuress.YoY Sales Change %",
  ]);
  for (const instance of table.visual?.objects?.columnWidth ?? []) {
    requiredWidths.delete(instance.selector?.metadata);
  }
  if (requiredWidths.size > 0) {
    addIssue(
      "portfolio-table-column-width",
      `Product Portfolio Detail lacks fixed widths for: ${[...requiredWidths].join(", ")}.`,
    );
  }
  evidence.portfolioTable =
    "seven retained columns with compact headers and visual-level revenue units";
}

function validateLegacyRemoval(visuals) {
  const legacyTitles = new Set([
    "Monthly Product Sales",
    "Sales by Product",
    "Sales by Product Category",
    "Category Sales Mix",
    "Sales Orders",
  ]);
  const retained = visuals
    .map((visual) => titleOf(visual))
    .filter((title) => legacyTitles.has(title));
  if (retained.length > 0) {
    addIssue(
      "legacy-product-visual",
      `Legacy Product visuals remain: ${retained.join(", ")}.`,
    );
  }
  if (
    visuals.some((visual) =>
      ["lineChart", "donutChart"].includes(visual.visual?.visualType),
    )
  ) {
    addIssue(
      "legacy-product-type",
      "Product Performance must not retain the duplicated monthly line or donut chart.",
    );
  }
  evidence.legacyRemoval =
    "duplicated monthly, product/category revenue, donut and orders removed";
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
  const expected = [
    "Product Catalog Count",
    "Product Coverage %",
    "Product Coverage Display",
    "Product Portfolio Contribution %",
    "Top Category Revenue Share",
  ];
  for (const measure of expected) {
    if (!measures.includes(`measure '${measure}' =`)) {
      addIssue(
        "missing-product-measure",
        `Required Product Performance measure is missing: ${measure}.`,
      );
    }
  }

  const coverage = measures.match(
    /measure 'Product Coverage Display' =([\s\S]*?)\n\t\tdisplayFolder:/,
  )?.[1];
  if (
    !coverage?.includes("[Distinct Products Sold]") ||
    !coverage.includes("[Product Catalog Count]") ||
    !coverage.includes('" / "') ||
    coverage.includes("[Product Coverage %]") ||
    coverage.includes('" of "')
  ) {
    addIssue(
      "coverage-dax",
      "Product Coverage Display must compactly show sold / catalog; the percentage belongs in tooltip context.",
    );
  }

  const contribution = measures.match(
    /measure 'Product Portfolio Contribution %' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !contribution?.includes("ALLSELECTED ( 'dim DimProduct' )")
  ) {
    addIssue(
      "portfolio-share-dax",
      "Product Portfolio Contribution % must remove row-level product filters with ALLSELECTED DimProduct.",
    );
  }

  const topCategory = measures.match(
    /measure 'Top Category Revenue Share' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !topCategory?.includes("MAXX") ||
    !topCategory.includes(
      "ALLSELECTED ( 'dim DimProduct'[CategoryName] )",
    )
  ) {
    addIssue(
      "top-category-dax",
      "Top Category Revenue Share must calculate the maximum selected category revenue share.",
    );
  }
  evidence.model = expected;
}

async function validateNavigationRename() {
  const pagesRoot = path.join(reportRoot, "pages");
  const pageEntries = await readdir(pagesRoot, {
    withFileTypes: true,
  });
  const stale = [];
  for (const pageEntry of pageEntries) {
    if (!pageEntry.isDirectory()) continue;
    const visualRoot = path.join(
      pagesRoot,
      pageEntry.name,
      "visuals",
    );
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
      if (content.includes("Product Analysis")) {
        stale.push(path.relative(root, file));
      }
    }
  }
  if (stale.length > 0) {
    addIssue(
      "stale-navigation",
      `Product Analysis remains in ${stale.length} visual definitions.`,
    );
  }
  evidence.navigation = "Product Performance across report navigation";
}

const visuals = await loadVisuals();
await validatePage(visuals);
validateSlicers(visuals);
validateKpis(visuals);
validateCategoryGrowth(visuals);
validateTopProducts(visuals);
validatePriceVolume(visuals);
validatePortfolioTable(visuals);
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
