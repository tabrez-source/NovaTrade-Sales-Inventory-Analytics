#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");
const semanticRoot = path.join(root, "powerbi", "NovaTrade.SemanticModel", "definition");
const reportRoot = path.join(root, "powerbi", "NovaTrade.Report", "definition", "pages");
const issues = [];
const expectedRows = [
  ["ceo@novatrade.example", "CEO", "GLOBAL", "null", "null", "true"],
  ["manager@novatrade.example", "Manager", "GLOBAL", "null", "null", "true"],
  ["sales.mumbai@novatrade.example", "Mumbai Salesperson", "REGION", "1", "West", "true"],
  ["sales.chennai@novatrade.example", "Chennai Salesperson", "REGION", "2", "South", "true"],
  ["sales.delhi@novatrade.example", "Delhi Salesperson", "REGION", "3", "North", "true"],
  ["sales.kolkata@novatrade.example", "Kolkata Salesperson", "REGION", "4", "East", "true"],
];
const allowedChanges = new Set([
  ".github/workflows/powerbi-ci.yml",
  "powerbi/NovaTrade.SemanticModel/definition/tables/Security UserAccess.tmdl",
  "powerbi/NovaTrade.SemanticModel/definition/roles/Dynamic Regional Access.tmdl",
  "scripts/qa/validate-rls-governance-checkpoint.mjs",
  "scripts/qa/validate-governance-checkpoint.mjs",
  "scripts/qa/validate-final-polish-checkpoint.mjs",
  "scripts/powerbi/build-final-report-polish.mjs",
  "scripts/powerbi/build-report-governance.mjs",
  "docs/REPORT-GOVERNANCE-PAGES.md",
  "powerbi/NovaTrade.SemanticModel/definition/model.tmdl",
  "powerbi/NovaTrade.SemanticModel/definition/relationships.tmdl",
  "powerbi/NovaTrade.SemanticModel/definition/tables/fact FactInventoryMovement.tmdl",
  "powerbi/NovaTrade.Report/definition/pages/1f4b43e6cf3bae8af6ab/visuals/397801e0501ce474/visual.json",
]);

function fail(message) {
  issues.push(message);
}

function compact(text) {
  return text.replace(/\s+/g, "");
}

function normalizedUpn(value) {
  return value.trim().toLowerCase();
}

function hasKnownAccess(rows, upn, branchId) {
  const current = normalizedUpn(upn);
  return rows.some((row) =>
    row.IsActive
      && normalizedUpn(row.UserPrincipalName) === current
      && (row.AccessScope === "GLOBAL" || row.BranchID === branchId),
  );
}

function movementBranch(movementType, toBranchId, fromBranchId) {
  const normalized = String(movementType ?? "").trim().toUpperCase();
  if (normalized === "INWARD") return toBranchId;
  if (normalized === "OUTWARD") return fromBranchId;
  return toBranchId ?? fromBranchId;
}

function gitPaths(args) {
  return execFileSync("git", args, { cwd: root })
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"));
}

async function walkVisualFiles(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walkVisualFiles(entryPath, output);
    if (entry.isFile() && entry.name === "visual.json") output.push(entryPath);
  }
  return output;
}

function changedPaths() {
  return [
    ...new Set([
      ...gitPaths(["diff", "--name-only", "-z", "origin/main...HEAD"]),
      ...gitPaths(["diff", "--name-only", "-z", "HEAD"]),
      ...gitPaths(["ls-files", "--others", "--exclude-standard", "-z"]),
    ]),
  ];
}

const files = {
  model: path.join(semanticRoot, "model.tmdl"),
  relationships: path.join(semanticRoot, "relationships.tmdl"),
  inventory: path.join(semanticRoot, "tables", "fact FactInventoryMovement.tmdl"),
  access: path.join(semanticRoot, "tables", "Security UserAccess.tmdl"),
  role: path.join(semanticRoot, "roles", "Dynamic Regional Access.tmdl"),
};
const [model, relationships, inventory, access, role] = await Promise.all(
  Object.values(files).map((file) => readFile(file, "utf8")),
);

for (const changedPath of changedPaths()) {
  if (!allowedChanges.has(changedPath)) {
    fail(`Only the approved RLS files may change; found ${changedPath}.`);
  }
}

if (!model.includes("ref table 'Security UserAccess'") || !model.includes("ref role 'Dynamic Regional Access'")) {
  fail("model.tmdl must reference Security UserAccess and Dynamic Regional Access.");
}
if (!model.includes('"Security UserAccess"')) {
  fail("PBI_QueryOrder must include Security UserAccess.");
}

if (!/^table 'Security UserAccess'\n\tisHidden/m.test(access)) {
  fail("Security UserAccess must be a hidden table.");
}
for (const [column, type] of [
  ["UserPrincipalName", "string"], ["Persona", "string"], ["AccessScope", "string"],
  ["BranchID", "int64"], ["RegionName", "string"], ["IsActive", "boolean"],
]) {
  const columnBlock = access.match(new RegExp(`column ${column}([\\s\\S]*?)(?=\\n\\tcolumn |\\n\\tpartition )`))?.[1] ?? "";
  if (!columnBlock.includes("isHidden") || !columnBlock.includes(`dataType: ${type}`)) {
    fail(`Security UserAccess[${column}] must be hidden and typed ${type}.`);
  }
}
if (!access.includes("BranchID = nullable Int64.Type") || !access.includes("RegionName = nullable text")) {
  fail("Security UserAccess must use nullable BranchID and RegionName types.");
}
if ((access.match(/@/g) ?? []).length !== 6 || (access.match(/@novatrade\.example/g) ?? []).length !== 6) {
  fail("Security UserAccess must contain exactly six synthetic .example identities.");
}
for (const row of expectedRows) {
  const literal = `{\"${row[0]}\", \"${row[1]}\", \"${row[2]}\", ${row[3]}, ${row[4] === "null" ? "null" : `\"${row[4]}\"`}, ${row[5]}}`;
  if (!access.includes(literal)) fail(`Security UserAccess is missing the required mapping: ${row.join(" | ")}.`);
}
const upns = expectedRows.map(([upn]) => upn);
if (new Set(upns).size !== 6 || expectedRows.some((row) => row[5] !== "true")) {
  fail("Security UserAccess mappings must be unique and active.");
}
if (/password|credential|tenant|secret/i.test(access)) {
  fail("Security UserAccess must not serialize credentials, tenant data, or secrets.");
}

const roleFiles = await readdir(path.join(semanticRoot, "roles"));
if (roleFiles.length !== 1 || roleFiles[0] !== "Dynamic Regional Access.tmdl") {
  fail("Exactly one role definition must exist.");
}
if (!role.includes("modelPermission: read") || /\bmember(s)?\b/i.test(role)) {
  fail("Dynamic Regional Access must be read-only and contain no serialized members.");
}
const permissionNames = [...role.matchAll(/^\ttablePermission '([^']+)' =/gm)].map((match) => match[1]);
if (permissionNames.join("|") !== "Security UserAccess|dim DimBranch") {
  fail("The role may have table permissions only on Security UserAccess and dim DimBranch.");
}
const roleCompact = compact(role);
const upnMatch = "LOWER(TRIM(USERPRINCIPALNAME()))";
if ((roleCompact.match(/USERPRINCIPALNAME\(\)/g) ?? []).length < 2 || (roleCompact.match(new RegExp(upnMatch.replace(/[()]/g, "\\$&"), "g")) ?? []).length < 2) {
  fail("Both table permissions must defensively match LOWER(TRIM(USERPRINCIPALNAME())).");
}
if (!roleCompact.includes("'SecurityUserAccess'[IsActive]=TRUE()") || !roleCompact.includes("'SecurityUserAccess'[AccessScope]=\"GLOBAL\"") || !roleCompact.includes("'SecurityUserAccess'[AccessScope]=\"REGION\"")) {
  fail("Role permissions must require active mappings and implement GLOBAL and REGION scopes.");
}
if (!roleCompact.includes("'SecurityUserAccess'[BranchID]=CurrentBranchID") || !roleCompact.includes("RETURNHasGlobalAccess||HasRegionalAccess")) {
  fail("DimBranch permission must use mapped BranchID with no permissive fallback.");
}
if (/DimFromGodown|DimToGodown/.test(role)) {
  fail("The role must not add security filters to either role-playing godown dimension.");
}

const inventoryColumn = inventory.match(/\tcolumn MovementBranchID =([\s\S]*?)(?=\n\tpartition )/)?.[1] ?? "";
const inventoryCompact = compact(inventoryColumn);
for (const required of [
  "UPPER(TRIM(COALESCE('factFactInventoryMovement'[MovementType],\"\")))",
  "RELATED('dimDimToGodown'[BranchID])",
  "RELATED('dimDimFromGodown'[BranchID])",
  "NormalizedMovementType=\"INWARD\",ToBranchID",
  "NormalizedMovementType=\"OUTWARD\",FromBranchID",
  "NOTISBLANK(ToBranchID),ToBranchID",
  "FromBranchID",
  "isHidden",
  "dataType:int64",
]) {
  if (!inventoryCompact.includes(required)) fail(`MovementBranchID is missing required logic: ${required}.`);
}
if (/LOOKUPVALUE/i.test(inventoryColumn)) fail("MovementBranchID must use RELATED(), not LOOKUPVALUE().");

const relationshipCount = relationships.match(/^relationship /gm)?.length ?? 0;
const expectedInventoryRelationship = /relationship [\w-]+\r?\n\tfromColumn: 'fact FactInventoryMovement'\.MovementBranchID\r?\n\ttoColumn: 'dim DimBranch'\.BranchID/m;
const expectedSalesRelationship = /relationship 719997ab-88e7-9460-c96b-be5db755dbc9\r?\n\tfromColumn: 'fact FactSales'\.BranchKey\r?\n\ttoColumn: 'dim DimBranch'\.BranchKey/m;
if (relationshipCount !== 11 || !expectedInventoryRelationship.test(relationships)) {
  fail("Exactly one active FactInventoryMovement[MovementBranchID] to DimBranch[BranchID] relationship is required.");
}
if (!expectedSalesRelationship.test(relationships)) fail("The existing FactSales to DimBranch relationship must remain unchanged.");
if (/crossFilteringBehavior:\s*both|securityFilteringBehavior:\s*both|isActive:\s*false/i.test(relationships)) {
  fail("Relationships must remain active, single-direction, and not security-filtered both ways.");
}

const visualFiles = await walkVisualFiles(reportRoot);
const expectedMovementVisuals = new Set([
  "6e63e51a13c0cbcb29b1/visuals/1a0b8ab2ca418f94/visual.json",
  "6e63e51a13c0cbcb29b1/visuals/7661639911ccad73/visual.json",
  "6e63e51a13c0cbcb29b1/visuals/60cbdf65c8d1dc44/visual.json",
]);
const foundMovementVisuals = new Set();
const allowedRegionSlicers = new Set([
  "Executive Overview/7419fa310624fdff/PhysicalRegionName",
  "Sales Performance/839d94e7daa0b164/ReportingRegionName",
  "Product Performance/e603411bce77a633/ReportingRegionName",
]);
const sensitiveMembers = new Set(["DistributorName", "SalesHeadName", "GodownName", "BranchName", "GodownID", "BranchID"]);
for (const file of visualFiles) {
  const visual = JSON.parse(await readFile(file, "utf8"));
  const serialized = JSON.stringify(visual);
  const relative = path.relative(reportRoot, file).replaceAll("\\", "/");
  for (const table of ["dim DimGodown", "dim DimFromGodown", "dim DimToGodown"]) {
    if (serialized.includes(`\"Entity\":\"${table}\"`)) fail(`${relative} directly binds ${table}.`);
  }
  if (serialized.includes('"Entity":"fact FactInventoryMovement"') && serialized.includes('"Property":"MovementGodown"')) {
    foundMovementVisuals.add(relative);
  }
  const visualType = visual.visual?.visualType;
  const hasMeasure = serialized.includes('"Measure"');
  const columns = [...serialized.matchAll(/\"Column\":\{[^}]*\"Property\":\"([^\"]+)\"/g)].map((match) => match[1]);
  if ((visualType === "slicer" || visualType === "tableEx" || visualType === "table") && !hasMeasure && columns.some((column) => sensitiveMembers.has(column))) {
    fail(`${relative} exposes a sensitive regional member list without an RLS-filtered measure context.`);
  }
  if (visualType === "slicer") {
    for (const column of columns.filter((name) => name === "PhysicalRegionName" || name === "ReportingRegionName")) {
      const pageName = visual.singleVisual?.vcObjects?.title?.[0]?.properties?.text?.expr?.Literal?.Value ?? "";
      const visualId = path.basename(path.dirname(file));
      const known = [...allowedRegionSlicers].some((entry) => entry.includes(`/${visualId}/${column}`));
      if (!known) fail(`${relative} has a non-allowlisted standalone region-label slicer: ${column}.`);
      void pageName;
    }
  }
}
if (foundMovementVisuals.size !== 3 || [...foundMovementVisuals].some((file) => !expectedMovementVisuals.has(file))) {
  fail("The three existing MovementGodown visual bindings must remain unchanged.");
}

const fixtures = expectedRows.map(([UserPrincipalName, Persona, AccessScope, BranchID, RegionName]) => ({
  UserPrincipalName, Persona, AccessScope, BranchID: BranchID === "null" ? null : Number(BranchID), RegionName: RegionName === "null" ? null : RegionName, IsActive: true,
}));
for (const branchId of [1, 2, 3, 4]) {
  if (!hasKnownAccess(fixtures, "ceo@novatrade.example", branchId) || !hasKnownAccess(fixtures, "manager@novatrade.example", branchId)) {
    fail("Global fixtures must allow every branch.");
  }
}
for (const row of fixtures.filter((row) => row.AccessScope === "REGION")) {
  if (!hasKnownAccess(fixtures, row.UserPrincipalName, row.BranchID) || hasKnownAccess(fixtures, row.UserPrincipalName, row.BranchID === 1 ? 2 : 1)) {
    fail(`Regional fixture is not limited to BranchID ${row.BranchID}.`);
  }
}
if (hasKnownAccess(fixtures, "unknown@novatrade.example", 1) || hasKnownAccess(fixtures.map((row) => ({ ...row, IsActive: false })), "sales.mumbai@novatrade.example", 1)) {
  fail("Unknown and inactive fixtures must deny access.");
}
for (const [type, toBranch, fromBranch, expected] of [
  [" inward ", 2, 1, 2], ["OUTWARD", 2, 1, 1], ["TRANSFER", 2, 1, 2], ["OTHER", null, 1, 1],
]) {
  if (movementBranch(type, toBranch, fromBranch) !== expected) fail(`Movement fixture failed for ${type}.`);
}

const result = {
  status: issues.length ? "failed" : "passed",
  issueCount: issues.length,
  evidence: {
    accessMappings: expectedRows.length,
    rolePermissions: permissionNames,
    activeRelationships: relationshipCount,
    movementGodownVisuals: [...foundMovementVisuals].sort(),
    visualFilesAudited: visualFiles.length,
    fixtures: ["global", "regional", "unknown", "inactive", "inward", "outward", "transfer-to", "fallback-from"],
  },
  issues,
};
console.log(JSON.stringify(result, null, 2));
if (issues.length) process.exit(1);
