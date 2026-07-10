---
name: anxos-release
description: "Prepare, publish, and verify AnxOS releases."
---

# AnxOS Release

Use this skill when the task asks to bump, tag, build, publish, or verify a release.

## Release Rules

- Inspect the current version, previous tags, branch, and working tree before changing release metadata.
- Increment the patch version unless the requested change requires minor or major.
- Run all required validations before publishing.
- Update package version, lockfile version, website release metadata, updater manifests, and release notes using existing project conventions.
- Commit the completed work with a Conventional Commit message.
- Push the `dev` branch.
- Create and push the version tag.
- Build supported artifacts with existing scripts:
  - `npm run dist:win:installer`
  - `npm run dist:win:portable`
  - `npm run dist:linux`
- Publish a GitHub Release and upload all expected assets:
  - Windows setup `.exe`
  - Windows setup `.blockmap`
  - Windows portable `.exe`
  - Linux `.AppImage`
  - Linux `.deb`
  - `latest.yml`
  - `latest-linux.yml`
  - `update-manifest.json`
- Verify the release URL, tag, version, and uploaded asset states after publishing.

## Failure Handling

Stop and report honestly when a required validation, build, upload, push, or release verification step fails. Do not silently skip release steps.
