#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const salesPageId = "97dd004d959bc353cfef";
const reportRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
);
const salesRoot = path.join(reportRoot, "pages", salesPageId);
const salesVisuals = path.join(salesRoot, "visuals");
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
    "columnChart",
    "clusteredBarChart",
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
  const entries = await readdir(salesVisuals, { withFileTypes: true });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(salesVisuals, entry.name, "visual.json");
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
  const page = await readJson(path.join(salesRoot, "page.json"));
  if (page.displayName !== "Sales Performance") {
    addIssue(
      "page-name",
      `Sales page displayName must be Sales Performance, found ${page.displayName}.`,
    );
  }
  if (page.width !== 1440 || page.height !== 810) {
    addIssue(
      "page-size",
      `Sales Performance must remain 1440 x 810, found ${page.width} x ${page.height}.`,
    );
  }

  evidence.page = page.displayName;
  evidence.visuals = visuals.length;
  if (visuals.length !== 55) {
    addIssue(
      "visual-count",
      `Sales Performance must contain 55 intentional visuals, found ${visuals.length}.`,
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
      "Primary Sales Performance visuals must have unique tabOrder values.",
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
      "Sales Performance must not use the uncorrected PhysicalRegionName slicer.",
    );
  }
  evidence.slicers = "strict Year + corrected Reporting Region";
}

function validateKpis(visuals) {
  const expected = new Map([
    ["Total Sales", "Total Sales"],
    ["Sales Orders", "Sales Order Count"],
    ["Average Order Value", "Average Order Value"],
    ["YoY Sales Growth", "YoY Sales Change %"],
    ["Active Distributors", "Active Distributors"],
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
  const trend = findByTitle(
    visuals,
    "Monthly Sales: Selected Year vs Prior Year",
  );
  if (!trend) return;
  if (trend.visual?.visualType !== "lineChart") {
    addIssue("trend-type", "Monthly comparison must be a lineChart.");
  }

  const category =
    trend.visual?.query?.queryState?.Category?.projections?.[0];
  if (
    category?.field?.Column?.Property !== "MonthName" ||
    category?.queryRef !== "dim DimDate.MonthName"
  ) {
    addIssue(
      "trend-month",
      "Monthly comparison must use DimDate[MonthName].",
    );
  }

  const measures = (
    trend.visual?.query?.queryState?.Y?.projections ?? []
  ).map((projection) => projection.field?.Measure?.Property);
  if (
    measures.length !== 2 ||
    !measures.includes("Total Sales") ||
    !measures.includes("Previous Year Sales")
  ) {
    addIssue(
      "trend-series",
      `Monthly comparison must contain Total Sales and Previous Year Sales; found ${measures.join(", ")}.`,
    );
  }

  const sort =
    trend.visual?.query?.sortDefinition?.sort?.[0];
  if (
    sort?.field?.Column?.Property !== "MonthName" ||
    sort?.direction !== "Ascending"
  ) {
    addIssue(
      "trend-sort",
      "Monthly comparison must sort MonthName ascending.",
    );
  }

  if (
    literalValue(
      trend.visual?.objects?.legend?.[0]?.properties?.show,
    ) !== "true"
  ) {
    addIssue("trend-legend", "Monthly comparison legend must be visible.");
  }

  const styles = trend.visual?.objects?.lineStyles ?? [];
  const currentStyle = styles.find(
    (style) => style.selector?.metadata === "Measuress.Total Sales",
  );
  const priorStyle = styles.find(
    (style) =>
      style.selector?.metadata === "Measuress.Previous Year Sales",
  );
  if (
    literalValue(currentStyle?.properties?.lineStyle) !== "'solid'" ||
    literalValue(priorStyle?.properties?.lineStyle) !== "'dashed'"
  ) {
    addIssue(
      "trend-line-style",
      "Selected-year line must be solid and prior-year line must be dashed.",
    );
  }
  evidence.trend = "MonthName; selected year solid; prior year dashed";
}

function validateDiagnostics(visuals) {
  const territory = findByTitle(
    visuals,
    "Assigned vs Cross-Region Sales by Month",
  );
  if (territory) {
    for (const measure of [
      "Assigned-Region Sales",
      "Cross Region Sales",
    ]) {
      if (!hasField(territory, "Measure", "Measuress", measure)) {
        addIssue(
          "territory-measure",
          `Territory mix must include ${measure}.`,
        );
      }
    }
  }

  const region = findByTitle(visuals, "Sales by Reporting Region");
  if (
    region &&
    !hasField(
      region,
      "Column",
      "dim DimDistributor",
      "ReportingRegionName",
    )
  ) {
    addIssue(
      "region-field",
      "Region ranking must use ReportingRegionName.",
    );
  }

  const salesHead = findByTitle(visuals, "Sales by Sales Head");
  if (
    salesHead &&
    !hasField(
      salesHead,
      "Column",
      "dim DimSalesHead",
      "SalesHeadName",
    )
  ) {
    addIssue(
      "sales-head-field",
      "Sales Head ranking must use DimSalesHead[SalesHeadName].",
    );
  }

  const distributors = findByTitle(
    visuals,
    "Top 5 Distributors by Sales",
  );
  if (distributors) {
    if (
      !hasField(
        distributors,
        "Column",
        "dim DimDistributor",
        "DistributorName",
      )
    ) {
      addIssue(
        "distributor-field",
        "Distributor ranking must use DistributorName.",
      );
    }
    const topN =
      distributors.filterConfig?.filters?.[0]?.filter?.Where?.[0]
        ?.Condition?.VisualTopN?.ItemCount;
    if (topN !== 5) {
      addIssue(
        "distributor-top-n",
        `Distributor ranking must enforce Top 5, found ${topN}.`,
      );
    }
  }

  if (
    visuals.some(
      (visual) =>
        visual.visual?.visualType === "donutChart" ||
        hasField(
          visual,
          "Column",
          "dim DimProduct",
          "CategoryName",
        ),
    )
  ) {
    addIssue(
      "legacy-sales-visual",
      "Sales Performance must not retain the old donut or product-category chart.",
    );
  }

  evidence.diagnostics = [
    "territory mix",
    "reporting-region ranking",
    "Sales Head ranking",
    "Top 5 distributors",
  ];
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
  const distributor = await readFile(
    path.join(
      root,
      "powerbi",
      "NovaTrade.SemanticModel",
      "definition",
      "tables",
      "dim DimDistributor.tmdl",
    ),
    "utf8",
  );
  const generator = await readFile(
    path.join(
      root,
      "scripts",
      "data_generation",
      "02_generate_business_master.py",
    ),
    "utf8",
  );

  const previousYear = measures.match(
    /measure 'Previous Year Sales' =([\s\S]*?)\n\t\tformatString:/,
  )?.[1];
  if (
    !previousYear?.includes("SAMEPERIODLASTYEAR") ||
    previousYear.includes("ISINSCOPE")
  ) {
    addIssue(
      "previous-year-dax",
      "Previous Year Sales must use SAMEPERIODLASTYEAR without an ISINSCOPE gate.",
    );
  }

  for (const measure of [
    "Sales Head Sales Contribution %",
    "Distributor Sales Contribution %",
    "Region Sales Contribution %",
  ]) {
    if (!measures.includes(`measure '${measure}' =`)) {
      addIssue(
        "missing-measure",
        `Required diagnostic measure is missing: ${measure}.`,
      );
    }
  }

  if (
    !distributor.includes("column ReportingRegionName =") ||
    !distributor.includes('1, "West"') ||
    !distributor.includes('2, "South"') ||
    !distributor.includes('3, "North"') ||
    !distributor.includes('4, "East"')
  ) {
    addIssue(
      "reporting-region-model",
      "ReportingRegionName must map branch IDs 1-4 to West/South/North/East.",
    );
  }

  if (
    !generator.includes(
      '[1, "Mumbai Head Branch", "Mumbai", "Maharashtra", "West", 1, 1]',
    )
  ) {
    addIssue(
      "mumbai-region-generator",
      "Synthetic business master must classify Mumbai as West.",
    );
  }

  evidence.model = "YoY scope repaired; reporting-region mapping corrected";
}

async function validateNavigationRename() {
  const pagesRoot = path.join(reportRoot, "pages");
  const pageEntries = await readdir(pagesRoot, { withFileTypes: true });
  const stale = [];
  for (const pageEntry of pageEntries) {
    if (!pageEntry.isDirectory()) continue;
    const visualsRoot = path.join(
      pagesRoot,
      pageEntry.name,
      "visuals",
    );
    let visualEntries = [];
    try {
      visualEntries = await readdir(visualsRoot, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    for (const visualEntry of visualEntries) {
      if (!visualEntry.isDirectory()) continue;
      const file = path.join(
        visualsRoot,
        visualEntry.name,
        "visual.json",
      );
      const contents = await readFile(file, "utf8");
      if (contents.includes("Sales Analysis")) {
        stale.push(path.relative(root, file));
      }
    }
  }
  if (stale.length) {
    addIssue(
      "stale-navigation-name",
      `Sales Analysis remains in ${stale.length} visual definitions.`,
      stale[0],
    );
  }
  evidence.navigation = "Sales Performance label propagated across pages";
}

const visuals = await loadVisuals();
await validatePage(visuals);
validateSlicers(visuals);
validateKpis(visuals);
validateTrend(visuals);
validateDiagnostics(visuals);
await validateModel();
await validateNavigationRename();

const result = {
  status: issues.length === 0 ? "passed" : "failed",
  issueCount: issues.length,
  evidence,
  issues,
};

console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exitCode = 1;
