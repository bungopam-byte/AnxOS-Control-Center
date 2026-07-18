# Onboarding Validation

Use this checklist to validate the new-user experience. Do not mark a result as passed unless it was actually tested in that runtime.

## Clean First Launch

1. Start with a clean config directory.
2. Launch AnxOS.
3. Confirm the Welcome modal appears once.
4. Click **Set Up AnxOS**.
5. Confirm the guided setup opens at the first step.
6. Close and relaunch.
7. Confirm the current setup step resumes.

## Skipped Setup

1. Start with a clean config directory.
2. Click **Explore on My Own**.
3. Relaunch.
4. Confirm the Welcome modal does not reopen automatically.
5. Confirm Settings can restart the setup guide.

## Completed Setup

1. Complete the setup guide.
2. Relaunch.
3. Confirm onboarding stays completed.
4. Confirm Dashboard and Setup Health render.

## Interrupted Setup

1. Start setup and move to a later step.
2. Quit the app.
3. Relaunch.
4. Confirm the saved step is restored.

## Windows

Validate on Windows development runtime and packaged runtime separately:

- desktop application host appears
- Windows local Agent actions are platform-correct
- Administrator-required service actions are blocked before execution
- no Linux-only service controls appear as usable
- filesystem paths remain Windows-compatible for local profiles

## Linux

Validate on Linux development runtime and packaged runtime separately:

- desktop application host appears
- Linux Agent actions are platform-correct
- dependency checks detect Linux tools without assuming Debian on every distro
- filesystem paths remain Unix-compatible for Linux profiles

## Local Agent

1. Open **Agent Control**.
2. Confirm **This Computer** and **Local AnxOS Agent** are separate.
3. Stop the local Agent if safe.
4. Confirm the UI shows stopped or unable-to-confirm, not fake not-installed.
5. Start or reconnect and confirm state updates.

## Remote Agent

1. Pair a remote Agent.
2. Select it from the node picker.
3. Confirm Dashboard, Files, Marketplace, Public Access, and Diagnostics use the selected Agent.
4. Confirm remote state does not replace local desktop identity.

## Agent Unavailable

1. Disconnect or stop a test Agent.
2. Refresh affected pages.
3. Confirm friendly errors are shown.
4. Confirm technical details remain available.
5. Confirm stale rows or stale provider details are cleared.

## Dependency Missing

1. Select a node missing a supported dependency.
2. Run dependency check.
3. Confirm status is **Not installed** or **Setup required** only when detection proves it.
4. Start an in-app install where supported.
5. Confirm progress remains inside AnxOS.

## Dependency Detection Unavailable

1. Simulate a failed dependency check.
2. Confirm status is **Unable to check** rather than falsely **Not installed**.
3. Confirm technical details explain the failure.

## Docker Missing

1. Select a node without Docker.
2. Open **Docker**.
3. Confirm the empty state says Docker is not installed or unavailable.
4. Confirm unsupported actions are disabled.

## No Servers

1. Use a profile with no instances.
2. Open **Dashboard** and **Instances**.
3. Confirm beginner empty states show **Browse Marketplace** or **Create a Server** actions.

## First Install

1. Open **Create Your First Server**.
2. Select a supported Minecraft or game-server template.
3. Confirm the existing Marketplace wizard opens.
4. Confirm dependency preflight and install status are real.
5. Confirm the completed server appears in **Instances**.

## Public Access

1. Open **Public Access**.
2. Confirm provider states match the selected node.
3. Confirm Tailscale, Playit, and Cloudflare show distinct capabilities.
4. Confirm unsupported actions explain why.

## Backup Creation

1. Open **Backups**.
2. Create a backup for a supported instance.
3. Confirm Setup Health updates **Backup created**.
4. Confirm restore/delete use appropriate confirmations.

## Guided Mode

1. Enable Guided Mode.
2. Confirm extra explanations and destructive confirmations appear.
3. Confirm no feature disappears.

## Advanced Mode

1. Enable Advanced Mode.
2. Confirm technical details are more prominent.
3. Confirm advanced mode does not bypass authorization.

## Reduced Motion

1. Enable the operating system reduced-motion preference.
2. Relaunch AnxOS.
3. Confirm nonessential animations are reduced.
4. Confirm focus and status indicators remain visible.

## Keyboard Navigation

1. Use Tab and Shift+Tab through the Welcome modal.
2. Confirm focus remains trapped inside modals.
3. Use Escape to close dismissible modals.
4. Confirm every actionable button has a visible focus state.

## Commands

Run at minimum:

```bash
node --check app.js
npm run onboarding:smoke
npm run ui:polish:smoke
npm run renderer-safety:smoke
npm run marketplace:smoke
npm run agent-control:smoke
npm run dependencies:smoke
npm run diagnostics:smoke
git diff --check
```

Add platform-specific smoke and packaging validation when testing packaged builds.
