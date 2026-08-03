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
const productPageId = "0c293fb867ead9beb4cc";
const executiveRoot = path.join(pagesRoot, executivePageId);
const productRoot = path.join(pagesRoot, productPageId);
const executiveVisuals = path.join(executiveRoot, "visuals");
const salesVisuals = path.join(pagesRoot, salesPageId, "visuals");
const productVisuals = path.join(productRoot, "visuals");

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
  averageOrderValueCard: "89095a97ff9df36c",
  accents: [
    "ed0475318c875ec6",
    "8aec449dc73518a2",
    "e0deb587fc725487",
    "63bac66df0d7b0f2",
    "68b9802f6e0e63fa",
  ],
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

async function readExecutiveTemplate(id) {
  return readJson(path.join(executiveVisuals, id, "visual.json"));
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function quoted(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function measureProjection(
  property,
  nativeQueryRef = property,
  displayName = undefined,
) {
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
    ...(displayName ? { displayName } : {}),
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
  const directory = path.join(productVisuals, id);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "visual.json"),
    `${JSON.stringify(visual, null, 2)}\n`,
    "utf8",
  );
  return id;
}

function titleOf(visual) {
  return visual.visual?.visualContainerObjects?.title?.[0]?.properties?.text
    ?.expr?.Literal?.Value?.replace(/^'|'$/g, "");
}

async function findSalesTemplate(title) {
  const polishedTitleAliases = new Map([
    ["YoY Growth by Reporting Region", "YoY Sales Growth by Reporting Region"],
    ["Top 5 Distributors by Sales", "Top 5 Distributors by Revenue"],
  ]);
  const acceptedTitles = new Set([
    title,
    ...(polishedTitleAliases.has(title)
      ? [polishedTitleAliases.get(title)]
      : []),
  ]);
  const entries = await readdir(salesVisuals, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const visual = await readJson(
      path.join(salesVisuals, entry.name, "visual.json"),
    );
    if (acceptedTitles.has(titleOf(visual))) return visual;
  }
  throw new Error(`Could not find Sales Performance template: ${title}`);
}

function updateNavigationState(visual) {
  const serialized = JSON.stringify(visual);
  const marker = serialized.match(
    /NT_UI_NAV_([a-f0-9]+)_(SHAPE|TEXT)_(ACTIVE|INACTIVE)/,
  );
  if (!marker) return;

  const [, targetPageId, kind] = marker;
  const active = targetPageId === productPageId;

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
    const visual = await readExecutiveTemplate(entry.name);
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
      ["Product Analysis", "Product Performance"],
      ["Open Product Analysis", "Open Product Performance"],
      ["Go to Product Analysis", "Go to Product Performance"],
    ]);
    await writeVisual(visual, `product-shell-${source.name}`);
  }
}

async function cloneExecutiveTemplate(id, seed, mutate = () => {}) {
  const visual = clone(await readExecutiveTemplate(id));
  mutate(visual);
  await writeVisual(visual, seed);
}

async function buildHeader() {
  await cloneExecutiveTemplate(
    templateIds.headerBackground,
    "product-header-background",
  );
  await cloneExecutiveTemplate(
    templateIds.title,
    "product-header-title",
    (visual) => {
      setTextbox(visual, "Product Performance");
      setAltText(visual, "Product Performance page title.");
    },
  );
  await cloneExecutiveTemplate(
    templateIds.subtitle,
    "product-header-subtitle",
    (visual) => {
      setTextbox(
        visual,
        "Assess portfolio coverage, category momentum, revenue concentration and price-volume positioning.",
      );
      setAltText(
        visual,
        "Product Performance page purpose: identify the products and categories that drive value, growth and portfolio risk.",
      );
    },
  );

  for (const [id, seed] of [
    [templateIds.prototypeChipBackground, "product-prototype-chip-background"],
    [templateIds.prototypeChip, "product-prototype-chip"],
    [templateIds.syntheticChipBackground, "product-synthetic-chip-background"],
    [templateIds.syntheticChip, "product-synthetic-chip"],
  ]) {
    await cloneExecutiveTemplate(id, seed);
  }

  await cloneExecutiveTemplate(
    templateIds.yearSlicer,
    "product-year-slicer",
    (visual) => {
      setAltText(
        visual,
        "Year filter. Select exactly one year; category growth uses the prior year automatically.",
      );
    },
  );

  await cloneExecutiveTemplate(
    templateIds.regionSlicer,
    "product-reporting-region-slicer",
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
      seed: "product-kpi-revenue",
      x: 208,
      title: "Product Revenue",
      measure: "Total Sales",
      tooltips: ["Previous Year Sales", "YoY Sales Change %"],
      alt: "Revenue generated by products for the selected year and reporting-region filters.",
    },
    {
      seed: "product-kpi-units",
      x: 452,
      title: "Units Sold",
      measure: "Total Quantity Sold",
      tooltips: ["Total Sales", "Average Selling Price"],
      alt: "Total product units sold for the selected filters.",
    },
    {
      seed: "product-kpi-coverage",
      x: 696,
      title: "Product Coverage",
      measure: "Product Coverage Display",
      tooltips: [
        "Distinct Products Sold",
        "Product Catalog Count",
        "Product Coverage %",
      ],
      alt: "Products sold out of the full product catalog, including the coverage rate.",
    },
    {
      seed: "product-kpi-average-selling-price",
      x: 940,
      title: "Average Selling Price",
      measure: "Average Selling Price",
      tooltips: ["Total Sales", "Total Quantity Sold"],
      alt: "Revenue per unit sold for the selected filters.",
    },
    {
      seed: "product-kpi-top-category-share",
      x: 1184,
      title: "Top Category Revenue Share",
      measure: "Top Category Revenue Share",
      tooltips: ["Total Sales", "Distinct Products Sold"],
      alt: "Share of selected product revenue generated by the leading category.",
    },
  ];

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    await cloneExecutiveTemplate(
      index === 3
        ? templateIds.averageOrderValueCard
        : templateIds.totalSalesCard,
      card.seed,
      (visual) => {
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
      },
    );
  }

  const accentXs = [208, 452, 696, 940, 1184];
  for (let index = 0; index < templateIds.accents.length; index += 1) {
    await cloneExecutiveTemplate(
      templateIds.accents[index],
      `product-kpi-accent-${index + 1}`,
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

function rankingQuery(category, measure, tooltips) {
  return {
    queryState: {
      Category: {
        projections: [category],
      },
      Y: {
        projections: [measureProjection(measure)],
      },
      Tooltips: {
        projections: tooltips.map((item) => measureProjection(item)),
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

function setPercentBarAxis(visual) {
  const categoryAxis = visual.visual.objects.categoryAxis[0].properties;
  const valueAxis = visual.visual.objects.valueAxis[0].properties;
  const labels = visual.visual.objects.labels[0].properties;

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

function setRevenueBarAxis(visual) {
  visual.visual.objects.categoryAxis[0].properties.showAxisTitle =
    literal("false");
  visual.visual.objects.valueAxis[0].properties.showAxisTitle =
    literal("false");
  visual.visual.objects.valueAxis[0].properties.labelDisplayUnits =
    literal(quoted("1000000"));
  visual.visual.objects.valueAxis[0].properties.labelPrecision =
    literal("1L");
  visual.visual.objects.categoryAxis[0].properties.maxMarginFactor =
    literal("48L");
}

function setSolidBarColor(visual, color = "#0B6F6A") {
  visual.visual.objects.dataPoint = [
    {
      properties: {
        fill: {
          solid: {
            color: literal(quoted(color)),
          },
        },
      },
      selector: {
        data: [
          {
            dataViewWildcard: {
              matchingOption: 0,
            },
          },
        ],
      },
    },
  ];

  if (visual.visual.objects.legend?.[0]?.properties) {
    visual.visual.objects.legend[0].properties.show = literal("false");
    visual.visual.objects.legend[0].properties.showTitle =
      literal("false");
  }
}

async function buildCategoryGrowth() {
  const visual = clone(
    await findSalesTemplate("YoY Growth by Reporting Region"),
  );
  setPosition(visual, {
    x: 208,
    y: 206,
    width: 620,
    height: 284,
    tabOrder: 30,
  });
  visual.visual.query = rankingQuery(
    columnProjection(
      "dim DimProduct",
      "CategoryName",
      "Category",
      "Category",
    ),
    "YoY Sales Change %",
    [
      "Total Sales",
      "Previous Year Sales",
      "Category Sales Contribution %",
      "Total Quantity Sold",
      "Average Selling Price",
    ],
  );
  delete visual.filterConfig;
  setTitle(visual, "Category YoY Growth");
  setAltText(
    visual,
    "Ranked bar chart comparing year-over-year sales growth across product categories. Blank bars mean no prior-year comparison is available.",
  );
  setPercentBarAxis(visual);
  setSolidBarColor(visual);

  await writeVisual(visual, "product-category-yoy-growth");
}

async function buildTopProducts() {
  const visual = clone(
    await findSalesTemplate("Top 5 Distributors by Sales"),
  );
  setPosition(visual, {
    x: 840,
    y: 206,
    width: 576,
    height: 284,
    tabOrder: 31,
  });
  visual.visual.query = rankingQuery(
    columnProjection(
      "dim DimProduct",
      "ProductName",
      "Product",
      "Product",
    ),
    "Total Sales",
    [
      "Product Portfolio Contribution %",
      "YoY Sales Change %",
      "Total Quantity Sold",
      "Average Selling Price",
    ],
  );
  visual.filterConfig = {
    filters: [
      {
        name: "ProductPerformanceTop10Products",
        field: {
          Column: {
            Expression: {
              SourceRef: {
                Entity: "dim DimProduct",
              },
            },
            Property: "ProductName",
          },
        },
        type: "VisualTopN",
        filter: {
          Version: 2,
          From: [
            {
              Name: "p",
              Entity: "dim DimProduct",
              Type: 0,
            },
          ],
          Where: [
            {
              Condition: {
                VisualTopN: {
                  ItemCount: 10,
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
  setTitle(visual, "Top 10 Products by Revenue");
  setAltText(
    visual,
    "Top ten products ranked by revenue, with portfolio share, growth, units and average selling price in tooltips.",
  );
  setRevenueBarAxis(visual);
  const categoryAxis =
    visual.visual.objects.categoryAxis[0].properties;
  categoryAxis.preferredCategoryWidth = literal("8D");
  categoryAxis.innerPadding = literal("8L");
  categoryAxis.fontSize = literal("8D");

  const labels = visual.visual.objects.labels[0].properties;
  labels.labelDisplayUnits = literal(quoted("1000000"));
  labels.labelPrecision = literal("2L");
  delete labels.valueCustomFormatString;
  setSolidBarColor(visual);
  await writeVisual(visual, "product-top-ten-products");
}

function visualContainerObjects(title, altText) {
  return {
    title: [
      {
        properties: {
          show: literal("true"),
          text: literal(quoted(title)),
        },
      },
    ],
    general: [
      {
        properties: {
          altText: literal(quoted(altText)),
        },
      },
    ],
  };
}

async function buildPriceVolumeMatrix() {
  const visual = {
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: "",
    position: {
      x: 208,
      y: 502,
      z: 17000,
      height: 226,
      width: 548,
      tabOrder: 32,
    },
    visual: {
      visualType: "scatterChart",
      query: {
        queryState: {
          Category: {
            projections: [
              columnProjection(
                "dim DimProduct",
                "CategoryName",
                "Category",
                "Category",
              ),
            ],
          },
          Series: {
            projections: [
              columnProjection(
                "dim DimProduct",
                "CategoryName",
                "Category",
                "Category",
              ),
            ],
          },
          X: {
            projections: [
              measureProjection("Total Quantity Sold", "Units Sold"),
            ],
          },
          Y: {
            projections: [
              measureProjection("Average Selling Price", "ASP"),
            ],
          },
          Size: {
            projections: [
              measureProjection("Total Sales", "Product Revenue"),
            ],
          },
          Tooltips: {
            projections: [
              measureProjection(
                "Category Sales Contribution %",
                "Revenue Share",
              ),
              measureProjection("YoY Sales Change %", "YoY Growth"),
              measureProjection(
                "Distinct Products Sold",
                "Products Sold",
              ),
            ],
          },
        },
      },
      objects: {
        legend: [
          {
            properties: {
              show: literal("true"),
              showTitle: literal("false"),
              position: literal(quoted("RightCenter")),
              fontSize: literal("8D"),
            },
          },
        ],
        categoryLabels: [
          {
            properties: {
              show: literal("false"),
              bold: literal("false"),
            },
          },
        ],
        colorByCategory: [
          {
            properties: {
              show: literal("true"),
            },
          },
        ],
        bubbles: [
          {
            properties: {
              bubbleSize: literal("42L"),
              markerRangeType: literal(quoted("dataRange")),
              preventOverflow: literal("true"),
            },
          },
        ],
        categoryAxis: [
          {
            properties: {
              show: literal("true"),
              showAxisTitle: literal("true"),
              titleText: literal(quoted("Units Sold")),
              labelDisplayUnits: literal(quoted("1000000")),
              labelPrecision: literal("1L"),
            },
          },
        ],
        valueAxis: [
          {
            properties: {
              show: literal("true"),
              showAxisTitle: literal("true"),
              titleText: literal(quoted("Average Selling Price")),
              labelDisplayUnits: literal(quoted("1")),
              labelPrecision: literal("0L"),
            },
          },
        ],
      },
      visualContainerObjects: visualContainerObjects(
        "Category Price–Volume Matrix",
        "Six-category bubble chart comparing units sold and average selling price. Bubble size represents sales revenue and the visible legend identifies each category.",
      ),
      drillFilterOtherVisuals: true,
    },
  };

  await writeVisual(visual, "product-category-price-volume-matrix");
}

async function buildPortfolioTable() {
  const values = [
    columnProjection(
      "dim DimProduct",
      "ProductName",
      "Product",
      "Product",
    ),
    columnProjection(
      "dim DimProduct",
      "CategoryName",
      "Category",
      "Category",
    ),
    measureProjection("Total Sales", "Revenue", "Revenue"),
    measureProjection("Total Quantity Sold", "Units", "Units"),
    measureProjection("Average Selling Price", "ASP", "ASP"),
    measureProjection(
      "Product Portfolio Contribution %",
      "Revenue Share",
      "Share",
    ),
    measureProjection(
      "YoY Sales Change %",
      "YoY Growth",
      "YoY",
    ),
  ];
  const visual = {
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: "",
    position: {
      x: 768,
      y: 502,
      z: 17100,
      height: 226,
      width: 648,
      tabOrder: 33,
    },
    visual: {
      visualType: "tableEx",
      query: {
        queryState: {
          Values: {
            projections: values,
          },
        },
        sortDefinition: {
          sort: [
            {
              field: measureProjection("Total Sales").field,
              direction: "Descending",
            },
          ],
          isDefaultSort: true,
        },
      },
      objects: {
        columnHeaders: [
          {
            properties: {
              bold: literal("true"),
              autoSizeColumnWidth: literal("false"),
              columnAdjustment: literal(quoted("fixedWidth")),
              customColumnWidth: literal("true"),
              defaultColumnWidth: literal("76D"),
              wordWrap: literal("false"),
            },
          },
        ],
        columnFormatting: [
          {
            properties: {
              labelDisplayUnits: literal(quoted("1000000")),
              labelPrecision: literal("2L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: {
              metadata: "Measuress.Total Sales",
            },
          },
        ],
        columnWidth: [
          {
            properties: {
              value: literal("142D"),
            },
            selector: {
              metadata: "dim DimProduct.ProductName",
            },
          },
          {
            properties: {
              value: literal("104D"),
            },
            selector: {
              metadata: "dim DimProduct.CategoryName",
            },
          },
          {
            properties: {
              value: literal("76D"),
            },
            selector: {
              metadata: "Measuress.Total Sales",
            },
          },
          {
            properties: {
              value: literal("58D"),
            },
            selector: {
              metadata: "Measuress.Total Quantity Sold",
            },
          },
          {
            properties: {
              value: literal("60D"),
            },
            selector: {
              metadata: "Measuress.Average Selling Price",
            },
          },
          {
            properties: {
              value: literal("58D"),
            },
            selector: {
              metadata:
                "Measuress.Product Portfolio Contribution %",
            },
          },
          {
            properties: {
              value: literal("56D"),
            },
            selector: {
              metadata: "Measuress.YoY Sales Change %",
            },
          },
        ],
        grid: [
          {
            properties: {
              gridVertical: literal("false"),
              gridHorizontal: literal("true"),
              rowPadding: literal("2D"),
            },
          },
        ],
        values: [
          {
            properties: {
              wordWrap: literal("false"),
            },
          },
        ],
        total: [
          {
            properties: {
              totals: literal("false"),
            },
          },
        ],
      },
      visualContainerObjects: visualContainerObjects(
        "Product Portfolio Detail",
        "Scrollable product table ranked by revenue, with category, units, average selling price, revenue share and year-over-year growth.",
      ),
      drillFilterOtherVisuals: true,
    },
  };

  await writeVisual(visual, "product-portfolio-detail");
}

async function buildFooter() {
  await cloneExecutiveTemplate(
    templateIds.footerBackground,
    "product-footer-background",
  );
  await cloneExecutiveTemplate(
    templateIds.footerText,
    "product-footer-text",
    (visual) => {
      setTextbox(
        visual,
        "Filters apply page-wide. Category bubbles compare price and volume; size represents revenue. Hover for share, growth and units.",
      );
      setAltText(
        visual,
        "Product Performance usage note: filters apply across the page; each bubble is a category and its size represents revenue.",
      );
    },
  );
}

async function updatePageMetadata() {
  const pageFile = path.join(productRoot, "page.json");
  const executivePage = await readJson(
    path.join(executiveRoot, "page.json"),
  );
  const page = await readJson(pageFile);
  page.displayName = "Product Performance";
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
        ["Product Analysis", "Product Performance"],
        ["Open Product Analysis", "Open Product Performance"],
        ["Go to Product Analysis", "Go to Product Performance"],
      ]);
      const after = JSON.stringify(visual);
      if (after !== before) {
        await writeFile(file, `${JSON.stringify(visual, null, 2)}\n`, "utf8");
      }
    }
  }
}

async function main() {
  await rm(productVisuals, { recursive: true, force: true });
  await mkdir(productVisuals, { recursive: true });

  await buildShell();
  await buildHeader();
  await buildKpiRow();
  await buildCategoryGrowth();
  await buildTopProducts();
  await buildPriceVolumeMatrix();
  await buildPortfolioTable();
  await buildFooter();
  await updatePageMetadata();
  await updateCrossPageNavigationLabels();

  const count = (
    await readdir(productVisuals, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
  console.log(
    `Built Product Performance page ${productPageId} with ${count} visuals.`,
  );
}

await main();
