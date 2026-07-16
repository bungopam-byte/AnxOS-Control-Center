# Release Blocker Closure Report

Original candidate source: `9eb2b66`, Version 1.7 Build 150 Private Alpha.

Candidate status: **INVALIDATED** by the High-severity real-machine node-health
recovery regression. Fix `61002a1` passes the 155-command source gate; exact
replacement artifacts have not yet been generated or validated.

| Blocker | Root cause | Closure evidence | Final status |
| --- | --- | --- | --- |
| Eight failed smokes | Seven assertions described obsolete source shapes or safe migration behavior; packaging lacked an explicit artifact precondition. | All 155 commands pass through `npm run rc:validate`. | AUTOMATED VALIDATION PASSING |
| Loopback identity | Stable identities were used for deduplication, but loopback URL still granted Local Agent classification. | Local role is explicit/verified; distinct authenticated loopback identities remain distinct in `device-architecture:smoke`. | RESOLVED |
| Unsupported repair IPC | QA expected `stopOldLocalAgentAndRepair`, but the candidate did not implement or document it. | Obsolete expectation removed; no capability is claimed. | RESOLVED |
| Candidate artifacts | No exact artifacts existed during the initial audit. | Five x64 artifacts built from `9eb2b66` passed structural validation but are invalid after the live regression; replacement artifacts must use `61002a1` or a documented descendant. | PRECONDITION_NOT_MET |
| Upgrade/uninstall | Repository tests could prove schema backups and external data placement, not Windows installer behavior. | Migration, update persistence, packaging contents, and recovery tests pass. | REQUIRES REAL MACHINE VALIDATION |
| Signing/SmartScreen | Linux builder had no accessible Authenticode verification tool/certificate/reputation environment. | Exact unsigned-state check remains PA-RC-01. | REQUIRES SIGNING INFRASTRUCTURE |
| Version alignment | Historical docs were being read as current and website matching allowed an older build. | Website/release build equality is enforced; documentation hierarchy separates historical evidence. | AUTOMATED VALIDATION PASSING |

Invalidated historical artifact evidence (do not use for further RC testing):

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `AnxOS-Control-Center-Setup-1.7-build150.exe` | 120214177 | `a6db1eb45b63877bd638f9e210160001aa0787cfe92b1323ca08f3e3fd078acc` |
| `AnxOS-Control-Center-Setup-1.7-build150.exe.blockmap` | 128057 | `d42bde9b83573be14cfc5b33e54d62cecd270edce6ae3da06f44b7e82eab3a5b` |
| `AnxOS-Control-Center-1.7-build150-portable.exe` | 119672843 | `b0e29e04a8c1f8aecb5af57059892415203a3f7b69905cf5295819e81e8916d2` |
| `AnxOS-Control-Center-1.7-build150.AppImage` | 150554875 | `08bb3d11a10323f67e20c407e83fdacee67bca5e94cd98f511f3bc7b8c316087` |
| `AnxOS-Control-Center-1.7-build150.deb` | 118519392 | `051412619a0355d6e8e0e90ddd9aff0fbe9ea18ab6cd8de841eb5a688c9a8210` |

Files changed: node identity implementation/docs/tests, QA smoke contracts,
packaging precondition logic, aggregate RC runner, release alignment tests, and
the reports listed in `DOCUMENTATION_INDEX.md`.

Engineering commits: `939fa1e`, `d08b982`, `9eb2b66`, `61002a1`.

No artifact was tagged, uploaded, published, or released.
