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

const expectedPages = {
  "57f63e365ec04b378b4b": {
    title: "Executive Overview",
    subtitle: "Executive snapshot of sales, demand and regional performance.",
    footer:
      "Definition: Cross-region revenue is generated outside the Sales Head's assigned base region. It signals market reach, not account reassignment.",
  },
  "97dd004d959bc353cfef": {
    title: "Sales Performance",
    subtitle: "Track sales, territory results and distributor concentration.",
    footer:
      "Guide: Filters apply page-wide. YoY is N/A without a prior-year period. Hover rankings for contribution, growth and cross-region context.",
  },
  "0c293fb867ead9beb4cc": {
    title: "Product Performance",
    subtitle: "Assess portfolio coverage, category growth and price-volume mix.",
    footer:
      "Guide: Filters apply page-wide. Bubble position shows units and average selling price; size shows revenue. Hover for share and growth.",
  },
  "6e63e51a13c0cbcb29b1": {
    title: "Inventory Operations",
    subtitle:
      "Monitor receipts, outbound demand and replenishment pressure.",
    footer:
      "Source limit: Transfers and authoritative opening stock are unavailable. Net Stock Flow = Inward Units - Outward Units; it is not Stock on Hand.",
  },
  "0833d451cbce4704acf3": {
    title: "Management Decision Center",
    subtitle: "Protect growth, recover demand and coordinate territories.",
    footer:
      "Rule: Replenishment pressure = positive product YoY growth + negative Net Stock Flow. It is not proof of stockout because opening stock and Stock on Hand are unavailable.",
  },
  "046c19d6b1632318bc76": {
    title: "Measures & Validation Center",
    subtitle: "Validate KPIs and relationship integrity under active filters.",
  },
  "1f4b43e6cf3bae8af6ab": {
    title: "Data Model Overview",
    subtitle: "Two-fact star schema, conformed dimensions and one-way filters.",
  },
  "8aceecd42b8f434b7f79": {
    title: "Business Logic & Notes",
    subtitle: "Definitions, decision rules and known source limitations.",
  },
};

const publicPageIds = new Set([
  "57f63e365ec04b378b4b",
  "97dd004d959bc353cfef",
  "0c293fb867ead9beb4cc",
  "6e63e51a13c0cbcb29b1",
  "0833d451cbce4704acf3",
]);

const requiredManagementTitles = new Set([
  "YoY Sales Growth",
  "Growing Products Under Pressure",
  "Pressure-Exposed Revenue Share",
  "Cross-Region Revenue Share",
  "Declining Revenue Exposure",
  "Revenue Under Replenishment Pressure by Category",
  "YoY Sales Growth by Sales Head",
  "Management Action Queue",
]);

const requiredModelTabOrder = new Map([
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

const issues = [];
const evidence = {
  pages: 0,
  publicPages: 0,
  hiddenReferencePages: 0,
  interactiveAndDataVisuals: 0,
  missingAltText: 0,
  duplicateTabOrders: 0,
  outOfCanvas: 0,
  compactRankings: 0,
  typedDisplayUnitSettings: 0,
  modelReadingStops: 0,
  contrast: {},
};

function issue(code, message, file = undefined) {
  issues.push({ code, message, ...(file ? { file } : {}) });
}

function literalValue(property) {
  return property?.expr?.Literal?.Value;
}

function unquote(value = "") {
  return value.replace(/^'|'$/g, "").replaceAll("''", "'");
}

function text(visual) {
  return (
    visual.visual?.objects?.general?.[0]?.properties?.paragraphs ?? []
  )
    .flatMap((paragraph) => paragraph.textRuns ?? [])
    .map((run) => run.value ?? "")
    .join("");
}

function title(visual) {
  return unquote(
    literalValue(
      visual.visual?.visualContainerObjects?.title?.[0]?.properties?.text,
    ),
  );
}

function altText(visual) {
  return unquote(
    literalValue(
      visual.visual?.visualContainerObjects?.general?.[0]?.properties?.altText,
    ),
  );
}

function displayUnits(properties) {
  return unquote(literalValue(properties?.labelDisplayUnits));
}

function precision(properties) {
  return literalValue(properties?.labelPrecision);
}

function yMeasure(visual) {
  return visual.visual?.query?.queryState?.Y?.projections?.[0]?.queryRef;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const channels = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function readPage(pageId) {
  const pageRoot = path.join(pagesRoot, pageId);
  const pageFile = path.join(pageRoot, "page.json");
  const page = JSON.parse(await readFile(pageFile, "utf8"));
  const visualsRoot = path.join(pageRoot, "visuals");
  const entries = await readdir(visualsRoot, { withFileTypes: true });
  const visuals = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(visualsRoot, entry.name, "visual.json");
    visuals.push({
      file,
      visual: JSON.parse(await readFile(file, "utf8")),
    });
  }
  return { page, pageFile, visuals };
}

function checkCompactRanking(visual, file) {
  if (visual.visual?.visualType !== "clusteredBarChart") return;
  const measure = yMeasure(visual);
  const expected = new Map([
    ["Measuress.Total Sales", ["1000000D", "1L"]],
    ["Measuress.Revenue at Flow Risk", ["1000000D", "1L"]],
    ["Measuress.Total Outward Quantity", ["1000D", "1L"]],
    ["Measuress.Net Movement Quantity", ["1000000D", "1L"]],
    ["Measuress.YoY Sales Change %", ["1D", "1L"]],
  ]).get(measure);
  if (!expected) return;

  const label = visual.visual.objects?.labels?.[0]?.properties;
  const axis = visual.visual.objects?.valueAxis?.[0]?.properties;
  if (
    displayUnits(label) !== expected[0] ||
    precision(label) !== expected[1] ||
    displayUnits(axis) !== expected[0] ||
    precision(axis) !== expected[1]
  ) {
    issue(
      "display-units",
      `${title(visual)} does not use the approved compact display units.`,
      relative(file),
    );
  } else {
    evidence.compactRankings += 1;
  }
  if (label?.valueCustomFormatString) {
    issue(
      "label-format",
      `${title(visual)} retains an exact-value format that can override compact units.`,
      relative(file),
    );
  }
}

function checkAxisTerminology(visual, file) {
  const expected = new Map([
    ["Measuress.Total Sales", "Sales Revenue"],
    ["Measuress.Previous Year Sales", "Sales Revenue"],
    ["Measuress.Assigned-Region Sales", "Sales Revenue"],
    ["Measuress.Cross Region Sales", "Sales Revenue"],
    ["Measuress.Revenue at Flow Risk", "Pressure-Exposed Revenue"],
    ["Measuress.Total Outward Quantity", "Outward Units"],
    ["Measuress.Net Movement Quantity", "Net Stock Flow"],
    ["Measuress.YoY Sales Change %", "YoY Sales Growth"],
  ]).get(yMeasure(visual));
  if (!expected) return;
  for (const item of visual.visual.objects?.valueAxis ?? []) {
    const actual = unquote(literalValue(item.properties?.titleText));
    if (actual !== expected) {
      issue(
        "axis-terminology",
        `${title(visual)} uses ${actual || "no title"} instead of ${expected} for its value axis.`,
        relative(file),
      );
    }
  }
}

function checkTypedDisplayUnitLiterals(value, file) {
  if (Array.isArray(value)) {
    for (const item of value) checkTypedDisplayUnitLiterals(item, file);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, item] of Object.entries(value)) {
    if (key.endsWith("DisplayUnits")) {
      const current = literalValue(item);
      if (/^'-?\d+'$/.test(current ?? "")) {
        issue(
          "display-unit-type",
          `${title(value) || "A visual"} stores ${key} as quoted text, which Power BI Desktop can ignore.`,
          relative(file),
        );
      }
      if (/^-?\d+D$/.test(current ?? "")) {
        evidence.typedDisplayUnitSettings += 1;
      }
    }
    checkTypedDisplayUnitLiterals(item, file);
  }
}

function checkManagementTable(visual, file) {
  if (title(visual) !== "Management Action Queue") return;
  const formats = new Map(
    (visual.visual.objects?.columnFormatting ?? []).map((item) => [
      item.selector?.metadata,
      item.properties,
    ]),
  );
  const sales = formats.get("Measuress.Total Sales");
  const flow = formats.get("Measuress.Net Movement Quantity");
  if (displayUnits(sales) !== "1000000D" || precision(sales) !== "1L") {
    issue(
      "management-sales-format",
      "Management Action Queue Sales must display in one-decimal millions.",
      relative(file),
    );
  }
  if (displayUnits(flow) !== "1000000D" || precision(flow) !== "2L") {
    issue(
      "management-flow-format",
      "Management Action Queue Net Flow must display in two-decimal millions.",
      relative(file),
    );
  }
}

for (const [pageId, expected] of Object.entries(expectedPages)) {
  const { page, pageFile, visuals } = await readPage(pageId);
  evidence.pages += 1;
  if (publicPageIds.has(pageId)) evidence.publicPages += 1;
  else evidence.hiddenReferencePages += 1;

  if (!publicPageIds.has(pageId) && page.visibility !== "HiddenInViewMode") {
    issue(
      "reference-visibility",
      `${page.displayName} must remain hidden in view mode.`,
      relative(pageFile),
    );
  }

  const titleVisual = visuals.find(
    ({ visual }) =>
      visual.position?.tabOrder === 9 && visual.visual?.visualType === "textbox",
  )?.visual;
  const subtitleVisual = visuals.find(
    ({ visual }) =>
      visual.position?.tabOrder === 10 && visual.visual?.visualType === "textbox",
  )?.visual;

  if (!titleVisual || text(titleVisual) !== expected.title) {
    issue(
      "page-title",
      `${page.displayName} has an inconsistent visible title.`,
      relative(pageFile),
    );
  }
  if (!subtitleVisual || text(subtitleVisual) !== expected.subtitle) {
    issue(
      "page-subtitle",
      `${page.displayName} has an inconsistent or unpolished subtitle.`,
      relative(pageFile),
    );
  }
  const subtitleParagraphs =
    subtitleVisual?.visual?.objects?.general?.[0]?.properties?.paragraphs ?? [];
  const subtitleText = subtitleVisual ? text(subtitleVisual) : "";
  if (
    subtitleParagraphs.length !== 1 ||
    subtitleParagraphs[0]?.textRuns?.length !== 1 ||
    (subtitleVisual?.position?.width ?? 0) < 420 ||
    (subtitleVisual?.position?.height ?? 0) < 34 ||
    subtitleText.length > 64
  ) {
    issue(
      "subtitle-fit",
      `${page.displayName} subtitle is not constrained to the safe single-run header contract.`,
      relative(pageFile),
    );
  }

  const tabOrders = new Map();
  for (const { file, visual } of visuals) {
    const serializedText = text(visual);
    if (serializedText.includes("Inventory Movement")) {
      issue(
        "navigation-language",
        `${page.displayName} still exposes the retired Inventory Movement label.`,
        relative(file),
      );
    }

    const position = visual.position ?? {};
    if (
      position.x < 0 ||
      position.y < 0 ||
      position.x + position.width > 1440 ||
      position.y + position.height > 810
    ) {
      evidence.outOfCanvas += 1;
      issue(
        "canvas-bounds",
        `${visual.name} is outside the 1440 x 810 canvas.`,
        relative(file),
      );
    }

    if (position.tabOrder !== undefined) {
      if (tabOrders.has(position.tabOrder)) {
        evidence.duplicateTabOrders += 1;
        issue(
          "duplicate-tab-order",
          `Tab order ${position.tabOrder} is duplicated on ${page.displayName}.`,
          relative(file),
        );
      }
      tabOrders.set(position.tabOrder, visual.name);
    }

    const type = visual.visual?.visualType;
    const requiresAccessibility = [
      "actionButton",
      "slicer",
      "cardVisual",
      "lineChart",
      "columnChart",
      "clusteredColumnChart",
      "clusteredBarChart",
      "donutChart",
      "scatterChart",
      "tableEx",
    ].includes(type);
    if (requiresAccessibility) {
      evidence.interactiveAndDataVisuals += 1;
      if (!altText(visual).trim()) {
        evidence.missingAltText += 1;
        issue(
          "missing-alt-text",
          `${type} ${visual.name} has no descriptive alt text.`,
          relative(file),
        );
      }
      if (!Number.isInteger(position.tabOrder) || position.tabOrder < 1) {
        issue(
          "missing-tab-order",
          `${type} ${visual.name} is missing a positive tab-order value.`,
          relative(file),
        );
      }
    }

    checkCompactRanking(visual, file);
    checkAxisTerminology(visual, file);
    checkManagementTable(visual, file);
    checkTypedDisplayUnitLiterals(visual, file);
  }

  if (expected.footer) {
    const footer = visuals.find(
      ({ visual }) =>
        visual.position?.tabOrder === 40 &&
        visual.visual?.visualType === "textbox",
    )?.visual;
    if (!footer || text(footer) !== expected.footer) {
      issue(
        "footer-copy",
        `${page.displayName} footer is stale, duplicated or not page-specific.`,
        relative(pageFile),
      );
    }
    const paragraphs =
      footer?.visual?.objects?.general?.[0]?.properties?.paragraphs ?? [];
    if (paragraphs.length !== 1 || paragraphs[0]?.textRuns?.length !== 2) {
      issue(
        "footer-structure",
        `${page.displayName} footer must contain one prefix run and one body run.`,
        relative(pageFile),
      );
    }
  }

  if (pageId === "0833d451cbce4704acf3") {
    const titles = new Set(visuals.map(({ visual }) => title(visual)).filter(Boolean));
    for (const required of requiredManagementTitles) {
      if (!titles.has(required)) {
        issue(
          "management-terminology",
          `Management Insights is missing approved title: ${required}.`,
          relative(pageFile),
        );
      }
    }
    for (const retired of [
      "Growing Products at Flow Risk",
      "Flow-Risk Revenue Share",
      "Cross-Region Exposure",
      "Flow-Risk Revenue by Category",
    ]) {
      if (titles.has(retired)) {
        issue(
          "retired-management-term",
          `Management Insights still exposes retired title: ${retired}.`,
          relative(pageFile),
        );
      }
    }
  }

  if (pageId === "1f4b43e6cf3bae8af6ab") {
    for (const [visualId, expectedOrder] of requiredModelTabOrder) {
      const modelVisual = visuals.find(({ visual }) => visual.name === visualId)?.visual;
      if (modelVisual?.position?.tabOrder !== expectedOrder) {
        issue(
          "model-reading-order",
          `Model visual ${visualId} is not in the approved reading order.`,
          relative(pageFile),
        );
      } else {
        evidence.modelReadingStops += 1;
      }
    }
    const modelChip = visuals.find(
      ({ visual }) => text(visual) === "10 relationships",
    )?.visual;
    if (!modelChip) {
      issue(
        "model-chip",
        "Data Model Overview must show the non-wrapping 10 relationships chip.",
        relative(pageFile),
      );
    }
    const retiredModelHeights = new Map([
      [254, 52],
      [372, 90],
      [518, 62],
      [634, 58],
    ]);
    for (const { file, visual } of visuals) {
      if (
        visual.visual?.visualType === "textbox" &&
        retiredModelHeights.get(visual.position?.y) === visual.position?.height
      ) {
        issue(
          "model-text-fit",
          "A model-node textbox still uses the clipped pre-polish height.",
          relative(file),
        );
      }
    }
  }
}

const contrastPairs = [
  ["primary text", "#0D2A3C", "#FFFCF7", 4.5],
  ["secondary text", "#566671", "#FFFCF7", 4.5],
  ["active navigation", "#061A2E", "#A8CF24", 4.5],
  ["inactive navigation", "#F4F7FA", "#172436", 4.5],
];
for (const [name, foreground, background, minimum] of contrastPairs) {
  const ratio = contrastRatio(foreground, background);
  evidence.contrast[name] = Number(ratio.toFixed(2));
  if (ratio < minimum) {
    issue(
      "contrast",
      `${name} contrast is ${ratio.toFixed(2)}:1; minimum is ${minimum}:1.`,
    );
  }
}

const result = {
  status: issues.length === 0 ? "passed" : "failed",
  issueCount: issues.length,
  evidence,
  issues,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = issues.length === 0 ? 0 : 1;
