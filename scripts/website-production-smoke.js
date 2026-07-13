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
const accountRedirect = read("account.html");
const profileRedirect = read("profile.html");
const robots = read("robots.txt");
const sitemap = read("sitemap.xml");
const manifest = read("site.webmanifest");
const websiteReadme = read("README.md");
const config = read("config.js");
const accountConfig = read("account-config.js");
const site = read("site.js");
const styles = read("styles.css");
const rootPackage = fs.readFileSync(path.join(root, "package.json"), "utf8");

const officialOrigin = "https://anxoscontrolcenter.org";
const oldPagesOrigin = "https://anxos-control-center.pages.dev";

["index.html", "activate.html", "forgot-password.html", "reset-password.html", "release-notes.html"].forEach((file) => {
  const html = read(file);
  assert(html.includes("data-site-menu-toggle"), `${file} must expose the mobile navigation toggle.`);
  assert(html.includes("data-site-nav"), `${file} must expose the mobile navigation target.`);
  assert(html.includes('rel="canonical"'), `${file} must declare a canonical URL.`);
  assert(html.includes('rel="icon"') && html.includes('apple-touch-icon') && html.includes('site.webmanifest'), `${file} must declare favicon and app icons.`);
});

assert(config.includes(`siteUrl: "${officialOrigin}"`) && accountConfig.includes(`siteUrl: "${officialOrigin}"`), "Website configs must use the official domain.");
assert(rootPackage.includes(`"homepage": "${officialOrigin}"`), "Package metadata should expose the official homepage.");
assert(index.includes(`<meta property="og:url" content="${officialOrigin}/">`) && index.includes("assets/social-preview.png"), "Homepage must expose canonical Open Graph metadata.");
assert(releaseNotes.includes(`<meta property="og:url" content="${officialOrigin}/release-notes.html">`), "Release notes must expose page-specific Open Graph URL.");
assert(index.includes('name="twitter:card" content="summary_large_image"'), "Homepage must include Twitter/X card metadata.");
assert(fs.existsSync(path.join(websiteRoot, "favicon.ico")), "Website must include favicon.ico.");
["favicon.svg", "favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "social-preview.png"].forEach((file) => {
  assert(fs.existsSync(path.join(websiteRoot, "assets", file)), `Website asset ${file} must exist.`);
});
assert(manifest.includes("AnxOS Control Center") && manifest.includes("/assets/icon-192.png"), "Web manifest must include app icon metadata.");
assert(robots.includes(`Sitemap: ${officialOrigin}/sitemap.xml`) && robots.includes("Disallow: /activate/") && robots.includes("Disallow: /reset-password.html"), "Robots rules must expose sitemap and exclude account routes.");
assert(sitemap.includes(`<loc>${officialOrigin}/</loc>`) && sitemap.includes(`<loc>${officialOrigin}/release-notes.html</loc>`) && !sitemap.includes("activate"), "Sitemap must include only public canonical pages.");
assert(activate.includes('name="robots" content="noindex,nofollow"') && forgot.includes('name="robots" content="noindex,nofollow"') && reset.includes('name="robots" content="noindex,nofollow"'), "Account and activation pages must be excluded from indexing.");
assert(accountRedirect.includes('name="robots" content="noindex,nofollow"') && profileRedirect.includes('name="robots" content="noindex,nofollow"'), "Account redirect shims must be excluded from indexing.");
assert(index.includes("© 2026 AnxOS Control Center") && index.includes("anxoscontrolcenter.org") && index.includes("#getting-started"), "Homepage footer must include copyright, official domain, and Getting Started links.");
assert(index.includes("First server workflow") && index.includes("Prepare Node") && index.includes("Node Health"), "Homepage must include honest Getting Started workflow copy.");

const deployedWebsiteText = fs.readdirSync(websiteRoot)
  .filter((file) => fs.statSync(path.join(websiteRoot, file)).isFile() && file !== "README.md")
  .map((file) => `${file}\n${read(file)}`)
  .join("\n");
assert(!deployedWebsiteText.includes(oldPagesOrigin), "Public website files must not hardcode the old Pages URL.");
assert(websiteReadme.includes("CNAME") && websiteReadme.includes("anxos-control-center.pages.dev") && websiteReadme.includes("permanent `301`"), "Website README must document the Cloudflare www redirect setup.");

assert(!index.includes("8 players"), "Homepage must not show fake player counts.");
assert(!index.includes("[11:57:42]"), "Homepage must not show fake timestamped console output.");
assert(index.includes("Live health appears after you connect an Agent"), "Homepage preview should be honest about live data.");
assert(index.includes("Runtime Dependencies") && index.includes("Prepare Node"), "Homepage should mention runtime dependency management.");

assert(index.includes("data-download-status"), "Downloads page should expose release metadata status.");
assert(site.includes("Release metadata is unavailable"), "Downloads should handle missing release metadata.");
assert(site.includes('node.setAttribute("aria-disabled", "true")'), "Unavailable download/config links should become disabled, not dead # links.");
assert(!site.includes("window.location.hostname === \"www.anxoscontrolcenter.org\""), "www redirects should be handled by Cloudflare, not application JavaScript.");
["index.html", "activate.html", "forgot-password.html", "reset-password.html", "release-notes.html"].forEach((file) => {
  assert(!read(file).includes('href="#"'), `${file} must not ship dead # fallback links.`);
});

assert(index.includes('id="not-found"') && site.includes('window.location.hash = "not-found"'), "Website must route unsupported hashes to a not-found state.");
assert(accountRedirect.includes("index.html${query}#account"), "Account redirect shim must preserve query parameters before the hash route.");
assert(site.includes('selectedState = "loading"'), "Sign-in route should show loading state instead of flashing signed-out UI while auth initializes.");
assert(site.includes("WEBSITE_DEBUG") && site.includes("if (!WEBSITE_DEBUG) return;"), "Verbose website auth logging must be opt-in.");
assert(index.includes("data-confirm-modal") && activate.includes("data-confirm-modal"), "Account and activation pages should expose the shared confirmation modal.");
assert(site.includes("function confirmUserAction") && site.includes("Approve this desktop app?") && site.includes("Sign out all desktop sessions?"), "Security-sensitive website actions should use branded confirmation copy.");
assert(!site.includes('confirm("Approve this AnxOS desktop app') && !site.includes('confirm("Sign out all desktop sessions'), "Website should not use raw browser confirmations for account/device actions.");

assert(index.includes('name="passwordConfirm"'), "Create account and reset forms should include password confirmation.");
assert(site.includes('setMessage("signup", "Passwords do not match.", "error")'), "Sign-up should validate password confirmation before network calls.");
assert(activate.includes("Opening this page never approves a device automatically."), "Activation page must explicitly avoid auto-approval ambiguity.");
assert(activate.includes('autocomplete="one-time-code"') && activate.includes('autocapitalize="characters"') && activate.includes('spellcheck="false"'), "Activation code input must support mobile/paste ergonomics.");

assert(styles.includes(".site-menu-button") && styles.includes(".site-nav.is-open"), "Website CSS must include mobile menu states.");
assert(styles.includes("@media (prefers-reduced-motion: reduce)"), "Website must respect reduced-motion preference.");
assert(styles.includes(".download-status") && styles.includes(".account-unavailable"), "Website must style honest loading/unavailable states.");
assert(styles.includes(".site-footer nav") && styles.includes(".steps--detailed"), "Website CSS must support footer and Getting Started responsive polish.");

console.log("Website production smoke checks passed.");
