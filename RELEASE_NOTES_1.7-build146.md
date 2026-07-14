# AnxOS Control Center v1.7-build146 - Private Alpha

This Private Alpha release is for invited testers only. It is not stable, production-ready, fully validated, or generally available.

Feature implementation is complete for this milestone. Static Windows packaging validation passed, website and release-route validation passed, versioning and artifact smoke tests passed, and Local Agent runtime metadata is prepared for build 146. Additional clean Windows real-machine validation was not completed. Testers should expect bugs and report issues.

## Highlights

- Local Windows Agent support.
- Automatic local node discovery.
- `This PC` local node.
- Windows service integration.
- Automatic local pairing.
- Local dependency scanning and installation flows.
- Local Marketplace deployment support.
- CurseForge integration.
- Local files, backups, diagnostics, and Public Access improvements.
- Updated onboarding.
- Updated website download and setup guidance.

## Intended audience

- Invited friends.
- Private testers.
- Users comfortable reporting bugs.
- Users who understand this is not a stable release.

## Known limitations

- Windows-only limitation: the beginner Local Agent setup flow is written for Windows.
- Windows Local Agent support is the focus of this release path. macOS Local Agent support is not documented or claimed.
- Linux desktop packages remain available, but the beginner Local Agent flow is written for Windows.
- No additional clean Windows installation test was completed.
- Windows service lifecycle was not validated on a fresh Windows installation.
- Reboot persistence was not validated.
- Automatic pairing was not validated on a clean Windows machine.
- Dependency installation was not fully validated on a clean Windows machine.
- Marketplace, CurseForge, Files, Backups, and Public Access were not fully exercised from the final production artifact on a clean Windows machine.
- Tester-discovered bugs are expected.

## Upgrade guidance

- New Windows users should use the Windows installer from the website, choose Use This PC, and let onboarding install and pair the Local Agent.
- Existing remote Agent users can keep using their configured remote nodes and add This PC later.
- Existing private-alpha users should verify the website version, installer filename, checksums, and release notes before replacing an installed build.

## Repair guidance

- If the Local Agent is offline, use Agent diagnostics to start or repair the service.
- If pairing fails, use Repair Pairing instead of copying tokens manually.
- If dependencies are missing or unavailable, re-run the dependency scan after installation or restart.
- If a Local Agent update fails, preserve instances and backups, then use repair or rollback instructions from diagnostics.

## Tester guidance

Report:

- Installation failures.
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
