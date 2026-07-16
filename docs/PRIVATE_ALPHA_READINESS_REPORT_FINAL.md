# Private Alpha Readiness Report

Invalidated candidate source: `9eb2b66`

Required replacement source: `61002a1` or a documented descendant

Public identity: Version 1.7 Build 150 Private Alpha

Architecture: x64

Decision date: 2026-07-16

## Repository Decision

The High-severity live node-health recovery defect found against the original
candidate is fixed in `61002a1`, and the aggregate source gate passes 155/155
commands. The original Windows/Linux artifacts are invalid because they predate
the fix. No replacement artifact evidence exists yet.

## External Gate

PA-RC-01 through PA-RC-17 require execution or re-execution against replacement
artifacts. PA-RC-05 and PA-RC-06 must specifically prove live recovery across
Agent Control, Nodes, Dashboard, the global shell, and navigation without an app
restart. Other required evidence includes Windows install,
upgrade, UAC/service behavior, Authenticode/SmartScreen, Debian pairing, rapid
remote switching, live Marketplace download/cancellation, real server lifecycle,
backup restore, filesystem confinement, Docker pull, Public Access, update
checksum/handoff, shutdown/recovery, and uninstall/reinstall preservation.

## Status Summary

| Area | Status |
| --- | --- |
| Architecture, authorization, recovery, migrations | AUTOMATED VALIDATION PASSING |
| Node identity and targeting | AUTOMATED VALIDATION PASSING |
| QA contract and documentation hierarchy | AUTOMATED VALIDATION PASSING |
| Diagnostics redaction | AUTOMATED VALIDATION PASSING |
| Template certification and metadata alignment | AUTOMATED VALIDATION PASSING |
| Exact candidate package contents | PRECONDITION_NOT_MET |
| Windows installation and Local Agent | REQUIRES REAL MACHINE VALIDATION |
| Signing and SmartScreen | REQUIRES SIGNING INFRASTRUCTURE |
| Marketplace/Public Access external behavior | REQUIRES EXTERNAL PROVIDER VALIDATION |
| OS installer rollback | TECHNICALLY NOT GUARANTEED |

## Evidence And Commits

- `939fa1e` reconciled QA contracts and stable loopback identity.
- `4547610` strengthened seeded diagnostic redaction.
- `d08b982` aligned metadata, documentation hierarchy, and template certification.
- `4a9c9aa` exposed explicit Docker capability states.
- `9eb2b66` persisted update handoff and next-launch recovery state.
- `61002a1` synchronized authenticated Agent recovery into canonical node health.
- Historical artifact hashes are retained in the blocker closure report only as
  invalidated provenance evidence.

## Final Recommendation

**NOT READY** to distribute as the first Private Alpha Release Candidate until
the exact artifacts complete PA-RC-01 through PA-RC-17 with no open Critical or
High defects.

**Repository readiness: 100%. Overall Private Alpha readiness: 82%.**

The remaining 18% includes replacement artifact generation plus evidence that
source tests cannot produce. Passing those gates permits a later decision of `PRIVATE ALPHA
READY`; this report does not authorize tagging, publishing, or releasing.
