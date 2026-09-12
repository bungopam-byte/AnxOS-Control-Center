# AnxOS Control Center v1.7-build147 - Private Alpha Hotfix

This Private Alpha hotfix is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

Build 147 replaces build 146 for testers because build 146 can crash during packaged Windows startup while loading Local Agent metadata from the wrong packaged path. Feature implementation remains complete for the Local Agent milestone, static packaging validation is being rerun for this hotfix, and additional clean Windows real-machine validation was not completed. Testers should expect bugs and report issues.

## Highlights

- Fixed a packaged Windows main-process startup crash caused by diagnostics loading `agent/package.json` from inside `app.asar`.
- Resolved bundled Local Agent version metadata from the packaged `local-agent-runtime` resource with a safe fallback.
- Kept Agent Control update checks, diagnostics, and runtime status working when bundled Agent metadata is unavailable.
- Added smoke coverage so diagnostics and Agent Control do not hard-load Agent package metadata from an asar-relative path.
- Bumped the Electron updater package version to `1.0.49` for Private Alpha hotfix update detection.
- Preserved the build 146 Local Windows Agent milestone: automatic discovery, `This PC`, Windows service support, automatic pairing, dependency flows, Marketplace support, files, backups, diagnostics, Public Access, onboarding, and website guidance.

## Intended audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs.
- Users who understand this is not a stable release.

## Who it is for

This release is for invited Windows testers who hit the build 146 startup crash or are starting Local Agent testing from the website.

New installations should use build 147 from the website, complete onboarding, choose Use This PC, install the Local Agent, pair automatically, scan dependencies, and create a test Marketplace server.

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

- New Windows users should use the build 147 Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing build 146 users who see the JavaScript startup error should install build 147 manually because build 146 may crash before it can run an update check.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If the app shows the build 146 JavaScript startup error, close it and install build 147 from the website.
- If the Local Agent is offline after build 147 starts, use Agent diagnostics to start or repair the service.
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
