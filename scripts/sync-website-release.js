const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const { OFFICIAL_SITE_ORIGIN } = require(path.join(rootDir, "src", "shared", "officialSite"));
const { getReleaseInfo } = require(path.join(rootDir, "src", "shared", "releaseConfig"));
const websiteConfigPath = path.join(rootDir, "website", "config.js");
const releaseNotesPath = path.join(rootDir, "website", "release-notes.json");
const repositoryUrl = "https://github.com/bungopam-byte/AnxOS-Control-Center";
const release = getReleaseInfo();
function formatReleaseDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Edmonton",
  });
}

function readReleaseNotes() {
  if (!fs.existsSync(releaseNotesPath)) {
    return [];
  }

  try {
    const notes = JSON.parse(fs.readFileSync(releaseNotesPath, "utf8"));
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.warn(`Could not read website/release-notes.json: ${error.message}`);
    return [];
  }
}

function getReleaseNotes() {
  const releaseDate = formatReleaseDate();
  const today = new Date().toISOString().slice(0, 10);
  const currentTag = release.tag;
  const notes = readReleaseNotes().map((entry) => {
    const tag = entry.tag || (entry.build ? `v${entry.version}-build${entry.build}` : `v${entry.version}`);
    const staleSemverUrl = /\/releases\/tag\/v\d+\.\d+\.\d+$/i.test(String(entry.url || ""));
    return {
      ...entry,
      tag,
      url: !entry.url || staleSemverUrl ? `${repositoryUrl}/releases/tag/${tag}` : entry.url,
    };
  });

  if (!notes.some((entry) => (entry.version === release.version && Number(entry.build) === release.build) || entry.tag === currentTag)) {
    notes.unshift({
      version: release.version,
      build: release.build,
      channel: release.channel,
      tag: currentTag,
      date: releaseDate,
      datetime: today,
      title: `AnxOS ${release.versionLabel}`,
      summary: "Latest AnxOS-Control-Center release.",
      changes: [
        "Updated application build, website metadata, and downloadable release assets.",
      ],
      url: `${repositoryUrl}/releases/tag/${currentTag}`,
    });
  }

  return notes;
}

const releaseNotes = getReleaseNotes();
fs.writeFileSync(releaseNotesPath, `${JSON.stringify(releaseNotes, null, 2)}\n`);

const config = `window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
  siteUrl: "${OFFICIAL_SITE_ORIGIN}",
  logoPath: "/assets/anxos-logo.png",
  latestVersion: "${release.version}",
  build: "${release.build}",
  buildNumber: "${release.build}",
  channel: "${release.channel}",
  releaseLabel: "${release.compactLabel}",
  releaseDate: "${formatReleaseDate()}",
  releaseTag: "${release.tag}",
  repositoryUrl: "${repositoryUrl}",
  releaseUrl: "${repositoryUrl}/releases/tag/${release.tag}",
  githubReleasesApiUrl: "https://api.github.com/repos/bungopam-byte/AnxOS-Control-Center/releases?per_page=20",
  stableDownloadEndpoints: {
    windows: "/api/download/latest/windows",
    windowsPortable: "/api/download/latest/windows-portable",
    linuxAppImage: "/api/download/latest/linux-appimage",
    linuxDeb: "/api/download/latest/linux-deb",
  },
  releaseNotes: ${JSON.stringify(releaseNotes, null, 4).replace(/^/gm, "  ").trimStart()},
};
`;

fs.writeFileSync(websiteConfigPath, config);
console.log(`Updated website/config.js for ${release.compactLabel}.`);
