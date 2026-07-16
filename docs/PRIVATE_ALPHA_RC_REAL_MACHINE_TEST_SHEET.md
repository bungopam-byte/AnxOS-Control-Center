# Private Alpha Release Candidate Real-Machine Test Sheet

This sheet validates a specific `dev` commit and its candidate artifacts on real
Windows and Debian systems. It covers behavior that repository automation cannot
prove. Completing this sheet does not authorize creating a tag, publishing a
release, or changing a public update channel.

## Result And Severity Rules

Allowed results: `PASS`, `FAIL`, `BLOCKED`, and `NOT RUN`.

| Severity | Release effect | Examples |
| --- | --- | --- |
| Critical | Release blocked | Data loss, path escape, authorization bypass, secret exposure, invalid or tampered artifact accepted |
| High | Release blocked | Install or upgrade unusable, Agent pairing broken, core workflow cannot complete or recover, false success, unsafe process left behind |
| Medium | Requires documented disposition before release | Degraded secondary behavior with a safe, tested workaround |
| Low | Does not normally block Private Alpha | Cosmetic or minor usability defect with no data, security, or workflow risk |

The candidate fails this gate when any required test is `FAIL`, `BLOCKED`, or
`NOT RUN`; any Critical or High defect remains open; evidence contains a secret;
or the tested artifact cannot be tied to the recorded commit and checksum.

## Invalidated Candidate Record

The Version 1.7 Build 150 artifacts built from `9eb2b66` are invalidated for RC
testing. Real-machine validation found a High-severity recovery inconsistency:
Agent Control reported an authenticated reachable Debian Agent while Nodes and
the global shell retained persisted Offline state. Root cause was an independent
Agent Control probe combined with node persistence that discarded live
connection state. Commit `61002a1` fixes the shared service boundary and adds an
unauthorized-to-repaired delayed-response regression. New candidate artifacts
must be built from `61002a1` or a documented descendant; old artifact results
must not be carried forward.

For the replacement candidate, rerun PA-RC-05 and PA-RC-06 and capture Agent
Control, Nodes, Dashboard, and global-shell status before and after credential
repair without restarting the app. Continue navigation through other
target-dependent pages and confirm the selected Debian Agent remains connected,
last seen advances, stale errors clear, and Connected Agent identifies it.

## Candidate And Environment Record

Do not record tokens, passwords, pairing secrets, authorization headers, private
keys, environment variables, or unredacted diagnostic content.

| Field | Recorded value |
| --- | --- |
| RC commit (`git rev-parse dev`) | |
| RC version/build | |
| Windows installer filename | |
| Windows installer SHA-256 | |
| Portable artifact filename and SHA-256, if tested | |
| Previous public version/build | |
| Previous public artifact source and SHA-256 | |
| Windows edition/version/build/architecture | |
| Windows install type (physical/VM) | |
| Debian version/architecture | |
| Desktop Agent version | |
| Debian Agent version | |
| Docker Engine version | |
| Public Access provider/version | |
| Marketplace provider/template/version | |
| Expected signing subject | |
| Signing certificate thumbprint | |
| Signature timestamp | |
| Tester and UTC test window | |
| Clean Windows snapshot/reference | |
| Debian snapshot/backup reference | |

Before testing, calculate artifact hashes with:

```powershell
Get-FileHash -Algorithm SHA256 .\<candidate-artifact>
Get-AuthenticodeSignature .\<candidate-artifact> | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
```

## Evidence Collection

For every test, record UTC timestamps, the selected node name and stable identity,
operation IDs where displayed, screenshots of material states, and the exact
artifact/template/provider used. Record defects in the `Actual behavior` field.

On Windows, collect a redacted bundle from **Diagnostics > Export Bundle**, the
contents exposed by **Diagnostics > Open Diagnostics Folder**, relevant Windows
Event Viewer Application/System entries, and Windows Security/SmartScreen history.
Development runs additionally use `.dev-logs/latest-error.json`,
`.dev-logs/runtime-state.json`, and `.dev-logs/live.log`.

On Debian, collect the Agent's configured logs and the relevant system or user
service journal. Record the actual unit name first, then use one of:

```bash
journalctl -u <agent-unit> --since '<UTC start>' --until '<UTC end>'
journalctl --user -u <agent-unit> --since '<UTC start>' --until '<UTC end>'
```

Inspect all evidence for secrets before attaching it to a defect or test report.

## PA-RC-01: Windows Signature And SmartScreen

**Default blocker severity:** High; Critical for an unexpected signer, invalid
signature accepted as trusted, or artifact hash mismatch.

**Preconditions:** Candidate downloaded through the intended Private Alpha
distribution path onto a Windows machine that has not previously trusted it.

**Steps:**

1. Calculate the installer SHA-256 and compare it byte-for-byte with the approved candidate checksum.
2. Run `Get-AuthenticodeSignature` and record status, signing subject, thumbprint, and timestamp.
3. Open the file's **Properties > Digital Signatures** and validate the signature details.
4. Launch the installer from Explorer while connected to the internet.
5. Record whether SmartScreen appears and capture the complete publisher message.
6. Cancel before installation; installation itself is covered by PA-RC-02.

**Expected behavior:** The hash matches. Authenticode status is `Valid`, the
publisher matches the approved AnxOS publisher, and the signature has a valid
timestamp. SmartScreen must not identify the artifact as corrupted or signed by
an unexpected/unknown publisher. Any reputation warning accurately names the
publisher and permits an explicit user decision.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** PowerShell signature/hash output, Digital Signatures screenshots,
SmartScreen screenshot, download source, Windows Security history.

## PA-RC-02: Fresh Windows Installation

**Default blocker severity:** High.

**Preconditions:** Disposable clean Windows snapshot with no prior AnxOS install
or AnxOS user-data directory. Do not delete data from a non-disposable system to
create this state.

**Steps:**

1. Restore the clean snapshot and confirm AnxOS is absent from installed apps, Start menu, and running processes.
2. Launch the verified installer as a standard user and approve elevation only when Windows requests it.
3. Complete the default installation without manually creating directories or installing runtime dependencies.
4. Launch AnxOS from the installed shortcut.
5. Exercise first-run navigation through Dashboard, Nodes, Settings, and Diagnostics.
6. Close and reopen the application, then reboot Windows and launch it again.
7. Check installed-app metadata, shortcuts, startup behavior, and Event Viewer for installer/application errors.

**Expected behavior:** Installation completes once without false success,
unexpected command windows, missing assets, or manual dependency work. The app
launches after install and reboot, context isolation remains effective, empty and
offline states are usable, and no secrets or raw stack traces appear.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Installer screens, installed-app entry, first-run screens, diagnostics
bundle after reboot, Event Viewer entries, Task Manager process list.

## PA-RC-03: Upgrade From Previous Public Build

**Default blocker severity:** Critical for data loss; otherwise High.

**Preconditions:** Snapshot/backup of the Windows system. Verified previous public
installer. Previous build contains a named test node, non-secret settings changes,
a disposable instance, a completed backup, and a harmless sentinel file.

**Steps:**

1. Install the previous public build and create the fixture data listed above.
2. Restart Windows and verify the previous build can still read every fixture.
3. Record the previous version and export a diagnostics bundle.
4. Run the verified RC installer over the existing installation using the supported upgrade path.
5. Launch the RC and verify the displayed version/build.
6. Verify nodes, settings, instance metadata, backup metadata, and the sentinel file.
7. Start and stop the disposable instance and run diagnostics.
8. Restart Windows and repeat the fixture checks.

**Expected behavior:** Upgrade is atomic from the user's perspective, preserves
expected user data and credentials, performs migrations once, and remains valid
after restart. Unknown future or corrupt data must fail safely rather than being
silently discarded. No instruction to delete configuration is required.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Before/after versions, redacted before/after diagnostics bundles,
fixture inventory, migration errors, Event Viewer entries.

## PA-RC-04: Local Windows Agent Setup

**Default blocker severity:** High.

**Preconditions:** Fresh RC installation with no Local Agent installed.

**Steps:**

1. Select **Use This PC** or the current Local Agent setup entry point.
2. Start Local Agent installation and approve the expected elevation prompt.
3. Observe installation, registration, identity, capability detection, and connection status.
4. Verify the local application host and Local Agent are shown as distinct concepts where applicable.
5. Close AnxOS, reboot Windows, and reopen it.
6. Verify the Agent reconnects with the same stable identity and no repeated pairing prompt.
7. Stop or disable the Agent service, run connection diagnostics, then use the guided repair flow.
8. Verify repair restores connectivity without exposing or requesting a raw token.

**Expected behavior:** One setup attempt produces one correctly registered Agent.
Startup registration survives reboot, identity is stable, capabilities reflect the
machine, failures are actionable, and diagnostics contain no credentials.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Setup/repair screens, service status and configured startup type,
Agent version/identity, redacted Desktop and Agent logs, Windows service events.

## PA-RC-05: Debian Agent Pairing

**Default blocker severity:** High.

**Preconditions:** Supported Debian host, synchronized clocks, reachable network,
and Agent installed through the documented path.

**Steps:**

1. Record the Agent package/version, service unit, URL, TLS mode, and host identity without recording credentials.
2. Start the Agent and verify its service reaches the running state.
3. From AnxOS, add/pair the Debian node using the supported guided flow.
4. Confirm the identity and capability summary before accepting the node.
5. Complete pairing and wait for the node to become online.
6. Restart the Agent service and confirm automatic reconnection with the same identity.
7. Restart AnxOS and confirm the node remains registered and reconnects.
8. Temporarily block connectivity, verify the offline/timeout state, restore connectivity, and verify automatic recovery.

**Expected behavior:** Pairing is authenticated, identity-bound, and durable. No
token is rendered or logged. Disconnects, timeouts, TLS failures, and recovery are
reported accurately without creating duplicate nodes.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Pairing screens, node identity/capabilities, redacted Desktop bundle,
Agent journal, network failure/recovery timestamps.

## PA-RC-06: Rapid Remote-Node Switching

**Default blocker severity:** Critical if an action executes on the wrong node;
otherwise High.

**Preconditions:** Online Local Windows Agent and Debian Agent with visibly
different names, capabilities, files, and disposable instances.

**Steps:**

1. Select Windows and visit Dashboard, Marketplace, Instances, Docker, Files, Console, Backups, Public Access, Settings, Security Center, and Agent Control.
2. On every page, record the displayed selected node and verify its data belongs to Windows.
3. Repeat for Debian.
4. Switch Windows to Debian and back at least ten times while opening pages and refreshing data rapidly.
5. Introduce response delay or temporary packet loss to one Agent, switch away before its response returns, and observe the current page.
6. With Debian selected, open a destructive confirmation, switch to Windows before confirming, and attempt confirmation.
7. Navigate away and back, then restart AnxOS and verify the intended persisted selection.

**Expected behavior:** One selection is reflected consistently across pages. Late
responses never replace current-node data. Destructive work revalidates its target
and is blocked or reconfirmed after a selection change. No implicit fallback to
the application host occurs.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Screen recording, exact switching timeline, node identities,
operation/IPC diagnostics, both Agent logs.

## PA-RC-07: Supported Marketplace Server Installation

**Default blocker severity:** Critical for overwrite/data loss; otherwise High.

**Preconditions:** Disposable supported node, supported server template recorded
in the environment table, sufficient disk space, and no instance with the target
name/path.

**Steps:**

1. Select the intended node and verify the template is explicitly shown as supported for its OS/capabilities.
2. Run requirements/preflight and record disk-space and dependency results.
3. Start installation once and observe download, validation, extraction, configuration, activation, verification, and cleanup states.
4. Attempt a duplicate submission while the operation is active.
5. After completion, verify exactly one instance exists and its path does not contain staging artifacts.
6. Start the server, wait for readiness, connect with the expected protocol/client where practical, then stop it.
7. Inspect temporary/staging locations for abandoned artifacts.

**Expected behavior:** Unsupported choices are rejected before download where
metadata permits. A supported install remains isolated until verification,
activates atomically, cannot overwrite an existing instance, and reports truthful
progress. Duplicate submission does not create duplicate work.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Template/provider/version, disk-space reading, operation ID and state
timeline, instance logs, directory listing before/after, Desktop and Agent logs.

## PA-RC-08: Cancellation During A Real Download

**Default blocker severity:** High.

**Preconditions:** A supported marketplace operation large enough to observe in
progress, disposable target, and OS network/process monitoring available.

**Steps:**

1. Start the real download and record its operation ID and destination/staging path.
2. Wait for measurable progress between 10% and 50%.
3. Select **Cancel** once and record the timestamp.
4. Observe network activity and relevant child processes until they stop or reach the documented safe-cancellation boundary.
5. Verify the operation reaches `cancelled`, not `completed` or generic success.
6. Verify no active instance or final artifact was exposed and temporary content is cleaned or explicitly retained for safe resume.
7. Retry from the UI and verify a new execution attempt either resumes safely or restarts cleanly.

**Expected behavior:** Cancellation reaches the underlying downloader/process, not
only the UI record. Final activation never occurs, locks are released safely, and
retry is a real new attempt with accurate progress and outcome.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Operation IDs/attempt numbers, network/process observations, staging
directory before/after, progress screenshots, Desktop and Agent logs.

## PA-RC-09: Instance Lifecycle, Readiness, And Crash Recovery

**Default blocker severity:** High.

**Preconditions:** Disposable installed server with known readiness signal and a
valid startup command.

**Steps:**

1. Start the instance and record transitions through starting, process running, server ready, and healthy/degraded as applicable.
2. Verify the service is not called ready before its real readiness signal.
3. Stop it from AnxOS and confirm intentional stop, process exit, and port release.
4. Restart it and confirm a new process reaches readiness.
5. Trigger one unintentional crash using the supported process-control path and record exit code and state.
6. Observe bounded automatic recovery and backoff.
7. Cause repeated startup failures on the disposable fixture until crash-loop protection activates.
8. Restore the valid configuration and perform the supported recovery action.
9. Restart AnxOS while the instance is running and verify process/state reconciliation.

**Expected behavior:** Running, ready, healthy, stopped, crashed, and crash-loop
states are distinct. Intentional stops do not restart. Recovery is bounded, exit
details remain available, stale PIDs are repaired, and the UI never claims health
solely because a process exists.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** State timeline, PID/port observations, readiness and server logs,
exit code, retry/backoff timestamps, diagnostics before/after app restart.

## PA-RC-10: Backup Creation And Restore

**Default blocker severity:** Critical for data loss or unsafe overwrite; otherwise High.

**Preconditions:** Disposable stopped instance, known marker value `A`, sufficient
space for backup plus restore safety snapshot, and an external copy of the fixture.

**Steps:**

1. Create a backup and record operation ID, archive path, size, and integrity result.
2. Verify the archive is listed only after completion and validation.
3. Change the instance marker to `B` and verify the change.
4. Start the instance and attempt restore.
5. Confirm restore either refuses while running or explicitly stops and verifies the instance before proceeding.
6. Restore the backup and verify an automatic pre-restore safety snapshot is created.
7. Verify the restored marker is `A`, permissions are usable, and the instance reaches readiness.
8. Verify retention did not remove the only valid recovery copy.

**Expected behavior:** Backup and restore check space, integrity, compatibility,
and concurrency. Restore never writes into a running instance without verified
stop, and success is reported only after the restored instance is usable.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Operation IDs, archive checksum/integrity result, free-space readings,
backup inventory, marker evidence, safety snapshot, instance/Agent logs.

## PA-RC-11: File Transfer And Path Confinement

**Default blocker severity:** Critical for any read/write outside the authorized
root; otherwise High.

**Preconditions:** Disposable authorized root, test files with known SHA-256, and
an outside-root sentinel that must remain unchanged.

**Steps:**

1. Upload a test file and compare its source and remote SHA-256.
2. Download it and compare the downloaded SHA-256.
3. Rename, move, edit, and delete disposable files inside the root; verify each result.
4. Attempt traversal paths using `../` segments and mixed separators.
5. Attempt an absolute path outside the authorized root.
6. On Debian, create a symlink inside the authorized root pointing to the outside sentinel, then attempt read and write through it.
7. Interrupt a large upload, then verify no corrupt final file is exposed and retry behaves cleanly.
8. Confirm the outside sentinel content, metadata, and checksum remain unchanged.

**Expected behavior:** Valid transfers preserve content. Canonical resolution
confines every operation to its authorized root, including symlinks and remote
separator normalization. Invalid paths fail with a redacted actionable error.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Requested and resolved paths with user-specific portions redacted,
before/after checksums, transfer operation IDs, outside sentinel evidence, Agent logs.

## PA-RC-12: Docker Image Pull

**Default blocker severity:** High.

**Preconditions:** Node advertises Docker capability; Docker daemon is reachable;
test image and immutable digest are recorded.

**Steps:**

1. Select the Docker-capable node and confirm Docker actions are unavailable on a node without that capability.
2. Pull the recorded image by tag/digest and observe real progress.
3. Submit the same pull again while active.
4. Verify completion against `docker image inspect` and the expected digest.
5. Start a disposable container, view logs/stats, stop it, and remove it.
6. Remove the disposable image if no other fixture requires it.

**Expected behavior:** Pull status reflects the real daemon, duplicate work is
locked or joined, digest/identity is accurate, and lifecycle actions target the
selected node. Cleanup does not remove unrelated images, containers, or volumes.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Image name/digest, operation ID, `docker image inspect`,
`docker events` for the test window, daemon journal, Desktop/Agent logs.

## PA-RC-13: Public Access Provisioning

**Default blocker severity:** Critical for unintended exposure or credential leak;
otherwise High.

**Preconditions:** Disposable ready instance/port, supported provider installed and
authenticated through its intended mechanism, and an external cellular network.

**Steps:**

1. Select the target node and verify the provider capability/status.
2. Provision access to the disposable instance port.
3. Record lifecycle states until the public endpoint is reported ready.
4. Connect from a device on cellular data and verify traffic reaches only the intended service.
5. Restart the provider process or interrupt connectivity, then verify status and recovery.
6. Stop/delete the public access configuration from AnxOS.
7. Re-test the endpoint externally and verify it is no longer reachable.
8. Inspect provider state for abandoned tunnels/configuration.

**Expected behavior:** Provisioning reports success only after provider readiness,
targets the selected node/port, redacts credentials, recovers accurately, and
fully revokes the endpoint on cleanup.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Provider/version, redacted endpoint, operation/status timeline,
external connection evidence, provider logs, cleanup evidence.

## PA-RC-14: App Update Download And Checksum Verification

**Default blocker severity:** Critical if a mismatched artifact is accepted;
otherwise High.

**Preconditions:** A controlled Private Alpha update manifest and candidate
artifact already available to the tester. Do not modify a public channel, publish
an artifact, or create a tag for this test.

**Steps:**

1. Record the current app version, update manifest URL/channel, target version, artifact URL, and expected SHA-256.
2. Independently download the candidate and confirm its SHA-256 matches the manifest.
3. Trigger **Check for Updates** and start the in-app download.
4. Observe progress and verify the downloaded file's SHA-256 independently before installation handoff.
5. Using an isolated controlled manifest/artifact fixture, provide a deliberately mismatched checksum.
6. Trigger the update again and verify the mismatch is rejected without replacing the current installation.
7. Restart the app and verify the current version remains usable after rejection.

**Expected behavior:** Platform/version selection is correct, download progress is
truthful, checksum is mandatory, and verification occurs before handoff. A missing
or mismatched checksum produces a redacted actionable failure and cannot overwrite
the current app. OS-installer rollback must not be claimed unless separately proven.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Redacted manifest, expected/actual hashes, update operation ID,
download path metadata, update diagnostics, before/after app version.

## PA-RC-15: Shutdown During Active Work

**Default blocker severity:** Critical for corruption/data loss; otherwise High.

**Preconditions:** Disposable marketplace download and instance. Snapshot state
before each subtest. Test each operation independently.

**Steps:**

1. Start a real cancellable download, wait for measurable progress, and close AnxOS normally.
2. Verify the Desktop process exits and inspect whether the underlying task was cancelled or safely detached according to its ownership.
3. Reopen AnxOS and record the operation state; do not retry yet.
4. Start the disposable instance, close AnxOS, and verify local/remote process behavior matches the documented ownership model.
5. Reopen and verify instance state is reconciled rather than inferred from stale cache.
6. Repeat the active-download case using Windows shutdown/restart rather than app close.

**Expected behavior:** Shutdown stops accepting new destructive work, flushes
records, closes streams, and either cancels owned work or records safe detachment.
No interrupted operation is marked successful, no corrupt final artifact appears,
and an Agent-owned server is not accidentally killed by renderer shutdown.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Operation/process IDs, shutdown timeline, Task Manager/process state,
staging files, diagnostics from immediately before and after restart, Agent logs.

## PA-RC-16: Restart Recovery

**Default blocker severity:** Critical for corruption/data loss; otherwise High.

**Preconditions:** Interrupted state produced by PA-RC-15 plus a running remote
instance and known node cache state.

**Steps:**

1. Start AnxOS after the interruption and observe startup recovery before initiating new work.
2. Verify interrupted operations are identified accurately and are not shown as successful.
3. Verify stale locks are repaired or expire without allowing duplicate destructive work.
4. Verify incomplete install/extraction artifacts are isolated and cleaned or retained only for an explicit safe retry.
5. Verify running instance state, node online/offline state, and capabilities are refreshed from their authoritative sources.
6. Retry the interrupted download and verify a new attempt completes or fails truthfully.
7. Restart once more and confirm no repeated recovery loop or duplicate instance/operation appears.

**Expected behavior:** Recovery is deterministic, idempotent, and preserves useful
diagnostics. It repairs stale ownership without hiding partial work, leaking
secrets, or requiring configuration deletion.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Before/after operation records, attempt IDs, lock/staging evidence,
node/instance state, two consecutive startup diagnostics bundles, Agent logs.

## PA-RC-17: Uninstall And Reinstall With User-Data Preservation

**Default blocker severity:** Critical for unexpected user-data deletion; otherwise High.

**Preconditions:** Completed PA-RC-03 fixture inventory and full backup. Record
whether Local Agent removal is a separate explicit choice.

**Steps:**

1. Close AnxOS and record expected preserved user data: nodes, settings, instance metadata/content, backups, and harmless sentinel files.
2. Uninstall AnxOS through Windows Installed Apps using default choices.
3. Verify application binaries, shortcuts, and owned transient files are removed.
4. Verify expected user data remains and record Local Agent service behavior.
5. Reinstall the same verified RC artifact.
6. Launch and verify preserved nodes, settings, instances, backups, and sentinel files.
7. Verify Local Agent reconnects, or use the documented reinstall/repair flow if it was explicitly removed.
8. Start/stop the disposable instance and open one backup to confirm metadata is usable.
9. Run Diagnostics and reboot Windows for a final persistence check.

**Expected behavior:** Default uninstall removes the application but does not
silently delete user-owned server data, configuration, or backups. Any destructive
removal option is explicit. Reinstall recognizes compatible data, reconnects or
guides Agent repair, and does not create duplicate identities.

**Actual behavior:**

| Result | Defect ID | Observed behavior |
| --- | --- | --- |
| | | |

**Collect:** Before/after fixture inventory and checksums, uninstall screens,
installed-app entries, service status, reinstall diagnostics, final reboot evidence.

## Final Gate Summary

| ID | Test | Result | Highest defect severity | Defect ID(s) | Tester/date |
| --- | --- | --- | --- | --- | --- |
| PA-RC-01 | Signature and SmartScreen | | | | |
| PA-RC-02 | Fresh Windows installation | | | | |
| PA-RC-03 | Previous public build upgrade | | | | |
| PA-RC-04 | Local Windows Agent | | | | |
| PA-RC-05 | Debian Agent pairing | | | | |
| PA-RC-06 | Remote-node switching | | | | |
| PA-RC-07 | Marketplace installation | | | | |
| PA-RC-08 | Real-download cancellation | | | | |
| PA-RC-09 | Instance lifecycle/recovery | | | | |
| PA-RC-10 | Backup and restore | | | | |
| PA-RC-11 | File transfer/confinement | | | | |
| PA-RC-12 | Docker image pull | | | | |
| PA-RC-13 | Public Access | | | | |
| PA-RC-14 | Update/checksum | | | | |
| PA-RC-15 | Shutdown during work | | | | |
| PA-RC-16 | Restart recovery | | | | |
| PA-RC-17 | Uninstall/reinstall | | | | |

**Gate decision:** `PASS / FAIL`

**Open Critical defects:**

**Open High defects:**

**Medium defects and approved dispositions:**

**Evidence reviewed for secret exposure by:**

**QA sign-off and UTC timestamp:**

**Release owner sign-off and UTC timestamp:**

Passing this sheet means the recorded candidate is eligible for a separate release
decision. It does not itself authorize tagging, publishing, or releasing it.
