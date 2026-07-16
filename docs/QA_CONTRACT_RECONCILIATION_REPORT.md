# QA Contract Reconciliation Report

## Root Causes

- Tests asserted exact handler text after IPC registration was centralized.
- Safe schema migration was mistaken for forbidden configuration mutation.
- Corrupt-settings preservation was mistaken for failed default recovery.
- A nonexistent Local Agent repair capability remained in an authorization list.
- Artifact absence was reported as a product failure instead of a precondition.
- `agent:validate` was described as the full repository gate even though it runs
  an Agent-focused subset.

## Corrections

- Behavioral intent now follows authorized handler/service behavior and stable
  error outcomes rather than obsolete implementation strings.
- `rc:validate` runs every `*:smoke` command and stops at the first failure.
- `artifacts:validate` requires exact artifacts; `packaging:smoke` returns a
  structured `PRECONDITION_NOT_MET` when artifacts are absent.
- `TEST_MATRIX.md` separates source, artifact, and real-machine validation.
- Build-numbered reports are explicitly historical and non-normative.

Files changed: `package.json`, `scripts/rc-validate.js`, seven corrected smoke
tests, `scripts/packaging-artifact-smoke.js`, architecture documentation, and
template/version validation scripts.

Commits: `939fa1e`, `d08b982`.

Validation:

- `npm run rc:validate`: PASS, 155/155 commands.
- `npm run agent:validate`: PASS in the initial clean-branch audit.
- JavaScript syntax validation: PASS.
- `npm run renderer-safety:smoke`: PASS.
- `npm run docs:architecture:smoke`: PASS.
- `git diff --check`: PASS.
- `npm run artifacts:validate`: PASS for Windows and Linux x64 artifacts.

Final status: **AUTOMATED VALIDATION PASSING**.

Remaining QA work is exactly PA-RC-01 through PA-RC-17. Those tests require
Windows, real services/providers, network behavior, signing, or human evidence
and cannot be converted into repository passes.
