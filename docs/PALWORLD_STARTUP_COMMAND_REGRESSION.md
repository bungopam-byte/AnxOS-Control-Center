# Palworld Startup Command Regression Trace

## Phase 1 Findings

The Palworld marketplace template still defines a structured command:

```json
{
  "executable": "bash",
  "args": [
    "-lc",
    "chmod +x ./PalServer.sh 2>/dev/null || true; exec ./PalServer.sh -port={serverPort} -players={maxPlayers} -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS"
  ]
}
```

`src/services/marketplaceService.js` preserves this shape while expanding template values. A fresh Palworld install should create or update the Agent instance with `executable: "bash"` and `args[1]` containing the whole shell script.

The command-boundary regression is in the desktop instance settings path:

- `app.js` renders configured arguments with `args.join(" ")`.
- The save path reads that single text field through `parseArgs(...)`.
- `parseArgs(...)` only preserves a multi-word argument when it is explicitly quoted or when the whole field is JSON.
- The rendered field for Palworld is not JSON and does not retain quotes around the `bash -lc` script argument, so saving settings can turn `["-lc", "chmod +x ..."]` into `["-lc", "chmod", "+x", "./PalServer.sh", ...]`.

After that mutation, the Agent's runtime spawn path is executing the wrong structured argv, not merely logging it wrong:

```js
childProcess.spawn(config.executable, config.args, { shell: false })
```

With flattened args, Bash receives `-lc chmod +x ...`, treats `chmod` as the command string, and exits with `chmod: missing operand`. The existing `on-failure` restart policy can then restart the instance repeatedly.

This affects any existing or future shell-wrapper template whose command body is represented as one argument, including `bash -lc "..."`, `sh -c "..."`, and PowerShell `-Command "..."` / `-EncodedCommand ...` style commands. Java/Minecraft commands are less exposed because their arguments are naturally tokenized and the Java settings path reconstructs `-jar` arguments explicitly.
