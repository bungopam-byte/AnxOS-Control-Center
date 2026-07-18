---
name: anxos-validation
description: "Run AnxOS validation commands for changed files."
---

# AnxOS Validation

Use this skill when validating implementation work, bug fixes, release preparation, or pre-push checks.

## Process

- Inspect changed files and choose relevant checks.
- Run `node --check` on changed JavaScript files.
- Run applicable existing npm scripts from `package.json`.
- Prefer existing smoke tests over ad hoc test logic.
- Always run `git diff --check`.
- Report exactly which commands passed or failed.
- Never invent or imply validation results.

## Common Commands

```bash
.agent/scripts/validate-skills
.agent/scripts/validate-project
npm run marketplace:smoke
npm run owner:smoke
npm run owner-account:smoke
npm run account:smoke
npm run agent:token:smoke
node scripts/security-backup-smoke.js
npm --prefix agent run check
git diff --check
```

Choose only the checks that fit the change unless a release or full validation is requested.
