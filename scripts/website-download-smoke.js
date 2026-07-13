const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.resolve(__dirname, "..");
const websiteRoot = path.join(root, "website");
const service = require(path.join(websiteRoot, "release-download-service.js"));

function readWebsite(file) {
  return fs.readFileSync(path.join(websiteRoot, file), "utf8");
}

function makeAsset(name, size = 1024, urlName = name, owner = "bungopam-byte", repo = "AnxOS-Control-Center") {
  return {
    name,
    size,
    browser_download_url: `https://github.com/${owner}/${repo}/releases/download/v1.7-build142/${encodeURIComponent(urlName)}`,
  };
}

function sampleReleases() {
  return [
    {
      draft: true,
      prerelease: false,
      tag_name: "v9.9-build999",
      name: "Draft release",
      published_at: "2026-07-14T00:00:00Z",
      html_url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v9.9-build999",
      assets: [makeAsset("AnxOS-Control-Center-Setup-9.9-build999.exe")],
    },
    {
      draft: false,
      prerelease: false,
      tag_name: "v1.7-build142",
      name: "AnxOS Version 1.7 build142",
      body: "Channel: Private Alpha\n\n<script>alert(1)</script>\nUse official assets only.",
      published_at: "2026-07-13T12:00:00Z",
      html_url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.7-build142",
      assets: [
        makeAsset("AnxOS-Control-Center-Setup-1.7-build142.exe", 80 * 1024 * 1024),
        makeAsset("AnxOS-Control-Center-1.7-build142-portable.exe", 78 * 1024 * 1024),
        makeAsset("AnxOS-Control-Center-1.7-build142.AppImage", 92 * 1024 * 1024),
        makeAsset("AnxOS-Control-Center-1.7-build142.deb", 84 * 1024 * 1024),
        makeAsset("SHA256SUMS", 512),
        makeAsset("AnxOS-Control-Center-evil.exe", 1, "AnxOS-Control-Center-evil.exe", "other", "repo"),
        { name: "Source code (zip)", browser_download_url: "https://github.com/bungopam-byte/AnxOS-Control-Center/archive/refs/tags/v1.7-build142.zip" },
      ],
    },
  ];
}

function mockFetchJson(payload, ok = true, status = 200) {
  global.fetch = async () => ({
    ok,
    status,
    text: async () => typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

async function main() {
  const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center";
  const normalized = service.latestPublishedRelease(sampleReleases(), {
    repositoryUrl,
    config: { channel: "Private Alpha" },
  });

  assert(normalized, "Latest published release should normalize.");
  assert.strictEqual(normalized.version, "1.7", "Version should be parsed from release metadata.");
  assert.strictEqual(normalized.buildNumber, "142", "Build number should be parsed from release metadata.");
  assert.strictEqual(normalized.channel, "Private Alpha", "Channel should be parsed from release body or fallback config.");
  assert.strictEqual(normalized.assets.length, 4, "Only real installer assets from the expected repository should be exposed.");
  assert(normalized.assets.some((asset) => asset.key === "windows-setup"), "Windows Setup should be detected.");
  assert(normalized.assets.some((asset) => asset.key === "windows-portable"), "Windows Portable should be detected.");
  assert(normalized.assets.some((asset) => asset.key === "linux-appimage"), "Linux AppImage should be detected.");
  assert(normalized.assets.some((asset) => asset.key === "linux-deb"), "Linux .deb should be detected.");
  assert.strictEqual(normalized.checksumAssets[0].fileName, "SHA256SUMS", "Checksum manifest should be detected.");
  assert(normalized.assets.every((asset) => asset.checksumAsset?.fileName === "SHA256SUMS"), "Assets should reference checksum metadata when present.");
  assert(!normalized.assets.some((asset) => /evil/i.test(asset.fileName)), "Unexpected GitHub repositories must be rejected.");
  assert.strictEqual(service.preferredAssetForPlatform(normalized, "windows").key, "windows-setup", "Windows should prefer Setup.");
  assert.strictEqual(service.preferredAssetForPlatform(normalized, "linux").key, "linux-appimage", "Linux should prefer AppImage.");
  assert.strictEqual(service.preferredAssetForPlatform(normalized, "macos"), null, "macOS should not receive a fake download.");

  const missingLinux = service.latestPublishedRelease([{
    draft: false,
    tag_name: "v1.0-build1",
    published_at: "2026-01-01T00:00:00Z",
    html_url: `${repositoryUrl}/releases/tag/v1.0-build1`,
    assets: [makeAsset("AnxOS-Control-Center-Setup-1.0-build1.exe")],
  }], { repositoryUrl, config: {} });
  assert.strictEqual(service.preferredAssetForPlatform(missingLinux, "linux"), null, "Missing platform should remain unavailable.");

  mockFetchJson(sampleReleases());
  const loaded = await service.loadLatestRelease({ repositoryUrl, force: true, config: { channel: "Private Alpha" } });
  assert.strictEqual(loaded.tagName, "v1.7-build142", "Release loader should use mocked GitHub API data.");
  mockFetchJson("not json");
  await assert.rejects(
    service.loadLatestRelease({ repositoryUrl, force: true }),
    /invalid JSON/i,
    "Invalid GitHub JSON should be reported."
  );
  mockFetchJson({ message: "rate limit" }, false, 403);
  await assert.rejects(
    service.loadLatestRelease({ repositoryUrl, force: true }),
    /rate limit/i,
    "GitHub API failure should be reported."
  );

  const download = readWebsite("download/index.html");
  const downloadHtml = readWebsite("download.html");
  const index = readWebsite("index.html");
  const releaseNotes = readWebsite("release-notes.html");
  const gettingStarted = readWebsite("getting-started/index.html");
  const site = readWebsite("site.js");
  const config = readWebsite("config.js");
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "windows-release.yml"), "utf8");
  assert(download.includes('data-download-page') && download.includes('data-primary-download'), "/download should render the dynamic download workspace.");
  assert(download.includes('rel="canonical" href="https://anxoscontrolcenter.org/download"'), "/download should expose canonical metadata.");
  assert(downloadHtml.includes('window.location.replace("/download" + window.location.search)'), "/download.html should preserve query strings while redirecting.");
  assert(index.includes('href="/download"') && releaseNotes.includes('href="/download"') && gettingStarted.includes('href="/download"'), "Public CTAs should point to the domain download route.");
  assert(!/AnxOS-Control-Center-Setup-1\.7-build142\.exe/.test(`${download}\n${index}\n${releaseNotes}\n${gettingStarted}\n${site}\n${config}`), "Website download logic must not hardcode an obsolete installer filename.");
  assert(!/releases\/download\/v1\.7-build142/.test(`${download}\n${index}\n${releaseNotes}\n${gettingStarted}\n${site}\n${config}`), "Website download logic must not hardcode an obsolete release asset URL.");
  assert(site.includes("textContent = release.releaseBody") && !site.includes("innerHTML = release.releaseBody"), "Release text should be rendered safely.");
  assert(site.includes("isExpectedAssetUrl") || fs.readFileSync(path.join(websiteRoot, "release-download-service.js"), "utf8").includes("isExpectedAssetUrl"), "Download URLs should be allowlisted.");
  assert(config.includes("githubReleasesApiUrl") && config.includes("stableDownloadEndpoints") && !config.includes("downloads:"), "Config should contain release discovery settings, not static artifact URLs.");
  assert(workflow.includes("sha256sum AnxOS-Control-Center-* > SHA256SUMS"), "Release workflow should publish a checksum manifest.");

  const functionsHelper = await import(pathToFileURL(path.join(root, "functions", "_shared", "release-download.mjs")).href);
  assert.strictEqual(functionsHelper.classifyAssetName("AnxOS-Control-Center-Setup-1.7-build142.exe"), "windows", "Redirect helper should classify Windows setup.");
  assert.strictEqual(functionsHelper.classifyAssetName("AnxOS-Control-Center-1.7-build142-portable.exe"), "windows-portable", "Redirect helper should classify Windows portable.");
  assert.strictEqual(functionsHelper.classifyAssetName("AnxOS-Control-Center-1.7-build142.AppImage"), "linux-appimage", "Redirect helper should classify AppImage.");
  assert.strictEqual(functionsHelper.classifyAssetName("AnxOS-Control-Center-1.7-build142.deb"), "linux-deb", "Redirect helper should classify .deb.");
  const artifact = functionsHelper.findArtifact(sampleReleases()[1], functionsHelper.repositoryFromEnv({ ANXOS_GITHUB_REPOSITORY: "bungopam-byte/AnxOS-Control-Center" }), "linux-deb");
  assert(artifact?.browser_download_url.endsWith(".deb"), "Redirect helper should select the requested artifact only.");
  assert.strictEqual(functionsHelper.findArtifact(sampleReleases()[1], functionsHelper.repositoryFromEnv({ ANXOS_GITHUB_REPOSITORY: "bungopam-byte/AnxOS-Control-Center" }), "macos"), null, "Redirect helper must not redirect missing artifacts.");
  mockFetchJson(sampleReleases());
  const redirectResponse = await functionsHelper.redirectLatestArtifact(new Request("https://anxoscontrolcenter.org/api/download/latest/windows"), { ANXOS_GITHUB_REPOSITORY: "bungopam-byte/AnxOS-Control-Center" }, "windows");
  assert.strictEqual(redirectResponse.status, 302, "Stable endpoint helper should redirect when the artifact exists.");
  assert(redirectResponse.headers.get("location").includes("AnxOS-Control-Center-Setup-1.7-build142.exe"), "Stable endpoint helper should redirect to the matching setup asset.");
  const missingResponse = await functionsHelper.redirectLatestArtifact(new Request("https://anxoscontrolcenter.org/api/download/latest/macos"), { ANXOS_GITHUB_REPOSITORY: "bungopam-byte/AnxOS-Control-Center" }, "macos");
  assert.strictEqual(missingResponse.status, 404, "Stable endpoint helper should return JSON 404 when the artifact is missing.");
  assert.match(await missingResponse.text(), /ARTIFACT_NOT_FOUND/, "Missing artifact response should be structured JSON.");

  console.log("Website download smoke checks passed.");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
