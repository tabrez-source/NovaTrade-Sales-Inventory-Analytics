#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const writeEvidence = !process.argv.includes("--no-write");
const reportRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
);
const pagesRoot = path.join(reportRoot, "pages");
const executivePageId = "57f63e365ec04b378b4b";
const executiveVisuals = path.join(
  pagesRoot,
  executivePageId,
  "visuals",
);

const expectedPublicPages = new Set([
  "Executive Overview",
  "Sales Performance",
  "Product Analysis",
  "Inventory Movement Analysis",
  "Management Insights",
]);

const expectedHiddenPages = new Set([
  "00_UI Template",
  "DAX & Measures Validation",
  "Data Model Overview",
  "Business Logic & Notes",
]);

const obsoletePageIds = [
  "146c63ce2a7232f022ca",
  "a3ae9ddee48899760b72",
  "1958dc59ea847d3f5dc5",
];

const obsoleteAssets = [
  "batteries20755036479770694.png",
  "mos_bat3097343853681004.jpg",
  "torch6333343974821143.jpg",
];

const ids = {
  monthlySales: "35295e3fe4369375",
  monthlyTerritory: "91cc18e048e53159",
  yearSlicer: "4045a6ffb8100702",
  categoryRanking: "a6cd0f341d75fea9",
  salesHeadRanking: "5718a21de2ee5fa6",
  regionRanking: "912762d404f7e63e",
};

const issues = [];
const evidence = {};

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function literalValue(property) {
  return property?.expr?.Literal?.Value;
}

function addIssue(code, message, file = null) {
  issues.push({ code, message, ...(file ? { file } : {}) });
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

async function validateJson() {
  const files = (await walk(root)).filter(
    (file) =>
      file.endsWith(".json") &&
      !file.includes(`${path.sep}.git${path.sep}`),
  );
  for (const file of files) {
    try {
      await readJson(file);
    } catch (error) {
      addIssue("invalid-json", error.message, path.relative(root, file));
    }
  }
  evidence.jsonFiles = files.length;
}

async function validatePages() {
  const metadata = await readJson(path.join(pagesRoot, "pages.json"));
  const pageDirectories = (await readdir(pagesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const publicPages = [];
  const hiddenPages = [];
  let visualDefinitions = 0;

  if (metadata.activePageName !== executivePageId) {
    addIssue(
      "active-page",
      "Executive Overview must remain the active report page.",
    );
  }

  for (const pageId of metadata.pageOrder) {
    if (!pageDirectories.includes(pageId)) {
      addIssue("missing-page", `Page order references missing page ${pageId}.`);
      continue;
    }
    const page = await readJson(path.join(pagesRoot, pageId, "page.json"));
    const visualRoot = path.join(pagesRoot, pageId, "visuals");
    let visualCount = 0;
    try {
      visualCount = (await readdir(visualRoot, { withFileTypes: true })).filter(
        (entry) => entry.isDirectory(),
      ).length;
    } catch {
      visualCount = 0;
    }
    visualDefinitions += visualCount;
    if (page.visibility === "HiddenInViewMode") hiddenPages.push(page.displayName);
    else publicPages.push(page.displayName);
  }

  for (const pageId of pageDirectories) {
    if (!metadata.pageOrder.includes(pageId)) {
      addIssue("orphan-page", `Page directory ${pageId} is not in pageOrder.`);
    }
  }

  for (const pageId of obsoletePageIds) {
    if (pageDirectories.includes(pageId)) {
      addIssue("obsolete-page", `Obsolete page ${pageId} still exists.`);
    }
  }

  for (const name of expectedPublicPages) {
    if (!publicPages.includes(name)) {
      addIssue("public-page", `Expected visible page is missing: ${name}.`);
    }
  }
  for (const name of expectedHiddenPages) {
    if (!hiddenPages.includes(name)) {
      addIssue("hidden-page", `Expected hidden page is missing: ${name}.`);
    }
  }
  for (const name of publicPages) {
    if (!expectedPublicPages.has(name)) {
      addIssue("unexpected-public-page", `Unexpected visible page: ${name}.`);
    }
  }
  for (const name of hiddenPages) {
    if (!expectedHiddenPages.has(name)) {
      addIssue("unexpected-hidden-page", `Unexpected hidden page: ${name}.`);
    }
  }

  evidence.pageDefinitions = metadata.pageOrder.length;
  evidence.publicPages = publicPages.length;
  evidence.hiddenPages = hiddenPages.length;
  evidence.visualDefinitions = visualDefinitions;
}

async function loadExecutiveVisual(id) {
  return readJson(path.join(executiveVisuals, id, "visual.json"));
}

async function validateMonthlyViews() {
  for (const id of [ids.monthlySales, ids.monthlyTerritory]) {
    const visual = await loadExecutiveVisual(id);
    const projection =
      visual.visual.query.queryState.Category.projections?.[0];
    const sort =
      visual.visual.query.sortDefinition?.sort?.[0];
    if (
      projection?.field?.Column?.Property !== "MonthName" ||
      projection?.queryRef !== "dim DimDate.MonthName"
    ) {
      addIssue(
        "month-field",
        `${id} must use DimDate[MonthName].`,
      );
    }
    if (
      sort?.field?.Column?.Property !== "MonthName" ||
      sort?.direction !== "Ascending"
    ) {
      addIssue(
        "month-sort",
        `${id} must sort MonthName ascending.`,
      );
    }
  }

  const dimDate = await readFile(
    path.join(
      root,
      "powerbi",
      "NovaTrade.SemanticModel",
      "definition",
      "tables",
      "dim DimDate.tmdl",
    ),
    "utf8",
  );
  if (
    !/column MonthName[\s\S]*?sortByColumn: MonthNumber/.test(dimDate)
  ) {
    addIssue(
      "month-model-sort",
      "DimDate[MonthName] must be sorted by MonthNumber.",
    );
  }
  if (dimDate.includes("column 'Month Year'")) {
    addIssue("unused-month-year", "Unused Month Year column still exists.");
  }
  if (/\n\tcolumn Column\n/.test(dimDate)) {
    addIssue("generic-date-column", "Generic DimDate[Column] still exists.");
  }

  const cultureFile = path.join(
    root,
    "powerbi",
    "NovaTrade.SemanticModel",
    "definition",
    "cultures",
    "en-US.tmdl",
  );
  const culture = await readFile(cultureFile, "utf8");
  const metadataStart = culture.indexOf("linguisticMetadata =");
  const metadataEnd = culture.indexOf("\n\t\tcontentType: json");
  if (metadataStart < 0 || metadataEnd < 0) {
    addIssue(
      "linguistic-metadata",
      "Could not locate the en-US linguistic metadata payload.",
    );
  } else {
    const payload = culture
      .slice(
        metadataStart + "linguisticMetadata =".length,
        metadataEnd,
      )
      .trim();
    try {
      const metadata = JSON.parse(payload);
      if (metadata.Entities?.["dim_DimDate.column"]) {
        addIssue(
          "generic-date-language-entity",
          "Generic DimDate[Column] remains in linguistic metadata.",
        );
      }
      if (metadata.Relationships?.["dim_DimDate_has_column"]) {
        addIssue(
          "generic-date-language-relationship",
          "Generic DimDate[Column] relationship remains in linguistic metadata.",
        );
      }
      evidence.linguisticMetadata = "valid JSON";
    } catch (error) {
      addIssue("linguistic-metadata-json", error.message, cultureFile);
    }
  }

  evidence.monthAxis = "MonthName sorted by MonthNumber";
}

async function validateYearSlicer() {
  const slicer = await loadExecutiveVisual(ids.yearSlicer);
  const selection = slicer.visual.objects.selection?.[0]?.properties;
  if (literalValue(selection?.singleSelect) !== "true") {
    addIssue("year-single-select", "Year slicer must enable single select.");
  }
  if (literalValue(selection?.strictSingleSelect) !== "true") {
    addIssue(
      "year-strict-single-select",
      "Year slicer must require exactly one selection.",
    );
  }
  if (literalValue(selection?.selectAllCheckboxEnabled) !== "false") {
    addIssue("year-select-all", "Year slicer must disable Select All.");
  }
  evidence.yearSelection = "single and required";
}

async function validateRankings() {
  const configs = [
    ids.categoryRanking,
    ids.salesHeadRanking,
    ids.regionRanking,
  ];

  for (const id of configs) {
    const visual = await loadExecutiveVisual(id);
    const objects = visual.visual.objects;
    const labels = objects.labels?.[0]?.properties;
    if (literalValue(labels?.labelDisplayUnits) !== "'1'") {
      addIssue(
        "ranking-units",
        `${id} must disable automatic label scaling before applying the custom format.`,
      );
    }
    if (literalValue(labels?.labelPrecision) !== "1L") {
      addIssue("ranking-precision", `${id} must use one decimal place.`);
    }
    if (
      literalValue(labels?.valueCustomFormatString) !==
      "'₹0.0,,\"M\"'"
    ) {
      addIssue(
        "ranking-format",
        `${id} must use the compact ₹0.0M label format.`,
      );
    }
    if (literalValue(objects.categoryAxis?.[0]?.properties?.showAxisTitle) !== "false") {
      addIssue("ranking-category-title", `${id} has a redundant category-axis title.`);
    }
    if (literalValue(objects.valueAxis?.[0]?.properties?.showAxisTitle) !== "false") {
      addIssue("ranking-value-title", `${id} has a redundant value-axis title.`);
    }

    const dataPoint = objects.dataPoint?.[0];
    const fillRule =
      dataPoint?.properties?.fill?.solid?.color?.expr?.FillRule;
    if (fillRule?.Input?.Measure?.Property !== "Total Sales") {
      addIssue(
        "ranking-color-input",
        `${id} must derive its teal scale from Total Sales.`,
      );
    }
    const gradient = fillRule?.FillRule?.linearGradient2;
    if (
      gradient?.min?.color?.Literal?.Value !== "'#B6DEDB'" ||
      gradient?.max?.color?.Literal?.Value !== "'#0B6F6A'"
    ) {
      addIssue(
        "ranking-color-scale",
        `${id} must use the approved light-to-dark teal scale.`,
      );
    }
    if (
      dataPoint?.selector?.data?.[0]?.dataViewWildcard?.matchingOption !== 0
    ) {
      addIssue(
        "ranking-color-selector",
        `${id} must apply the colour scale to all bar instances and totals.`,
      );
    }
  }

  evidence.compactRankingLabels = configs.length;
  evidence.rankingColorPolicy = "sales-magnitude light-to-dark teal";
}

async function validateNavigation() {
  const directories = (await readdir(executiveVisuals, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory());
  let primaryLabels = 0;
  let referenceLabels = 0;

  for (const directory of directories) {
    const file = path.join(executiveVisuals, directory.name, "visual.json");
    let visual;
    try {
      visual = await readJson(file);
    } catch {
      continue;
    }

    const altText = literalValue(
      visual.visual.visualContainerObjects?.general?.[0]?.properties?.altText,
    ) ?? "";
    if (/NT_STAGE2_(DOC_)?ICON/.test(altText)) {
      addIssue(
        "navigation-icon",
        `Navigation icon remains in visual ${directory.name}.`,
      );
    }

    const textStyle =
      visual.visual.objects?.general?.[0]?.properties?.paragraphs?.[0]
        ?.textRuns?.[0]?.textStyle;
    if (/NT_UI_NAV_.*_TEXT_/.test(altText)) {
      primaryLabels += 1;
      if (
        visual.position.x !== 20 ||
        visual.position.width !== 156 ||
        textStyle?.fontSize !== "10.5pt"
      ) {
        addIssue(
          "primary-navigation-label",
          `${directory.name} must use x=20, width=156, and 10.5pt text.`,
        );
      }
    }
    if (/NT_STAGE2_DOC_TEXT/.test(altText)) {
      referenceLabels += 1;
      if (
        visual.position.x !== 20 ||
        visual.position.width !== 156 ||
        textStyle?.fontSize !== "10pt"
      ) {
        addIssue(
          "reference-navigation-label",
          `${directory.name} must use x=20, width=156, and 10pt text.`,
        );
      }
    }
  }

  if (primaryLabels !== 5 || referenceLabels !== 3) {
    addIssue(
      "navigation-label-count",
      `Expected 5 primary and 3 reference labels; found ${primaryLabels} and ${referenceLabels}.`,
    );
  }
  evidence.navigation = "icon-free; 5 primary and 3 reference labels enlarged";
}

async function validateLayout() {
  const category = await loadExecutiveVisual(ids.categoryRanking);
  const salesHead = await loadExecutiveVisual(ids.salesHeadRanking);
  const region = await loadExecutiveVisual(ids.regionRanking);
  const row = [category.position, salesHead.position, region.position];
  const expected = [
    { x: 208, y: 466, width: 374, height: 262 },
    { x: 594, y: 466, width: 440, height: 262 },
    { x: 1046, y: 466, width: 370, height: 262 },
  ];
  row.forEach((position, index) => {
    for (const property of ["x", "y", "width", "height"]) {
      if (position[property] !== expected[index][property]) {
        addIssue(
          "ranking-layout",
          `Ranking visual ${index + 1} has unexpected ${property}.`,
        );
      }
    }
  });
  if (
    row[1].x - (row[0].x + row[0].width) !== 12 ||
    row[2].x - (row[1].x + row[1].width) !== 12 ||
    row[2].x + row[2].width !== 1416
  ) {
    addIssue("ranking-grid", "Ranking row must retain 12 px gutters.");
  }
  evidence.rankingGrid = "374 / 440 / 370 px with 12 px gutters";
}

async function validateResourcesAndReferences() {
  const files = (await walk(path.join(root, "powerbi"))).filter(
    (file) => !file.includes(`${path.sep}.git${path.sep}`),
  );
  const textualFiles = files.filter((file) =>
    [".json", ".tmdl", ".pbip", ".pbir"].includes(path.extname(file)),
  );
  const text = (
    await Promise.all(textualFiles.map((file) => readFile(file, "utf8")))
  ).join("\n");

  for (const pageId of obsoletePageIds) {
    if (text.includes(pageId)) {
      addIssue("obsolete-page-reference", `Reference remains to ${pageId}.`);
    }
  }
  for (const asset of obsoleteAssets) {
    if (text.includes(asset)) {
      addIssue("obsolete-asset-reference", `Reference remains to ${asset}.`);
    }
  }

  const report = await readJson(path.join(reportRoot, "report.json"));
  const registered = report.resourcePackages.find(
    (resourcePackage) => resourcePackage.name === "RegisteredResources",
  );
  for (const item of registered.items) {
    const resourcePath = path.join(
      root,
      "powerbi",
      "NovaTrade.Report",
      "StaticResources",
      "RegisteredResources",
      item.path,
    );
    if (!files.includes(resourcePath)) {
      addIssue(
        "missing-resource",
        `Registered resource is missing: ${item.path}.`,
      );
    }
  }
  evidence.registeredResources = registered.items.length;
}

await validateJson();
await validatePages();
await validateMonthlyViews();
await validateYearSlicer();
await validateRankings();
await validateNavigation();
await validateLayout();
await validateResourcesAndReferences();

const result = {
  status: issues.length === 0 ? "passed" : "failed",
  validatedAt: new Date().toISOString(),
  issueCount: issues.length,
  evidence,
  issues,
};

const output = path.join(root, "_brief", "executive-final-qa.json");
if (writeEvidence) {
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
process.exitCode = issues.length === 0 ? 0 : 1;
