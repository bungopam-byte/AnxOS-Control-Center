# Documentation Status

## Current Normative Documents

The following documents describe the current `dev` implementation and release
gates:

- `ARCHITECTURE.md`
- `OPERATION_FRAMEWORK.md`
- `NODE_TARGETING.md`
- `ERROR_CONTRACT.md`
- `SECURITY_BOUNDARIES.md`
- `CONFIG_MIGRATIONS.md`
- `RECOVERY_MODEL.md`
- `TEST_MATRIX.md`
- `KNOWN_LIMITATIONS.md`
- `PRIVATE_ALPHA_RC_REAL_MACHINE_TEST_SHEET.md`
- `MARKETPLACE_TEMPLATE_CERTIFICATION.md`

When a current document conflicts with a build-numbered report, the current
document controls.

## Historical Evidence

Files whose names contain a build number, publication report, packaged
validation report, or past readiness audit are immutable historical evidence.
They describe the named commit/artifact only and are not instructions for the
current candidate. A historical `PASS` never transfers to a later commit or
artifact.

## Generated Release Data

`release.json` is the source of public version, build, and channel identity.
`website/config.js`, `website/release-notes.json`, update manifests, generated
`release-build.json`, artifact names, and checksums must be derived from that
identity and validated for the exact candidate. Generated files do not prove
that an artifact was built, signed, installed, or exercised on a real machine.
