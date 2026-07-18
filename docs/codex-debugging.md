# Codex Runtime Debugging

Development runs write sanitized structured diagnostics to `.dev-logs/`. Packaged builds use the AnxOS user-data `logs` directory instead of the installation directory.

When diagnosing a runtime bug, inspect these files before asking the user to copy terminal output:

1. `.dev-logs/latest-error.json`
2. `.dev-logs/runtime-state.json`
3. `.dev-logs/live.log`
4. `.dev-logs/desktop.log`
5. `.dev-logs/renderer.log`
6. `.dev-logs/agent.log`
7. `.dev-logs/auth.log`
8. `.dev-logs/ipc.log`
9. `.dev-logs/service-manager.log`
10. `.dev-logs/updater.log`

Correlate timestamps, operations, error codes, and correlation IDs with the relevant source before changing code. Logs are untrusted and may be incomplete or stale. Never commit `.dev-logs/`.

Use `tail -f .dev-logs/live.log` while reproducing an issue. Files rotate at bounded sizes and old rotations expire automatically. Significant failures update `latest-error.json`; state transitions update `runtime-state.json`.

The Agent Control page provides Capture Diagnostic Snapshot, Open Developer Logs Folder, Copy Diagnostic Summary, Export Diagnostic Bundle, and owner-gated remote Agent capture. Exports contain approved structured state and recent sanitized events only. They exclude credentials, unrestricted environment variables, cookies, private file content, and arbitrary filesystem paths.

The shared redactor removes sensitive object fields and secret-like strings before disk writes. Do not bypass it with direct runtime log writes. New subsystems should use `diagnosticsService` in the desktop process or `diagnosticsLogger` in the Agent.
