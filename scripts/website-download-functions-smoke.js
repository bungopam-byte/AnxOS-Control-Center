const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "website", "functions", "api", "download", "latest", "[platform].js"), "utf8");
const worker = fs.readFileSync(path.join(__dirname, "..", "website", "_worker.js"), "utf8");
for (const route of ["windows", "windows-portable", "linux-appimage", "linux-deb"]) {
  assert(new RegExp(`(?:^|[\\s"'])${route}(?:["'\\s:]|$)`).test(source), `Function must define ${route} asset routing.`);
}
assert(source.includes("status: 302") && source.includes("location: asset.browser_download_url"), "Routes must return redirects to the verified release asset.");
assert(source.includes("ANXOS_RELEASE_REPOSITORY") && source.includes("ANXOS_GITHUB_REPOSITORY"), "Repository configuration must support the documented environment variables.");
assert(!source.includes("index.html") && !source.includes("text/html"), "API functions must not use the SPA fallback.");
assert(worker.includes("env.ASSETS.fetch(request)") && worker.includes("/api/download/latest/"), "Pages worker must route API requests before static assets.");
console.log("website download function smoke: PASS");
