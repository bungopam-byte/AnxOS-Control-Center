#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const accountService = fs.readFileSync(path.join(root, "src", "services", "accountAuthService.js"), "utf8");

assert(accountService.includes("function getSupabaseProjectRefFromUrl"), "Account service must derive the Supabase project ref from configured URLs.");
assert(accountService.includes("projectRef: getAccountProjectRef()") && accountService.includes("projectId: getAccountProjectRef()"), "Account refresh payload must include project context.");
assert(accountService.includes("ANXOS_SUPABASE_PROJECT_REF") && accountService.includes("SUPABASE_PROJECT_REF"), "Environment configuration must support explicit project refs.");
assert(accountService.includes("getSupabaseProjectRefFromUrl(accountApiUrl)") && accountService.includes("getSupabaseProjectRefFromUrl(supabaseUrl)"), "Project ref derivation must support account API and Supabase auth URLs.");
assert(accountService.includes("Account API URL is missing the Supabase project reference"), "Project-less Supabase account API URLs must remain rejected.");

console.log("Account project context smoke checks passed.");
