# Local Agent Windows Setup

This guide describes the intended beginner setup flow for Windows users.

## User Flow

1. Download the Windows installer from the website.
2. Install and launch AnxOS Control Center.
3. In onboarding, choose `Use This PC` or `Configure Both`.
4. Select `Install Local Agent`.
5. Approve administrator permission if service installation requires it.
6. Let AnxOS install the bundled runtime, create directories, create secure config, install the service, start the Agent, and pair automatically.
7. Let AnxOS scan dependencies.
8. Install supported missing dependencies from inside AnxOS where available.
9. Open Marketplace and create the first server.

No terminal commands, manual Node.js install, JSON editing, localhost configuration, or token copying should be required for normal users.

## Service Behavior

The Local Agent is designed to run as a Windows service so it can start with Windows and continue running when the desktop app is closed. Service actions include install, start, stop, restart, repair, and remove.

Repair preserves user-created instances and backups unless the user explicitly chooses a destructive cleanup.

## Setup Checks

Onboarding and Agent Control should verify:

- Desktop application ready.
- Local Agent installed.
- Windows service registered.
- Agent running.
- Authentication successful.
- Agent version compatible.
- Storage paths writable.
- Required permissions available.

## Storage Choices

The setup flow should use managed defaults for instances, backups, logs, configuration, and temporary downloads. Paths with spaces and non-ASCII characters must work.

## Validation Status

Repository smoke tests validate the installer, service-control model, pairing, discovery, dependency scanning, Marketplace flows, Files, Backups, Public Access, diagnostics, and node coexistence logic. Real Windows installer execution, service startup after reboot, SmartScreen, antivirus behavior, and dependency installs still require real-machine validation before stable release.
