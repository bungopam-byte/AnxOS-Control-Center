# Build 153 Release Report

## Executive status

**NO-GO for production release closure.** The Desktop Release workflow validation, Windows packaging/signing, and Linux packaging jobs passed, but the publish job was skipped. No `v1.7-build153` GitHub Release or release assets were created, and production still serves Build 152 metadata.

## Candidate

- Source: `release/build153-final`
- Release metadata commit: `aa6b1f7`
- Feature baseline includes `94b8ed7` (Public Access Create Service fix)
- Intended tag: `v1.7-build153` (not created)

## Included changes

- SteamCMD instance updates with trusted Agent execution.
- Legacy SteamCMD metadata migration.
- Correct paired-Agent status rendering.
- Marketplace installation and runtime-selection fixes.
- Public Access Create Service error/progress handling.
- CI signing and verification hardening.

## Validation

- Local `npm run rc:validate`: PASS (162/162).
- Desktop Release workflow `29672796182`: validation PASS, Windows PASS, Linux PASS.
- Azure signing and signtool verification: PASS in the workflow.
- Publish: SKIPPED.

## Artifact and checksum status

No published Build 153 artifact inventory or SHA-256 values can be recorded because the publish job did not run. The generated workflow artifacts remain distinct from a GitHub Release and must not be treated as published assets.

## Production status

Production currently reports Build 152 (`v1.7-build152`) in `config.js` and its download metadata. Build 153 is therefore not production-ready until publication and website deployment are completed and independently verified.

## Known blocker

The workflow's publish condition was not met for the manually dispatched branch run. Publish Build 153 using the established tag/release flow, then redeploy website metadata and verify download endpoints and checksums.
