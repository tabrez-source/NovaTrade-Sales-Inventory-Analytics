#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const pagesRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
  "pages",
);
const executivePageId = "57f63e365ec04b378b4b";
const salesPageId = "97dd004d959bc353cfef";
const executiveRoot = path.join(pagesRoot, executivePageId);
const salesRoot = path.join(pagesRoot, salesPageId);
const executiveVisuals = path.join(executiveRoot, "visuals");
const salesVisuals = path.join(salesRoot, "visuals");

const templateIds = {
  headerBackground: "2e5d825f66e89ecb",
  title: "2dc35cc73f3b7be4",
  subtitle: "d608993a879cfc23",
  prototypeChip: "2abb00474541b410",
  prototypeChipBackground: "2ca4a7e2a7a0463a",
  syntheticChip: "0a20b909c15b4a56",
  syntheticChipBackground: "6f942d256f6edcc3",
  yearSlicer: "4045a6ffb8100702",
  regionSlicer: "7419fa310624fdff",
  totalSalesCard: "dab956e4dea30777",
  salesOrdersCard: "2ecb4cbc4c336e75",
  averageOrderValueCard: "89095a97ff9df36c",
  activeDistributorsCard: "85ec041f05521bb1",
  accents: [
    "ed0475318c875ec6",
    "8aec449dc73518a2",
    "e0deb587fc725487",
    "63bac66df0d7b0f2",
    "68b9802f6e0e63fa",
  ],
  monthlySales: "35295e3fe4369375",
  monthlyTerritoryMix: "91cc18e048e53159",
  regionRanking: "912762d404f7e63e",
  salesHeadRanking: "5718a21de2ee5fa6",
  topCategories: "a6cd0f341d75fea9",
  footerBackground: "b3aca13e578bf54a",
  footerText: "6deba4df210b1ed5",
};

function visualId(seed) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readTemplate(id) {
  return readJson(path.join(executiveVisuals, id, "visual.json"));
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function quoted(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function measureProjection(property, nativeQueryRef = property) {
  return {
    field: {
      Measure: {
        Expression: {
          SourceRef: {
            Entity: "Measuress",
          },
        },
        Property: property,
      },
    },
    queryRef: `Measuress.${property}`,
    nativeQueryRef,
    active: true,
  };
}

function columnProjection(
  entity,
  property,
  nativeQueryRef = property,
  displayName = undefined,
) {
  return {
    field: {
      Column: {
        Expression: {
          SourceRef: {
            Entity: entity,
          },
        },
        Property: property,
      },
    },
    queryRef: `${entity}.${property}`,
    nativeQueryRef,
    active: true,
    ...(displayName ? { displayName } : {}),
  };
}

function setTextbox(visual, value) {
  visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0].value =
    value;
}

function setTitle(visual, value) {
  visual.visual.visualContainerObjects.title[0].properties.text =
    literal(quoted(value));
}

function setAltText(visual, value) {
  const general =
    visual.visual.visualContainerObjects.general ??
    (visual.visual.visualContainerObjects.general = [
      { properties: {} },
    ]);
  general[0].properties.altText = literal(quoted(value));
}

function setPosition(visual, position) {
  visual.position = {
    ...visual.position,
    ...position,
  };
}

function replaceStrings(value, replacements) {
  if (typeof value === "string") {
    let output = value;
    for (const [from, to] of replacements) {
      output = output.replaceAll(from, to);
    }
    return output;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, replacements));
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      value[key] = replaceStrings(item, replacements);
    }
  }
  return value;
}

async function writeVisual(visual, seed) {
  const id = visualId(seed);
  visual.name = id;
  const directory = path.join(salesVisuals, id);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "visual.json"),
    `${JSON.stringify(visual, null, 2)}\n`,
    "utf8",
  );
  return id;
}

function updateNavigationState(visual) {
  const serialized = JSON.stringify(visual);
  const marker = serialized.match(
    /NT_UI_NAV_([a-f0-9]+)_(SHAPE|TEXT)_(ACTIVE|INACTIVE)/,
  );
  if (!marker) return;

  const [, targetPageId, kind] = marker;
  const active = targetPageId === salesPageId;

  replaceStrings(visual, [
    [`_${kind}_ACTIVE`, `_${kind}_${active ? "ACTIVE" : "INACTIVE"}`],
    [`_${kind}_INACTIVE`, `_${kind}_${active ? "ACTIVE" : "INACTIVE"}`],
  ]);

  if (kind === "SHAPE") {
    const objects = visual.visual.objects;
    objects.fill[0].properties.fillColor.solid.color =
      literal(quoted(active ? "#A8CF24" : "#172436"));
    objects.outline[0].properties.show = literal(active ? "false" : "true");
    if (!active) {
      objects.outline[0].properties.lineColor = {
        solid: {
          color: literal(quoted("#2D4158")),
        },
      };
    }
  }

  if (kind === "TEXT") {
    const textRun =
      visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0];
    textRun.textStyle.fontWeight = active ? "bold" : "normal";
    textRun.textStyle.color = active ? "#061A2E" : "#F4F7FA";
  }
}

async function buildShell() {
  const entries = await readdir(executiveVisuals, { withFileTypes: true });
  const shell = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const visual = await readTemplate(entry.name);
    if ((visual.position?.x ?? 9999) >= 196) continue;
    shell.push(visual);
  }

  shell.sort(
    (left, right) =>
      (left.position?.z ?? 0) - (right.position?.z ?? 0),
  );

  for (const source of shell) {
    const visual = clone(source);
    updateNavigationState(visual);
    replaceStrings(visual, [
      ["Sales Analysis", "Sales Performance"],
      ["Open Sales Analysis", "Open Sales Performance"],
      ["Go to Sales Analysis", "Go to Sales Performance"],
    ]);
    await writeVisual(visual, `sales-shell-${source.name}`);
  }
}

async function cloneTemplate(id, seed, mutate = () => {}) {
  const visual = clone(await readTemplate(id));
  mutate(visual);
  await writeVisual(visual, seed);
}

async function buildHeader() {
  await cloneTemplate(
    templateIds.headerBackground,
    "sales-header-background",
  );
  await cloneTemplate(templateIds.title, "sales-header-title", (visual) => {
    setTextbox(visual, "Sales Performance");
    setAltText(visual, "Sales Performance page title.");
  });
  await cloneTemplate(
    templateIds.subtitle,
    "sales-header-subtitle",
    (visual) => {
      setTextbox(
        visual,
        "Track momentum, territory execution, sales ownership and distributor concentration.",
      );
      setAltText(
        visual,
        "Sales Performance page purpose: monitor movement and diagnose commercial drivers.",
      );
    },
  );

  for (const [id, seed] of [
    [templateIds.prototypeChipBackground, "sales-prototype-chip-background"],
    [templateIds.prototypeChip, "sales-prototype-chip"],
    [templateIds.syntheticChipBackground, "sales-synthetic-chip-background"],
    [templateIds.syntheticChip, "sales-synthetic-chip"],
  ]) {
    await cloneTemplate(id, seed);
  }

  await cloneTemplate(
    templateIds.yearSlicer,
    "sales-year-slicer",
    (visual) => {
      setAltText(
        visual,
        "Year filter. Select exactly one year; the monthly comparison uses the prior year automatically.",
      );
    },
  );

  await cloneTemplate(
    templateIds.regionSlicer,
    "sales-reporting-region-slicer",
    (visual) => {
      visual.visual.query.queryState.Values.projections = [
        columnProjection(
          "dim DimDistributor",
          "ReportingRegionName",
          "ReportingRegion",
          "Reporting Region",
        ),
      ];
      setAltText(
        visual,
        "Reporting Region filter using corrected West, South, North and East branch mappings.",
      );
    },
  );
}

function cardQuery(primary, tooltips = []) {
  return {
    queryState: {
      Data: {
        projections: [measureProjection(primary)],
      },
      ...(tooltips.length
        ? {
            Tooltips: {
              projections: tooltips.map((measure) =>
                measureProjection(measure),
              ),
            },
          }
        : {}),
    },
  };
}

async function buildKpiRow() {
  const cards = [
    {
      template: templateIds.totalSalesCard,
      seed: "sales-kpi-total-sales",
      x: 208,
      title: "Total Sales",
      measure: "Total Sales",
      tooltips: ["Previous Year Sales", "YoY Sales Change %"],
      alt: "Total Sales for the selected year and reporting-region filters.",
    },
    {
      template: templateIds.salesOrdersCard,
      seed: "sales-kpi-sales-orders",
      x: 452,
      title: "Sales Orders",
      measure: "Sales Order Count",
      tooltips: ["Total Sales", "Average Order Value"],
      alt: "Distinct sales orders for the selected filters.",
    },
    {
      template: templateIds.averageOrderValueCard,
      seed: "sales-kpi-average-order-value",
      x: 696,
      title: "Average Order Value",
      measure: "Average Order Value",
      tooltips: ["Total Sales", "Sales Order Count"],
      alt: "Average sales value per distinct order for the selected filters.",
    },
    {
      template: templateIds.totalSalesCard,
      seed: "sales-kpi-yoy-growth",
      x: 940,
      title: "YoY Sales Growth",
      measure: "YoY Sales Growth Display",
      tooltips: ["Total Sales", "Previous Year Sales", "YoY Sales Change"],
      alt: "Year-over-year sales growth for the selected filters. N/A means the selected period has no prior-year sales.",
    },
    {
      template: templateIds.activeDistributorsCard,
      seed: "sales-kpi-active-distributors",
      x: 1184,
      title: "Active Distributors",
      measure: "Active Distributors",
      tooltips: ["Total Sales", "Sales per Active Distributor"],
      alt: "Distinct distributors with sales in the selected filters.",
    },
  ];

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    await cloneTemplate(card.template, card.seed, (visual) => {
      setPosition(visual, {
        x: card.x,
        y: 100,
        width: 232,
        height: 94,
        tabOrder: 20 + index,
      });
      visual.visual.query = cardQuery(card.measure, card.tooltips);
      setTitle(visual, card.title);
      setAltText(visual, card.alt);
    });
  }

  const accentXs = [208, 452, 696, 940, 1184];
  for (let index = 0; index < templateIds.accents.length; index += 1) {
    await cloneTemplate(
      templateIds.accents[index],
      `sales-kpi-accent-${index + 1}`,
      (visual) => {
        setPosition(visual, {
          x: accentXs[index],
          y: 100,
          width: 232,
          height: 4,
        });
      },
    );
  }
}

function setMeasureTooltips(visual, measures) {
  visual.visual.query.queryState.Tooltips = {
    projections: measures.map((measure) => measureProjection(measure)),
  };
}

async function buildMonthlySales() {
  await cloneTemplate(
    templateIds.monthlySales,
    "sales-monthly-sales-vs-prior-year",
    (visual) => {
      setPosition(visual, {
        x: 208,
        y: 206,
        width: 620,
        height: 248,
        tabOrder: 30,
      });
      visual.visual.query.queryState.Y.projections = [
        measureProjection("Total Sales", "Selected Year Sales"),
        measureProjection("Previous Year Sales", "Prior Year Sales"),
      ];
      setMeasureTooltips(visual, [
        "YoY Sales Change",
        "YoY Sales Change %",
        "Sales Order Count",
        "Average Order Value",
      ]);
      setTitle(visual, "Monthly Sales: Selected Year vs Prior Year");
      setAltText(
        visual,
        "Line chart comparing selected-year and prior-year sales across January to December.",
      );

      const legend = visual.visual.objects.legend[0].properties;
      legend.show = literal("true");
      legend.position = literal(quoted("Top"));
      legend.showTitle = literal("false");

      const baseLine =
        visual.visual.objects.lineStyles?.[0] ?? { properties: {} };
      const selectedYear = clone(baseLine);
      selectedYear.selector = { metadata: "Measuress.Total Sales" };
      selectedYear.properties.strokeColor = {
        solid: { color: literal(quoted("#148D87")) },
      };
      selectedYear.properties.markerColor = {
        solid: { color: literal(quoted("#148D87")) },
      };
      selectedYear.properties.lineStyle = literal(quoted("solid"));
      selectedYear.properties.markerShape = literal(quoted("circle"));

      const priorYear = clone(baseLine);
      priorYear.selector = { metadata: "Measuress.Previous Year Sales" };
      priorYear.properties.strokeColor = {
        solid: { color: literal(quoted("#4F7A89")) },
      };
      priorYear.properties.markerColor = {
        solid: { color: literal(quoted("#4F7A89")) },
      };
      priorYear.properties.lineStyle = literal(quoted("dashed"));
      priorYear.properties.markerShape = literal(quoted("square"));

      visual.visual.objects.lineStyles = [selectedYear, priorYear];
      const axis = visual.visual.objects.valueAxis[0].properties;
      axis.showAxisTitle = literal("false");
      axis.labelDisplayUnits = literal(quoted("1000000"));
      axis.labelPrecision = literal("1L");
    },
  );
}

async function buildTerritoryMix() {
  await cloneTemplate(
    templateIds.monthlyTerritoryMix,
    "sales-monthly-territory-mix",
    (visual) => {
      setPosition(visual, {
        x: 840,
        y: 206,
        width: 576,
        height: 248,
        tabOrder: 31,
      });
      setMeasureTooltips(visual, [
        "Cross Region Sales %",
        "Sales Order Count",
        "Average Order Value",
      ]);
      setTitle(visual, "Assigned vs Cross-Region Sales by Month");
      setAltText(
        visual,
        "Monthly column chart splitting sales fulfilled inside the assigned region and across regions.",
      );
      const axis = visual.visual.objects.valueAxis[0].properties;
      axis.showAxisTitle = literal("false");
      axis.labelDisplayUnits = literal(quoted("1000000"));
      axis.labelPrecision = literal("1L");
    },
  );
}

function rankingQuery(category, tooltips, measure = "Total Sales") {
  return {
    queryState: {
      Category: {
        projections: [category],
      },
      Y: {
        projections: [measureProjection(measure)],
      },
      Tooltips: {
        projections: tooltips.map((measure) => measureProjection(measure)),
      },
    },
    sortDefinition: {
      sort: [
        {
          field: measureProjection(measure).field,
          direction: "Descending",
        },
      ],
      isDefaultSort: true,
    },
  };
}

function setBarAxisTitle(visual, title) {
  visual.visual.objects.categoryAxis[0].properties.titleText =
    literal(quoted(title));
  visual.visual.objects.categoryAxis[0].properties.showAxisTitle =
    literal("false");
  visual.visual.objects.valueAxis[0].properties.showAxisTitle =
    literal("false");
  visual.visual.objects.valueAxis[0].properties.labelDisplayUnits =
    literal(quoted("1000000"));
  visual.visual.objects.valueAxis[0].properties.labelPrecision =
    literal("1L");
}

function setPercentBarAxis(visual, title) {
  const categoryAxis = visual.visual.objects.categoryAxis[0].properties;
  const valueAxis = visual.visual.objects.valueAxis[0].properties;
  const labels = visual.visual.objects.labels[0].properties;

  categoryAxis.titleText = literal(quoted(title));
  categoryAxis.showAxisTitle = literal("false");
  valueAxis.showAxisTitle = literal("false");
  valueAxis.titleText = literal(quoted("YoY Growth"));
  valueAxis.labelDisplayUnits = literal(quoted("1"));
  valueAxis.labelPrecision = literal("1L");
  labels.labelDisplayUnits = literal(quoted("1"));
  labels.labelPrecision = literal("1L");
  labels.valueCustomFormatString = literal(
    quoted("0.0%;-0.0%;0.0%"),
  );
}

async function buildRegionRanking() {
  // Chart contract: compare signed selected-year growth across the four
  // reporting regions; sort descending, label percentages directly, and
  // preserve an honest blank state when no prior-year period exists.
  await cloneTemplate(
    templateIds.regionRanking,
    "sales-region-ranking",
    (visual) => {
      setPosition(visual, {
        x: 208,
        y: 466,
        width: 374,
        height: 262,
        tabOrder: 32,
      });
      visual.visual.query = rankingQuery(
        columnProjection(
          "dim DimDistributor",
          "ReportingRegionName",
          "Reporting Region",
        ),
        [
          "Total Sales",
          "Previous Year Sales",
          "Region Sales Contribution %",
          "Cross Region Sales %",
          "Active Distributors",
        ],
        "YoY Sales Change %",
      );
      delete visual.filterConfig;
      setTitle(visual, "YoY Growth by Reporting Region");
      setAltText(
        visual,
        "Ranked bar chart comparing year-over-year sales growth across corrected West, South, North and East reporting regions. Blank bars mean no prior-year comparison is available.",
      );
      setPercentBarAxis(visual, "Reporting Region");

      const dataPoint =
        visual.visual.objects.dataPoint?.[0]?.properties?.fill?.solid
          ?.color?.expr?.FillRule;
      if (dataPoint) {
        dataPoint.Input.Measure.Property = "YoY Sales Change %";
        dataPoint.FillRule.linearGradient2.min.color.Literal.Value =
          "'#D8EEEE'";
        dataPoint.FillRule.linearGradient2.max.color.Literal.Value =
          "'#0B6F6A'";
      }
    },
  );
}

async function buildSalesHeadRanking() {
  await cloneTemplate(
    templateIds.salesHeadRanking,
    "sales-head-ranking",
    (visual) => {
      setPosition(visual, {
        x: 594,
        y: 466,
        width: 400,
        height: 262,
        tabOrder: 33,
      });
      visual.visual.query = rankingQuery(
        columnProjection(
          "dim DimSalesHead",
          "SalesHeadName",
          "Sales Head",
        ),
        [
          "Sales Head Sales Contribution %",
          "YoY Sales Change %",
          "Sales Order Count",
          "Cross Region Sales %",
        ],
      );
      delete visual.filterConfig;
      setTitle(visual, "Sales by Sales Head");
      setAltText(
        visual,
        "Ranked bar chart comparing sales-head performance with contribution, growth, orders and cross-region exposure in tooltips.",
      );
      setBarAxisTitle(visual, "Sales Head");
    },
  );
}

async function buildTopDistributors() {
  await cloneTemplate(
    templateIds.topCategories,
    "sales-top-five-distributors",
    (visual) => {
      setPosition(visual, {
        x: 1006,
        y: 466,
        width: 410,
        height: 262,
        tabOrder: 34,
      });
      visual.visual.query = rankingQuery(
        columnProjection(
          "dim DimDistributor",
          "DistributorName",
          "Distributor",
        ),
        [
          "Distributor Sales Contribution %",
          "YoY Sales Change %",
          "Sales Order Count",
          "Average Order Value",
        ],
      );
      visual.filterConfig = {
        filters: [
          {
            name: "SalesPerformanceTop5Distributors",
            field: {
              Column: {
                Expression: {
                  SourceRef: {
                    Entity: "dim DimDistributor",
                  },
                },
                Property: "DistributorName",
              },
            },
            type: "VisualTopN",
            filter: {
              Version: 2,
              From: [
                {
                  Name: "d",
                  Entity: "dim DimDistributor",
                  Type: 0,
                },
              ],
              Where: [
                {
                  Condition: {
                    VisualTopN: {
                      ItemCount: 5,
                    },
                  },
                },
              ],
            },
            howCreated: "User",
            isHiddenInViewMode: true,
            isLockedInViewMode: true,
          },
        ],
      };
      setTitle(visual, "Top 5 Distributors by Sales");
      setAltText(
        visual,
        "Top five distributors ranked by sales, responsive to the selected year and reporting region.",
      );
      setBarAxisTitle(visual, "Distributor");
      visual.visual.objects.categoryAxis[0].properties.maxMarginFactor =
        literal("52L");
    },
  );
}

async function buildFooter() {
  await cloneTemplate(
    templateIds.footerBackground,
    "sales-footer-background",
  );
  await cloneTemplate(templateIds.footerText, "sales-footer-text", (visual) => {
    setTextbox(
      visual,
      "Filters apply to every visual. YoY shows N/A when no prior-year period exists; hover rankings for diagnostic context.",
    );
    setAltText(
      visual,
      "Sales Performance usage note: filters apply across the page, N/A means no prior-year comparison, and tooltips provide diagnostic context.",
    );
  });
}

async function updatePageMetadata() {
  const pageFile = path.join(salesRoot, "page.json");
  const executivePage = await readJson(
    path.join(executiveRoot, "page.json"),
  );
  const page = await readJson(pageFile);
  page.displayName = "Sales Performance";
  page.objects = clone(executivePage.objects);
  await writeFile(pageFile, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

async function updateCrossPageNavigationLabels() {
  const pageEntries = await readdir(pagesRoot, { withFileTypes: true });
  for (const pageEntry of pageEntries) {
    if (!pageEntry.isDirectory()) continue;
    const visualsDirectory = path.join(
      pagesRoot,
      pageEntry.name,
      "visuals",
    );
    let visualEntries = [];
    try {
      visualEntries = await readdir(visualsDirectory, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }

    for (const visualEntry of visualEntries) {
      if (!visualEntry.isDirectory()) continue;
      const file = path.join(
        visualsDirectory,
        visualEntry.name,
        "visual.json",
      );
      const visual = await readJson(file);
      const before = JSON.stringify(visual);
      replaceStrings(visual, [
        ["Sales Analysis", "Sales Performance"],
        ["Open Sales Analysis", "Open Sales Performance"],
        ["Go to Sales Analysis", "Go to Sales Performance"],
      ]);
      const after = JSON.stringify(visual);
      if (after !== before) {
        await writeFile(file, `${JSON.stringify(visual, null, 2)}\n`, "utf8");
      }
    }
  }
}

async function main() {
  await rm(salesVisuals, { recursive: true, force: true });
  await mkdir(salesVisuals, { recursive: true });

  await buildShell();
  await buildHeader();
  await buildKpiRow();
  await buildMonthlySales();
  await buildTerritoryMix();
  await buildRegionRanking();
  await buildSalesHeadRanking();
  await buildTopDistributors();
  await buildFooter();
  await updatePageMetadata();
  await updateCrossPageNavigationLabels();

  const count = (
    await readdir(salesVisuals, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
  console.log(
    `Built Sales Performance page ${salesPageId} with ${count} visuals.`,
  );
}

await main();
