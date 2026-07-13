const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const site = read("website/site.js");
const activate = read("website/activate/index.html");
const edgeFunction = read("supabase/functions/anxos-account/index.ts");
const packageJson = read("package.json");

assert(packageJson.includes('"device-activation:smoke"'), "Package scripts should expose the device activation smoke test.");

assert(site.includes('apikey: accountConfig.supabaseAnonKey'), "All website account API requests must include the Supabase anon apikey.");
assert(site.includes('authorization: `Bearer ${accessToken}`'), "Protected website account API requests must include the current bearer token.");
assert(site.includes("const requireAuth = options.requireAuth !== false"), "Website API helper must support public and protected account API requests.");
assert(site.includes("waitForAuthRestoration") && site.includes("authInitializationPromise"), "Protected account requests must wait for bounded auth restoration.");
assert(site.includes("AUTH_SESSION_RESTORE_TIMEOUT") && site.includes("api-auth-restore-timeout"), "Auth restoration timeout must become a clear auth state.");
assert(site.includes('requireAuth: false') && site.includes('"/api/auth/device/lookup"'), "Device review must use a public device-code lookup request.");
assert(site.includes("requireSignedInForDeviceAction"), "Device approve/deny actions must require a signed-in session.");
assert(site.includes("setDeviceActions(true)") && site.includes("currentDeviceRequest = result.device"), "Valid device lookup must enable approve/deny only after loading a request.");
assert(site.includes("renderDeviceSummary(null)") && site.includes("Waiting for code"), "Invalid or unavailable device lookups must reset the requesting-device panel.");
assert(site.includes("friendlyAccountDataError(error)") && site.includes("ACCOUNT_NETWORK_OR_CORS"), "Activation and account UI must classify fetch/CORS failures instead of showing raw errors.");
assert(!site.includes('setDeviceMessage(friendlyAuthError(error), "error")'), "Activation API failures should use account data error classification, not raw auth-only messages.");

assert(activate.includes('data-device-action="lookup"'), "Activation page must expose Review Device.");
assert(activate.includes('data-device-action="approve" disabled'), "Activation page must keep Approve disabled until lookup succeeds.");
assert(activate.includes('data-device-action="deny" disabled'), "Activation page must keep Deny disabled until lookup succeeds.");
assert(activate.includes("Opening this page never approves a device automatically."), "Activation page must state that approval is never automatic.");

const lookupBody = edgeFunction.slice(
  edgeFunction.indexOf("async function lookupDevice"),
  edgeFunction.indexOf("async function approveDevice")
);
assert(!lookupBody.includes("requireWebsiteUser"), "Device lookup must not require a website user session.");
assert(lookupBody.includes("getRequestByUserCode") && lookupBody.includes("publicDeviceRequest"), "Device lookup must return only the public device request data.");
assert(!lookupBody.includes("accountId"), "Public device lookup must not expose account identifiers.");

const approveBody = edgeFunction.slice(
  edgeFunction.indexOf("async function approveDevice"),
  edgeFunction.indexOf("async function denyDevice")
);
const denyBody = edgeFunction.slice(
  edgeFunction.indexOf("async function denyDevice"),
  edgeFunction.indexOf("async function refreshDesktopSession")
);
assert(approveBody.includes("requireWebsiteUser"), "Device approval must require an authenticated website user.");
assert(denyBody.includes("requireWebsiteUser"), "Device denial must require an authenticated website user.");
assert(edgeFunction.includes('"access-control-allow-headers": "authorization,content-type,x-client-info,apikey"'), "Supabase function CORS must allow apikey and authorization headers.");
assert(edgeFunction.includes('"https://anxoscontrolcenter.org"'), "Supabase function CORS defaults must include the official production origin.");

console.log("Device activation smoke checks passed.");
