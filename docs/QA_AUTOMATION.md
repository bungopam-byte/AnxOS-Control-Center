# Local Electron QA automation

The QA harness launches AnxOS with an explicit `--qa-mode` flag and uses Playwright's Electron API. QA mode is disabled for normal launches, has no HTTP or LAN listener, and does not expose shell, filesystem, process, or credential APIs. It only observes and clicks the application window.

## Windows usage

From a checkout with dependencies installed:

```powershell
$env:ANXOS_QA_MODE = "1"
npm run qa:acceptance
```

The runner launches the local Electron entrypoint by default. Set `ANXOS_QA_EXECUTABLE` to a packaged executable for installed-build testing. Set `ANXOS_QA_DESTRUCTIVE=1` only for a separately provisioned test environment; the initial suite never performs destructive actions.

Artifacts are written to `artifacts/qa/<UTC timestamp>/`. They contain screenshots, a timeline, results, environment metadata, renderer console errors, and a summary. Secrets and authorization headers are redacted.

## Security boundaries

The harness has no network server and generates no persistent credentials. Playwright is restricted to the Electron process launched by the runner. Destructive workflows are opt-in and are not enabled by the default acceptance suite.
