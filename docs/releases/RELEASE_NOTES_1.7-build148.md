# AnxOS Control Center v1.7-build148 - Private Alpha Hotfix

This Private Alpha hotfix is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

Build 148 replaces build 147 for testers because build 147 can still crash during packaged Windows startup when diagnostics loads shared desktop modules that were omitted from `app.asar`.

## Highlights

- Fixed a packaged startup crash where `src/shared/redaction.js` was missing from the Electron app package.
- Added explicit packaging coverage for shared desktop modules used by diagnostics, logging, and release metadata.
- Added artifact smoke assertions so future Windows and Linux packages must include required shared modules in `app.asar`.
- Preserved the build 147 Local Agent metadata resolver fix.
- Bumped the Electron updater package version to `1.0.50` for Private Alpha hotfix detection.

## Intended audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs.
- Users who understand this is not a stable release.

## Who it is for

This release is for invited Windows testers who hit the build 147 JavaScript startup error or are starting Local Agent testing from the website.

New installations should use build 148 from the website, complete onboarding, choose Use This PC, install the Local Agent, pair automatically, scan dependencies, and create a test Marketplace server.

Existing remote Agent users do not need to change their Debian or remote Windows Agent setup. They can keep using existing remote nodes and add `This PC` later.

## Known limitations

- Windows-only limitation: the beginner Local Agent setup flow is written for Windows.
- Windows Local Agent support is the focus of this release path. macOS Local Agent support is not documented or claimed.
- Linux desktop packages remain available, but the beginner Local Agent flow is written for Windows.
- No additional clean Windows installation test was completed for this hotfix.
- real-machine Windows installation, service startup after reboot, Marketplace installs, backups, and Public Access were not completed for this Private Alpha gate.
- Windows service lifecycle was not validated on a fresh Windows installation.
- Reboot persistence was not validated.
- Automatic pairing was not validated on a clean Windows machine.
- Dependency installation was not fully validated on a clean Windows machine.
- Marketplace, CurseForge, Files, Backups, and Public Access were not fully exercised from the final production artifact on a clean Windows machine.
- Tester-discovered bugs are expected.

## Upgrade guidance

- New Windows users should use the build 148 Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing build 146 or 147 users who see a JavaScript startup error should install build 148 manually because the app may crash before it can run an update check.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If the app shows a JavaScript startup error for missing packaged modules, close it and install build 148 from the website.
- If the Local Agent is offline after build 148 starts, use Agent diagnostics to start or repair the service.
- If pairing fails, use Repair Pairing instead of copying tokens manually.
- If dependencies are missing or unavailable, re-run the dependency scan after installation or restart.
- If a Local Agent update fails, preserve instances and backups, then use repair or rollback instructions from diagnostics.

## Tester guidance

Report:

- Installation failures.
- JavaScript startup errors.
- Agent offline states.
- Service failures.
- Pairing failures.
- Dependency installation problems.
- Marketplace installation failures.
- CurseForge errors.
- Instance start or stop issues.
- Backup or restore issues.
- Public Access issues.
- Antivirus or SmartScreen interference.

Include screenshots and exported sanitized diagnostics when possible. Do not include Agent tokens, CurseForge credentials, private URLs, or unredacted logs.
