# CurseForge Packaged Validation - 1.7-build146

Date: 2026-07-14

Build artifacts:

- `dist/AnxOS-Control-Center-Setup-1.7-build146.exe`
- `dist/AnxOS-Control-Center-1.7-build146-portable.exe`
- `dist/AnxOS-Control-Center-Setup-1.7-build146.exe.blockmap`
- `dist/win-unpacked/resources/app.asar`

## Static Windows Artifact Inspection

Result: passed.

The focused Windows artifact inspection verified:

- Windows installer, portable executable, and blockmap exist and are non-empty.
- `win-unpacked/resources/app.asar` exists.
- Required application, preload, renderer, release metadata, Agent server, Agent CurseForge proxy, and desktop CurseForge provider files are present.
- Runtime configuration files are not bundled in `app.asar`, including:
  - `/agent/.env`
  - `/agent/config/device-identity.json`
  - `/config/agent.json`
  - `/config/application-host.json`
  - `/config/device-identity.json`
  - `/config/marketplace.json`
  - `/config/nodes.json`
  - `/config/owner-accounts.json`
- Release metadata matches `1.7-build146`.
- Renderer-facing and CurseForge integration files do not contain the known local key fingerprint or environment-provided CurseForge key values.

## Clean Profile Wine Probe

Result: partial pass.

The unpacked Windows executable was launched with:

- A fresh `WINEPREFIX`.
- A temporary working directory outside the repository.
- CurseForge-related environment variables unset.
- No repository `.env` available through `process.cwd()`.

The packaged app reached main-process startup and wrote runtime diagnostics under the clean Wine profile. The diagnostics reported:

- `appVersion`: `Version 1.7 Build 146 Private Alpha`
- `platform`: `win32`
- CurseForge key `loaded: false`
- CurseForge key `source: null`
- `envFileExists: false`
- `resolvedEnvPath: null`

This confirms the clean packaged app no longer finds the developer machine's ignored `config/marketplace.json` or repository `.env` when it is launched outside the repo with a fresh profile.

Wine exited with status `3` after Electron startup and logged Wine/Chromium host errors. No full marketplace UI browsing or modpack installation validation was claimed from this Wine run.

## Commands

Focused Windows artifact inspection:

```bash
node <<'NODE'
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const { buildReleaseInfo, readReleaseConfig } = require('./src/shared/releaseConfig');
const root = process.cwd();
const dist = path.join(root, 'dist');
const releaseConfig = readReleaseConfig();
const artifactVersion = buildReleaseInfo(releaseConfig).artifactVersion;
const artifacts = [
  `AnxOS-Control-Center-Setup-${artifactVersion}.exe`,
  `AnxOS-Control-Center-${artifactVersion}-portable.exe`,
  `AnxOS-Control-Center-Setup-${artifactVersion}.exe.blockmap`,
];
for (const artifact of artifacts) {
  const p = path.join(dist, artifact);
  assert(fs.existsSync(p), `missing ${artifact}`);
  assert(fs.statSync(p).size > (artifact.endsWith('.blockmap') ? 1024 : 1024 * 1024), `small ${artifact}`);
}
const archive = path.join(dist, 'win-unpacked', 'resources', 'app.asar');
assert(fs.existsSync(archive), 'missing win app.asar');
const entries = new Set(asar.listPackage(archive));
for (const entry of ['/main.js','/preload.js','/app.js','/index.html','/release.json','/release-build.json','/agent/src/server.js','/agent/src/services/curseforgeProxyService.js','/src/services/providers/curseforgeProvider.js']) {
  assert(entries.has(entry), `app.asar missing ${entry}`);
}
for (const entry of ['/agent/.env','/agent/config/device-identity.json','/config/agent.json','/config/application-host.json','/config/device-identity.json','/config/marketplace.json','/config/nodes.json','/config/owner-accounts.json']) {
  assert(!entries.has(entry), `app.asar includes runtime file ${entry}`);
}
const release = JSON.parse(asar.extractFile(archive, 'release.json').toString('utf8'));
assert.strictEqual(release.version, releaseConfig.version);
assert.strictEqual(release.build, releaseConfig.build);
assert.strictEqual(release.channel, releaseConfig.channel);
const build = JSON.parse(asar.extractFile(archive, 'release-build.json').toString('utf8'));
assert.strictEqual(build.version, releaseConfig.version);
assert.strictEqual(build.build, releaseConfig.build);
assert.strictEqual(build.channel, releaseConfig.channel);
assert(build.gitCommit, 'missing gitCommit');
assert(build.buildDate, 'missing buildDate');
const filesToScan = ['app.js','preload.js','index.html','src/services/providers/curseforgeProvider.js','agent/src/services/curseforgeProxyService.js'];
const forbidden = [process.env.CURSEFORGE_API_KEY, process.env.CF_API_KEY].filter(Boolean);
for (const file of filesToScan) {
  const text = asar.extractFile(archive, file).toString('utf8');
  assert(!/78550439f2f2/.test(text), `${file} contains local key fingerprint`);
  for (const secret of forbidden) assert(!text.includes(secret), `${file} contains environment secret`);
}
console.log(`Windows packaging artifact inspection passed for ${artifactVersion}.`);
NODE
```

Clean Wine profile probe:

```bash
tmp=$(mktemp -d)
mkdir -p "$tmp/run"
export WINEPREFIX="$tmp/wineprefix"
export WINEDEBUG=-all
(
  cd "$tmp/run" &&
  env -u CF_API_KEY -u CURSEFORGE_API_KEY -u CURSEFORGE_API_TOKEN -u ANXOS_CURSEFORGE_PROXY_URL -u ANXHUB_CURSEFORGE_PROXY_URL -u CURSEFORGE_PROXY_URL \
    timeout 45s wine "/home/anx/Projects/AnxOS-Control-Center/dist/win-unpacked/AnxOS Control Center.exe" --no-sandbox --disable-gpu
)
rm -rf "$tmp"
```

## Validation Not Completed

A real clean Windows user-profile install/start test was not completed on this Linux host. Do not tag or publish a production release from this validation alone.
