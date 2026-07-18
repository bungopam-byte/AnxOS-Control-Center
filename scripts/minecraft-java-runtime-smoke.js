const assert = require("assert");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const runtimeResolver = require("../src/shared/minecraftJavaRuntime");
const instanceService = require("../src/shared/instances/instanceServiceCore");

async function makeJava(root, folder, major) {
  const executable = path.join(root, folder, "bin", "java");
  await fs.mkdir(path.dirname(executable), { recursive: true });
  await fs.writeFile(executable, `#!/bin/sh\nif [ "$1" = "-version" ]; then echo 'openjdk version "${major === 8 ? "1.8.0_452" : `${major}.0.1`}"' >&2; exit 0; fi\ntrap 'exit 0' TERM INT\nwhile :; do sleep 1; done\n`, { mode: 0o755 });
  return executable;
}

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anxos-java-runtime-"));
  const instanceRoot = path.join(root, "instances");
  const java8 = await makeJava(root, "temurin-8-jdk-amd64", 8);
  const java16 = await makeJava(root, "temurin-16-jdk-amd64", 16);
  const java17 = await makeJava(root, "temurin-17-jdk-amd64", 17);
  const java21 = await makeJava(root, "temurin-21-jdk-amd64", 21);
  const previousRoots = process.env.ANXOS_JAVA_RUNTIME_ROOTS;
  const previousExecutableRoots = process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS;
  process.env.ANXOS_JAVA_RUNTIME_ROOTS = root;
  process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS = root;
  try {
    assert.strictEqual(runtimeResolver.getRequiredJavaMajor({ minecraftVersion: "1.12.2", loader: "forge", loaderVersion: "14.23.5.2859" }).major, 8);
    assert.strictEqual(runtimeResolver.getRequiredJavaMajor({ minecraftVersion: "1.17.1", loader: "fabric" }).major, 16);
    assert.strictEqual(runtimeResolver.getRequiredJavaMajor({ minecraftVersion: "1.20.4", loader: "forge" }).major, 17);
    assert.strictEqual(runtimeResolver.getRequiredJavaMajor({ minecraftVersion: "1.20.6", loader: "neoforge" }).major, 21);
    assert.strictEqual(runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.12.2", loader: "forge" }, { candidates: [java21, java8] }).executable, java8);
    assert.strictEqual(runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.17.1", loader: "quilt" }, { candidates: [java16] }).major, 16);
    assert.strictEqual(runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.20.4", loader: "fabric" }, { candidates: [java17] }).major, 17);
    assert.strictEqual(runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.20.6", loader: "vanilla" }, { candidates: [java21] }).major, 21);
    assert.throws(
      () => runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.12.2", loader: "forge" }, { candidates: [java21] }),
      (error) => error.code === "JAVA_RUNTIME_REQUIRED" && error.requiredMajor === 8 && error.detectedMajors.includes(21)
    );
    assert.throws(
      () => runtimeResolver.resolveJavaRuntime({ minecraftVersion: "1.12.2", javaRuntimeOverride: java21 }, { candidates: [java8, java21] }),
      (error) => error.code === "JAVA_RUNTIME_OVERRIDE_INVALID"
    );
    const windowsRoots = runtimeResolver.approvedRoots("win32", { ProgramFiles: "C:\\Program Files", ProgramData: "C:\\ProgramData" });
    assert(windowsRoots.some((entry) => /Program Files/.test(entry)));

    instanceService.configureInstanceService({ getConfig: () => ({ instanceRoot }) });
    await instanceService.createInstance({
      id: "rlcraft-runtime-smoke", displayName: "RLCraft", type: "java-app", game: "minecraft",
      minecraftVersion: "1.12.2", serverSoftware: "forge", loader: "forge", loaderVersion: "14.23.5.2859",
      executable: "java", args: ["-Xmx1G", "-jar", "forge.jar", "nogui"], serverJar: "forge.jar",
      installationState: "installing", restartPolicy: "never", startupTimeoutMs: 1000,
    });
    await instanceService.writeInstanceFile("rlcraft-runtime-smoke", "forge.jar", Buffer.from("test"));
    const activated = await instanceService.updateInstance("rlcraft-runtime-smoke", { installationState: "active" });
    assert.strictEqual(activated.executable, java8);
    assert.strictEqual(activated.javaRuntime.major, 8);
    assert.strictEqual(activated.loaderVersion, "14.23.5.2859");
    const started = await instanceService.startInstance("rlcraft-runtime-smoke");
    assert.strictEqual(started.executable, java8);
    await instanceService.stopInstance("rlcraft-runtime-smoke");
    const restarted = await instanceService.startInstance("rlcraft-runtime-smoke");
    assert.strictEqual(restarted.javaRuntime.executable, java8);
    await instanceService.stopInstance("rlcraft-runtime-smoke");

    await assert.rejects(
      () => instanceService.updateInstance("rlcraft-runtime-smoke", { executable: java21 }),
      (error) => error.code === "JAVA_RUNTIME_PATH_NOT_ALLOWED"
    );
    const nonJava = await instanceService.createInstance({ id: "non-java-runtime-smoke", displayName: "Node", type: "node-app", executable: "node", entrypoint: "index.js" });
    assert.strictEqual(nonJava.executable, "node");
  } finally {
    await instanceService.shutdownInstanceService().catch(() => {});
    if (previousRoots === undefined) delete process.env.ANXOS_JAVA_RUNTIME_ROOTS; else process.env.ANXOS_JAVA_RUNTIME_ROOTS = previousRoots;
    if (previousExecutableRoots === undefined) delete process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS; else process.env.AGENT_INSTANCE_EXECUTABLE_ROOTS = previousExecutableRoots;
    await fs.rm(root, { recursive: true, force: true });
  }
  console.log("Minecraft Java runtime smoke tests passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
