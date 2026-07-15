#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const service = fs.readFileSync(path.join(root, "src", "services", "marketplaceInstallService.js"), "utf8");

assert(app.includes("function classifyMarketplaceServerPackCapability"), "Renderer must classify provider server-pack capability.");
assert(app.includes("Official Server Pack Available"), "CurseForge explicit server packs must be labeled installable.");
assert(app.includes("Client Pack Only"), "Client-only provider projects must be visibly labeled.");
assert(app.includes("This version does not provide an official dedicated-server pack on CurseForge."), "Client-only CurseForge UX must use clear wording.");
assert(app.includes("Browse Server-Compatible Packs"), "Client-only UX must offer a server-compatible browse action.");
assert(app.includes("marketplaceInstallButton.disabled = marketplaceInstallInFlight || (isProviderMarketplaceTemplate(template) && capability.installable === false)"), "Normal Install action must be disabled for classified client-only provider selections.");
assert(app.includes("if (isProviderMarketplaceTemplate(template) && capability.installable === false)"), "Submit handler must block client-only provider selections before Agent work.");
assert(service.includes("createCurseForgeServerPackRequiredError"), "Service must preserve structured CURSEFORGE_SERVER_PACK_REQUIRED errors.");
assert(service.includes("This project does not provide a compatible dedicated-server pack for the selected version."), "Structured server-pack-required error wording must remain concise.");
assert(service.includes("emitProgress({ ...progressState, stage: \"resolving\""), "Compatible provider installs must still proceed through server-pack resolution.");

console.log("Marketplace server capability UX smoke checks passed.");
