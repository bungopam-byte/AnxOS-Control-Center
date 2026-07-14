# AnxOS Control Center v1.7-build149 - Private Alpha Hotfix

This Private Alpha hotfix is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

Build 149 replaces build 148 for testers because build 148 can launch but the packaged Marketplace catalog can be empty when required config files are missing from `app.asar`.

## Highlights

- Fixed packaged Marketplace loading by injecting `config/marketplace-templates.json` into `app.asar`.
- Added `config/agent.example.json` to the same packaging verification path.
- Added artifact smoke assertions so future Windows and Linux packages must include the Marketplace template catalog.
- Preserved the build 148 shared-module packaging fix.
- Bumped the Electron updater package version to `1.0.51` for Private Alpha hotfix detection.

## Intended audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs.
- Users who understand this is not a stable release.

## Who it is for

This release is for invited testers who saw an empty Marketplace in build 148 or are starting Local Agent testing from the website.

New installations should use build 149 from the website, complete onboarding, choose Use This PC, install the Local Agent, pair automatically, scan dependencies, and create a test Marketplace server.

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

- New Windows users should use the build 149 Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing build 148 users who see an empty Marketplace should install build 149 manually.
- Existing build 146 or 147 users who see a JavaScript startup error should install build 149 manually because the app may crash before it can run an update check.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If Marketplace shows no templates immediately after install, close AnxOS and install build 149 from the website.
- If the Local Agent is offline after build 149 starts, use Agent diagnostics to start or repair the service.
- If pairing fails, use Repair Pairing instead of copying tokens manually.
- If dependencies are missing or unavailable, re-run the dependency scan after installation or restart.
- If a Local Agent update fails, preserve instances and backups, then use repair or rollback instructions from diagnostics.

## Tester guidance

Report:

- Installation failures.
- JavaScript startup errors.
- Empty Marketplace states.
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
