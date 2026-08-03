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

const pageIds = {
  executive: "57f63e365ec04b378b4b",
  validation: "046c19d6b1632318bc76",
  model: "1f4b43e6cf3bae8af6ab",
  logic: "8aceecd42b8f434b7f79",
};

const pageDefinitions = {
  validation: {
    id: pageIds.validation,
    displayName: "DAX & Measures Validation",
    referenceMarker: "DAX & Measures",
  },
  model: {
    id: pageIds.model,
    displayName: "Data Model Overview",
    referenceMarker: "Data Model Overview",
  },
  logic: {
    id: pageIds.logic,
    displayName: "Business Logic & Notes",
    referenceMarker: "Business Logic & Notes",
  },
};

const executiveRoot = path.join(pagesRoot, pageIds.executive);
const executiveVisuals = path.join(executiveRoot, "visuals");

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
  card: "dab956e4dea30777",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function visualId(seed) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function quoted(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function setPosition(visual, position) {
  visual.position = { ...visual.position, ...position };
}

function setTextbox(visual, value) {
  visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0].value =
    value;
}

function setTitle(visual, value) {
  visual.visual.visualContainerObjects.title[0].properties.text = literal(
    quoted(value),
  );
}

function setAltText(visual, value) {
  const general =
    visual.visual.visualContainerObjects.general ??
    (visual.visual.visualContainerObjects.general = [{ properties: {} }]);
  general[0].properties.altText = literal(quoted(value));
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

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readExecutiveTemplate(id) {
  return readJson(path.join(executiveVisuals, id, "visual.json"));
}

function genericContainerObjects(altText) {
  return {
    general: [
      {
        properties: {
          altText: literal(quoted(altText)),
        },
      },
    ],
    visualHeader: [
      {
        properties: {
          show: literal("false"),
        },
      },
    ],
    dropShadow: [
      {
        properties: {
          show: literal("false"),
        },
      },
    ],
  };
}

function makeShape({
  x,
  y,
  width,
  height,
  fill = "#FFFCF7",
  outline = "#D9D4C8",
  outlineShow = true,
  z = 100,
  tabOrder,
  altText,
}) {
  return {
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: "pending",
    position: {
      x,
      y,
      width,
      height,
      z,
      ...(tabOrder === undefined ? {} : { tabOrder }),
    },
    visual: {
      visualType: "shape",
      objects: {
        shape: [
          {
            properties: {
              tileShape: literal(quoted("rectangle")),
            },
          },
        ],
        rotation: [
          {
            properties: {
              shapeAngle: literal("0L"),
            },
          },
        ],
        fill: [
          {
            properties: {
              fillColor: {
                solid: { color: literal(quoted(fill)) },
              },
            },
            selector: { id: "default" },
          },
        ],
        outline: [
          {
            properties: {
              show: literal(outlineShow ? "true" : "false"),
              ...(outlineShow
                ? {
                    lineColor: {
                      solid: { color: literal(quoted(outline)) },
                    },
                  }
                : {}),
            },
            selector: { id: "default" },
          },
        ],
        shadow: [
          {
            properties: {
              show: literal("false"),
            },
          },
        ],
      },
      visualContainerObjects: genericContainerObjects(altText),
      drillFilterOtherVisuals: true,
    },
    howCreated: "InsertVisualButton",
  };
}

function makeTextbox({
  x,
  y,
  width,
  height,
  paragraphs,
  z = 110,
  tabOrder,
  altText,
  background = false,
}) {
  const normalized = paragraphs.map((paragraph) => ({
    textRuns: [
      {
        value: paragraph.text,
        textStyle: {
          fontFamily: paragraph.fontFamily ?? "'Segoe UI'",
          fontSize: paragraph.fontSize ?? "10pt",
          color: paragraph.color ?? "#17334A",
          ...(paragraph.bold ? { fontWeight: "bold" } : {}),
          ...(paragraph.italic ? { fontStyle: "italic" } : {}),
        },
      },
    ],
    horizontalTextAlignment: paragraph.align ?? "left",
  }));

  return {
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: "pending",
    position: {
      x,
      y,
      width,
      height,
      z,
      ...(tabOrder === undefined ? {} : { tabOrder }),
    },
    visual: {
      visualType: "textbox",
      objects: {
        general: [{ properties: { paragraphs: normalized } }],
      },
      visualContainerObjects: {
        background: [
          {
            properties: {
              show: literal(background ? "true" : "false"),
            },
          },
        ],
        border: [
          {
            properties: {
              show: literal("false"),
            },
          },
        ],
        ...genericContainerObjects(altText),
      },
      drillFilterOtherVisuals: true,
    },
  };
}

function pageVisualsRoot(pageKey) {
  return path.join(pagesRoot, pageDefinitions[pageKey].id, "visuals");
}

async function writeVisual(pageKey, visual, seed) {
  const id = visualId(`${pageKey}-${seed}`);
  visual.name = id;
  const directory = path.join(pageVisualsRoot(pageKey), id);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "visual.json"),
    `${JSON.stringify(visual, null, 2)}\n`,
    "utf8",
  );
  return id;
}

async function cloneTemplate(pageKey, templateId, seed, mutate = () => {}) {
  const visual = clone(await readExecutiveTemplate(templateId));
  mutate(visual);
  await writeVisual(pageKey, visual, seed);
}

function markerFromAltText(visual) {
  return visual.visual?.visualContainerObjects?.general?.[0]?.properties?.altText
    ?.expr?.Literal?.Value;
}

function setReferenceNavigationState(visual, activeMarker) {
  const marker = markerFromAltText(visual) ?? "";
  const mainNav = marker.match(
    /NT_UI_NAV_([a-f0-9]+)_(SHAPE|TEXT)_(ACTIVE|INACTIVE)/,
  );

  if (mainNav) {
    const [, , kind] = mainNav;
    replaceStrings(visual, [
      [`_${kind}_ACTIVE`, `_${kind}_INACTIVE`],
      [`_${kind}_INACTIVE`, `_${kind}_INACTIVE`],
    ]);
    if (kind === "SHAPE") {
      const objects = visual.visual.objects;
      objects.fill[0].properties.fillColor.solid.color = literal(
        quoted("#172436"),
      );
      objects.outline[0].properties.show = literal("true");
      objects.outline[0].properties.lineColor = {
        solid: { color: literal(quoted("#2D4158")) },
      };
    } else {
      const textRun =
        visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0];
      textRun.textStyle.fontWeight = "normal";
      textRun.textStyle.color = "#F4F7FA";
    }
    return;
  }

  const reference = marker.match(/NT_STAGE2_DOC_(SHAPE|TEXT) \| (.+)'?$/);
  if (!reference) return;
  const [, kind, rawLabel] = reference;
  const label = rawLabel.replace(/'$/, "");
  const active = label === activeMarker;

  if (kind === "SHAPE") {
    const objects = visual.visual.objects;
    objects.fill[0].properties.fillColor.solid.color = literal(
      quoted(active ? "#A8CF24" : "#12384B"),
    );
    objects.outline[0].properties.show = literal(active ? "false" : "true");
    if (!active) {
      objects.outline[0].properties.lineColor = {
        solid: { color: literal(quoted("#365568")) },
      };
    }
  } else {
    const textRun =
      visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0];
    textRun.textStyle.fontWeight = active ? "bold" : "normal";
    textRun.textStyle.color = active ? "#061A2E" : "#FFFCF7";
  }
}

async function buildShell(pageKey) {
  const entries = await readdir(executiveVisuals, { withFileTypes: true });
  const shell = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const visual = await readExecutiveTemplate(entry.name);
    if ((visual.position?.x ?? 9999) >= 196) continue;
    shell.push(visual);
  }
  shell.sort(
    (left, right) => (left.position?.z ?? 0) - (right.position?.z ?? 0),
  );

  for (const source of shell) {
    const visual = clone(source);
    setReferenceNavigationState(
      visual,
      pageDefinitions[pageKey].referenceMarker,
    );
    await writeVisual(pageKey, visual, `shell-${source.name}`);
  }
}

async function buildHeader({
  pageKey,
  title,
  subtitle,
  chip1 = "Portfolio documentation",
  chip2 = "Synthetic data",
  includeFilters = false,
}) {
  await cloneTemplate(
    pageKey,
    templateIds.headerBackground,
    "header-background",
  );
  await cloneTemplate(pageKey, templateIds.title, "header-title", (visual) => {
    setTextbox(visual, title);
    setAltText(visual, `${title} page title.`);
  });
  await cloneTemplate(
    pageKey,
    templateIds.subtitle,
    "header-subtitle",
    (visual) => {
      setTextbox(visual, subtitle);
      setAltText(visual, subtitle);
    },
  );

  for (const [templateId, seed] of [
    [templateIds.prototypeChipBackground, "chip-one-background"],
    [templateIds.syntheticChipBackground, "chip-two-background"],
  ]) {
    await cloneTemplate(pageKey, templateId, seed);
  }
  await cloneTemplate(
    pageKey,
    templateIds.prototypeChip,
    "chip-one",
    (visual) => {
      setTextbox(visual, chip1);
      setAltText(visual, chip1);
    },
  );
  await cloneTemplate(
    pageKey,
    templateIds.syntheticChip,
    "chip-two",
    (visual) => {
      setTextbox(visual, chip2);
      setAltText(visual, chip2);
    },
  );

  if (!includeFilters) return;

  await cloneTemplate(
    pageKey,
    templateIds.yearSlicer,
    "year-slicer",
    (visual) => {
      setAltText(
        visual,
        "Year filter. Validation tests recalculate for the selected year.",
      );
    },
  );
  await cloneTemplate(
    pageKey,
    templateIds.regionSlicer,
    "category-slicer",
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
        "Product Category filter. Validation tests recalculate across both fact tables.",
      );
    },
  );
}

async function buildFooter(pageKey, text) {
  await writeVisual(
    pageKey,
    makeShape({
      x: 208,
      y: 752,
      width: 1208,
      height: 40,
      fill: "#E0F0EC",
      outline: "#A9CDC5",
      z: 500,
      altText: "Reference-page interpretation note background.",
    }),
    "footer-background",
  );
  await writeVisual(
    pageKey,
    makeTextbox({
      x: 224,
      y: 755,
      width: 1176,
      height: 34,
      z: 510,
      altText: text,
      paragraphs: [
        {
          text,
          fontSize: "9.5pt",
          color: "#0F675F",
        },
      ],
    }),
    "footer-text",
  );
}

async function buildCard({
  pageKey,
  seed,
  x,
  y,
  width,
  height,
  title,
  measure,
  tooltips = [],
  altText,
  tabOrder,
}) {
  await cloneTemplate(pageKey, templateIds.card, seed, (visual) => {
    setPosition(visual, {
      x,
      y,
      width,
      height,
      ...(tabOrder === undefined ? {} : { tabOrder }),
    });
    visual.visual.query = cardQuery(measure, tooltips);
    setTitle(visual, title);
    setAltText(visual, altText);
  });
}

async function buildValidationPage() {
  const pageKey = "validation";
  await buildShell(pageKey);
  await buildHeader({
    pageKey,
    title: "Measures & Validation Center",
    subtitle:
      "Reconcile core KPIs and relationship integrity under the current filter context.",
    chip1: "Filter-aware tests",
    chip2: "Synthetic data",
    includeFilters: true,
  });

  const summaries = [
    {
      title: "Tests Run",
      measure: "Validation Tests Run",
      x: 208,
      alt: "Number of validation tests applicable to the current filter context.",
    },
    {
      title: "Passed",
      measure: "Validation Tests Passed",
      x: 512,
      alt: "Number of applicable validation tests that passed.",
    },
    {
      title: "Failed",
      measure: "Validation Tests Failed",
      x: 816,
      alt: "Number of applicable validation tests requiring review.",
    },
    {
      title: "Overall Result",
      measure: "Validation Overall Status",
      x: 1120,
      alt: "Overall validation result for the current filters.",
    },
  ];

  for (let index = 0; index < summaries.length; index += 1) {
    const card = summaries[index];
    await buildCard({
      pageKey,
      seed: `summary-${index + 1}`,
      x: card.x,
      y: 100,
      width: 288,
      height: 92,
      title: card.title,
      measure: card.measure,
      altText: card.alt,
      tabOrder: 20 + index,
    });
  }

  const tests = [
    {
      title: "Sales Region Partition",
      measure: "Validation Sales Split Status",
      tooltips: [
        "Validation Sales Split Variance",
        "Total Sales",
        "Assigned-Region Sales",
        "Cross Region Sales",
      ],
      formula: "Total Sales = Assigned-Region Sales + Cross-Region Sales\nTolerance: ₹1",
      alt: "Checks that assigned-region and cross-region sales fully reconcile to total sales.",
    },
    {
      title: "Average Order Value Identity",
      measure: "Validation AOV Status",
      tooltips: [
        "Validation AOV Variance",
        "Total Sales",
        "Sales Order Count",
        "Average Order Value",
      ],
      formula: "Total Sales = Average Order Value × Distinct Sales Orders\nTolerance: ₹1",
      alt: "Checks the average-order-value calculation against sales and distinct orders.",
    },
    {
      title: "Relationship Key Integrity",
      measure: "Validation Relationship Integrity Status",
      tooltips: [
        "Validation Orphan Fact Rows",
        "Validation Sales Orphan Rows",
        "Validation Inventory Orphan Rows",
        "Sales Row Count",
        "Inventory Row Count",
      ],
      formula: "All fact foreign keys must resolve to their related dimensions\nExpected orphan rows: 0",
      alt: "Checks referential integrity across all active fact-to-dimension relationships.",
    },
    {
      title: "Inventory Net Flow Identity",
      measure: "Validation Net Flow Status",
      tooltips: [
        "Validation Net Flow Variance",
        "Net Movement Quantity",
        "Total Inward Quantity",
        "Total Outward Quantity",
      ],
      formula: "Net Stock Flow = Inward Units − Outward Units\nExpected variance: 0",
      alt: "Checks that net stock flow reconciles exactly to inward minus outward units.",
    },
    {
      title: "Movement Classification",
      measure: "Validation Movement Classification Status",
      tooltips: [
        "Validation Movement Classification Variance",
        "Validation Raw Movement Quantity",
        "Total Inward Quantity",
        "Total Outward Quantity",
        "Total Transfer Quantity",
      ],
      formula: "Raw movement quantity = Inward + Outward + Transfer\nExpected variance: 0",
      alt: "Checks that every movement unit is classified as inward, outward, or transfer.",
    },
    {
      title: "Product Coverage Bounds",
      measure: "Validation Product Coverage Status",
      tooltips: [
        "Product Coverage %",
        "Distinct Products Sold",
        "Product Catalog Count",
      ],
      formula: "Distinct Products Sold ≤ Product Catalog Count\nValid coverage range: 0%–100%",
      alt: "Checks that product coverage remains within its mathematically valid range.",
    },
  ];

  const xPositions = [208, 616, 1024];
  const yPositions = [206, 410];
  for (let index = 0; index < tests.length; index += 1) {
    const test = tests[index];
    const x = xPositions[index % 3];
    const y = yPositions[Math.floor(index / 3)];
    await writeVisual(
      pageKey,
      makeShape({
        x,
        y,
        width: 392,
        height: 188,
        fill: "#FFFCF7",
        outline: "#D9D4C8",
        z: 200 + index * 5,
        altText: `${test.title} validation panel background.`,
      }),
      `test-${index + 1}-background`,
    );
    await writeVisual(
      pageKey,
      makeShape({
        x,
        y,
        width: 392,
        height: 5,
        fill: index === 4 ? "#C9911A" : "#15958D",
        outlineShow: false,
        z: 201 + index * 5,
        altText: `${test.title} panel accent.`,
      }),
      `test-${index + 1}-accent`,
    );
    await buildCard({
      pageKey,
      seed: `test-${index + 1}-status`,
      x: x + 10,
      y: y + 12,
      width: 372,
      height: 102,
      title: test.title,
      measure: test.measure,
      tooltips: test.tooltips,
      altText: test.alt,
      tabOrder: 30 + index,
    });
    await writeVisual(
      pageKey,
      makeTextbox({
        x: x + 18,
        y: y + 119,
        width: 356,
        height: 56,
        z: 203 + index * 5,
        altText: `${test.title} validation rule: ${test.formula}`,
        paragraphs: [
          {
            text: test.formula,
            fontSize: "9.5pt",
            color: "#506477",
          },
        ],
      }),
      `test-${index + 1}-formula`,
    );
  }

  await writeVisual(
    pageKey,
    makeShape({
      x: 208,
      y: 612,
      width: 1208,
      height: 126,
      fill: "#EEF6F4",
      outline: "#B9D9D3",
      z: 400,
      altText: "Validation interpretation guidance background.",
    }),
    "interpretation-background",
  );
  await writeVisual(
    pageKey,
    makeTextbox({
      x: 228,
      y: 626,
      width: 1168,
      height: 96,
      z: 410,
      tabOrder: 40,
      altText:
        "Validation interpretation guidance. PASS confirms internal reconciliation for the current filters, not external source certification.",
      paragraphs: [
        {
          text: "How to read this page",
          fontSize: "11pt",
          color: "#0F675F",
          bold: true,
        },
        {
          text:
            "PASS confirms that the semantic-model calculations reconcile under the selected Year and Product Category. N/A means the test has no applicable rows. REVIEW means at least one rule failed and the report should not be published until investigated. These tests validate internal consistency; they do not replace upstream source certification.",
          fontSize: "9.5pt",
          color: "#2C5260",
        },
      ],
    }),
    "interpretation-text",
  );

  await buildFooter(
    pageKey,
    "Validation is filter-aware. Currency identities use a ₹1 tolerance for floating-point rounding; count and quantity identities require exact reconciliation.",
  );
}

async function buildModelPage() {
  const pageKey = "model";
  await buildShell(pageKey);
  await buildHeader({
    pageKey,
    title: "NovaTrade Data Model",
    subtitle:
      "Two-fact star schema with conformed dimensions, single-direction filtering and reusable measures.",
    chip1: "Import-mode model",
    chip2: "10 active relationships",
  });

  const summaryCards = [
    {
      x: 208,
      title: "Sales Fact Rows",
      measure: "Sales Row Count",
      alt: "Rows in FactSales at sales-order-line grain.",
    },
    {
      x: 512,
      title: "Inventory Fact Rows",
      measure: "Inventory Row Count",
      alt: "Rows in FactInventoryMovement at inventory-movement grain.",
    },
    {
      x: 816,
      title: "Product Catalog",
      measure: "Product Catalog Count",
      alt: "Distinct products in DimProduct.",
    },
    {
      x: 1120,
      title: "Orphan Fact Rows",
      measure: "Validation Orphan Fact Rows",
      tooltips: [
        "Validation Sales Orphan Rows",
        "Validation Inventory Orphan Rows",
      ],
      alt: "Fact rows whose active relationship keys do not resolve to dimensions.",
    },
  ];

  for (let index = 0; index < summaryCards.length; index += 1) {
    const card = summaryCards[index];
    await buildCard({
      pageKey,
      seed: `summary-${index + 1}`,
      x: card.x,
      y: 100,
      width: 288,
      height: 88,
      title: card.title,
      measure: card.measure,
      tooltips: card.tooltips ?? [],
      altText: card.alt,
      tabOrder: 20 + index,
    });
  }

  await writeVisual(
    pageKey,
    makeShape({
      x: 208,
      y: 200,
      width: 1208,
      height: 538,
      fill: "#FFFCF7",
      outline: "#D9D4C8",
      z: 100,
      altText: "NovaTrade star-schema architecture panel.",
    }),
    "model-panel-background",
  );

  await writeVisual(
    pageKey,
    makeTextbox({
      x: 228,
      y: 210,
      width: 1168,
      height: 34,
      z: 130,
      altText:
        "Conformed dimensions DimDate and DimProduct filter both fact tables.",
      paragraphs: [
        {
          text: "CONFORMED DIMENSIONS — shared across Sales and Inventory",
          fontSize: "10pt",
          color: "#0F675F",
          bold: true,
          align: "center",
        },
      ],
    }),
    "shared-dimensions-heading",
  );

  const sharedNodes = [
    {
      x: 514,
      title: "DimDate",
      body: "DateKey • FullDate\nMonth • Quarter • Year",
    },
    {
      x: 898,
      title: "DimProduct",
      body: "ProductKey • SKU • Product\nCategory • Model • Base Price",
    },
  ];
  for (let index = 0; index < sharedNodes.length; index += 1) {
    const node = sharedNodes[index];
    await writeNode(pageKey, {
      ...node,
      y: 246,
      width: 260,
      height: 66,
      fill: "#DDEFEA",
      outline: "#7EBBB2",
      titleColor: "#0F675F",
      seed: `shared-${index + 1}`,
    });
  }

  for (const connector of [
    { x: 642, y: 312, width: 4, height: 30 },
    { x: 1026, y: 312, width: 4, height: 30 },
    { x: 540, y: 340, width: 592, height: 3 },
    { x: 540, y: 340, width: 4, height: 24 },
    { x: 1128, y: 340, width: 4, height: 24 },
  ]) {
    await writeVisual(
      pageKey,
      makeShape({
        ...connector,
        fill: "#7EBBB2",
        outlineShow: false,
        z: 105,
        altText: "Single-direction dimension-to-fact relationship connector.",
      }),
      `shared-connector-${connector.x}-${connector.y}`,
    );
  }

  await writeNode(pageKey, {
    x: 354,
    y: 364,
    width: 374,
    height: 104,
    fill: "#0F766E",
    outline: "#0F675F",
    titleColor: "#FFFFFF",
    bodyColor: "#E8F6F3",
    title: "FactSales",
    body:
      "Grain: one sales-order line\nMeasures: revenue, quantity, orders, growth, contribution",
    seed: "fact-sales",
  });
  await writeNode(pageKey, {
    x: 944,
    y: 364,
    width: 374,
    height: 104,
    fill: "#0F766E",
    outline: "#0F675F",
    titleColor: "#FFFFFF",
    bodyColor: "#E8F6F3",
    title: "FactInventoryMovement",
    body:
      "Grain: one inventory movement\nMeasures: inward, outward, transfer and net stock flow",
    seed: "fact-inventory",
  });

  await writeVisual(
    pageKey,
    makeTextbox({
      x: 238,
      y: 476,
      width: 610,
      height: 34,
      z: 130,
      altText: "Sales fact supporting dimensions heading.",
      paragraphs: [
        {
          text: "SALES-SPECIFIC DIMENSIONS",
          fontSize: "9.5pt",
          color: "#506477",
          bold: true,
          align: "center",
        },
      ],
    }),
    "sales-dimensions-heading",
  );
  await writeVisual(
    pageKey,
    makeTextbox({
      x: 864,
      y: 476,
      width: 522,
      height: 34,
      z: 130,
      altText: "Inventory role-playing dimensions heading.",
      paragraphs: [
        {
          text: "INVENTORY ROLE-PLAYING DIMENSIONS",
          fontSize: "9.5pt",
          color: "#506477",
          bold: true,
          align: "center",
        },
      ],
    }),
    "inventory-dimensions-heading",
  );

  const salesDims = [
    [238, "DimDistributor", "DistributorKey\nReporting Region"],
    [394, "DimSalesHead", "SalesHeadKey\nBase Region"],
    [550, "DimBranch", "BranchKey\nRegion"],
    [706, "DimGodown", "GodownKey\nFulfillment location"],
  ];
  for (let index = 0; index < salesDims.length; index += 1) {
    const [x, title, body] = salesDims[index];
    await writeNode(pageKey, {
      x,
      y: 510,
      width: 144,
      height: 76,
      fill: "#F1F6F7",
      outline: "#9AB6C3",
      titleColor: "#17334A",
      bodyColor: "#506477",
      title,
      body,
      titleSize: "9pt",
      bodySize: "8pt",
      seed: `sales-dimension-${index + 1}`,
    });
  }

  const inventoryDims = [
    [946, "DimFromGodown", "FromGodownKey\nOrigin location"],
    [1154, "DimToGodown", "ToGodownKey\nDestination location"],
  ];
  for (let index = 0; index < inventoryDims.length; index += 1) {
    const [x, title, body] = inventoryDims[index];
    await writeNode(pageKey, {
      x,
      y: 510,
      width: 190,
      height: 76,
      fill: "#FFF4DD",
      outline: "#D7B56D",
      titleColor: "#6E5316",
      bodyColor: "#6D6250",
      title,
      body,
      titleSize: "9pt",
      bodySize: "8pt",
      seed: `inventory-dimension-${index + 1}`,
    });
  }

  await writeNode(pageKey, {
    x: 436,
    y: 626,
    width: 800,
    height: 72,
    fill: "#102F43",
    outline: "#102F43",
    titleColor: "#FFFFFF",
    bodyColor: "#DCE8EF",
    title: "Reusable Measures Layer",
    body:
      "Dedicated DAX table • shared definitions • display folders • validation measures • no bidirectional or many-to-many relationships",
    seed: "measures-layer",
  });

  await writeVisual(
    pageKey,
    makeTextbox({
      x: 226,
      y: 700,
      width: 1172,
      height: 34,
      z: 140,
      altText:
        "Relationship legend: one-to-many, single direction from dimensions to facts. DimFromGodown and DimToGodown are role-playing copies for inventory origin and destination.",
      paragraphs: [
        {
          text:
            "Relationship contract: 1 → * and single direction from dimension to fact. DimFromGodown and DimToGodown are role-playing copies for movement origin and destination.",
          fontSize: "8.5pt",
          color: "#506477",
          align: "center",
        },
      ],
    }),
    "relationship-legend",
  );

  await buildFooter(
    pageKey,
    "Source path: SQL Server NovaTrade_DW → imported star schema → reusable DAX measures → report pages. Auto date/time is disabled; DimDate is the reporting calendar.",
  );
}

async function writeNode(
  pageKey,
  {
    x,
    y,
    width,
    height,
    fill,
    outline,
    titleColor,
    bodyColor = "#506477",
    title,
    body,
    titleSize = "10.5pt",
    bodySize = "8.5pt",
    seed,
  },
) {
  await writeVisual(
    pageKey,
    makeShape({
      x,
      y,
      width,
      height,
      fill,
      outline,
      z: 120,
      altText: `${title} model node background.`,
    }),
    `${seed}-background`,
  );
  await writeVisual(
    pageKey,
    makeTextbox({
      x: x + 10,
      y: y + 8,
      width: width - 20,
      height: height - 14,
      z: 130,
      altText: `${title}. ${body}`,
      paragraphs: [
        {
          text: title,
          fontSize: titleSize,
          color: titleColor,
          bold: true,
          align: "center",
        },
        {
          text: body,
          fontSize: bodySize,
          color: bodyColor,
          align: "center",
        },
      ],
    }),
    `${seed}-text`,
  );
}

async function buildLogicPage() {
  const pageKey = "logic";
  await buildShell(pageKey);
  await buildHeader({
    pageKey,
    title: "Business Logic & Reporting Notes",
    subtitle:
      "Metric definitions, interpretation rules, decision thresholds and known source limitations.",
    chip1: "Definition contract",
    chip2: "Synthetic data",
  });

  const sections = [
    {
      title: "01  Sales & Order KPIs",
      color: "#15958D",
      body:
        "• Total Sales = Σ FactSales[LineTotal]\n• Units Sold = Σ FactSales[Quantity]\n• Sales Orders = distinct OrderNumber\n• Average Order Value = Total Sales ÷ Sales Orders\n• Active Distributors = distributors with sales in the current filter context",
    },
    {
      title: "02  Time Intelligence",
      color: "#15958D",
      body:
        "• OrderDate is the active sales date; MovementDate is the active inventory date\n• Previous Year uses the same visible date period one year earlier\n• YoY is N/A when no prior-year period exists\n• Running Total uses the maximum visible date within ALLSELECTED\n• Select one complete Year for a comparable management review",
    },
    {
      title: "03  Territory Governance",
      color: "#15958D",
      body:
        "• Assigned-Region Sales: distributor reporting region matches the Sales Head base region\n• Cross-Region Sales: the two regions differ\n• Cross-Region Revenue Share = Cross-Region Sales ÷ Total Sales\n• Cross-region activity signals market reach and coordination needs; it does not mean account reassignment",
    },
    {
      title: "04  Inventory Flow",
      color: "#D1842B",
      body:
        "• Inward, Outward and Transfer use the movement classification columns\n• Net Stock Flow = Inward Units − Outward Units\n• Inbound-to-Outbound Coverage = Inward ÷ Outward\n• A product has flow deficit when Net Stock Flow < 0\n• Net Stock Flow is a period movement signal—not Stock on Hand",
    },
    {
      title: "05  Management Exception Rules",
      color: "#C9911A",
      body:
        "• Flow risk = positive product YoY growth AND negative Net Stock Flow\n• Protect growth: growing product under replenishment pressure\n• Recover demand: negative product YoY growth\n• Monitor: neither exception rule is triggered\n• Exception revenue shares quantify exposure; they do not prove shortage or lost sales",
    },
    {
      title: "06  Source Limits & Safe Use",
      color: "#9A5D4C",
      body:
        "• Dataset is synthetic; the current movement fact contains no TRANSFER rows\n• Opening stock and authoritative Stock on Hand are unavailable\n• COGS, margin, supplier lead time, targets and service levels are unavailable\n• Therefore no stockout, profitability, target attainment or forecast claim is made\n• Filters apply through documented model relationships; validation status should be checked before sharing",
    },
  ];

  const xPositions = [208, 616, 1024];
  const yPositions = [104, 382];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const x = xPositions[index % 3];
    const y = yPositions[Math.floor(index / 3)];
    await writeVisual(
      pageKey,
      makeShape({
        x,
        y,
        width: 392,
        height: 262,
        fill: "#FFFCF7",
        outline: "#D9D4C8",
        z: 200 + index * 4,
        altText: `${section.title} definition panel background.`,
      }),
      `section-${index + 1}-background`,
    );
    await writeVisual(
      pageKey,
      makeShape({
        x,
        y,
        width: 392,
        height: 7,
        fill: section.color,
        outlineShow: false,
        z: 201 + index * 4,
        altText: `${section.title} panel accent.`,
      }),
      `section-${index + 1}-accent`,
    );
    await writeVisual(
      pageKey,
      makeTextbox({
        x: x + 18,
        y: y + 18,
        width: 356,
        height: 226,
        z: 202 + index * 4,
        tabOrder: 20 + index,
        altText: `${section.title}. ${section.body}`,
        paragraphs: [
          {
            text: section.title,
            fontSize: "11pt",
            color: section.color,
            bold: true,
          },
          {
            text: section.body,
            fontSize: "9.5pt",
            color: "#2D4558",
          },
        ],
      }),
      `section-${index + 1}-text`,
    );
  }

  await writeVisual(
    pageKey,
    makeShape({
      x: 208,
      y: 658,
      width: 1208,
      height: 80,
      fill: "#102F43",
      outline: "#102F43",
      z: 400,
      altText: "Decision-use contract background.",
    }),
    "decision-contract-background",
  );
  await writeVisual(
    pageKey,
    makeTextbox({
      x: 230,
      y: 671,
      width: 1164,
      height: 54,
      z: 410,
      tabOrder: 30,
      altText:
        "Decision-use contract: management insights identify where to investigate and prioritize; they do not replace operational stock, cost, target, or forecast systems.",
      paragraphs: [
        {
          text: "DECISION-USE CONTRACT",
          fontSize: "10pt",
          color: "#A8CF24",
          bold: true,
          align: "center",
        },
        {
          text:
            "Use this report to identify where to investigate, coordinate and prioritize. Do not use it as proof of physical stock, profitability, target attainment or future demand without the missing operational sources.",
          fontSize: "9.5pt",
          color: "#F0F5F7",
          align: "center",
        },
      ],
    }),
    "decision-contract-text",
  );

  await buildFooter(
    pageKey,
    "Governance note: metric definitions are centralized in the semantic model and tested on the Measures & Validation page under the same filter context.",
  );
}

function removeMeasure(text, name) {
  const startToken = `\n\tmeasure '${name}' =`;
  const start = text.indexOf(startToken);
  if (start === -1) return text;
  const nextMeasure = text.indexOf("\n\tmeasure ", start + startToken.length);
  const nextColumn = text.indexOf("\n\tcolumn ", start + startToken.length);
  const candidates = [nextMeasure, nextColumn].filter((value) => value !== -1);
  if (!candidates.length) {
    throw new Error(`Could not find the end of measure: ${name}`);
  }
  const end = Math.min(...candidates);
  return `${text.slice(0, start)}${text.slice(end)}`;
}

async function updateValidationMeasures() {
  let text = await readFile(measuresFile, "utf8");

  const validationStart = text.indexOf(
    "\n\tmeasure 'Validation Sales Split Variance' =",
  );
  if (validationStart !== -1) {
    const columnStart = text.indexOf("\n\tcolumn Value", validationStart);
    if (columnStart === -1) {
      throw new Error("Could not locate the end of the validation measure block.");
    }
    text = `${text.slice(0, validationStart)}${text.slice(columnStart)}`;
  }

  for (const unsupported of [
    "Assump Opening Stock",
    "Estimated Closing Stock",
    "Total COGS",
  ]) {
    text = removeMeasure(text, unsupported);
  }

  const validationMeasures = `
\tmeasure 'Validation Sales Split Variance' =

\t\t\tVAR ExpectedSales =
\t\t\t    COALESCE ( [Assigned-Region Sales], 0 )
\t\t\t        + COALESCE ( [Cross Region Sales], 0 )
\t\t\tRETURN
\t\t\tIF (
\t\t\t    ISBLANK ( [Total Sales] ),
\t\t\t    BLANK (),
\t\t\t    [Total Sales] - ExpectedSales
\t\t\t)
\t\tformatString: "₹"#,0.00;#,0.00\\ -"₹";"₹"#,0.00
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: eab0a4cf-b5bf-4cd2-bf4a-bb8a5ca58f01

\t\tannotation PBI_FormatHint = {"currencyCulture":"hi-IN"}

\tmeasure 'Validation Sales Split Status' =

\t\t\tIF (
\t\t\t    ISBLANK ( [Total Sales] ),
\t\t\t    "N/A",
\t\t\t    IF ( ABS ( [Validation Sales Split Variance] ) <= 1, "PASS", "FAIL" )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 8fe49f4d-48cb-44a7-91d0-1d5e3c1ddf02

\tmeasure 'Validation AOV Variance' =

\t\t\tIF (
\t\t\t    [Sales Order Count] = 0,
\t\t\t    BLANK (),
\t\t\t    [Total Sales]
\t\t\t        - ( [Average Order Value] * [Sales Order Count] )
\t\t\t)
\t\tformatString: "₹"#,0.00;#,0.00\\ -"₹";"₹"#,0.00
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: ad9f02ef-78e4-46a6-9b90-97ddd3d0a703

\t\tannotation PBI_FormatHint = {"currencyCulture":"hi-IN"}

\tmeasure 'Validation AOV Status' =

\t\t\tIF (
\t\t\t    [Sales Order Count] = 0,
\t\t\t    "N/A",
\t\t\t    IF ( ABS ( [Validation AOV Variance] ) <= 1, "PASS", "FAIL" )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: cbcbbf75-9f87-486c-8990-893bcf09ef04

\tmeasure 'Validation Sales Orphan Rows' =

\t\t\tCOALESCE (
\t\t\t    COUNTROWS (
\t\t\t        FILTER (
\t\t\t            'fact FactSales',
\t\t\t            ISBLANK ( RELATED ( 'dim DimDate'[DateKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimProduct'[ProductKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimDistributor'[DistributorKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimSalesHead'[SalesHeadKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimBranch'[BranchKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimGodown'[GodownKey] ) )
\t\t\t        )
\t\t\t    ),
\t\t\t    0
\t\t\t)
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: d61aed09-0556-4acd-997f-c86756366a05

\tmeasure 'Validation Inventory Orphan Rows' =

\t\t\tCOALESCE (
\t\t\t    COUNTROWS (
\t\t\t        FILTER (
\t\t\t            'fact FactInventoryMovement',
\t\t\t            ISBLANK ( RELATED ( 'dim DimDate'[DateKey] ) )
\t\t\t                || ISBLANK ( RELATED ( 'dim DimProduct'[ProductKey] ) )
\t\t\t                || (
\t\t\t                    NOT ISBLANK ( 'fact FactInventoryMovement'[FromGodownKey] )
\t\t\t                        && ISBLANK ( RELATED ( 'dim DimFromGodown'[GodownKey] ) )
\t\t\t                )
\t\t\t                || (
\t\t\t                    NOT ISBLANK ( 'fact FactInventoryMovement'[ToGodownKey] )
\t\t\t                        && ISBLANK ( RELATED ( 'dim DimToGodown'[GodownKey] ) )
\t\t\t                )
\t\t\t        )
\t\t\t    ),
\t\t\t    0
\t\t\t)
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: a64e3585-e772-44c0-b655-15c8f321b706

\tmeasure 'Validation Orphan Fact Rows' =

\t\t\t[Validation Sales Orphan Rows]
\t\t\t    + [Validation Inventory Orphan Rows]
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 7be91867-4c5d-4da2-963d-403ae5e7ae07

\tmeasure 'Validation Relationship Integrity Status' =

\t\t\tIF (
\t\t\t    [Sales Row Count] + [Inventory Row Count] = 0,
\t\t\t    "N/A",
\t\t\t    IF ( [Validation Orphan Fact Rows] = 0, "PASS", "FAIL" )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 4d75f999-f09b-4bb8-a704-3fe3c34d2608

\tmeasure 'Validation Net Flow Variance' =

\t\t\tIF (
\t\t\t    [Inventory Row Count] = 0,
\t\t\t    BLANK (),
\t\t\t    [Net Movement Quantity]
\t\t\t        - ( [Total Inward Quantity] - [Total Outward Quantity] )
\t\t\t)
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: a1e2486f-78f9-411c-95d0-0611cf0f8209

\tmeasure 'Validation Net Flow Status' =

\t\t\tIF (
\t\t\t    [Inventory Row Count] = 0,
\t\t\t    "N/A",
\t\t\t    IF ( [Validation Net Flow Variance] = 0, "PASS", "FAIL" )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 414bc53b-dab8-4b1e-8d7b-50796e7f630a

\tmeasure 'Validation Raw Movement Quantity' =

\t\t\tSUM ( 'fact FactInventoryMovement'[Quantity] )
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: ec823152-b407-450d-85f3-95302d2f930b

\tmeasure 'Validation Movement Classification Variance' =

\t\t\tIF (
\t\t\t    [Inventory Row Count] = 0,
\t\t\t    BLANK (),
\t\t\t    [Validation Raw Movement Quantity]
\t\t\t        - [Total Inward Quantity]
\t\t\t        - [Total Outward Quantity]
\t\t\t        - [Total Transfer Quantity]
\t\t\t)
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 76cfd3cc-a350-4e11-aa0a-8350855c090c

\tmeasure 'Validation Movement Classification Status' =

\t\t\tIF (
\t\t\t    [Inventory Row Count] = 0,
\t\t\t    "N/A",
\t\t\t    IF (
\t\t\t        [Validation Movement Classification Variance] = 0,
\t\t\t        "PASS",
\t\t\t        "FAIL"
\t\t\t    )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: eef6e97b-c83c-4916-bffd-3af4d8cb6e0d

\tmeasure 'Validation Product Coverage Status' =

\t\t\tVAR Coverage =
\t\t\t    [Product Coverage %]
\t\t\tRETURN
\t\t\tIF (
\t\t\t    ISBLANK ( Coverage ),
\t\t\t    "N/A",
\t\t\t    IF (
\t\t\t        Coverage >= 0
\t\t\t            && Coverage <= 1
\t\t\t            && [Distinct Products Sold] <= [Product Catalog Count],
\t\t\t        "PASS",
\t\t\t        "FAIL"
\t\t\t    )
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 63e18788-2d13-43e7-9334-335b89fa9d0e

\tmeasure 'Validation Tests Run' =

\t\t\tINT ( [Validation Sales Split Status] <> "N/A" )
\t\t\t    + INT ( [Validation AOV Status] <> "N/A" )
\t\t\t    + INT ( [Validation Relationship Integrity Status] <> "N/A" )
\t\t\t    + INT ( [Validation Net Flow Status] <> "N/A" )
\t\t\t    + INT ( [Validation Movement Classification Status] <> "N/A" )
\t\t\t    + INT ( [Validation Product Coverage Status] <> "N/A" )
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 39da88c1-e4ed-4784-beae-14638023ef0f

\tmeasure 'Validation Tests Passed' =

\t\t\tINT ( [Validation Sales Split Status] = "PASS" )
\t\t\t    + INT ( [Validation AOV Status] = "PASS" )
\t\t\t    + INT ( [Validation Relationship Integrity Status] = "PASS" )
\t\t\t    + INT ( [Validation Net Flow Status] = "PASS" )
\t\t\t    + INT ( [Validation Movement Classification Status] = "PASS" )
\t\t\t    + INT ( [Validation Product Coverage Status] = "PASS" )
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 3c892c94-c842-4397-89de-7ca198898310

\tmeasure 'Validation Tests Failed' =

\t\t\t[Validation Tests Run] - [Validation Tests Passed]
\t\tformatString: 0
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 1244cfd3-fb26-480f-b6ad-b07ec64a3f11

\tmeasure 'Validation Overall Status' =

\t\t\tSWITCH (
\t\t\t    TRUE (),
\t\t\t    [Validation Tests Run] = 0, "NO DATA",
\t\t\t    [Validation Tests Failed] = 0, "PASS",
\t\t\t    "REVIEW"
\t\t\t)
\t\tdisplayFolder: 11_Report Validation
\t\tlineageTag: 4e126490-9671-4d0c-9666-9b8ff363ab12
`;

  const insertAt = text.indexOf("\n\tcolumn Value");
  if (insertAt === -1) {
    throw new Error("Could not locate the Measures table value column.");
  }
  text = `${text.slice(0, insertAt)}${validationMeasures}${text.slice(insertAt)}`;
  await writeFile(measuresFile, text, "utf8");
}

async function updatePageDefinitions() {
  const page = (definition) => ({
    $schema:
      "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
    name: definition.id,
    displayName: definition.displayName,
    displayOption: "FitToPage",
    height: 810,
    width: 1440,
    visibility: "HiddenInViewMode",
    objects: {
      background: [
        {
          properties: {
            color: {
              solid: { color: literal(quoted("#F7F3EA")) },
            },
            transparency: literal("0D"),
          },
        },
      ],
      outspace: [
        {
          properties: {
            color: {
              solid: { color: literal(quoted("#F7F3EA")) },
            },
          },
        },
      ],
    },
  });

  for (const definition of Object.values(pageDefinitions)) {
    await writeFile(
      path.join(pagesRoot, definition.id, "page.json"),
      `${JSON.stringify(page(definition), null, 2)}\n`,
      "utf8",
    );
  }
}

async function preparePages() {
  for (const [pageKey, definition] of Object.entries(pageDefinitions)) {
    const visualsRoot = pageVisualsRoot(pageKey);
    await rm(visualsRoot, { recursive: true, force: true });
    await mkdir(visualsRoot, { recursive: true });
    await mkdir(path.join(pagesRoot, definition.id), { recursive: true });
  }
}

await updateValidationMeasures();
await updatePageDefinitions();
await preparePages();
await buildValidationPage();
await buildModelPage();
await buildLogicPage();

console.log(
  "Built NovaTrade report governance pages: validation, model overview, and business logic.",
);
