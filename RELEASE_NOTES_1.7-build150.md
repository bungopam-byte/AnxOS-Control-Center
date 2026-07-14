# AnxOS Control Center v1.7-build150 - Private Alpha Release Candidate

This Private Alpha release candidate is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

Build 150 replaces build 149 for testers because it fixes a startup-command regression that could break shell-wrapped game server templates such as Palworld, adds bounded restart behavior for immediate crashes, replaces the unsupported Public Access browser prompt with an in-app modal, and includes the completed desktop and website release-polish pass.

## Highlights

- Preserved shell-wrapped startup commands as structured executable arguments so Palworld keeps the full `bash -lc` script intact.
- Verified shell operators such as redirects, `|| true`, and semicolons remain inside the shell script argument instead of being split into separate process arguments.
- Added bounded restart/backoff handling so immediately crashing instances stop and show the real exit reason instead of restarting every second forever.
- Replaced the Public Access Create Access Service browser prompt with an in-app modal that validates service name, host, port, and protocol.
- Polished desktop navigation, dashboard, instances, Marketplace, Public Access, files, console, Docker, backups, settings, security, owner tools, node status, empty/error states, accessibility, and copy.
- Polished website design, navigation, home, authentication, profile, download, release notes, responsive behavior, accessibility, metadata, and production route readiness.
- Bumped the Electron updater package version to `1.0.52` for Private Alpha build 150 update detection.

## Intended audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs.
- Users who understand this is not a stable release.

## Who it is for

This release is for invited testers who are validating Marketplace game server startup, Public Access service creation, Local Agent behavior, desktop UI polish, website downloads, and updater metadata.

New installations should use build 150 from the website, complete onboarding, choose Use This PC, install the Local Agent, pair automatically, scan dependencies, and create a test Marketplace server.

Existing remote Agent users do not need to change their Debian or remote Windows Agent setup. They can keep using existing remote nodes and add `This PC` later.

## Known limitations

- Windows-only limitation: the beginner Local Agent setup flow is written for Windows.
- Windows Local Agent support is the focus of this release path. macOS Local Agent support is not documented or claimed.
- Linux desktop packages remain available, but the beginner Local Agent flow is written for Windows.
- No additional clean Windows installation test was completed for this release candidate.
- real-machine Windows installation, service startup after reboot, Marketplace installs, backups, and Public Access were not completed for this Private Alpha gate.
- Windows service lifecycle was not validated on a fresh Windows installation.
- Reboot persistence was not validated.
- Automatic pairing was not validated on a clean Windows machine.
- Dependency installation was not fully validated on a clean Windows machine.
- Marketplace, CurseForge, Files, Backups, and Public Access were not fully exercised from the final production artifact on a clean Windows machine.
- Tester-discovered bugs are expected.

## Upgrade guidance

- New Windows users should use the build 150 Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing build 149 users should install build 150 to receive the startup-command repair, restart-loop protection, Public Access modal fix, and polish pass.
- Existing build 146, 147, or 148 users who see a JavaScript startup error should install build 150 manually because the app may crash before it can run an update check.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If Palworld or another shell-wrapped template exits immediately after install, repair or recreate the instance on build 150 so saved startup metadata is normalized.
- If an instance enters a crash loop, check the visible exit reason and logs after restart attempts stop instead of repeatedly clicking Restart.
- If Public Access service creation fails, keep the modal open, correct field-level validation errors, and retry after confirming the selected provider is available.
- If Marketplace shows no templates immediately after install, close AnxOS and reinstall build 150 from the website.
- If the CurseForge connection test fails, build 150 should show whether the selected Agent is unreachable, missing configuration, failing the API probe, or failing the CDN authentication probe.
- If the Local Agent is offline after build 150 starts, use Agent diagnostics to start or repair the service.
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
- Palworld or shell-wrapped startup failures.
- CurseForge errors.
- Instance start, stop, restart, or crash-loop issues.
- Backup or restore issues.
- Public Access issues.
- Antivirus or SmartScreen interference.

Include screenshots and exported sanitized diagnostics when possible. Do not include Agent tokens, CurseForge credentials, private URLs, or unredacted logs.
