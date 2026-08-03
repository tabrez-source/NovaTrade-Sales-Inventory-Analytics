#!/usr/bin/env node

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const pagesRoot = path.join(
  root,
  "powerbi",
  "NovaTrade.Report",
  "definition",
  "pages",
);

const pageConfig = {
  "57f63e365ec04b378b4b": {
    title: "Executive Overview",
    subtitle: "Executive snapshot of sales, demand and regional performance.",
    footerPrefix: "Definition: ",
    footer:
      "Cross-region revenue is generated outside the Sales Head's assigned base region. It signals market reach, not account reassignment.",
  },
  "97dd004d959bc353cfef": {
    title: "Sales Performance",
    subtitle:
      "Track sales momentum, territory execution and distributor concentration.",
    footerPrefix: "Guide: ",
    footer:
      "Filters apply page-wide. YoY is N/A without a prior-year period. Hover rankings for contribution, growth and cross-region context.",
  },
  "0c293fb867ead9beb4cc": {
    title: "Product Performance",
    subtitle:
      "Assess portfolio coverage, category growth and price-volume position.",
    footerPrefix: "Guide: ",
    footer:
      "Filters apply page-wide. Bubble position shows units and average selling price; size shows revenue. Hover for share and growth.",
  },
  "6e63e51a13c0cbcb29b1": {
    title: "Inventory Operations",
    subtitle:
      "Monitor receipts, outbound demand and replenishment pressure.",
    footerPrefix: "Source limit: ",
    footer:
      "Transfers and authoritative opening stock are unavailable. Net Stock Flow = Inward Units - Outward Units; it is not Stock on Hand.",
  },
  "0833d451cbce4704acf3": {
    title: "Management Decision Center",
    subtitle:
      "Prioritize growth protection, demand recovery and territory coordination.",
    footerPrefix: "Rule: ",
    footer:
      "Replenishment pressure = positive product YoY growth + negative Net Stock Flow. It is not proof of stockout because opening stock and Stock on Hand are unavailable.",
  },
  "046c19d6b1632318bc76": {
    title: "Measures & Validation Center",
    subtitle:
      "Reconcile KPI calculations and relationship integrity under active filters.",
  },
  "1f4b43e6cf3bae8af6ab": {
    title: "Data Model Overview",
    subtitle:
      "Two-fact star schema, conformed dimensions and single-direction filtering.",
  },
  "8aceecd42b8f434b7f79": {
    title: "Business Logic & Notes",
    subtitle: "Definitions, decision rules and known source limitations.",
  },
};

const titleReplacements = new Map([
  ["Total Sales", "Sales Revenue"],
  ["Product Revenue", "Sales Revenue"],
  ["Monthly Sales Trend", "Monthly Sales Revenue"],
  [
    "Sales Inside vs Outside Assigned Region",
    "Assigned-Region vs Cross-Region Revenue",
  ],
  ["Sales by Sales Head", "Sales Revenue by Sales Head"],
  ["Sales by Region", "Sales Revenue by Physical Region"],
  [
    "Monthly Sales: Selected Year vs Prior Year",
    "Monthly Revenue: Selected Year vs Prior Year",
  ],
  [
    "Assigned vs Cross-Region Sales by Month",
    "Assigned-Region vs Cross-Region Revenue by Month",
  ],
  ["Top 5 Distributors by Sales", "Top 5 Distributors by Revenue"],
  ["YoY Growth by Reporting Region", "YoY Sales Growth by Reporting Region"],
  ["Category YoY Growth", "YoY Sales Growth by Product Category"],
  [
    "Monthly Inward vs Outward Trend",
    "Monthly Inventory Flow: Inward vs Outward Units",
  ],
  ["Growing Products at Flow Risk", "Growing Products Under Pressure"],
  ["Flow-Risk Revenue Share", "Pressure-Exposed Revenue Share"],
  ["Cross-Region Exposure", "Cross-Region Revenue Share"],
  [
    "Flow-Risk Revenue by Category",
    "Revenue Under Replenishment Pressure by Category",
  ],
]);

const projectionLabels = new Map([
  ["Measuress.Total Sales", "Sales Revenue"],
  ["Measuress.Previous Year Sales", "Prior Year Revenue"],
  ["Measuress.Total Inward Quantity", "Inward Units"],
  ["Measuress.Total Outward Quantity", "Outward Units"],
  ["Measuress.Net Movement Quantity", "Net Stock Flow"],
  ["Measuress.Revenue at Flow Risk", "Pressure-Exposed Revenue"],
  [
    "Measuress.Revenue at Flow Risk %",
    "Pressure-Exposed Revenue Share",
  ],
  [
    "Measuress.Growing Products at Flow Risk",
    "Growing Products Under Pressure",
  ],
  ["Measuress.Cross Region Sales %", "Cross-Region Revenue Share"],
  [
    "Measuress.Declining Product Revenue %",
    "Declining Revenue Exposure",
  ],
]);

const projectionOverrides = new Map([
  [
    "Product Portfolio Detail",
    new Map([["Measuress.Total Sales", "Revenue"]]),
  ],
  [
    "Replenishment Watchlist",
    new Map([
      ["Measuress.Total Inward Quantity", "Inward"],
      ["Measuress.Total Outward Quantity", "Outward"],
      ["Measuress.Net Movement Quantity", "Net Flow"],
    ]),
  ],
  [
    "Management Action Queue",
    new Map([
      ["Measuress.Total Sales", "Sales"],
      ["Measuress.Net Movement Quantity", "Net Flow"],
    ]),
  ],
]);

const publicPageIds = new Set([
  "57f63e365ec04b378b4b",
  "97dd004d959bc353cfef",
  "0c293fb867ead9beb4cc",
  "6e63e51a13c0cbcb29b1",
  "0833d451cbce4704acf3",
]);

const modelTabOrder = new Map([
  ["a45b2bdf5d4dcc63", 30],
  ["f949493645d8c077", 31],
  ["a5cbe43b1eaddcd3", 32],
  ["2febc435cfbd2405", 33],
  ["b9f825b64fc288a5", 34],
  ["2a89ef4f8b5991d8", 35],
  ["cf1ae6f7841f1ec6", 36],
  ["7c2cee8bca68d044", 37],
  ["926146b675533505", 38],
  ["79c29d5120a098ce", 39],
  ["3567031278a5f76b", 40],
  ["a5982c7c1a003e8d", 41],
  ["5ef7feec7bc37787", 42],
  ["cf119faa1b4cc211", 43],
  ["86c2131f9ffd4a37", 44],
  ["e24f732c687d8187", 45],
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function quoted(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function literalValue(property) {
  return property?.expr?.Literal?.Value;
}

function unquote(value = "") {
  return value.replace(/^'|'$/g, "").replaceAll("''", "'");
}

function textboxParagraphs(visual) {
  return visual.visual?.objects?.general?.[0]?.properties?.paragraphs;
}

function textboxText(visual) {
  return (textboxParagraphs(visual) ?? [])
    .flatMap((paragraph) => paragraph.textRuns ?? [])
    .map((run) => run.value ?? "")
    .join("");
}

function setTextbox(visual, value) {
  const paragraphs = textboxParagraphs(visual);
  if (!paragraphs?.length) return;
  const paragraph = clone(paragraphs[0]);
  const textStyle = clone(paragraph.textRuns?.[0]?.textStyle ?? {});
  paragraph.textRuns = [{ value, textStyle }];
  visual.visual.objects.general[0].properties.paragraphs = [paragraph];
}

function setRichTextbox(visual, prefix, value) {
  const paragraphs = textboxParagraphs(visual);
  if (!paragraphs?.length) return;
  const paragraph = clone(paragraphs[0]);
  const primaryStyle = clone(paragraph.textRuns?.[0]?.textStyle ?? {});
  const secondaryStyle = clone(
    paragraph.textRuns?.[1]?.textStyle ?? {
      ...primaryStyle,
      fontFamily: "'Segoe UI'",
      fontWeight: "normal",
      color: "#0D2A3C",
    },
  );
  paragraph.textRuns = [
    { value: prefix, textStyle: primaryStyle },
    { value, textStyle: secondaryStyle },
  ];
  visual.visual.objects.general[0].properties.paragraphs = [paragraph];
}

function setAltText(visual, value) {
  const containers =
    visual.visual.visualContainerObjects ??
    (visual.visual.visualContainerObjects = {});
  const general = containers.general ?? (containers.general = [{ properties: {} }]);
  general[0].properties ??= {};
  general[0].properties.altText = literal(quoted(value));
}

function altText(visual) {
  return unquote(
    literalValue(
      visual.visual?.visualContainerObjects?.general?.[0]?.properties?.altText,
    ),
  );
}

function titleText(visual) {
  return unquote(
    literalValue(
      visual.visual?.visualContainerObjects?.title?.[0]?.properties?.text,
    ),
  );
}

function setTitle(visual, value) {
  const title = visual.visual?.visualContainerObjects?.title?.[0]?.properties;
  if (title) title.text = literal(quoted(value));
}

function replaceTextboxText(visual, replacements) {
  const paragraphs = textboxParagraphs(visual);
  if (!paragraphs) return;
  for (const paragraph of paragraphs) {
    for (const run of paragraph.textRuns ?? []) {
      for (const [from, to] of replacements) {
        run.value = (run.value ?? "").replaceAll(from, to);
      }
    }
  }
}

function updateProjectionLabels(visual) {
  const queryState = visual.visual?.query?.queryState;
  if (!queryState) return;
  const overrides = projectionOverrides.get(titleText(visual));
  for (const role of Object.values(queryState)) {
    for (const projection of role?.projections ?? []) {
      const label =
        overrides?.get(projection.queryRef) ??
        projectionLabels.get(projection.queryRef);
      if (!label) continue;
      projection.nativeQueryRef = label;
      projection.displayName = label;
    }
  }
}

function setDisplayUnits(properties, units, precision) {
  if (!properties) return;
  properties.labelDisplayUnits = literal(quoted(String(units)));
  properties.labelPrecision = literal(`${precision}L`);
  delete properties.valueCustomFormatString;
}

function yMeasure(visual) {
  return visual.visual?.query?.queryState?.Y?.projections?.[0]?.queryRef;
}

function compactChartLabels(visual) {
  if (visual.visual?.visualType !== "clusteredBarChart") return;
  const measure = yMeasure(visual);
  const revenueMeasures = new Set([
    "Measuress.Total Sales",
    "Measuress.Revenue at Flow Risk",
  ]);
  const unitMeasures = new Map([
    ["Measuress.Total Outward Quantity", [1000, 1]],
    ["Measuress.Net Movement Quantity", [1000000, 1]],
  ]);

  let format;
  if (revenueMeasures.has(measure)) format = [1000000, 1];
  else if (unitMeasures.has(measure)) format = unitMeasures.get(measure);
  else return;

  for (const item of visual.visual.objects?.labels ?? []) {
    setDisplayUnits(item.properties, ...format);
  }
  for (const item of visual.visual.objects?.valueAxis ?? []) {
    setDisplayUnits(item.properties, ...format);
  }
}

function updateManagementTable(visual) {
  if (
    visual.visual?.visualType !== "tableEx" ||
    titleText(visual) !== "Management Action Queue"
  ) {
    return;
  }
  for (const item of visual.visual.objects?.columnFormatting ?? []) {
    const metadata = item.selector?.metadata;
    if (metadata === "Measuress.Total Sales") {
      setDisplayUnits(item.properties, 1000000, 1);
    }
    if (metadata === "Measuress.Net Movement Quantity") {
      setDisplayUnits(item.properties, 1000000, 2);
    }
  }
}

function updateModelDiagram(visual) {
  if (modelTabOrder.has(visual.name)) {
    visual.position.tabOrder = modelTabOrder.get(visual.name);
  }
  if (visual.visual?.visualType !== "textbox") return;
  if (visual.position.y === 254 && visual.position.height === 52) {
    visual.position.height = 58;
  }
  if (visual.position.y === 372 && visual.position.height === 90) {
    visual.position.height = 96;
  }
  if (visual.position.y === 518 && visual.position.height === 62) {
    visual.position.height = 68;
  }
  if (visual.position.y === 634 && visual.position.height === 58) {
    visual.position.height = 64;
  }
}

function updateModelChip(visual) {
  if (textboxText(visual) !== "10 active relationships") return;
  setTextbox(visual, "10 relationships");
  setAltText(
    visual,
    "Ten active one-to-many, single-direction model relationships.",
  );
}

function updateNavigation(visual) {
  const marker = altText(visual);
  const isInventoryNavigation = marker.includes(
    "NT_UI_NAV_6e63e51a13c0cbcb29b1_",
  );
  if (!isInventoryNavigation) return;
  replaceTextboxText(visual, [["Inventory Movement", "Inventory Operations"]]);
  setAltText(
    visual,
    marker.replaceAll("Inventory Movement", "Inventory Operations"),
  );
}

function updateGovernanceLanguage(pageId, visual) {
  if (
    pageId !== "046c19d6b1632318bc76" &&
    pageId !== "8aceecd42b8f434b7f79"
  ) {
    return;
  }
  const replacements = [
    ["Total Sales", "Sales Revenue"],
    [
      "Flow risk = positive product YoY growth AND negative Net Stock Flow",
      "Replenishment pressure = positive product YoY growth AND negative Net Stock Flow",
    ],
    [
      "Protect growth: growing product under replenishment pressure",
      "Protect growth: replenish a growing product under pressure",
    ],
    [
      "Exception revenue shares quantify exposure",
      "Pressure-exposed and declining revenue shares quantify exposure",
    ],
  ];
  replaceTextboxText(visual, replacements);
  const currentAlt = altText(visual);
  if (currentAlt) {
    let updatedAlt = currentAlt;
    for (const [from, to] of replacements) {
      updatedAlt = updatedAlt.replaceAll(from, to);
    }
    setAltText(visual, updatedAlt);
  }
  if (
    pageId === "8aceecd42b8f434b7f79" &&
    visual.visual?.visualType === "textbox" &&
    visual.position.tabOrder >= 20
  ) {
    setAltText(visual, textboxText(visual).replaceAll("\n", " "));
  }
  if (
    pageId === "046c19d6b1632318bc76" &&
    visual.name === "38faf3c1b6d4d2ef"
  ) {
    setAltText(
      visual,
      "Validation interpretation guidance. PASS confirms internal reconciliation for the current filters, not external source certification.",
    );
  }
}

async function processPage(pageId) {
  const config = pageConfig[pageId];
  if (!config) return;
  const visualsRoot = path.join(pagesRoot, pageId, "visuals");
  const entries = await readdir(visualsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(visualsRoot, entry.name, "visual.json");
    const visual = JSON.parse(await readFile(file, "utf8"));

    updateNavigation(visual);
    updateProjectionLabels(visual);
    compactChartLabels(visual);
    updateManagementTable(visual);
    updateGovernanceLanguage(pageId, visual);

    if (pageId === "1f4b43e6cf3bae8af6ab") {
      updateModelDiagram(visual);
      updateModelChip(visual);
    }

    if (visual.position?.tabOrder === 9 && visual.visual?.visualType === "textbox") {
      setTextbox(visual, config.title);
      setAltText(visual, `${config.title} page title.`);
    }
    if (visual.position?.tabOrder === 10 && visual.visual?.visualType === "textbox") {
      setTextbox(visual, config.subtitle);
      setAltText(visual, config.subtitle);
    }
    if (
      publicPageIds.has(pageId) &&
      visual.position?.tabOrder === 40 &&
      visual.visual?.visualType === "textbox"
    ) {
      setRichTextbox(visual, config.footerPrefix, config.footer);
      setAltText(visual, `${config.footerPrefix}${config.footer}`);
    }

    const currentTitle = titleText(visual);
    if (titleReplacements.has(currentTitle)) {
      const nextTitle = titleReplacements.get(currentTitle);
      setTitle(visual, nextTitle);
      const currentAlt = altText(visual);
      if (currentAlt) {
        setAltText(
          visual,
          currentAlt
            .replaceAll("Total Sales", "Sales Revenue")
            .replaceAll("product revenue", "sales revenue")
            .replaceAll("flow-risk", "replenishment-pressure")
            .replaceAll("Flow-risk", "Replenishment-pressure")
            .replaceAll("Cross-region exposure", "Cross-region revenue share"),
        );
      }
    }

    await writeFile(file, `${JSON.stringify(visual, null, 2)}\n`, "utf8");
  }
}

for (const pageId of Object.keys(pageConfig)) {
  await processPage(pageId);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      pagesPolished: Object.keys(pageConfig).length,
      scope: [
        "terminology",
        "header text fit",
        "footer relevance",
        "compact display units",
        "model-page reading order",
        "model-node text fit",
      ],
    },
    null,
    2,
  ),
);
