# CurseForge Authentication Audit

Date: 2026-07-14

## Root Cause

CurseForge works on the development machine because a private API key is present in local, Git-ignored configuration. A clean packaged installation does not receive any of those files, so the main-process provider cannot resolve a key and returns `CURSEFORGE_API_KEY_REQUIRED`. The renderer then shows the current generic orange "CurseForge API key required" state.

Local diagnostic fingerprint observed during this audit:

- `sha256:78550439f2f2`, length 60

The fingerprint is non-reversible and only confirms that the same local secret is present in multiple development-only locations. The full key was not printed in this report and must not be committed.

## Key Resolution

The current CurseForge provider is `src/services/providers/curseforgeProvider.js`.

Current precedence:

1. Stored app marketplace config from `providerConfigService`:
   - Electron packaged/dev: `<app userData>/config/marketplace.json`
   - Non-Electron scripts/dev fallback: `<cwd>/config/marketplace.json`
2. Direct config object fields:
   - `apiKey`
   - `curseForgeApiKey`
   - `curseforgeApiKey`
   - `cfApiKey`
3. Legacy migration from local environment and `.env` files:
   - `CURSEFORGE_API_KEY`
   - `CF_API_KEY`
   - `ANXHUB_CURSEFORGE_API_KEY`
4. Key file fields/env:
   - `apiKeyFile`
   - `curseForgeApiKeyFile`
   - `curseforgeApiKeyFile`
   - `cfApiKeyFile`
   - `CURSEFORGE_API_KEY_FILE`
   - `CF_API_KEY_FILE`
   - `ANXHUB_CURSEFORGE_API_KEY_FILE`

The provider searches deterministic `.env` candidates including the repo root `.env`, `agent/.env`, Electron user data `.env`, `process.execPath` directory `.env`, and `process.resourcesPath` candidates. These are local runtime files, not release artifacts.

## Request Trace

All official CurseForge API calls currently go through `src/services/providers/curseforgeProvider.js` and call `requestJson()`, which attaches:

- `Accept: application/json`
- `User-Agent: AnxOS-Control-Center/1.0 (+https://anxos.local)`
- `x-api-key: <resolved key>`

Covered official API paths:

- `GET /mods/search` via `searchModpacks()`
- `GET /mods/{projectId}` via `getMod()`
- `GET /mods/{projectId}/files` via `getFiles()`
- `GET /mods/{projectId}/files/{fileId}` via `getFile()`
- `GET /mods/{projectId}/files/{fileId}/download-url` via `getFileDownloadUrl()`

Marketplace browsing, project details, file selection, dependency resolution, and modpack installation all call the provider from `src/services/marketplaceInstallService.js`.

The Electron renderer does not call the CurseForge API directly. It calls main-process IPC through marketplace handlers and settings handlers.

No Agent CurseForge endpoint exists in the current code. The Agent does not currently proxy CurseForge requests or provide a protected CurseForge key to the desktop app.

## Direct Fetch Bypass Audit

No direct `api.curseforge.com`, `forgecdn`, or `x-api-key` calls were found outside `curseforgeProvider.js`.

The following generic fetch helpers exist outside the CurseForge provider, but are not direct CurseForge API clients:

- `src/services/marketplaceInstallService.js`: generic download helpers for loaders, archives, and provider-independent downloads.
- `src/services/marketplaceService.js`: generic community template download pipeline.
- `src/services/providers/modrinthProvider.js`: Modrinth-only provider client.
- `src/services/agentClient.js`, `agent/src/server.js`, and account/AMP services: unrelated service clients.

## CDN Download Behavior

Direct file downloads currently use `downloadFile()` -> `requestBuffer(downloadUrl)`.

`requestBuffer()` validates the URL and sends only:

- `User-Agent: AnxOS-Control-Center/1.0 (+https://anxos.local)`

It does not attach `x-api-key` or use an authenticated CDN flow. Redirect handling is delegated to default `fetch()` behavior, with no explicit logging of redirect count, hostname, project ID, file ID, or whether authentication was attached.

This is a future failure point for CurseForge CDN authentication requirements and must be fixed in the CDN phase.

## Cache Behavior

Marketplace browsing is not using cached CurseForge data when no key is available. A missing key fails before a provider API request is made.

The only CurseForge metadata cache found is an in-memory project metadata cache in `curseforgeProvider.js` (`modMetadataCache`) used by `getMod()`. It does not populate search results and does not provide offline browsing.

## Packaged-Build Failure Explanation

The release package includes source files and `config/marketplace-templates.json`, but it does not include Git-ignored local secret files such as:

- `.env`
- `agent/.env`
- `config/marketplace.json`

The development machine has local secret configuration, so `getCurseForgeApiKey()` succeeds. A clean packaged install has no user-data marketplace config and no local `.env`, so `requireApiKey()` throws `CURSEFORGE_API_KEY_REQUIRED`.

The current product copy then asks the user to save their own CurseForge API key, which is not appropriate for ordinary testers.

