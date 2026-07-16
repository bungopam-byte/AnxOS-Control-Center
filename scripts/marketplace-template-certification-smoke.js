#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const templates = require("../config/marketplace-templates.json");
const matrix = fs.readFileSync(path.join(root, "docs", "MARKETPLACE_TEMPLATE_CERTIFICATION.md"), "utf8");

function certification(template) {
  if (template.disabled === true || template.comingSoon === true || template.installerType === "no-install") return "Disabled";
  if (template.deprecated === true) return "Deprecated";
  if (template.unsupported === true) return "Unsupported";
  if (template.experimental === true || template.manualStartRequired === true || template.installerType === "local-import") return "Experimental";
  return "Supported";
}

assert(Array.isArray(templates) && templates.length > 0, "Marketplace template catalog must be a non-empty array.");
for (const template of templates) {
  const status = certification(template);
  assert(["Supported", "Experimental", "Disabled", "Deprecated", "Unsupported"].includes(status));
  assert(matrix.includes(`| \`${template.id}\` | ${status} |`), `Certification matrix must classify ${template.id} as ${status}.`);
}
assert.strictEqual((matrix.match(/^\| `[^`]+` \|/gm) || []).length, templates.length, "Certification matrix must contain exactly one row per template.");

console.log(`Marketplace template certification passed (${templates.length} templates).`);
