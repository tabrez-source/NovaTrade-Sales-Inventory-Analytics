#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const pagesRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
  "pages",
);
const measuresFile = path.join(
  root,
  "powerbi",
  "NovaTrade.SemanticModel",
  "definition",
  "tables",
  "Measuress.tmdl",
);
const relationshipsFile = path.join(
  root,
  "powerbi",
  "NovaTrade.SemanticModel",
  "definition",
  "relationships.tmdl",
);

const pageDefinitions = {
  validation: {
    id: "046c19d6b1632318bc76",
    displayName: "DAX & Measures Validation",
    minVisuals: 65,
  },
  model: {
    id: "1f4b43e6cf3bae8af6ab",
    displayName: "Data Model Overview",
    minVisuals: 68,
  },
  logic: {
    id: "8aceecd42b8f434b7f79",
    displayName: "Business Logic & Notes",
    minVisuals: 55,
  },
};

const issues = [];

function fail(message) {
  issues.push(message);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readPage(page) {
  const pageRoot = path.join(pagesRoot, page.id);
  const definition = await readJson(path.join(pageRoot, "page.json"));
  const visualRoot = path.join(pageRoot, "visuals");
  const entries = await readdir(visualRoot, { withFileTypes: true });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    visuals.push(
      await readJson(path.join(visualRoot, entry.name, "visual.json")),
    );
  }
  return { definition, visuals };
}

function allStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) allStrings(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) allStrings(item, output);
  }
  return output;
}

function textOf(visuals) {
  return allStrings(visuals).join("\n");
}

function visualTypes(visuals) {
  return visuals.reduce((counts, visual) => {
    const type = visual.visual?.visualType ?? "unknown";
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function queryMeasureNames(visuals) {
  const names = new Set();
  for (const visual of visuals) {
    const serialized = JSON.stringify(visual.visual?.query ?? {});
    for (const match of serialized.matchAll(/"Property":"([^"]+)"/g)) {
      names.add(match[1]);
    }
  }
  return names;
}

function slicerBindings(visuals) {
  const result = [];
  for (const visual of visuals) {
    if (visual.visual?.visualType !== "slicer") continue;
    const projections =
      visual.visual?.query?.queryState?.Values?.projections ?? [];
    for (const projection of projections) {
      const column = projection.field?.Column;
      if (!column) continue;
      result.push(
        `${column.Expression?.SourceRef?.Entity}.${column.Property}`,
      );
    }
  }
  return result;
}

function assertContains(text, values, context) {
  for (const value of values) {
    if (!text.includes(value)) {
      fail(`${context} is missing required text or binding: ${value}`);
    }
  }
}

const pages = {};
for (const [key, expected] of Object.entries(pageDefinitions)) {
  const page = await readPage(expected);
  pages[key] = page;
  if (page.definition.displayName !== expected.displayName) {
    fail(
      `${expected.displayName} has unexpected display name: ${page.definition.displayName}`,
    );
  }
  if (page.definition.width !== 1440 || page.definition.height !== 810) {
    fail(`${expected.displayName} must use the 1440 × 810 report canvas.`);
  }
  if (page.definition.visibility !== "HiddenInViewMode") {
    fail(`${expected.displayName} must remain hidden from standard report tabs.`);
  }
  if (page.visuals.length < expected.minVisuals) {
    fail(
      `${expected.displayName} has ${page.visuals.length} visuals; expected at least ${expected.minVisuals}.`,
    );
  }
}

const validationText = textOf(pages.validation.visuals);
const validationMeasures = queryMeasureNames(pages.validation.visuals);
const validationSlicers = slicerBindings(pages.validation.visuals);
const validationTypes = visualTypes(pages.validation.visuals);

assertContains(
  validationText,
  [
    "Measures & Validation Center",
    "Sales Region Partition",
    "Average Order Value Identity",
    "Relationship Key Integrity",
    "Inventory Net Flow Identity",
    "Movement Classification",
    "Product Coverage Bounds",
    "PASS confirms",
    "not external source certification",
  ],
  "Validation page",
);

for (const measure of [
  "Validation Tests Run",
  "Validation Tests Passed",
  "Validation Tests Failed",
  "Validation Overall Status",
  "Validation Sales Split Status",
  "Validation AOV Status",
  "Validation Relationship Integrity Status",
  "Validation Net Flow Status",
  "Validation Movement Classification Status",
  "Validation Product Coverage Status",
]) {
  if (!validationMeasures.has(measure)) {
    fail(`Validation page is missing required measure binding: ${measure}`);
  }
}

for (const binding of [
  "dim DimDate.YearNumber",
  "dim DimProduct.CategoryName",
]) {
  if (!validationSlicers.includes(binding)) {
    fail(`Validation page is missing required slicer binding: ${binding}`);
  }
}
if (validationTypes.cardVisual < 10) {
  fail("Validation page must contain four summary cards and six test cards.");
}

const modelText = textOf(pages.model.visuals);
const modelMeasures = queryMeasureNames(pages.model.visuals);
const modelSlicers = slicerBindings(pages.model.visuals);
assertContains(
  modelText,
  [
    "NovaTrade Data Model",
    "FactSales",
    "FactInventoryMovement",
    "DimDate",
    "DimProduct",
    "DimDistributor",
    "DimSalesHead",
    "DimBranch",
    "DimGodown",
    "DimFromGodown",
    "DimToGodown",
    "Reusable Measures Layer",
    "1 → *",
    "single direction",
    "role-playing copies",
  ],
  "Data Model Overview page",
);
for (const measure of [
  "Sales Row Count",
  "Inventory Row Count",
  "Product Catalog Count",
  "Validation Orphan Fact Rows",
]) {
  if (!modelMeasures.has(measure)) {
    fail(`Data Model Overview is missing required evidence card: ${measure}`);
  }
}
if (modelSlicers.length !== 0) {
  fail("Data Model Overview must remain architecture-focused and contain no slicers.");
}

const logicText = textOf(pages.logic.visuals);
const logicSlicers = slicerBindings(pages.logic.visuals);
assertContains(
  logicText,
  [
    "Business Logic & Reporting Notes",
    "Total Sales = Σ FactSales[LineTotal]",
    "Average Order Value = Total Sales ÷ Sales Orders",
    "YoY is N/A when no prior-year period exists",
    "Cross-region activity signals market reach",
    "Net Stock Flow = Inward Units − Outward Units",
    "Net Stock Flow is a period movement signal—not Stock on Hand",
    "Flow risk = positive product YoY growth AND negative Net Stock Flow",
    "Opening stock and authoritative Stock on Hand are unavailable",
    "COGS, margin, supplier lead time, targets and service levels are unavailable",
    "DECISION-USE CONTRACT",
  ],
  "Business Logic & Notes page",
);
if (logicSlicers.length !== 0) {
  fail("Business Logic & Notes must remain definition-focused and contain no slicers.");
}

const measuresText = await readFile(measuresFile, "utf8");
for (const measure of [
  "Validation Sales Split Variance",
  "Validation Sales Split Status",
  "Validation AOV Variance",
  "Validation AOV Status",
  "Validation Sales Orphan Rows",
  "Validation Inventory Orphan Rows",
  "Validation Orphan Fact Rows",
  "Validation Relationship Integrity Status",
  "Validation Net Flow Variance",
  "Validation Net Flow Status",
  "Validation Raw Movement Quantity",
  "Validation Movement Classification Variance",
  "Validation Movement Classification Status",
  "Validation Product Coverage Status",
  "Validation Tests Run",
  "Validation Tests Passed",
  "Validation Tests Failed",
  "Validation Overall Status",
]) {
  if (!measuresText.includes(`measure '${measure}' =`)) {
    fail(`Semantic model is missing validation measure: ${measure}`);
  }
}
for (const unsupported of [
  "Assump Opening Stock",
  "Estimated Closing Stock",
  "Total COGS",
]) {
  if (measuresText.includes(`measure '${unsupported}' =`)) {
    fail(`Unsupported semantic measure must be removed: ${unsupported}`);
  }
}
if ((measuresText.match(/displayFolder: 11_Report Validation/g) ?? []).length !== 18) {
  fail("All 18 validation measures must be assigned to 11_Report Validation.");
}

const relationshipsText = await readFile(relationshipsFile, "utf8");
const relationshipCount =
  relationshipsText.match(/^relationship /gm)?.length ?? 0;
if (relationshipCount !== 10) {
  fail(`Expected 10 active relationships; found ${relationshipCount}.`);
}
for (const forbidden of ["crossFilteringBehavior: both", "isActive: false"] ) {
  if (relationshipsText.includes(forbidden)) {
    fail(`Relationship contract contains forbidden setting: ${forbidden}`);
  }
}

const result = {
  status: issues.length ? "failed" : "passed",
  validatedAt: new Date().toISOString(),
  issueCount: issues.length,
  evidence: {
    pages: Object.fromEntries(
      Object.entries(pages).map(([key, value]) => [
        key,
        {
          displayName: value.definition.displayName,
          visuals: value.visuals.length,
          visualTypes: visualTypes(value.visuals),
        },
      ]),
    ),
    validationTests: 6,
    validationMeasures: 18,
    activeRelationships: relationshipCount,
    unsupportedMeasuresRemoved: [
      "Assump Opening Stock",
      "Estimated Closing Stock",
      "Total COGS",
    ],
    navigation: "five analytical pages plus three hidden reference pages",
  },
  issues,
};

console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exit(1);
