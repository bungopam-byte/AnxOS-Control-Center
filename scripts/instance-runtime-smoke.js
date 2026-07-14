#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const servicePath = require.resolve("../agent/src/services/instances/instanceService");

function clearService() {
  delete require.cache[servicePath];
}

function palworldPayload(id, port = 8211, queryPort = 27015) {
  return {
    id,
    displayName: "Palworld Runtime Smoke",
    type: "custom-command",
    workingDirectory: "data/server",
    executable: "bash",
    args: [
      "-lc",
      `chmod +x ./PalServer.sh 2>/dev/null || true; exec ./PalServer.sh -port=${port} -players=32 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS`,
    ],
    restartPolicy: "on-failure",
    ports: [port, queryPort],
    primaryPort: port,
    templateId: "palworld",
    game: "palworld",
    tags: ["palworld", "steamcmd", "game-server"],
    startupTimeoutMs: 7200000,
  };
}

async function withTempService(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-instance-runtime-smoke-"));
  const previousRoot = process.env.AGENT_INSTANCE_ROOT;
  process.env.AGENT_INSTANCE_ROOT = path.join(root, "instances");
  clearService();
  const instanceService = require(servicePath);
  try {
    await fn(instanceService, root);
  } finally {
    instanceService._test.setProcessInspectionProvider(null);
    instanceService._test.setProcessAliveProvider(null);
    if (previousRoot === undefined) {
      delete process.env.AGENT_INSTANCE_ROOT;
    } else {
      process.env.AGENT_INSTANCE_ROOT = previousRoot;
    }
    clearService();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runtimeSnapshot(instanceRoot, pid = 580981, port = 8211, queryPort = 27015) {
  const executablePath = path.join(instanceRoot, "data", "server", "Pal", "Binaries", "Linux", "PalServer-Linux-Shipping");
  return {
    processes: [{
      pid,
      ppid: 1,
      name: "PalServer-Linux-Shipping",
      exe: executablePath,
      cwd: path.join(instanceRoot, "data", "server"),
      commandLine: `${executablePath} Pal -port=${port} -players=32 -useperfthreads -NoAsyncLoadingThread -UseMultithreadForDS`,
    }],
    ports: [
      { protocol: "udp", port, pid },
      { protocol: "udp", port: queryPort, pid },
    ],
  };
}

async function createPalworld(instanceService, id = "palworld-runtime-smoke", port = 8211, queryPort = 27015) {
  await instanceService.createInstance(palworldPayload(id, port, queryPort));
  await instanceService.writeInstanceFile(id, "server/PalServer.sh", "#!/usr/bin/env bash\n");
  return path.join(process.env.AGENT_INSTANCE_ROOT, id);
}

async function assertDetachedRuntimeReconciliation() {
  await withTempService(async (instanceService) => {
    const instanceRoot = await createPalworld(instanceService);
    instanceService._test.setProcessAliveProvider((pid) => Number(pid) === 580981);
    instanceService._test.setProcessInspectionProvider(() => runtimeSnapshot(instanceRoot));

    let status = await instanceService.updateInstance("palworld-runtime-smoke", {});
    status = await instanceService.getStatus("palworld-runtime-smoke");
    assert.strictEqual(status.state, "Running", "Detached Palworld process should reconcile to Running.");
    assert.strictEqual(status.pid, 580981, "Reconciled runtime PID should be preserved.");
    assert.strictEqual(status.runtimeProcess?.ppid, 1, "Detached PPID 1 should be recorded.");
    assert.deepStrictEqual(status.runtimeProcess?.ports, [8211, 27015], "Configured Palworld ports should be verified.");

    await assert.rejects(
      () => instanceService.startInstance("palworld-runtime-smoke"),
      (error) => {
        assert.strictEqual(error.code, "INSTANCE_ALREADY_RUNNING", "Duplicate start should return already-running compatibility code.");
        assert.strictEqual(error.state, "ALREADY_RUNNING", "Duplicate start should include structured ALREADY_RUNNING state.");
        assert.strictEqual(error.runtime?.pid, 580981, "Duplicate start should report the reconciled runtime PID.");
        return true;
      },
      "Duplicate start should not launch another Palworld process."
    );

    await assert.rejects(
      () => instanceService.deleteInstance("palworld-runtime-smoke"),
      (error) => {
        assert.strictEqual(error.code, "INSTANCE_RUNNING", "Delete should refuse while detached runtime is active.");
        return true;
      },
      "Delete must guard live detached runtimes."
    );
  });
}

async function assertNoUnrelatedAdoptionAndPortCollision() {
  await withTempService(async (instanceService) => {
    const instanceRoot = await createPalworld(instanceService, "palworld-collision-smoke");
    const unrelatedRoot = `${instanceRoot}2`;
    instanceService._test.setProcessAliveProvider((pid) => [600001, 600002].includes(Number(pid)));
    instanceService._test.setProcessInspectionProvider(() => ({
      processes: [{
        pid: 600001,
        ppid: 1,
        name: "PalServer-Linux-Shipping",
        exe: path.join(unrelatedRoot, "data", "server", "Pal", "Binaries", "Linux", "PalServer-Linux-Shipping"),
        cwd: path.join(unrelatedRoot, "data", "server"),
        commandLine: `${path.join(unrelatedRoot, "data", "server", "Pal", "Binaries", "Linux", "PalServer-Linux-Shipping")} Pal -port=8211`,
      }, {
        pid: 600002,
        ppid: 1,
        name: "other-service",
        exe: "/usr/bin/other-service",
        cwd: "/tmp",
        commandLine: "/usr/bin/other-service --port 27015",
      }],
      ports: [
        { protocol: "udp", port: 8211, pid: 600001 },
        { protocol: "udp", port: 27015, pid: 600002 },
      ],
    }));

    const status = await instanceService.getStatus("palworld-collision-smoke");
    assert.notStrictEqual(status.pid, 600001, "Unrelated PalServer process with a similar path prefix must not be adopted.");
    assert.notStrictEqual(status.state, "Running", "Unrelated PalServer process must not transition the instance to Running.");

    await assert.rejects(
      () => instanceService.startInstance("palworld-collision-smoke"),
      (error) => {
        assert.strictEqual(error.code, "PORT_IN_USE", "Unrelated configured port ownership should be reported as PORT_IN_USE.");
        assert(error.conflicts?.some((conflict) => conflict.port === 8211 && conflict.pid === 600001), "Port conflict should include the unrelated PalServer owner.");
        assert(error.conflicts?.some((conflict) => conflict.port === 27015 && conflict.pid === 600002), "Port conflict should include other query-port owner.");
        return true;
      },
      "Unrelated port ownership should block start instead of adopting the process."
    );
  });
}

async function assertStopAfterReconciliation() {
  await withTempService(async (instanceService) => {
    const instanceRoot = await createPalworld(instanceService, "palworld-stop-smoke");
    const alive = new Set([580982]);
    instanceService._test.setProcessAliveProvider((pid) => alive.has(Number(pid)));
    instanceService._test.setProcessInspectionProvider(() => alive.has(580982) ? runtimeSnapshot(instanceRoot, 580982) : { processes: [], ports: [] });

    let status = await instanceService.getStatus("palworld-stop-smoke");
    assert.strictEqual(status.state, "Running", "Stop smoke should first reconcile detached runtime.");

    const originalKill = process.kill;
    process.kill = (pid, signal) => {
      if (Number(pid) === 580982 && (signal === "SIGTERM" || signal === "SIGKILL")) {
        alive.delete(580982);
        return true;
      }
      return originalKill(pid, signal);
    };
    try {
      status = await instanceService.stopInstance("palworld-stop-smoke");
      assert.strictEqual(status.state, "Stopped", "Stop should transition reconciled detached runtime to Stopped.");
      assert.strictEqual(status.pid, null, "Stop should clear runtime PID.");
    } finally {
      process.kill = originalKill;
    }
  });
}

async function assertRenameDuplicateAndCrashLifecycle() {
  await withTempService(async (instanceService) => {
    await instanceService.createInstance({
      id: "duplicate-source",
      displayName: "Duplicate Source",
      type: "custom-command",
      workingDirectory: "data",
      executable: "node",
      args: ["server.js"],
      restartPolicy: "never",
      ports: [25565],
    });
    await instanceService.writeInstanceFile("duplicate-source", "server.properties", "server-port=25565\n");

    const renamed = await instanceService.renameInstance("duplicate-source", "Renamed Source");
    assert.strictEqual(renamed.displayName, "Renamed Source", "Instance rename should update display name without changing ID.");

    const duplicated = await instanceService.duplicateInstance("duplicate-source", {
      id: "duplicate-copy",
      displayName: "Duplicate Copy",
    });
    assert.strictEqual(duplicated.duplicated, true, "Duplicate operation should report success.");
    assert.strictEqual(duplicated.instance.id, "duplicate-copy", "Duplicate should use requested target ID.");
    assert.strictEqual(duplicated.instance.displayName, "Duplicate Copy", "Duplicate should use requested display name.");
    assert.strictEqual(duplicated.instance.state, "Stopped", "Duplicated instances should start stopped.");
    assert.strictEqual(duplicated.instance.pid, null, "Duplicated instances should not inherit runtime PID.");
    assert.strictEqual(duplicated.instance.duplicatedFrom, "duplicate-source", "Duplicate should preserve source identity metadata.");
    const copiedFile = await instanceService.readInstanceFile("duplicate-copy", "server.properties");
    assert.strictEqual(copiedFile.content, "server-port=25565\n", "Duplicate should copy instance data files.");

    await instanceService.updateInstance("duplicate-copy", {});
    const crashedConfigPath = path.join(process.env.AGENT_INSTANCE_ROOT, "duplicate-copy", "config.json");
    const crashedConfig = JSON.parse(fs.readFileSync(crashedConfigPath, "utf8"));
    fs.writeFileSync(crashedConfigPath, `${JSON.stringify({
      ...crashedConfig,
      state: "Failed",
      failureReason: "PROCESS_EXITED",
      pid: null,
    }, null, 2)}\n`);
    const crashed = await instanceService.getStatus("duplicate-copy");
    assert.strictEqual(crashed.lifecycleState, "Crashed", "Failed process exits should expose Crashed lifecycle state.");
    assert.strictEqual(crashed.crashed, true, "Failed process exits should expose crashed=true.");

    await assert.rejects(
      () => instanceService.duplicateInstance("duplicate-source", { id: "duplicate-copy" }),
      (error) => error.code === "INSTANCE_ALREADY_EXISTS",
      "Duplicate should refuse to overwrite an existing instance."
    );
  });
}

async function run() {
  await assertDetachedRuntimeReconciliation();
  await assertNoUnrelatedAdoptionAndPortCollision();
  await assertStopAfterReconciliation();
  await assertRenameDuplicateAndCrashLifecycle();
  console.log("Instance runtime smoke checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
