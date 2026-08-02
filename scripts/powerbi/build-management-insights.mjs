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
const measuresFile = path.join(
  root,
  "powerbi",
  "NovaTrade.SemanticModel",
  "definition",
  "tables",
  "Measuress.tmdl",
);
const executivePageId = "57f63e365ec04b378b4b";
const salesPageId = "97dd004d959bc353cfef";
const inventoryPageId = "6e63e51a13c0cbcb29b1";
const managementPageId = "0833d451cbce4704acf3";
const executiveRoot = path.join(pagesRoot, executivePageId);
const managementRoot = path.join(pagesRoot, managementPageId);
const executiveVisuals = path.join(executiveRoot, "visuals");
const salesVisuals = path.join(pagesRoot, salesPageId, "visuals");
const inventoryVisuals = path.join(pagesRoot, inventoryPageId, "visuals");
const managementVisuals = path.join(managementRoot, "visuals");

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
  inventoryTable: "60cbdf65c8d1dc44",
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
        Expression: { SourceRef: { Entity: "Measuress" } },
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
        Expression: { SourceRef: { Entity: entity } },
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
  visual.position = { ...visual.position, ...position };
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
  const directory = path.join(managementVisuals, id);
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
  const entries = await readdir(salesVisuals, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const visual = await readJson(
      path.join(salesVisuals, entry.name, "visual.json"),
    );
    if (titleOf(visual) === title) return visual;
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
  const active = targetPageId === managementPageId;

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
        solid: { color: literal(quoted("#2D4158")) },
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
      ["Inventory Movement Analysis", "Inventory Operations"],
      ["Inventory Movement", "Inventory Operations"],
      ["Open Inventory Movement", "Open Inventory Operations"],
      ["Go to Inventory Movement", "Go to Inventory Operations"],
    ]);
    await writeVisual(visual, `management-shell-${source.name}`);
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
    "management-header-background",
  );
  await cloneExecutiveTemplate(
    templateIds.title,
    "management-header-title",
    (visual) => {
      setTextbox(visual, "Management Decision Center");
      setAltText(visual, "Management Decision Center page title.");
    },
  );
  await cloneExecutiveTemplate(
    templateIds.subtitle,
    "management-header-subtitle",
    (visual) => {
      setTextbox(
        visual,
        "Prioritize growth, territory governance and replenishment exceptions with traceable evidence.",
      );
      setAltText(
        visual,
        "Management page purpose: identify measurable exceptions, quantify exposure, assign ownership and support follow-up action.",
      );
    },
  );

  for (const [id, seed] of [
    [templateIds.prototypeChipBackground, "management-prototype-chip-background"],
    [templateIds.prototypeChip, "management-prototype-chip"],
    [templateIds.syntheticChipBackground, "management-synthetic-chip-background"],
    [templateIds.syntheticChip, "management-synthetic-chip"],
  ]) {
    await cloneExecutiveTemplate(id, seed);
  }

  await cloneExecutiveTemplate(
    templateIds.yearSlicer,
    "management-year-slicer",
    (visual) => {
      setAltText(
        visual,
        "Year filter. Select exactly one year for a comparable year-over-year management review.",
      );
    },
  );

  await cloneExecutiveTemplate(
    templateIds.regionSlicer,
    "management-category-slicer",
    (visual) => {
      visual.visual.query.queryState.Values.projections = [
        columnProjection(
          "dim DimProduct",
          "CategoryName",
          "Product Category",
          "Product Category",
        ),
      ];
      const header = visual.visual.objects?.header?.[0]?.properties;
      if (header) header.text = literal(quoted("Product Category"));
      setAltText(
        visual,
        "Product Category filter. Updates both sales and inventory evidence on this page.",
      );
    },
  );
}

function cardQuery(primary, tooltips = []) {
  return {
    queryState: {
      Data: { projections: [measureProjection(primary)] },
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
      seed: "management-kpi-yoy-growth",
      x: 208,
      title: "YoY Sales Growth",
      measure: "YoY Sales Change %",
      tooltips: ["Total Sales", "Previous Year Sales", "YoY Sales Change"],
      alt: "Year-over-year sales growth for the selected filters.",
    },
    {
      seed: "management-kpi-growing-flow-risk-products",
      x: 452,
      title: "Growing Products at Flow Risk",
      measure: "Growing Products at Flow Risk",
      tooltips: ["Revenue at Flow Risk", "Revenue at Flow Risk %"],
      alt: "Count of products with positive year-over-year sales growth and negative net stock flow.",
    },
    {
      seed: "management-kpi-flow-risk-revenue",
      x: 696,
      title: "Flow-Risk Revenue Share",
      measure: "Revenue at Flow Risk %",
      tooltips: ["Revenue at Flow Risk", "Total Sales"],
      alt: "Share of selected revenue generated by growing products with negative net stock flow.",
    },
    {
      seed: "management-kpi-cross-region-exposure",
      x: 940,
      title: "Cross-Region Exposure",
      measure: "Cross Region Sales %",
      tooltips: [
        "Cross Region Sales",
        "Assigned-Region Sales",
        "Previous Year Cross Region Sales %",
        "Cross Region Exposure Change",
        "Total Sales",
      ],
      alt: "Share of selected revenue sold outside the distributor reporting region.",
    },
    {
      seed: "management-kpi-declining-revenue-exposure",
      x: 1184,
      title: "Declining Revenue Exposure",
      measure: "Declining Product Revenue %",
      tooltips: [
        "Declining Product Revenue",
        "Declining Products",
        "Total Sales",
      ],
      alt: "Share of selected revenue generated by products with negative year-over-year sales growth.",
    },
  ];

  for (let index = 0; index < cards.length; index += 1) {
    const card = cards[index];
    await cloneExecutiveTemplate(
      index === 2
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
      `management-kpi-accent-${index + 1}`,
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

function rankingQuery(category, measure, tooltips, direction = "Descending") {
  return {
    queryState: {
      Category: { projections: [category] },
      Y: { projections: [measureProjection(measure)] },
      Tooltips: {
        projections: tooltips.map((item) => measureProjection(item)),
      },
    },
    sortDefinition: {
      sort: [
        {
          field: measureProjection(measure).field,
          direction,
        },
      ],
      isDefaultSort: true,
    },
  };
}

function setSolidBarColor(visual, color) {
  visual.visual.objects.dataPoint = [
    {
      properties: {
        fill: { solid: { color: literal(quoted(color)) } },
      },
      selector: {
        data: [{ dataViewWildcard: { matchingOption: 0 } }],
      },
    },
  ];
}

function setRevenueBarAxis(visual) {
  const valueAxis = visual.visual.objects?.valueAxis?.[0]?.properties;
  if (valueAxis) {
    valueAxis.labelDisplayUnits = literal(quoted("1000000000"));
    valueAxis.labelPrecision = literal("2L");
    valueAxis.titleText = literal(quoted("Revenue at Flow Risk"));
  }
  const labels = visual.visual.objects?.labels?.[0]?.properties;
  if (labels) {
    labels.labelDisplayUnits = literal(quoted("1000000000"));
    labels.labelPrecision = literal("2L");
  }
  const categoryAxis = visual.visual.objects?.categoryAxis?.[0]?.properties;
  if (categoryAxis) {
    categoryAxis.titleText = literal(quoted("Product Category"));
  }
}

function setPercentBarAxis(visual) {
  const valueAxis = visual.visual.objects?.valueAxis?.[0]?.properties;
  if (valueAxis) {
    valueAxis.labelDisplayUnits = literal(quoted("1"));
    valueAxis.labelPrecision = literal("1L");
    valueAxis.titleText = literal(quoted("YoY Sales Growth"));
  }
  const labels = visual.visual.objects?.labels?.[0]?.properties;
  if (labels) {
    labels.labelDisplayUnits = literal(quoted("1"));
    labels.labelPrecision = literal("1L");
    labels.valueCustomFormatString = literal(quoted("0.0%;-0.0%;0.0%"));
  }
  const categoryAxis = visual.visual.objects?.categoryAxis?.[0]?.properties;
  if (categoryAxis) {
    categoryAxis.titleText = literal(quoted("Sales Head"));
  }
}

async function buildFlowRiskByCategory() {
  const visual = clone(await findSalesTemplate("Top 5 Distributors by Sales"));
  replaceStrings(visual, [
    ["Measuress.Total Sales", "Measuress.Revenue at Flow Risk"],
    ["Total Sales", "Revenue at Flow Risk"],
  ]);
  setPosition(visual, {
    x: 208,
    y: 206,
    width: 596,
    height: 260,
    tabOrder: 30,
  });
  visual.visual.query = rankingQuery(
    columnProjection(
      "dim DimProduct",
      "CategoryName",
      "Product Category",
      "Product Category",
    ),
    "Revenue at Flow Risk",
    [
      "Revenue at Flow Risk %",
      "Growing Products at Flow Risk",
      "Total Sales",
      "YoY Sales Change %",
      "Inbound Coverage %",
      "Net Movement Quantity",
    ],
  );
  delete visual.filterConfig;
  setTitle(visual, "Flow-Risk Revenue by Category");
  setAltText(
    visual,
    "Product categories ranked by revenue generated from growing products whose net stock flow is negative.",
  );
  setRevenueBarAxis(visual);
  setSolidBarColor(visual, "#C9911A");
  await writeVisual(visual, "management-flow-risk-revenue-by-category");
}

async function buildSalesHeadGrowth() {
  const visual = clone(
    await findSalesTemplate("YoY Growth by Reporting Region"),
  );
  setPosition(visual, {
    x: 816,
    y: 206,
    width: 600,
    height: 260,
    tabOrder: 31,
  });
  visual.visual.query = rankingQuery(
    columnProjection(
      "dim DimSalesHead",
      "SalesHeadName",
      "Sales Head",
      "Sales Head",
    ),
    "YoY Sales Change %",
    [
      "Total Sales",
      "Previous Year Sales",
      "Cross Region Sales %",
      "Previous Year Cross Region Sales %",
      "Cross Region Exposure Change",
      "Active Distributors",
      "Sales per Active Distributor",
    ],
  );
  delete visual.filterConfig;
  setTitle(visual, "YoY Sales Growth by Sales Head");
  setAltText(
    visual,
    "Sales Heads ranked by year-over-year sales growth, with revenue, distributor productivity and cross-region exposure available in tooltips.",
  );
  setPercentBarAxis(visual);
  await writeVisual(visual, "management-yoy-growth-by-sales-head");
}

function containerObjectsFrom(template, title, altText) {
  const objects = clone(template.visual.visualContainerObjects);
  const wrapper = { visual: { visualContainerObjects: objects } };
  setTitle(wrapper, title);
  setAltText(wrapper, altText);
  return objects;
}

async function buildActionQueue() {
  const template = await readJson(
    path.join(
      inventoryVisuals,
      templateIds.inventoryTable,
      "visual.json",
    ),
  );
  const values = [
    columnProjection("dim DimProduct", "ProductName", "Product", "Product"),
    columnProjection(
      "dim DimProduct",
      "CategoryName",
      "Category",
      "Category",
    ),
    measureProjection("Management Action", "Action", "Action"),
    measureProjection("Total Sales", "Sales", "Sales"),
    measureProjection("YoY Sales Change %", "YoY Growth", "YoY Growth"),
    measureProjection("Inbound Coverage %", "Inbound Coverage", "Inbound Coverage"),
    measureProjection("Net Movement Quantity", "Net Flow", "Net Flow"),
  ];
  const visual = {
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: "",
    position: {
      x: 208,
      y: 478,
      z: 17100,
      height: 250,
      width: 1208,
      tabOrder: 32,
    },
    visual: {
      visualType: "tableEx",
      query: {
        queryState: { Values: { projections: values } },
        sortDefinition: {
          sort: [
            {
              field: measureProjection("Management Action").field,
              direction: "Ascending",
            },
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
              defaultColumnWidth: literal("110D"),
              wordWrap: literal("false"),
            },
          },
        ],
        columnFormatting: [
          {
            properties: {
              labelDisplayUnits: literal(quoted("1000000000")),
              labelPrecision: literal("2L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: { metadata: "Measuress.Total Sales" },
          },
          {
            properties: {
              labelDisplayUnits: literal(quoted("1")),
              labelPrecision: literal("1L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: { metadata: "Measuress.YoY Sales Change %" },
          },
          {
            properties: {
              labelDisplayUnits: literal(quoted("1")),
              labelPrecision: literal("1L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: { metadata: "Measuress.Inbound Coverage %" },
          },
          {
            properties: {
              labelDisplayUnits: literal(quoted("1000000")),
              labelPrecision: literal("1L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: { metadata: "Measuress.Net Movement Quantity" },
          },
        ],
        columnWidth: [
          {
            properties: { value: literal("190D") },
            selector: { metadata: "dim DimProduct.ProductName" },
          },
          {
            properties: { value: literal("145D") },
            selector: { metadata: "dim DimProduct.CategoryName" },
          },
          {
            properties: { value: literal("240D") },
            selector: { metadata: "Measuress.Management Action" },
          },
          {
            properties: { value: literal("120D") },
            selector: { metadata: "Measuress.Total Sales" },
          },
          {
            properties: { value: literal("105D") },
            selector: { metadata: "Measuress.YoY Sales Change %" },
          },
          {
            properties: { value: literal("135D") },
            selector: { metadata: "Measuress.Inbound Coverage %" },
          },
          {
            properties: { value: literal("105D") },
            selector: { metadata: "Measuress.Net Movement Quantity" },
          },
        ],
        grid: [
          {
            properties: {
              gridVertical: literal("false"),
              gridHorizontal: literal("true"),
              rowPadding: literal("3D"),
            },
          },
        ],
        values: [{ properties: { wordWrap: literal("false") } }],
        total: [{ properties: { totals: literal("false") } }],
      },
      visualContainerObjects: containerObjectsFrom(
        template,
        "Management Action Queue",
        "Product action queue ordered by deterministic management priority, with sales growth and inventory-flow evidence shown in the same row.",
      ),
      drillFilterOtherVisuals: true,
    },
  };
  await writeVisual(visual, "management-action-queue");
}

async function buildFooter() {
  await cloneExecutiveTemplate(
    templateIds.footerBackground,
    "management-footer-background",
  );
  await cloneExecutiveTemplate(
    templateIds.footerText,
    "management-footer-text",
    (visual) => {
      setTextbox(
        visual,
        "Rule: Flow risk = positive YoY product growth + negative Net Stock Flow. It signals replenishment pressure, not a stockout; opening stock and Stock on Hand are unavailable. Select one Year for comparable YoY evidence.",
      );
      setAltText(
        visual,
        "Management decision-rule note: flow risk combines positive year-over-year product sales growth with negative net stock flow. It is not proof of a stockout because opening stock and stock on hand are unavailable.",
      );
    },
  );
}

async function updateManagementMeasures() {
  let measures = await readFile(measuresFile, "utf8");
  if (measures.includes("measure 'Growing Products at Flow Risk' =")) return;

  const marker = "\tmeasure 'Inbound Coverage %' =";
  if (!measures.includes(marker)) {
    throw new Error("Could not find the management-measure insertion point.");
  }

  const managementMeasures = `\tmeasure 'Growing Products at Flow Risk' =\n\n\t\t\tVAR ProductSignals =\n\t\t\t    ADDCOLUMNS (\n\t\t\t        VALUES ( 'dim DimProduct'[ProductKey] ),\n\t\t\t        \"@Revenue\", CALCULATE ( [Total Sales] ),\n\t\t\t        \"@Growth\", CALCULATE ( [YoY Sales Change %] ),\n\t\t\t        \"@NetFlow\", CALCULATE ( [Net Movement Quantity] )\n\t\t\t    )\n\t\t\tRETURN\n\t\t\tCOUNTROWS (\n\t\t\t    FILTER (\n\t\t\t        ProductSignals,\n\t\t\t        NOT ISBLANK ( [@Revenue] )\n\t\t\t            && NOT ISBLANK ( [@Growth] )\n\t\t\t            && NOT ISBLANK ( [@NetFlow] )\n\t\t\t            && [@Growth] > 0\n\t\t\t            && [@NetFlow] < 0\n\t\t\t    )\n\t\t\t)\n\t\tformatString: 0\n\t\tdisplayFolder: 10_Management Decision Center\n\t\tlineageTag: 0b7c0246-6c7a-44c7-a2ae-a166b6d6ca0e\n\n\tmeasure 'Revenue at Flow Risk' =\n\n\t\t\tVAR ProductSignals =\n\t\t\t    ADDCOLUMNS (\n\t\t\t        VALUES ( 'dim DimProduct'[ProductKey] ),\n\t\t\t        \"@Revenue\", CALCULATE ( [Total Sales] ),\n\t\t\t        \"@Growth\", CALCULATE ( [YoY Sales Change %] ),\n\t\t\t        \"@NetFlow\", CALCULATE ( [Net Movement Quantity] )\n\t\t\t    )\n\t\t\tRETURN\n\t\t\tSUMX (\n\t\t\t    FILTER (\n\t\t\t        ProductSignals,\n\t\t\t        NOT ISBLANK ( [@Revenue] )\n\t\t\t            && NOT ISBLANK ( [@Growth] )\n\t\t\t            && NOT ISBLANK ( [@NetFlow] )\n\t\t\t            && [@Growth] > 0\n\t\t\t            && [@NetFlow] < 0\n\t\t\t    ),\n\t\t\t    [@Revenue]\n\t\t\t)\n\t\tformatString: \"₹\"#,0.00;#,0.00\\ -\"₹\";\"₹\"#,0.00\n\t\tdisplayFolder: 10_Management Decision Center\n\t\tlineageTag: 1756922f-3e83-4441-a950-26aac53f5c4c\n\n\t\tannotation PBI_FormatHint = {\"currencyCulture\":\"hi-IN\"}\n\n\tmeasure 'Revenue at Flow Risk %' =\n\n\t\t\tDIVIDE ( [Revenue at Flow Risk], [Total Sales] )\n\t\tformatString: 0.00%;-0.00%;0.00%\n\t\tdisplayFolder: 10_Management Decision Center\n\t\tlineageTag: 42fb3f4d-3afb-4b35-92f1-dff79644fca3\n\n\tmeasure 'Management Action' =\n\n\t\t\tVAR ProductRevenue =\n\t\t\t    [Total Sales]\n\t\t\tVAR GrowthRate =\n\t\t\t    [YoY Sales Change %]\n\t\t\tVAR NetFlow =\n\t\t\t    [Net Movement Quantity]\n\t\t\tRETURN\n\t\t\tSWITCH (\n\t\t\t    TRUE (),\n\t\t\t    ISBLANK ( ProductRevenue ), BLANK (),\n\t\t\t    NOT ISBLANK ( GrowthRate )\n\t\t\t        && GrowthRate > 0\n\t\t\t        && NetFlow < 0, \"1 · Replenish & protect growth\",\n\t\t\t    NOT ISBLANK ( GrowthRate )\n\t\t\t        && GrowthRate < 0, \"2 · Recover demand\",\n\t\t\t    \"3 · Monitor\"\n\t\t\t)\n\t\tdisplayFolder: 10_Management Decision Center\n\t\tlineageTag: 74cc8bce-9339-45ea-b15f-62bff642126d\n\n`;

  measures = measures.replace(marker, `${managementMeasures}${marker}`);
  await writeFile(measuresFile, measures, "utf8");
}

async function updateDecliningMeasures() {
  let measures = await readFile(measuresFile, "utf8");
  if (measures.includes("measure 'Declining Product Revenue %' =")) return;

  const marker = "\tmeasure 'Management Action' =";
  if (!measures.includes(marker)) {
    throw new Error("Could not find the declining-measure insertion point.");
  }

  const decliningMeasures = `\tmeasure 'Declining Products' =

\t\t\tVAR ProductSignals =
\t\t\t    ADDCOLUMNS (
\t\t\t        VALUES ( 'dim DimProduct'[ProductKey] ),
\t\t\t        "@Revenue", CALCULATE ( [Total Sales] ),
\t\t\t        "@Growth", CALCULATE ( [YoY Sales Change %] )
\t\t\t    )
\t\t\tRETURN
\t\t\tCOUNTROWS (
\t\t\t    FILTER (
\t\t\t        ProductSignals,
\t\t\t        NOT ISBLANK ( [@Revenue] )
\t\t\t            && NOT ISBLANK ( [@Growth] )
\t\t\t            && [@Growth] < 0
\t\t\t    )
\t\t\t)
\t\tformatString: 0
\t\tdisplayFolder: 10_Management Decision Center
\t\tlineageTag: 0e295672-28d9-4455-a6f1-f3b22144e5d5

\tmeasure 'Declining Product Revenue' =

\t\t\tVAR ProductSignals =
\t\t\t    ADDCOLUMNS (
\t\t\t        VALUES ( 'dim DimProduct'[ProductKey] ),
\t\t\t        "@Revenue", CALCULATE ( [Total Sales] ),
\t\t\t        "@Growth", CALCULATE ( [YoY Sales Change %] )
\t\t\t    )
\t\t\tRETURN
\t\t\tSUMX (
\t\t\t    FILTER (
\t\t\t        ProductSignals,
\t\t\t        NOT ISBLANK ( [@Revenue] )
\t\t\t            && NOT ISBLANK ( [@Growth] )
\t\t\t            && [@Growth] < 0
\t\t\t    ),
\t\t\t    [@Revenue]
\t\t\t)
\t\tformatString: "₹"#,0.00;#,0.00\\ -"₹";"₹"#,0.00
\t\tdisplayFolder: 10_Management Decision Center
\t\tlineageTag: b366a15c-3af1-4224-b199-d7eaa3206853

\t\tannotation PBI_FormatHint = {"currencyCulture":"hi-IN"}

\tmeasure 'Declining Product Revenue %' =

\t\t\tDIVIDE ( [Declining Product Revenue], [Total Sales] )
\t\tformatString: 0.00%;-0.00%;0.00%
\t\tdisplayFolder: 10_Management Decision Center
\t\tlineageTag: 292a45f3-e8b0-4a8a-b389-6ec9086952ea

`;

  measures = measures.replace(marker, `${decliningMeasures}${marker}`);
  await writeFile(measuresFile, measures, "utf8");
}

async function updateGovernanceMeasures() {
  let measures = await readFile(measuresFile, "utf8");
  if (measures.includes("measure 'Cross Region Exposure Change' =")) return;

  const marker = "\tmeasure 'Management Action' =";
  if (!measures.includes(marker)) {
    throw new Error("Could not find the governance-measure insertion point.");
  }

  const governanceMeasures = `\tmeasure 'Previous Year Cross Region Sales %' =

\t\t\tCALCULATE (
\t\t\t    [Cross Region Sales %],
\t\t\t    SAMEPERIODLASTYEAR ( 'dim DimDate'[FullDate] )
\t\t\t)
\t\tformatString: 0.00%;-0.00%;0.00%
\t\tdisplayFolder: 10_Management Decision Center
\t\tlineageTag: 50c22d03-452e-41d5-9273-ef8b38931c18

\tmeasure 'Cross Region Exposure Change' =

\t\t\tVAR PriorYearShare =
\t\t\t    [Previous Year Cross Region Sales %]
\t\t\tRETURN
\t\t\tIF (
\t\t\t    ISBLANK ( PriorYearShare ),
\t\t\t    BLANK (),
\t\t\t    [Cross Region Sales %] - PriorYearShare
\t\t\t)
\t\tformatString: 0.00%;-0.00%;0.00%
\t\tdisplayFolder: 10_Management Decision Center
\t\tlineageTag: 201c91f8-2f55-48a3-9419-48b967b3ebba

`;

  measures = measures.replace(marker, `${governanceMeasures}${marker}`);
  await writeFile(measuresFile, measures, "utf8");
}

async function updatePageMetadata() {
  const pageFile = path.join(managementRoot, "page.json");
  const executivePage = await readJson(path.join(executiveRoot, "page.json"));
  const page = await readJson(pageFile);
  page.displayName = "Management Insights";
  page.objects = clone(executivePage.objects);
  await writeFile(pageFile, `${JSON.stringify(page, null, 2)}\n`, "utf8");
}

async function main() {
  await updateManagementMeasures();
  await updateDecliningMeasures();
  await updateGovernanceMeasures();
  await rm(managementVisuals, { recursive: true, force: true });
  await mkdir(managementVisuals, { recursive: true });

  await buildShell();
  await buildHeader();
  await buildKpiRow();
  await buildFlowRiskByCategory();
  await buildSalesHeadGrowth();
  await buildActionQueue();
  await buildFooter();
  await updatePageMetadata();

  const count = (
    await readdir(managementVisuals, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
  console.log(
    `Built Management Insights page ${managementPageId} with ${count} visuals.`,
  );
}

await main();
