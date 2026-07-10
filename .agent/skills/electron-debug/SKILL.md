---
name: electron-debug
description: "Debug Electron startup, IPC, preload, renderer, and window issues."
---

# Electron Debug

Use this skill for Electron main-process, preload, renderer, IPC, context-isolation, startup, navigation, packaged-build, and BrowserWindow problems.

## Process

- Inspect existing Electron architecture before editing.
- Identify whether the issue is in main, preload, renderer, IPC, service code, packaging, or generated assets.
- Keep fixes narrow and compatible with packaged builds.
- Maintain `contextIsolation: true` and avoid exposing Node.js or privileged APIs directly to the renderer.
- Validate IPC handlers in trusted main-process or backend code.
- Avoid importing files outside packaged app boundaries.
- Add regression coverage or smoke coverage where practical.

## Validation

Run `node --check` on changed Electron files and any relevant smoke tests. For packaged-build fixes, run the applicable build command when practical.
