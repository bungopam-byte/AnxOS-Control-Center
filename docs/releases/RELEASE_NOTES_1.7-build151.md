# AnxOS Control Center v1.7-build151 - Private Alpha Replacement Candidate

This invited-tester candidate replaces invalidated build 150. It is not a stable or generally available release.

## Highlights

- Uses one evidence-driven CurseForge dedicated-server compatibility classification across listing cards, details, install review, server-pack selection, preflight, and diagnostics.
- Selects provider-linked official server packs instead of client archives and blocks known client-only or unsupported projects before installation.
- Adds a data-driven certification registry with validation evidence, certification status, staleness handling, confidence, and last-validation dates.
- Preserves Compatibility Unknown when CurseForge does not expose enough evidence and never infers compatibility from a filename alone.
- Includes the recovered Agent-health synchronization fix from `61002a1`, so authenticated recovery updates canonical Nodes, Dashboard, Agent Control, and global-shell state.
- Includes the guarded Windows “Stop Old Local Agent and Repair” workflow for verified AnxOS Local Agent processes.
- Bumps the Electron updater package version to `1.0.53` for build 151 update detection.

## Replacement testing

- Do not reuse results from invalidated build 150 artifacts.
- Re-run PA-RC-05 and PA-RC-06, including credential recovery and cross-page selected-node status without restarting the app.
- Re-run PA-RC-07 against CurseForge projects covering an official server pack, a provider-declared compatible pack, a known client-only pack, and insufficient metadata.
- Record the exact build 151 artifact filename and SHA-256 for every result.

## Who it is for

Build 151 is for invited Private Alpha testers validating the replacement candidate. New installations should use only the new build 151 artifacts after verifying their SHA-256 values. Existing remote Agent users can keep their configured nodes, but must repeat the recovered Agent-state checks against this build.

## Known limitations

- Windows installation, signing/SmartScreen, reboot persistence, real provider downloads, and the remaining PA-RC machine checks still require execution against these exact replacement artifacts.
- Windows-only limitation: the guided Local Agent setup and repair path remains Windows-focused. macOS Local Agent support is not documented or claimed.
- The real-machine Windows installation gate has not yet been completed for build 151.
- Compatibility Unknown is intentionally not promoted to a compatibility claim without stronger provider or certification evidence.
- Private Alpha defects are expected; attach sanitized diagnostics and never include tokens, API keys, private URLs, or raw credentials.

## Upgrade guidance

- Replace invalidated build 150 with build 151; do not carry forward its artifact hashes or test results.
- Preserve user data and verify Nodes, Agent Control, Dashboard, and the selected-node shell agree after upgrade and credential recovery.

## Repair guidance

- If a verified old Local Agent owns the managed port on Windows, use Stop Old Local Agent and Repair.
- If CurseForge compatibility evidence changes between browsing and installation, follow the install-time classification and select the official linked server pack when offered.
