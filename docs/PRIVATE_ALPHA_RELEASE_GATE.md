# Private Alpha Final Release Gate

> Historical evidence only. This document records the 2026-07-13 gate and is
> not the current Release Candidate decision. Use
> `PRIVATE_ALPHA_READINESS_REPORT_FINAL.md` and
> `PRIVATE_ALPHA_RC_REAL_MACHINE_TEST_SHEET.md` for the current gate.

Date: 2026-07-13
Branch: `dev`
Release channel: Private Alpha

This gate covers readiness for a limited Private Alpha with trusted testers. It does not authorize a public beta, v1.0 release, version bump, tag, GitHub Release, or automatic installer publication.

## Ready for Private Alpha

The repository is ready for controlled Private Alpha validation, with the recommendation that testers use the documented Windows 11 desktop plus Debian Agent setup and report issues with diagnostics bundles.

Evidence:

- Release metadata still reports `Private Alpha`.
- Desktop renderer syntax and shared JavaScript syntax checks passed.
- Agent validation passed.
- Website production and download smoke tests passed.
- Marketplace smoke tests passed, including Palworld SteamCMD regression coverage.
- Files, filesystem-root, dependencies, Docker, Public Access, Diagnostics, Agent Control, Node Health, renderer safety, UI polish, account, Windows runtime, and instance deletion smoke tests passed.
- Recent live Anxlab validation confirmed Palworld SteamCMD install, artifact verification, runtime command restoration, first startup, and cleanup.
- First-time empty states now explain what each page does, why it is empty, and how to begin.
- Destructive Docker controls and generated Docker actions use the shared danger button treatment.
- Tester-facing Private Alpha docs, known limitations, and setup guidance now exist.

## Remaining Risks

- Windows desktop launch was validated by smoke tests, not by an interactive Windows `npm start` session in this final gate.
- Packaged Windows installer behavior was not validated in this gate.
- Public Access smoke tests passed, but live external reachability was not retested in this gate.
- Website download availability depends on public release repository assets. Missing assets should show an unavailable state, not a fake download.
- Marketplace templates depend on external networks and host packages; not every template has fresh live validation.
- Docker smoke detected Docker resources on this environment, but tester nodes may not have Docker installed or accessible.
- Account flows require live backend availability and should be rechecked by testers on Windows and mobile.

## Known Issues

- Agent instance state can remain `Starting` for a Palworld server even after logs show the server is running on `:8211`. The process stayed alive and ports were correct, but the state transition deserves a focused follow-up.
- Playit tunnel metadata can require Linux socket permissions beyond service detection.
- Some diagnostics remain intentionally technical and may need interpretation in bug reports.
- Packaged installer signing and SmartScreen behavior are outside this readiness pass.
- Docker cleanup actions remain destructive and should be tested carefully with disposable resources.

## Recommended Tester Instructions

1. Use the exact commit selected for the test run.
2. Start with [Private Alpha Tester Guide](PRIVATE_ALPHA_TESTER_GUIDE.md).
3. Record environment details from [Real-Machine Validation](REAL_MACHINE_VALIDATION.md).
4. Start the Windows desktop app with `npm start`.
5. Confirm Local Application Host appears.
6. Select or pair the Debian Agent.
7. Run Diagnostics and export a bundle only if needed.
8. Run dependency checks before Marketplace installs.
9. Install one low-risk template and one SteamCMD template only on a prepared test node.
10. Validate Files local and remote profiles.
11. Validate Public Access only against a test endpoint.
12. Stop and remove test instances after validation.
13. Attach operation IDs and sanitized diagnostics to bug reports.

## What should not be tested yet

- Public production use.
- Untrusted third-party testers.
- Public beta messaging.
- Real customer workloads without backups.
- Broad Marketplace template claims beyond tested templates.
- Installer publishing or update-channel promotion.
- Destructive Docker cleanup against important volumes.
- Running the Agent as root to bypass permission issues.

## Honest recommendation

Recommendation: Private Alpha.

Do not recommend Public Alpha or Beta yet. The app has enough automated and recent live evidence for a small trusted group, but it still needs interactive Windows validation, packaged installer validation, live Public Access verification, and clearer state handling for long-running game server startup.

Scores:

| Area | Score | Notes |
| --- | ---: | --- |
| Desktop | 7 | Strong smoke coverage and improved UX; final interactive Windows pass still required. |
| Website | 8 | Production/download smoke passed; depends on public release assets. |
| Marketplace | 7 | Shared smoke coverage and Palworld live validation passed; external providers remain variable. |
| Agent | 7 | Validation passed and recent live Anxlab flows worked; deployment sync remains important. |
| Public Access | 6 | Smoke passed; live external reachability should be retested. |
| UX | 7 | Empty states and consistency improved; advanced workflows still dense. |
| Documentation | 8 | Tester guide, known limitations, audit, and validation docs now exist. |
| Testing confidence | 7 | Broad automated coverage passed; not all gates were live/manual. |
| Overall Private Alpha readiness | 7 | Ready for controlled trusted testers, not public rollout. |

## Validation Summary

Passed:

- `node --check app.js`
- `node --check main.js`
- `node --check preload.js`
- `find src agent/src functions scripts -name '*.js' -not -path '*/node_modules/*' -print0 | xargs -0 -n 1 node --check`
- `npm run renderer-safety:smoke`
- `npm run ui:polish:smoke`
- `npm run node-health:smoke`
- `npm run agent:validate`
- `npm run marketplace:smoke`
- `npm run files:smoke`
- `npm run public-access:smoke`
- `npm run diagnostics:smoke`
- `npm run agent-control:smoke`
- `npm run website:smoke`
- `npm run account:smoke`
- `npm run dependencies:smoke`
- `npm run instances:deletion:smoke`
- `npm run docker:smoke`
- `npm run windows-runtime:smoke`
- Markdown local link validation script
- `git diff --check`

Skipped or not performed:

- Interactive Windows `npm start` click-through in this final gate.
- Packaged Windows installer build/install validation.
- Live Public Access external reachability.
- Live website auth on iPhone.
- Full live install matrix for every Marketplace template.

## Final Gate Decision

Proceed with limited Private Alpha only.

Keep tester count small, require diagnostics-backed bug reports, and do not broaden release scope until the remaining live gates are completed.
