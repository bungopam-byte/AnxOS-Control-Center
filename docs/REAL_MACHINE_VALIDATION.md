# Real-Machine Validation

Use this guide for live validation on the available Windows 11 desktop, Debian Agent machine, and iPhone. Record failures exactly; do not mark a check passed unless it was performed on the named hardware.

## Test Environment Recording

Copy this block into each test note:

```text
Date:
Tester:
Git branch:
Commit hash:
Application mode: dev | packaged
Windows version:
Linux distribution and version:
CPU architecture:
Agent version or commit:
Node.js version:
Package manager:
Public Access provider versions:
Browser and mobile device:
Relevant configuration state:
Machine state: clean | existing | previously prepared
Notes:
```

Before starting, capture `git status --short --branch`, `git rev-parse HEAD`, Node/npm versions, and the current Agent URL/token state without recording secrets.

## Windows Desktop Validation

1. Confirm the repository is on `dev` and the commit matches the planned test commit.
2. Install fresh dependencies with `npm install`.
3. Start the development app with `npm start`.
4. If a packaged build is available, start it from the installed shortcut and from the executable directly.
5. Verify the app icon, taskbar icon, window title, splash/first screen, and AnxOS branding.
6. Walk the main navigation: Dashboard, Marketplace, Instances, Operations, Diagnostics, Agent Control, Nodes, Public Access, Owner Workspace, Settings.
7. Resize the window from narrow to wide. Confirm no horizontal scrolling, clipped text, missing sidebars, or unusable fixed-height panels.
8. Open modals and dialogs from account, Marketplace, diagnostics export, dependency preparation, and destructive confirmations. Confirm centering, viewport-safe overflow, ESC handling, focus return, and background scroll locking.
9. Sign in, confirm account state, then sign out. Record any Supabase/session restoration delay or error code.
10. Open Owner Workspace while locked. Confirm protected data is hidden. Authorize Owner state and confirm diagnostics, node health, and operational summaries appear.
11. Enable and disable Developer Mode. Confirm disabled controls explain why they are unavailable.
12. Connect to the Debian Agent node. Confirm node identity, status, health, and Operations entries.
13. In Marketplace, run Check Requirements for templates that require Java, SteamCMD, .NET, Docker/Podman, and no extra dependencies.
14. Confirm Windows dependency messaging is guided and does not claim unsupported automatic Linux package-manager behavior.
15. Open Operations. Confirm dependency checks, Marketplace attempts, diagnostics, and failures retain timestamps, status, details, and recovery actions.
16. Open Public Access. Confirm Playit, Tailscale, Cloudflare Tunnel, and AnxOS Relay states are truthful. Tailscale tailnet-only must not appear as public internet exposure.
17. Restart the app. Confirm selected node, account state, Operations history, diagnostics, and Marketplace state recover or fail with clear guidance.
18. Use Diagnostics: Capture Snapshot, Copy Summary, Export Bundle, and Open Logs Folder. Confirm copied/exported data is redacted.
19. Trigger an external URL action. Confirm expected URLs open and unsafe or unsupported URLs are blocked with a diagnostic event.
20. For any failure, create a bug report using the template below with logs and operation IDs.

## Windows Local Agent Validation

Do not mark these checks passed unless they were performed on a real Windows machine or clearly identified Windows VM.

1. Install AnxOS from the Windows installer, not from `npm start`.
2. Launch AnxOS and choose `Use This PC`.
3. Confirm the missing-Agent message explains what the Local Agent does and offers Install Local Agent, Learn More, and Use Remote Agent Instead.
4. Install the Local Agent without installing Node.js manually.
5. Approve administrator permission only when requested by Windows.
6. Confirm the bundled runtime is copied to the managed install location.
7. Confirm configuration, logs, instance storage, backup storage, and temporary download directories are created.
8. Confirm the Windows service is installed once, starts automatically, and does not create duplicate Agent processes.
9. Reboot Windows and confirm the service starts before opening the desktop app.
10. Confirm automatic pairing completes without copying tokens or editing JSON.
11. Rotate credentials and confirm re-pairing succeeds.
12. Break or remove service registration, then use Repair Service.
13. Break pairing, then use Repair Pairing.
14. Run dependency scanning for Java, Docker, Git, SteamCMD, .NET, PowerShell, FFmpeg, Tailscale, Cloudflared, Playit, and Visual C++ runtime.
15. Install at least one supported dependency through AnxOS and confirm re-scan.
16. Install a supported Marketplace server on `This PC`.
17. Start, stop, restart, kill, rename, open folder, view console, send command, view logs, and delete the test instance.
18. Create and restore a backup with a safety snapshot.
19. Validate Files shortcuts for Instances, Backups, Desktop, Documents, Downloads, AppData, ProgramData, and Steam Libraries where available.
20. Validate Public Access provider state and Windows Firewall consent.
21. Uninstall or remove the service and confirm instances/backups are preserved unless explicitly selected.
22. Inspect diagnostics export and confirm no full tokens, API keys, private environment variables, or owner secrets are present.

## Debian Agent Validation

1. Confirm Debian version, architecture, Node.js version, npm version, package manager, and current Agent commit.
2. Start the Agent in the intended mode: development command, systemd user service, or packaged Agent mode.
3. Confirm `/api/v1/health` responds locally.
4. Confirm authenticated Agent requests work from the Windows desktop without recording the token.
5. Pair or select the node in the desktop app and confirm node identity is stable.
6. Run Agent health checks from Agent Control and Node Health.
7. Restart the Agent process. Confirm the desktop reconnects and Operations/Diagnostics record the interruption and recovery.
8. Reboot the Debian machine. Confirm Agent service recovery, node reconnect, and stale-state handling.
9. Run dependency detection for Java, SteamCMD, .NET, Docker/Podman, Node.js, Python, archive tools, and command requirements.
10. Run Prepare This Node for one dependency set where installation is safe. Confirm the plan is shown before installation.
11. Validate Java detection and installation path. Confirm `java -version` after preparation.
12. Validate SteamCMD detection and installation path. Confirm `steamcmd +quit` or the safe equivalent after preparation.
13. Validate .NET detection and installation path. Confirm `dotnet --info` after preparation.
14. Validate Docker or Podman detection. Confirm permission messaging if the current user cannot access the daemon.
15. Test sudo handling without storing passwords. Confirm no password is logged.
16. Cancel a preparation flow before installation when the UI allows it. Confirm Operations records cancellation and no success is claimed.
17. Force or simulate a failed package installation where safe. Confirm stable error code, sanitized output, failed state, and manual recovery guidance.
18. Confirm verification runs after preparation and that success is only shown after verification passes.
19. Install one Marketplace template end to end.
20. Start, stop, restart, and delete the created instance. Confirm deletion safeguards and existing-instance protection.
21. Create a port conflict before starting an instance. Confirm startup blocks with a useful error.
22. Interrupt an install where safe. Confirm partial install recovery or cleanup guidance.
23. Correlate Agent logs, desktop Operations, and diagnostics bundle timestamps.

## Playit Live Validation

1. Confirm Playit binary or service detection on the selected node.
2. Confirm authentication state is reported honestly.
3. Discover any existing tunnel and confirm address, protocol, local port, and status.
4. Create a tunnel using the real Playit-supported flow. Do not fake tunnel metadata in AnxOS.
5. Start and stop the tunnel. Confirm AnxOS reflects the state after refresh.
6. Confirm public address display from an external network.
7. Try an invalid service or invalid port. Confirm validation prevents unsafe exposure and records a useful error.
8. Disconnect the Agent while Playit is running. Confirm Public Access becomes degraded or unavailable without losing previous diagnostics context.
9. Restart the app and confirm tunnel state recovery.
10. Test tunnel deletion confirmation if deletion is supported by the active Playit flow. If unsupported, confirm destructive UI is unavailable.
11. Inspect logs and diagnostics for redaction of tokens, tunnel secrets, authorization headers, and private paths.
12. Record whether Playit still works after the provider abstraction changes.

## Website and iPhone Validation

1. Open the production or preview website on iPhone Safari.
2. Validate the home page loads without horizontal overflow.
3. Sign in. Record auth provider, redirects, and any slow session restoration.
4. Sign up with a test account only if the environment allows it.
5. Open Profile and confirm user/account state.
6. Sign out and confirm protected pages no longer show account data.
7. Test mobile navigation open/close, active route state, and back navigation.
8. Test tablet-width layout in browser dev tools or iPad-sized viewport if available.
9. Open all website modals. Confirm viewport-safe sizing, scroll locking, ESC/back behavior where supported, and focus behavior.
10. Tap inputs and confirm keyboard opening/closing does not hide submit buttons or trap the page.
11. Trigger form validation errors. Confirm messages are specific and visible.
12. Confirm there is no horizontal overflow on home, sign-in, sign-up, profile, and activation routes.
13. Check safe-area behavior around the notch, bottom browser controls, and landscape orientation.
14. Refresh each route. Confirm direct-route loading works.
15. Test auth redirects while signed out and signed in.
16. Simulate slow or failed Supabase session restoration if possible. Confirm loading and error states are honest.

## Bug Reporting Template

```text
Title:
Severity: Critical | High | Medium | Low
Environment:
Exact steps to reproduce:
Expected result:
Actual result:
Screenshots or logs:
Relevant operation ID:
Relevant timestamps:
Reproduces consistently: yes | no | intermittent
Suspected subsystem:
Workaround, if any:
```

Attach copied diagnostics or exported diagnostic bundles only after confirming they contain no secrets.

## Release Gate

AnxOS may move from pre-alpha to limited private alpha only when all of these are true:

- Windows desktop launches successfully in development mode and packaged mode when available.
- Debian Agent reconnects reliably after Agent restart and machine reboot.
- One real Marketplace installation succeeds end to end.
- One dependency preparation flow succeeds and verifies afterward.
- One failed dependency preparation reports a stable error code, sanitized output, and recovery guidance.
- Playit tunnel works live from an external network after the provider abstraction changes.
- Website auth works on iPhone, including sign-in, profile, sign-out, refresh, and redirects.
- No critical unresolved bugs remain.
- No known secret leakage exists in logs, diagnostics, screenshots, or exported bundles.
- Recovery instructions exist for common failures: Agent offline, token mismatch, dependency failure, port conflict, Playit unavailable, auth restoration failure.

If any gate fails, keep the project in pre-alpha and create focused fixes before broadening testers.

For the Local Agent stable release path, build 146 remains blocked until Windows Local Agent validation above is completed and the matching build assets exist in the public release repository.
