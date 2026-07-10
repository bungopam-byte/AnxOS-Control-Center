# AnxOS Control Center Agent Instructions

These rules apply to coding agents working in this repository.

## Project Approach

- Read existing documentation and inspect related code before modifying behavior.
- Prefer the existing project architecture, dependencies, services, IPC patterns, and UI components.
- Avoid unnecessary dependencies and broad rewrites.
- Preserve unrelated user or agent changes. Do not use destructive Git commands such as `git reset --hard`, `git clean`, or broad file restoration.
- Add regression coverage for bug fixes when practical.

## UI and UX

- Preserve the existing AnxOS visual identity and desktop application aesthetic.
- Do not redesign pages unless explicitly requested.
- Keep UI spacing, density, typography, cards, controls, modals, navigation, loading states, empty states, disabled states, and error states visually consistent.
- Treat renderer hiding as presentation only, never as a security boundary.

## Security

- Keep privileged owner functionality protected in trusted main-process or backend code.
- Maintain Electron context isolation and existing IPC security boundaries.
- Never expose passwords, API keys, Supabase secrets, refresh tokens, agent tokens, private keys, or credentials.
- Redact sensitive values from logs, errors, diagnostics, screenshots, and generated history.
- Do not weaken authentication, authorization, URL allowlists, validation, secure storage, or token handling.

## Validation

- Validate changed JavaScript files with `node --check`.
- Run relevant repository smoke tests and validation scripts for the files changed.
- Run `git diff --check`.
- Do not claim validation passed unless the command actually ran successfully.
- Report the exact commands that passed or failed.

## Git Workflow

- Use Conventional Commit messages.
- Commit completed work and push it to the `dev` branch when requested or when the task requires it.
- Before release work, verify that the working tree is clean and validations pass.

## Release Workflow

- For release tasks, increment the patch version unless the requested change requires another version level.
- Create a release commit and version tag.
- Push the `dev` branch and release tag.
- Build the supported release artifacts using the repository's existing release workflow.
- Publish the GitHub release and attach the generated artifacts.
- Update required version numbers, manifests, website release metadata, and changelog/release notes where applicable.
- Verify that the GitHub release, tag, version, and downloadable assets exist.
- Never silently skip a failed build, upload, test, push, or release step.
