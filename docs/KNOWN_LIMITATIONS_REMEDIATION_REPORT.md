# Known Limitations Remediation Report

Candidate source: `9eb2b66`, Version 1.7 Build 150 Private Alpha.

| Area | Root cause and remediation | Evidence | Final status |
| --- | --- | --- | --- |
| Installer rollback | Electron hands a verified artifact to the OS installer and cannot control later mutation. Update schema 2 now persists previous/target build, artifact digest, handoff outcome, next-launch confirmation, and recovery guidance. Migration backups and external user-data placement remain intact. | `versioning:smoke`, `updates:download-safety:smoke`, `RECOVERY_MODEL.md` | MITIGATED; OS rollback TECHNICALLY NOT GUARANTEED |
| Marketplace dependencies | Provider calls already use bounded timeouts, retry classification, deterministic fixtures, dependency/disk preflight, cached catalogs, cancellation, staging, and truthful failures. External APIs and packages remain variable. | `marketplace:smoke`, provider and cancellation smokes | REQUIRES EXTERNAL PROVIDER VALIDATION |
| Docker capability | Docker status now separates supported, installed, configured, running, reachable, authorized, and compatible, with repair guidance. | `docker:smoke` | AUTOMATED VALIDATION PASSING |
| Public Access capability | Provider detection distinguishes installed/configured/running/authenticated/connected health. Readiness does not treat tailnet/provider process state as public reachability. | `public-access:smoke`, `diagnostics:smoke` | REQUIRES EXTERNAL PROVIDER VALIDATION |
| Template certification | All 33 catalog entries are classified Supported, Experimental, or Disabled by a checked matrix. No template is silently treated as certified by provider availability. | `marketplace:certification:smoke` | RESOLVED |
| Packaged Local Windows Agent | Candidate package contains the Local Agent runtime and shared modules; package loading passed. Service, elevation, reboot, repair, upgrade, and uninstall behavior need Windows execution. | `artifacts:validate`, PA-RC-02 through PA-RC-05 and PA-RC-17 | REQUIRES REAL MACHINE VALIDATION |
| Public reachability | Provider running, tunnel state, local readiness, external reachability, and unknown are documented as distinct. External connectivity is never established by source tests. | Public Access/diagnostics smokes, PA-RC-13 | REQUIRES EXTERNAL PROVIDER VALIDATION |
| Diagnostic security | Shared redaction covers sensitive keys, bearer/JWT values, assignments, CLI secrets, credentialed URLs, private keys, paths, and large base64. Seeded secrets are verified in persisted Desktop and Agent diagnostics. | `diagnostics:smoke`, `marketplace:ipc-error-contract:smoke` | AUTOMATED VALIDATION PASSING |
| Signing and SmartScreen | Packaging configuration requests signature verification and identifies the publisher, but no signature tool/certificate or Windows reputation evidence was available. | PA-RC-01 | REQUIRES SIGNING INFRASTRUCTURE |

Files changed across remediation: `src/services/updateManager.js`,
`src/shared/dockerService.js`, `src/shared/redaction.js`, related smoke tests,
`RECOVERY_MODEL.md`, `KNOWN_LIMITATIONS.md`, and certification documentation.

Engineering commits: `4547610`, `d08b982`, `4a9c9aa`, `9eb2b66`.

Remaining risk is confined to OS installers, signing/reputation, external
providers, host permissions, real networks/disks, and human workflow validation.
