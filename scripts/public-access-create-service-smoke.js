const fs = require("fs");

const source = fs.readFileSync("app.js", "utf8");
const required = [
  ["form submit handler", 'form.addEventListener("submit", (event) =>'],
  ["submitting guard", "if (submitting) return;"],
  ["selected instance lookup", "values.instanceId"],
  ["trusted instance request", "createAccessServiceForInstance(instance, \"playit\")"],
  ["instance payload identity", "linkedInstanceId: instance.id"],
  ["request completion", "Create Service request completed"],
  ["failure surfaced", "friendlyPublicAccessCreateError(error)"],
  ["dynamic node context", 'createNodeActionContext("public-access-create-service")'],
];

const missing = required.filter(([, needle]) => !source.includes(needle));
if (missing.length) {
  throw new Error(`Public Access Create Service regression checks failed: ${missing.map(([name]) => name).join(", ")}`);
}

if (/createAccessServiceForInstance\([\s\S]{0,300}?\)\s*\{[\s\S]{0,500}?return null;/.test(source)) {
  throw new Error("Create Service path still silently returns null before reporting failure.");
}

console.log("Public Access Create Service smoke checks passed.");
