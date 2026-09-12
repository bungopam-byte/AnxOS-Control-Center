# AnxOS Control Center Version 1.7 Build 159

## Who it is for

Private Alpha administrators setting up and managing dedicated servers across supported Windows and Debian nodes.

## New installations

Install the signed Windows x64 installer or a provided Debian x64 package, then complete the guided first-run setup.

## First-run experience

Build 159 introduces a focused seven-step setup guide covering sign-in, local ownership, Agent connection, node preparation, first-server creation, public access, and setup completion. Clear status markers, contextual guidance, and deep links keep each step understandable and recoverable.

## Account and pairing reliability

Device authorization polling now respects the server-provided interval and can resume after its bounded wait. Expired or consumed pairing codes are cleared so a new pairing attempt starts cleanly.

## Responsive desktop and website guidance

The Control Center remains usable at the supported 900 x 640 minimum window size. Website navigation, downloads, copy actions, and the `/setup/` guide are optimized for mobile layouts.

## Upgrade guidance

Existing installations can use the updater metadata or download the signed installer from the release page. Existing remote Agent users should verify the selected node after pairing.

## Platform support

Windows x64 installer and portable packages are Authenticode signed. Debian x64 packages are provided for Linux. macOS is not a supported release target.

## Repair guidance

Use Agent Control and Dependencies to repair missing prerequisites, then return to the guided setup step that needs attention.

## Existing remote Agent users

Pair the existing Agent and verify the selected node before managing instances.

## Windows-only limitation

Windows packaging and Authenticode signing are provided for x64 systems.

## macOS Local Agent support is not documented or claimed

macOS is not a supported release target.

## real-machine Windows installation

Validate the installer signature before installation and keep the Agent paired during upgrade.
