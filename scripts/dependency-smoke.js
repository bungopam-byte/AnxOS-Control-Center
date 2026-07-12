const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  dependencyIdsForGroups,
  resolveTemplateDependencyIds,
} = require("../src/shared/marketplaceDependencies");
const dependencyService = require("../agent/src/services/dependencyService");

const templates = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config", "marketplace-templates.json"), "utf8"));

function template(id) {
  const found = templates.find((entry) => entry.id === id);
  assert(found, `Template ${id} should exist.`);
  return found;
}

function createMockHooks(options = {}) {
  const installedCommands = new Set(options.installedCommands || []);
  const commandCalls = [];
  const osRelease = options.osRelease || [
    "ID=debian",
    "ID_LIKE=debian",
    "PRETTY_NAME=\"Debian GNU/Linux 13\"",
    "VERSION_ID=\"13\"",
  ].join("\n");

  return {
    commandCalls,
    hooks: {
      readFileText(filePath) {
        if (filePath === "/etc/os-release") return osRelease;
        throw new Error(`Unexpected read: ${filePath}`);
      },
      accessExecutable(filePath) {
        const command = path.basename(filePath);
        if (installedCommands.has(command)) return;
        throw new Error(`not executable: ${command}`);
      },
      async commandRunner(command, args = []) {
        commandCalls.push({ command: path.basename(command), args });
        const commandName = path.basename(command);
        if (commandName === "sudo" && args[0] === "-n" && args[1] === "true") {
          return { ok: true, exitCode: 0, stdout: "", stderr: "" };
        }
        if (commandName === "sudo" && args[0] === "-n") {
          const delegated = path.basename(args[1] || "");
          if (delegated === "apt-get" && args.includes("install")) {
            installedCommands.add(options.installProvides || "dotnet");
          }
          return { ok: true, exitCode: 0, stdout: "installed", stderr: "" };
        }
        if (commandName === "dotnet") {
          return { ok: true, exitCode: 0, stdout: "Microsoft.NETCore.App 8.0.28 [/usr/share/dotnet/shared/Microsoft.NETCore.App]", stderr: "" };
        }
        if (commandName === "java") {
          return { ok: true, exitCode: 0, stdout: "", stderr: "openjdk version \"21.0.11\"" };
        }
        if (commandName === "node") {
          return { ok: true, exitCode: 0, stdout: "v22.23.1", stderr: "" };
        }
        if (commandName === "python3") {
          return { ok: true, exitCode: 0, stdout: "Python 3.13.5", stderr: "" };
        }
        if (["unzip", "tar", "xz", "curl", "docker", "steamcmd"].includes(commandName)) {
          return { ok: true, exitCode: 0, stdout: `${commandName} 1.0`, stderr: "" };
        }
        return { ok: true, exitCode: 0, stdout: "", stderr: "" };
      },
    },
  };
}

async function run() {
  assert.deepStrictEqual(dependencyIdsForGroups(["steam-game-servers"]), ["steamcmd"]);
  assert(resolveTemplateDependencyIds(template("terraria-tshock")).includes("dotnet-runtime"), "TShock should require .NET.");
  assert(resolveTemplateDependencyIds(template("terraria-tshock")).includes("unzip"), "TShock should require unzip.");
  assert(resolveTemplateDependencyIds(template("palworld")).includes("steamcmd"), "Palworld should require SteamCMD.");
  assert(resolveTemplateDependencyIds(template("minecraft-paper")).includes("java"), "Minecraft should require Java.");
  assert(resolveTemplateDependencyIds(template("discord-js")).includes("nodejs"), "Discord.js should require Node.js.");
  assert(resolveTemplateDependencyIds(template("python-discord-bot")).includes("python"), "Python bot should require Python.");

  const parsed = dependencyService.parseOsRelease("ID=ubuntu\nID_LIKE=debian\nPRETTY_NAME=\"Ubuntu\"\n");
  assert.strictEqual(parsed.packageManager, "apt");
  assert.strictEqual(parsed.family, "debian");

  let mock = createMockHooks({ installedCommands: ["java"] });
  dependencyService.__setTestHooks(mock.hooks);
  let check = await dependencyService.checkDependencies({ dependencyIds: ["java"] });
  assert.strictEqual(check.ok, true);
  assert.strictEqual(check.dependencies[0].state, "installed");

  mock = createMockHooks({ installedCommands: ["sudo", "apt-get"], installProvides: "dotnet" });
  dependencyService.__setTestHooks(mock.hooks);
  let install = await dependencyService.installDependencies({ dependencyIds: ["dotnet-runtime"] });
  assert.strictEqual(install.ok, true);
  assert(
    mock.commandCalls.some((call) => call.command === "sudo" && call.args.some((arg) => path.basename(String(arg)) === "apt-get")),
    "Install should use sudo -n with apt-get."
  );

  mock = createMockHooks({
    installedCommands: ["sudo", "apt-get"],
    osRelease: "ID=solus\nPRETTY_NAME=\"Solus\"\n",
  });
  dependencyService.__setTestHooks(mock.hooks);
  check = await dependencyService.checkDependencies({ dependencyIds: ["steamcmd"] });
  assert.strictEqual(check.ok, false);
  assert.strictEqual(check.dependencies[0].state, "unsupported");

  assert.throws(() => dependencyIdsForGroups(["bad;group"]), /Unsupported dependency group/);
  await assert.rejects(() => dependencyService.checkDependencies({ dependencyIds: ["java;rm"] }), /Unsupported dependency ID/);

  mock = createMockHooks({ installedCommands: ["sudo", "apt-get"], installProvides: "dotnet" });
  dependencyService.__setTestHooks(mock.hooks);
  await Promise.all([
    dependencyService.installDependencies({ dependencyIds: ["dotnet-runtime"] }),
    dependencyService.installDependencies({ dependencyIds: ["dotnet-runtime"] }),
  ]);
  const aptInstallCalls = mock.commandCalls.filter((call) => call.command === "sudo" && call.args.includes("install"));
  assert.strictEqual(aptInstallCalls.length, 1, "Concurrent installs for one dependency should coalesce.");

  dependencyService.__setTestHooks();
  console.log("Dependency smoke passed.");
}

run().catch((error) => {
  dependencyService.__setTestHooks();
  console.error(error);
  process.exit(1);
});
