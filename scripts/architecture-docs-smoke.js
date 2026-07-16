#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const packageJson = require("../package.json");

const root = path.resolve(__dirname, "..");
const required = {
  "docs/ARCHITECTURE.md": ["Runtime boundaries", "State ownership", "Persistence", "Packaging", "Known boundaries"],
  "docs/OPERATION_FRAMEWORK.md": ["runtime compatibility", "Persistence and crash recovery", "Secret redaction", "Rollback honesty"],
  "docs/NODE_TARGETING.md": ["canonical source", "selection version", "explicit target"],
  "docs/ERROR_CONTRACT.md": ["friendlyMessage", "technicalDetails", "retryable", "redacted diagnostics"],
  "docs/SECURITY_BOUNDARIES.md": ["Renderer and preload", "Desktop main process", "Agent", "Secrets and diagnostics"],
  "docs/CONFIG_MIGRATIONS.md": ["schema version", "future", "atomic"],
  "docs/RECOVERY_MODEL.md": ["Operations", "Agent connectivity", "Instances", "Backup restore", "Shutdown", "Desktop updates"],
  "docs/TEST_MATRIX.md": ["Shared operations", "Node selection/races", "Full repository gate"],
};

for (const [relativePath, phrases] of Object.entries(required)) {
  const filePath = path.join(root, relativePath);
  assert(fs.existsSync(filePath), `${relativePath} must exist.`);
  const source = fs.readFileSync(filePath, "utf8");
  for (const phrase of phrases) assert(source.includes(phrase), `${relativePath} must describe ${phrase}.`);
}

const documentedCommands = new Set();
for (const relativePath of Object.keys(required)) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const match of source.matchAll(/`npm run ([a-z0-9:_-]+)(?:\s[^`]*)?`/gi)) documentedCommands.add(match[1]);
}
for (const command of documentedCommands) {
  assert(packageJson.scripts[command], `Documented npm command must exist: ${command}`);
}

console.log(`Architecture documentation smoke passed (${Object.keys(required).length} required documents, ${documentedCommands.size} npm commands).`);
