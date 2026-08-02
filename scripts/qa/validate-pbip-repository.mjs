#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const powerBiRoot = path.join(root, "powerbi");
const issues = [];
const evidence = {
  jsonFiles: 0,
  pbipProjects: 0,
  reports: 0,
  semanticModels: 0,
  pages: 0,
  visuals: 0,
  tmdlFiles: 0,
  registeredResources: 0,
};

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function addIssue(code, message, file = null) {
  issues.push({ code, message, ...(file ? { file: relative(file) } : {}) });
}

async function exists(file, type = null) {
  try {
    const details = await stat(file);
    if (type === "file") return details.isFile();
    if (type === "directory") return details.isDirectory();
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  if (!(await exists(directory, "directory"))) return files;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    addIssue("invalid-json", error.message, file);
    return null;
  }
}

async function requirePath(file, type, code) {
  if (!(await exists(file, type))) {
    addIssue(code, `Required ${type} is missing.`, file);
    return false;
  }
  return true;
}

async function validateJsonFiles(files) {
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  evidence.jsonFiles = jsonFiles.length;
  await Promise.all(jsonFiles.map((file) => readJson(file)));
}

async function validateResources(reportDirectory, report) {
  for (const resourcePackage of report?.resourcePackages ?? []) {
    for (const item of resourcePackage.items ?? []) {
      const resource = path.join(
        reportDirectory,
        "StaticResources",
        resourcePackage.name,
        item.path,
      );
      if (await requirePath(resource, "file", "missing-resource")) {
        evidence.registeredResources += 1;
      }
    }
  }
}

async function validatePages(reportDirectory) {
  const pagesDirectory = path.join(reportDirectory, "definition", "pages");
  const pagesFile = path.join(pagesDirectory, "pages.json");
  if (!(await requirePath(pagesFile, "file", "missing-pages-metadata"))) return;

  const metadata = await readJson(pagesFile);
  if (!metadata) return;

  const pageOrder = metadata.pageOrder;
  if (!Array.isArray(pageOrder) || pageOrder.length === 0) {
    addIssue("page-order", "pageOrder must contain at least one page.", pagesFile);
    return;
  }

  if (new Set(pageOrder).size !== pageOrder.length) {
    addIssue("duplicate-page", "pageOrder contains duplicate page IDs.", pagesFile);
  }
  if (!pageOrder.includes(metadata.activePageName)) {
    addIssue("active-page", "activePageName is not present in pageOrder.", pagesFile);
  }

  const pageDirectories = (await readdir(pagesDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const pageId of pageOrder) {
    const pageDirectory = path.join(pagesDirectory, pageId);
    const pageFile = path.join(pageDirectory, "page.json");
    if (!(await requirePath(pageFile, "file", "missing-page"))) continue;

    const page = await readJson(pageFile);
    if (!page?.displayName?.trim()) {
      addIssue("page-name", "Page displayName must not be empty.", pageFile);
    }
    evidence.pages += 1;

    const visualsDirectory = path.join(pageDirectory, "visuals");
    if (!(await exists(visualsDirectory, "directory"))) continue;

    const visualDirectories = (
      await readdir(visualsDirectory, { withFileTypes: true })
    ).filter((entry) => entry.isDirectory());

    for (const visualDirectory of visualDirectories) {
      const visualFile = path.join(
        visualsDirectory,
        visualDirectory.name,
        "visual.json",
      );
      if (await requirePath(visualFile, "file", "missing-visual")) {
        evidence.visuals += 1;
      }
    }
  }

  for (const pageId of pageDirectories) {
    if (!pageOrder.includes(pageId)) {
      addIssue(
        "orphan-page",
        "Page directory is not referenced by pageOrder.",
        path.join(pagesDirectory, pageId),
      );
    }
  }
}

async function validateSemanticModel(reportDirectory, reportDefinition) {
  const modelPath = reportDefinition?.datasetReference?.byPath?.path;
  if (!modelPath) {
    addIssue(
      "dataset-reference",
      "Report must reference its semantic model by path.",
      path.join(reportDirectory, "definition.pbir"),
    );
    return;
  }

  const modelDirectory = path.resolve(reportDirectory, modelPath);
  if (!modelDirectory.startsWith(`${powerBiRoot}${path.sep}`)) {
    addIssue(
      "dataset-path",
      "Semantic-model path resolves outside the powerbi directory.",
      path.join(reportDirectory, "definition.pbir"),
    );
    return;
  }

  const required = [
    [path.join(modelDirectory, ".platform"), "semantic-platform"],
    [path.join(modelDirectory, "definition.pbism"), "semantic-definition"],
    [path.join(modelDirectory, "definition", "model.tmdl"), "semantic-model"],
  ];
  for (const [file, code] of required) {
    await requirePath(file, "file", code);
  }
  evidence.semanticModels += 1;
}

async function validateProject(projectFile) {
  const project = await readJson(projectFile);
  if (!project) return;

  const artifacts = project.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    addIssue("project-artifacts", "PBIP project has no report artifacts.", projectFile);
    return;
  }
  evidence.pbipProjects += 1;

  for (const artifact of artifacts) {
    const reportPath = artifact?.report?.path;
    if (!reportPath) {
      addIssue("report-path", "Report artifact has no path.", projectFile);
      continue;
    }

    const reportDirectory = path.resolve(path.dirname(projectFile), reportPath);
    if (!reportDirectory.startsWith(`${powerBiRoot}${path.sep}`)) {
      addIssue(
        "report-path",
        "Report path resolves outside the powerbi directory.",
        projectFile,
      );
      continue;
    }

    const required = [
      [path.join(reportDirectory, ".platform"), "report-platform"],
      [path.join(reportDirectory, "definition.pbir"), "report-definition"],
      [
        path.join(reportDirectory, "definition", "report.json"),
        "report-metadata",
      ],
    ];
    for (const [file, code] of required) {
      await requirePath(file, "file", code);
    }

    const reportDefinition = await readJson(
      path.join(reportDirectory, "definition.pbir"),
    );
    const report = await readJson(
      path.join(reportDirectory, "definition", "report.json"),
    );

    evidence.reports += 1;
    await validateSemanticModel(reportDirectory, reportDefinition);
    await validatePages(reportDirectory);
    await validateResources(reportDirectory, report);
  }
}

async function validateTmdl(files) {
  const tmdlFiles = files.filter((file) => file.endsWith(".tmdl"));
  evidence.tmdlFiles = tmdlFiles.length;

  for (const file of tmdlFiles) {
    const content = await readFile(file, "utf8");
    if (!content.trim()) {
      addIssue("empty-tmdl", "TMDL file is empty.", file);
    }
    if (/^(<<<<<<<|=======|>>>>>>>)/m.test(content)) {
      addIssue("merge-marker", "Unresolved Git merge marker found.", file);
    }
    if (/^\+/m.test(content)) {
      addIssue(
        "diff-marker",
        "Literal leading '+' diff marker found in TMDL content.",
        file,
      );
    }
  }
}

if (!(await requirePath(powerBiRoot, "directory", "powerbi-root"))) {
  process.exitCode = 1;
} else {
  const files = await walk(powerBiRoot);
  await validateJsonFiles(files);
  await validateTmdl(files);

  const projectFiles = files.filter((file) => file.endsWith(".pbip"));
  if (projectFiles.length === 0) {
    addIssue("pbip-project", "No PBIP project file was found.", powerBiRoot);
  }
  for (const projectFile of projectFiles) {
    await validateProject(projectFile);
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
