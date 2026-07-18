# CurseForge Clean-Machine Validation

Use this document for private-alpha packaged-build validation. The target machine or Windows user profile must not have this repository, repo `.env`, `agent/.env`, or developer marketplace config installed.

## Required Setup

- Install the same Windows installer or portable package that testers receive.
- Configure either the hosted CurseForge proxy or an AnxOS Agent with protected CurseForge configuration.
- Do not give ordinary testers a CurseForge developer API key.
- Do not paste or expose the raw key in DevTools, screenshots, logs, settings exports, crash reports, or diagnostics.

## Scenario Matrix

- Development build with valid configuration: CurseForge browse, project details, files, dependency resolution, and downloads pass.
- Packaged build with valid Agent/proxy configuration: CurseForge listings, search, details, files, server-pack selection, authenticated downloads, and installation pass on a clean profile.
- Packaged build without configuration: CurseForge shows the friendly unavailable state with diagnostics code `CF-CONFIG-MISSING`; Modrinth remains usable.
- Invalid key: Owner diagnostics report an invalid or unauthorized configuration without exposing the key.
- Unauthorized response: Marketplace reports CurseForge authorization failure distinctly from missing configuration.
- Rate limiting: Marketplace reports rate limiting and keeps retry available.
- Browse success followed by download failure: Project browsing remains successful while file download authentication failure is reported separately.
- Modpack with a server pack: Installer prefers the official server pack and installs bundled server files when present.
- Modpack without a server pack: Installer must not silently treat a client-only archive as server-compatible; it must validate server signals or fail with guidance.
- Dependency download: Required CurseForge dependencies resolve through the centralized provider and authenticate downloads.
- Redirected CDN download: Redirects from CurseForge CDN preserve authenticated request flow and log hostname/status/redirect count only.
- Secret masking: Logs, UI diagnostics, IPC responses, and exported diagnostics contain only source category and short fingerprint.
- Renderer bundle inspection: `app.js`, `preload.js`, `index.html`, packaged `app.asar`, and DevTools-visible state must not contain the raw key.

## Validation Commands

Run these before distributing a private-alpha build:

```bash
node scripts/curseforge-packaged-regression.js
npm run marketplace:smoke
npm --prefix agent run check
git diff --check
```

## Manual Packaged-Build Steps

1. Install or unpack the Windows artifact in a clean Windows user profile.
2. Start AnxOS Control Center.
3. Open Marketplace and select CurseForge.
4. Verify listings load.
5. Search for a known server-compatible modpack.
6. Open project details.
7. Select a compatible Minecraft version and loader.
8. Select a file with an official server pack when available.
9. Start install and verify progress, cancellation, archive validation, extraction, dependency resolution, loader installation, EULA acceptance, instance registration, and server start.
10. Repeat with a project that has no server pack and confirm the app fails clearly instead of treating a client pack as a valid server.
11. Open DevTools and inspect network responses, local storage, renderer state, and bundled sources for the raw key.
12. Export diagnostics and confirm the raw key and signed secret data are absent.

