# Desktop Release CI

The `Desktop Release` workflow validates the repository before building. The validation job runs versioning smoke checks, `rc:validate`, and JavaScript syntax checks. Windows and Linux packaging start only after validation succeeds.

Windows builds use the dynamic Electron Builder configuration. Azure Trusted Signing is enabled only when all required secrets are present; partial configuration fails. Linux builds use the same configuration without signing.

Windows signing is verified after packaging with Windows SDK `signtool.exe verify /pa /v` for every generated executable. The verifier discovers an explicit `SIGNTOOL_PATH`, PATH candidates, `WindowsSdkDir`, and standard Windows SDK roots, preferring the newest x64 SDK. Any failed verification stops the job.

Artifacts are uploaded only after successful packaging and signature verification. Tag-triggered runs download both platform artifact sets, generate updater metadata and `SHA256SUMS`, validate the complete set, then publish to the release repository.

Common failures:

- Partial Azure secrets: configure all Azure variables or remove them for an unsigned developer build.
- Missing signtool: install a Windows SDK or set `SIGNTOOL_PATH`.
- Missing artifacts: inspect the platform packaging log before changing release metadata.
- Validation smoke failure: reproduce the named `npm run ...:smoke` command locally.
