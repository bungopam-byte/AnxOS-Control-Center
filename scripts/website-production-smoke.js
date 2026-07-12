const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const websiteRoot = path.join(root, "website");

function read(file) {
  return fs.readFileSync(path.join(websiteRoot, file), "utf8");
}

const index = read("index.html");
const activate = read("activate.html");
const forgot = read("forgot-password.html");
const reset = read("reset-password.html");
const releaseNotes = read("release-notes.html");
const site = read("site.js");
const styles = read("styles.css");

["index.html", "activate.html", "forgot-password.html", "reset-password.html", "release-notes.html"].forEach((file) => {
  const html = read(file);
  assert(html.includes("data-site-menu-toggle"), `${file} must expose the mobile navigation toggle.`);
  assert(html.includes("data-site-nav"), `${file} must expose the mobile navigation target.`);
});

assert(!index.includes("8 players"), "Homepage must not show fake player counts.");
assert(!index.includes("[11:57:42]"), "Homepage must not show fake timestamped console output.");
assert(index.includes("Live health appears after you connect an Agent"), "Homepage preview should be honest about live data.");
assert(index.includes("Runtime Dependencies") && index.includes("Prepare Node"), "Homepage should mention runtime dependency management.");

assert(index.includes("data-download-status"), "Downloads page should expose release metadata status.");
assert(site.includes("Release metadata is unavailable"), "Downloads should handle missing release metadata.");
assert(site.includes('node.setAttribute("aria-disabled", "true")'), "Unavailable download/config links should become disabled, not dead # links.");

assert(index.includes('id="not-found"') && site.includes('window.location.hash = "not-found"'), "Website must route unsupported hashes to a not-found state.");
assert(site.includes('selectedState = "loading"'), "Sign-in route should show loading state instead of flashing signed-out UI while auth initializes.");
assert(site.includes("WEBSITE_DEBUG") && site.includes("if (!WEBSITE_DEBUG) return;"), "Verbose website auth logging must be opt-in.");

assert(index.includes('name="passwordConfirm"'), "Create account and reset forms should include password confirmation.");
assert(site.includes('setMessage("signup", "Passwords do not match.", "error")'), "Sign-up should validate password confirmation before network calls.");
assert(activate.includes("Opening this page never approves a device automatically."), "Activation page must explicitly avoid auto-approval ambiguity.");
assert(activate.includes('autocomplete="one-time-code"') && activate.includes('autocapitalize="characters"') && activate.includes('spellcheck="false"'), "Activation code input must support mobile/paste ergonomics.");

assert(styles.includes(".site-menu-button") && styles.includes(".site-nav.is-open"), "Website CSS must include mobile menu states.");
assert(styles.includes("@media (prefers-reduced-motion: reduce)"), "Website must respect reduced-motion preference.");
assert(styles.includes(".download-status") && styles.includes(".account-unavailable"), "Website must style honest loading/unavailable states.");

console.log("Website production smoke checks passed.");
