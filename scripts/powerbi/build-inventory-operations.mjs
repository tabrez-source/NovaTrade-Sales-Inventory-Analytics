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
const executiveRoot = path.join(pagesRoot, executivePageId);
const inventoryRoot = path.join(pagesRoot, inventoryPageId);
const executiveVisuals = path.join(executiveRoot, "visuals");
const salesVisuals = path.join(pagesRoot, salesPageId, "visuals");
const inventoryVisuals = path.join(inventoryRoot, "visuals");

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
  const directory = path.join(inventoryVisuals, id);
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
  const active = targetPageId === inventoryPageId;

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
      ["Inventory Movement Analysis", "Inventory Operations"],
      ["Open Inventory Movement", "Open Inventory Operations"],
      ["Go to Inventory Movement", "Go to Inventory Operations"],
    ]);
    await writeVisual(visual, `inventory-shell-${source.name}`);
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
    "inventory-header-background",
  );
  await cloneExecutiveTemplate(
    templateIds.title,
    "inventory-header-title",
    (visual) => {
      setTextbox(visual, "Inventory Operations");
      setAltText(visual, "Inventory Operations page title.");
    },
  );
  await cloneExecutiveTemplate(
    templateIds.subtitle,
    "inventory-header-subtitle",
    (visual) => {
      setTextbox(
        visual,
        "Monitor inventory receipts, outbound pressure, warehouse flow deficits and replenishment priorities.",
      );
      setAltText(
        visual,
        "Inventory Operations page purpose: identify when, where and for which products outbound inventory flow exceeds receipts.",
      );
    },
  );

  for (const [id, seed] of [
    [templateIds.prototypeChipBackground, "inventory-prototype-chip-background"],
    [templateIds.prototypeChip, "inventory-prototype-chip"],
    [templateIds.syntheticChipBackground, "inventory-synthetic-chip-background"],
    [templateIds.syntheticChip, "inventory-synthetic-chip"],
  ]) {
    await cloneExecutiveTemplate(id, seed);
  }

  await cloneExecutiveTemplate(
    templateIds.yearSlicer,
    "inventory-year-slicer",
    (visual) => {
      setAltText(
        visual,
        "Year filter. Select exactly one year to update inventory flow KPIs, trends, rankings and watchlist.",
      );
    },
  );

  await cloneExecutiveTemplate(
    templateIds.regionSlicer,
    "inventory-operational-godown-slicer",
    (visual) => {
      visual.visual.query.queryState.Values.projections = [
        columnProjection(
          "fact FactInventoryMovement",
          "MovementGodown",
          "Operational Godown",
          "Operational Godown",
        ),
      ];
      const header = visual.visual.objects?.header?.[0]?.properties;
      if (header) header.text = literal(quoted("Operational Godown"));
      setAltText(
        visual,
        "Operational Godown filter. Includes receipts at the destination godown and outbound movements from the source godown.",
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
      seed: "inventory-kpi-inward-units",
      x: 208,
      title: "Inward Units",
      measure: "Total Inward Quantity",
      tooltips: ["Total Outward Quantity", "Inbound Coverage %"],
      alt: "Units received into operational godowns for the selected filters.",
    },
    {
      seed: "inventory-kpi-outward-units",
      x: 452,
      title: "Outward Units",
      measure: "Total Outward Quantity",
      tooltips: ["Total Inward Quantity", "Net Movement Quantity"],
      alt: "Units moved outward from operational godowns for the selected filters.",
    },
    {
      seed: "inventory-kpi-net-stock-flow",
      x: 696,
      title: "Net Stock Flow",
      measure: "Net Movement Quantity",
      tooltips: ["Total Inward Quantity", "Total Outward Quantity"],
      alt: "Net stock flow calculated as inward units minus outward units. This is not stock on hand.",
    },
    {
      seed: "inventory-kpi-inbound-coverage",
      x: 940,
      title: "Inbound Coverage",
      measure: "Inbound Coverage %",
      tooltips: ["Total Inward Quantity", "Total Outward Quantity"],
      alt: "Share of outward inventory flow covered by inward receipts for the selected filters.",
    },
    {
      seed: "inventory-kpi-deficit-products",
      x: 1184,
      title: "Products with Flow Deficit",
      measure: "Products with Flow Deficit",
      tooltips: ["Net Movement Quantity", "Inbound Coverage %"],
      alt: "Count of products whose outward units exceed inward units in the selected context.",
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
      `inventory-kpi-accent-${index + 1}`,
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
    visual.visual.objects.legend[0].properties.showTitle = literal("false");
  }
}

function setQuantityBarAxis(visual, precision = 1) {
  const categoryAxis = visual.visual.objects.categoryAxis[0].properties;
  const valueAxis = visual.visual.objects.valueAxis[0].properties;
  const labels = visual.visual.objects.labels[0].properties;
  categoryAxis.showAxisTitle = literal("false");
  valueAxis.showAxisTitle = literal("false");
  valueAxis.labelDisplayUnits = literal(quoted("1000000"));
  valueAxis.labelPrecision = literal(`${precision}L`);
  labels.labelDisplayUnits = literal(quoted("1000000"));
  labels.labelPrecision = literal(`${precision}L`);
  delete labels.valueCustomFormatString;
}

async function buildMonthlyTrend() {
  const visual = clone(
    await findSalesTemplate("Monthly Sales: Selected Year vs Prior Year"),
  );
  setPosition(visual, {
    x: 208,
    y: 206,
    width: 620,
    height: 284,
    tabOrder: 30,
  });
  visual.visual.query = {
    queryState: {
      Category: {
        projections: [
          columnProjection("dim DimDate", "MonthName", "Month", "Month"),
        ],
      },
      Y: {
        projections: [
          measureProjection("Total Inward Quantity", "Inward Units"),
          measureProjection("Total Outward Quantity", "Outward Units"),
        ],
      },
      Tooltips: {
        projections: [
          measureProjection("Net Movement Quantity", "Net Stock Flow"),
          measureProjection("Inbound Coverage %", "Inbound Coverage"),
        ],
      },
    },
    sortDefinition: {
      sort: [
        {
          field: columnProjection("dim DimDate", "MonthName").field,
          direction: "Ascending",
        },
      ],
    },
  };
  setTitle(visual, "Monthly Inward vs Outward Trend");
  setAltText(
    visual,
    "Monthly line chart comparing inward and outward inventory units for the selected year and operational godown.",
  );
  const valueAxis = visual.visual.objects.valueAxis[0].properties;
  valueAxis.titleText = literal(quoted("Units"));
  valueAxis.labelDisplayUnits = literal(quoted("1000000"));
  valueAxis.labelPrecision = literal("1L");
  visual.visual.objects.lineStyles = [
    {
      properties: {
        strokeShow: literal("true"),
        strokeWidth: literal("3D"),
        strokeColor: {
          solid: { color: literal(quoted("#148D87")) },
        },
        strokeTransparency: literal("0D"),
        lineStyle: literal(quoted("solid")),
        strokeLineJoin: literal(quoted("round")),
        showMarker: literal("true"),
        markerShape: literal(quoted("circle")),
        markerSize: literal("4D"),
        markerColor: {
          solid: { color: literal(quoted("#148D87")) },
        },
        areaShow: literal("false"),
        lineChartType: literal(quoted("linear")),
      },
      selector: { metadata: "Measuress.Total Inward Quantity" },
    },
    {
      properties: {
        strokeShow: literal("true"),
        strokeWidth: literal("3D"),
        strokeColor: {
          solid: { color: literal(quoted("#C97A2B")) },
        },
        strokeTransparency: literal("0D"),
        lineStyle: literal(quoted("solid")),
        strokeLineJoin: literal(quoted("round")),
        showMarker: literal("true"),
        markerShape: literal(quoted("square")),
        markerSize: literal("4D"),
        markerColor: {
          solid: { color: literal(quoted("#C97A2B")) },
        },
        areaShow: literal("false"),
        lineChartType: literal(quoted("linear")),
      },
      selector: { metadata: "Measuress.Total Outward Quantity" },
    },
  ];
  await writeVisual(visual, "inventory-monthly-inward-outward-trend");
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
    columnProjection("dim DimProduct", "ProductName", "Product", "Product"),
    "Total Outward Quantity",
    [
      "Total Inward Quantity",
      "Net Movement Quantity",
      "Inbound Coverage %",
    ],
  );
  visual.filterConfig = {
    filters: [
      {
        name: "InventoryOperationsTop10OutwardProducts",
        field: {
          Column: {
            Expression: {
              SourceRef: { Entity: "dim DimProduct" },
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
  setTitle(visual, "Top 10 Products by Outward Units");
  setAltText(
    visual,
    "Top ten products ranked by outward inventory units, with receipts, net stock flow and inbound coverage in tooltips.",
  );
  const categoryAxis = visual.visual.objects.categoryAxis[0].properties;
  categoryAxis.preferredCategoryWidth = literal("8D");
  categoryAxis.innerPadding = literal("8L");
  categoryAxis.fontSize = literal("8D");
  categoryAxis.maxMarginFactor = literal("48L");
  setQuantityBarAxis(visual, 2);
  setSolidBarColor(visual, "#C97A2B");
  await writeVisual(visual, "inventory-top-ten-outward-products");
}

async function buildGodownFlow() {
  const visual = clone(
    await findSalesTemplate("YoY Growth by Reporting Region"),
  );
  setPosition(visual, {
    x: 208,
    y: 502,
    width: 548,
    height: 226,
    tabOrder: 32,
  });
  visual.visual.query = rankingQuery(
    columnProjection(
      "fact FactInventoryMovement",
      "MovementGodown",
      "Operational Godown",
      "Operational Godown",
    ),
    "Net Movement Quantity",
    ["Total Inward Quantity", "Total Outward Quantity", "Inbound Coverage %"],
    "Ascending",
  );
  delete visual.filterConfig;
  setTitle(visual, "Net Stock Flow by Operational Godown");
  setAltText(
    visual,
    "Ranked bar chart showing inward units minus outward units for each operational godown. Negative values indicate flow deficit, not negative stock on hand.",
  );
  setQuantityBarAxis(visual, 1);
  const categoryAxis = visual.visual.objects.categoryAxis[0].properties;
  categoryAxis.preferredCategoryWidth = literal("22D");
  categoryAxis.innerPadding = literal("18L");
  setSolidBarColor(visual, "#4F7A89");
  await writeVisual(visual, "inventory-net-flow-by-godown");
}

function containerObjectsFrom(template, title, altText) {
  const objects = clone(template.visual.visualContainerObjects);
  const wrapper = { visual: { visualContainerObjects: objects } };
  setTitle(wrapper, title);
  setAltText(wrapper, altText);
  return objects;
}

async function buildWatchlist() {
  const template = await findSalesTemplate("Top 5 Distributors by Sales");
  const values = [
    columnProjection("dim DimProduct", "ProductName", "Product", "Product"),
    columnProjection(
      "fact FactInventoryMovement",
      "MovementGodown",
      "Godown",
      "Godown",
    ),
    measureProjection("Total Inward Quantity", "Inward", "Inward"),
    measureProjection("Total Outward Quantity", "Outward", "Outward"),
    measureProjection("Net Movement Quantity", "Net Flow", "Net Flow"),
    measureProjection("Inbound Coverage %", "Coverage", "Coverage"),
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
          Values: { projections: values },
        },
        sortDefinition: {
          sort: [
            {
              field: measureProjection("Net Movement Quantity").field,
              direction: "Ascending",
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
              defaultColumnWidth: literal("78D"),
              wordWrap: literal("false"),
            },
          },
        ],
        columnFormatting: [
          ...[
            "Measuress.Total Inward Quantity",
            "Measuress.Total Outward Quantity",
            "Measuress.Net Movement Quantity",
          ].map((metadata) => ({
            properties: {
              labelDisplayUnits: literal(quoted("1000000")),
              labelPrecision: literal("2L"),
              alignment: literal(quoted("Right")),
              styleHeader: literal("true"),
              styleValues: literal("true"),
              styleTotal: literal("true"),
            },
            selector: { metadata },
          })),
        ],
        columnWidth: [
          {
            properties: { value: literal("145D") },
            selector: { metadata: "dim DimProduct.ProductName" },
          },
          {
            properties: { value: literal("112D") },
            selector: {
              metadata: "fact FactInventoryMovement.MovementGodown",
            },
          },
          {
            properties: { value: literal("72D") },
            selector: { metadata: "Measuress.Total Inward Quantity" },
          },
          {
            properties: { value: literal("72D") },
            selector: { metadata: "Measuress.Total Outward Quantity" },
          },
          {
            properties: { value: literal("78D") },
            selector: { metadata: "Measuress.Net Movement Quantity" },
          },
          {
            properties: { value: literal("70D") },
            selector: { metadata: "Measuress.Inbound Coverage %" },
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
            properties: { wordWrap: literal("false") },
          },
        ],
        total: [
          {
            properties: { totals: literal("false") },
          },
        ],
      },
      visualContainerObjects: containerObjectsFrom(
        template,
        "Replenishment Watchlist",
        "Product and operational-godown watchlist ranked by the largest stock-flow deficit, with inward, outward, net flow and inbound coverage.",
      ),
      drillFilterOtherVisuals: true,
    },
  };
  await writeVisual(visual, "inventory-replenishment-watchlist");
}

async function buildFooter() {
  await cloneExecutiveTemplate(
    templateIds.footerBackground,
    "inventory-footer-background",
  );
  await cloneExecutiveTemplate(
    templateIds.footerText,
    "inventory-footer-text",
    (visual) => {
      setTextbox(
        visual,
        "Source limit: transfers and authoritative opening stock are unavailable. Net Stock Flow = inward − outward; it is not Stock on Hand.",
      );
      setAltText(
        visual,
        "Inventory source limitation: no transfer rows or authoritative opening-stock snapshot are available; net stock flow must not be interpreted as stock on hand.",
      );
    },
  );
}

async function updateInventoryMeasures() {
  let measures = await readFile(measuresFile, "utf8");
  if (measures.includes("measure 'Inbound Coverage %' =")) return;

  const marker = "\tmeasure 'Total Movement Quantity' =";
  if (!measures.includes(marker)) {
    throw new Error("Could not find the inventory-measure insertion point.");
  }

  const inventoryMeasures = `\tmeasure 'Inbound Coverage %' =\n\n\t\t\tDIVIDE ( [Total Inward Quantity], [Total Outward Quantity] )\n\t\tformatString: 0.00%;-0.00%;0.00%\n\t\tdisplayFolder: 09_Inventory Operations\n\t\tlineageTag: 7b0fe7e3-4622-4a47-9664-b44d5866db71\n\n\tmeasure 'Products with Flow Deficit' =\n\n\t\t\tVAR ProductFlow =\n\t\t\t    FILTER (\n\t\t\t        ADDCOLUMNS (\n\t\t\t            VALUES ( 'dim DimProduct'[ProductKey] ),\n\t\t\t            \"@NetFlow\", CALCULATE ( [Net Movement Quantity] )\n\t\t\t        ),\n\t\t\t        [@NetFlow] < 0\n\t\t\t    )\n\t\t\tRETURN\n\t\t\tCOUNTROWS ( ProductFlow )\n\t\tformatString: 0\n\t\tdisplayFolder: 09_Inventory Operations\n\t\tlineageTag: 8d842cab-cac1-419c-a40f-eb8a8866b997\n\n`;

  measures = measures.replace(marker, `${inventoryMeasures}${marker}`);
  await writeFile(measuresFile, measures, "utf8");
}

async function updatePageMetadata() {
  const pageFile = path.join(inventoryRoot, "page.json");
  const executivePage = await readJson(
    path.join(executiveRoot, "page.json"),
  );
  const page = await readJson(pageFile);
  page.displayName = "Inventory Operations";
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
        ["Inventory Movement Analysis", "Inventory Operations"],
        ["Open Inventory Movement", "Open Inventory Operations"],
        ["Go to Inventory Movement", "Go to Inventory Operations"],
      ]);
      const after = JSON.stringify(visual);
      if (after !== before) {
        await writeFile(file, `${JSON.stringify(visual, null, 2)}\n`, "utf8");
      }
    }
  }
}

async function main() {
  await updateInventoryMeasures();
  await rm(inventoryVisuals, { recursive: true, force: true });
  await mkdir(inventoryVisuals, { recursive: true });

  await buildShell();
  await buildHeader();
  await buildKpiRow();
  await buildMonthlyTrend();
  await buildTopProducts();
  await buildGodownFlow();
  await buildWatchlist();
  await buildFooter();
  await updatePageMetadata();
  await updateCrossPageNavigationLabels();

  const count = (
    await readdir(inventoryVisuals, { withFileTypes: true })
  ).filter((entry) => entry.isDirectory()).length;
  console.log(
    `Built Inventory Operations page ${inventoryPageId} with ${count} visuals.`,
  );
}

await main();
