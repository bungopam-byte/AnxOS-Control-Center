# AnxOS Control Center v1.7-build152 - Private Alpha Replacement Candidate

This invited-tester candidate replaces invalidated build 151. It is not a stable or generally available release.

## Highlights

- Includes embedded Windows CPU and GPU temperature telemetry without requiring a separately installed monitoring application.
- Migrates the packaged Windows Local Agent to one authoritative per-user Scheduled Task lifecycle with verified legacy cleanup.
- Packages the complete Local Agent runtime, including required application services and standalone runtime dependencies.
- Retains the evidence-driven CurseForge dedicated-server compatibility classification and official server-pack selection from build 151.
- Includes the recovered Agent-health synchronization fix so authenticated recovery updates Nodes, Dashboard, Agent Control, and global-shell state.

## Replacement testing

- Do not reuse results or hashes from invalidated build 151 artifacts.
- Validate Windows telemetry, Local Agent install, repair, restart, reboot, logon startup, uninstall, reinstall, and upgrade behavior.
- Re-run PA-RC-05, PA-RC-06, and PA-RC-07 against the exact build 152 artifact hashes.
- Record the exact build 152 artifact filename and SHA-256 for every result.

## Who it is for

Build 152 is for invited Private Alpha testers validating the replacement candidate. New installations should use only the new build 152 artifacts after verifying their SHA-256 values. Existing remote Agent users can keep their configured nodes, pairing, and user data while repeating the recovered Agent-state checks against this build.

## Known limitations

- Windows installation, signing/SmartScreen, reboot persistence, real provider downloads, and the remaining PA-RC machine checks require execution against these exact replacement artifacts.
- Windows-only limitation: the guided Local Agent setup and repair path remains Windows-focused. macOS Local Agent support is not documented or claimed.
- The real-machine Windows installation gate must be completed for build 152 before release approval.
- Compatibility Unknown remains intentionally unpromoted without stronger provider or certification evidence.
- Private Alpha defects are expected; attach sanitized diagnostics and never include tokens, API keys, private URLs, or raw credentials.

## Upgrade guidance

- Replace invalidated build 151 with build 152; do not carry forward its artifact hashes or test results.
- Preserve user data and verify Nodes, Agent Control, Dashboard, selected-node routing, telemetry, and pairing after upgrade.

## Repair guidance

- Use Agent Control repair to migrate conclusively owned stale AnxOS registrations to the packaged Scheduled Task lifecycle.
- If registration ownership cannot be proven, leave it unchanged and review the reported diagnostic evidence.
- If CurseForge compatibility evidence changes between browsing and installation, follow the install-time classification and select the official linked server pack when offered.
