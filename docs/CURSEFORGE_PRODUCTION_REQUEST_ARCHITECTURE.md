# CurseForge Production Request Architecture

Date: 2026-07-14

## Confirmed Current Flow

Packaged desktop Marketplace requests originate in the Electron renderer and cross IPC into the Electron main process:

1. Renderer `app.js` calls Marketplace IPC methods exposed by `preload.js`.
2. `src/ipc/marketplaceIpc.js` invokes `src/services/marketplaceInstallService.js`.
3. CurseForge operations call `src/services/providers/curseforgeProvider.js`.

The renderer does not call `api.curseforge.com` directly and must not receive a raw CurseForge API key.

The main-process provider currently supports these trusted-backend modes:

- Hosted proxy, when `ANXOS_CURSEFORGE_PROXY_URL`, `ANXHUB_CURSEFORGE_PROXY_URL`, or `CURSEFORGE_PROXY_URL` is configured.
- AnxOS Agent proxy, when provider config explicitly enables Agent proxying or the desktop backend mode is `agent`.
- Owner-local fallback, for local development/private owner testing only.

The local Windows Agent is not a valid secret source for ordinary packaged testers unless that Agent is explicitly configured with a protected CurseForge key. The selected remote AnxOS Agent is the required private-alpha path.

## Required Private-Alpha Flow

```text
Packaged desktop app
        |
        | authenticated AnxOS Agent request
        v
Selected Debian AnxOS Agent
        |
        | adds x-api-key privately
        v
CurseForge API and CDN
```

The desktop app may receive Marketplace JSON, status metadata, and downloaded file bytes. It must never receive the raw CurseForge API key.

## Root Cause

The packaged build correctly excludes secrets: no CurseForge API key, known local key fingerprint, or runtime config file is present in the packaged renderer or integration files.

The remaining failure is configuration architecture, not artifact leakage. A clean packaged runtime has no local secure CurseForge credential source, and the Marketplace did not consistently resolve CurseForge browsing, details, file lookup, and downloads through the selected credential-backed AnxOS Agent. As a result, an ordinary tester sees the orange unavailable state even though the release package is clean.

