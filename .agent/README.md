# AnxOS Agent Workflow

This directory contains repository-specific instructions and lightweight automation helpers for coding agents working on AnxOS Control Center. It is developer infrastructure only; it does not add an AnxOS application page, user setting, or packaged UI feature.

## How Codex Uses This

Codex reads the root `AGENTS.md` as permanent project guidance while working in this repository. The reusable skill files under `.agent/skills/` provide task-specific instructions that can be referenced by coding agents when a task matches their purpose.

## Included Skills

- `anxos-ui-review`: review changed UI code and screenshots for AnxOS visual consistency, spacing, clipping, responsiveness, states, and keyboard accessibility.
- `anxos-validation`: determine and run the validation commands that apply to the current changes.
- `anxos-release`: perform release preparation, validation, versioning, tagging, artifact building, GitHub release publishing, and verification.
- `electron-debug`: diagnose Electron main, preload, renderer, IPC, context isolation, navigation, startup, and window issues.
- `agent-debug`: diagnose remote-agent connectivity, configuration, authentication, token, API, node-status, and service issues.

## Adding a Skill

1. Create a new directory under `.agent/skills/<skill-name>/`.
2. Add `SKILL.md`.
3. Start the file with YAML front matter:

   ```yaml
   ---
   name: skill-name
   description: "Short routing description."
   ---
   ```

4. Keep the skill focused and reusable. Put permanent repository rules in `AGENTS.md`, not in every skill.
5. Run `.agent/scripts/validate-skills`.

## Commands

Validate skill metadata:

```bash
.agent/scripts/validate-skills
```

Run the project validation helper:

```bash
.agent/scripts/validate-project
```

Check release readiness without publishing:

```bash
.agent/scripts/release-check
```

## Project Instructions vs Skills

`AGENTS.md` contains rules that should apply to every repository task. Skills are smaller, reusable routing documents for specific task types. For example, release safety belongs in both root policy and `anxos-release`, while UI screenshot review details belong in `anxos-ui-review`.

## Release Separation

General validation and release automation are intentionally separate. `.agent/scripts/validate-project` checks the repository without changing versions, tags, or releases. `.agent/scripts/release-check` verifies release readiness but does not publish anything. Actual publishing should use the repository's existing release workflow and GitHub CLI only when explicitly requested.
