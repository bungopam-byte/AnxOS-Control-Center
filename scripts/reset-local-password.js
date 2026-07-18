const bcrypt = require("bcryptjs");
const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const PASSWORD_MIN_LENGTH = 10;
const BCRYPT_ROUNDS = 12;

function parseArgs(argv) {
  const options = {
    username: "Anx",
    config: "",
    passwordStdin: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--username" || arg === "-u") {
      options.username = argv[index + 1] || options.username;
      index += 1;
    } else if (arg === "--config" || arg === "-c") {
      options.config = argv[index + 1] || "";
      index += 1;
    } else if (arg === "--password-stdin") {
      options.passwordStdin = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function usage() {
  return [
    "Reset a local AnxOS Owner/Admin password.",
    "",
    "Usage:",
    "  npm run security:reset-password -- --username Anx",
    "  node scripts/reset-local-password.js --username Anx --config \"%APPDATA%\\AnxHub\\config\"",
    "",
    "Options:",
    "  --username, -u       Local AnxOS username to reset. Defaults to Anx.",
    "  --config, -c         Config directory or security.json path.",
    "  --password-stdin     Read the new password from stdin. Useful for tests/automation.",
  ].join("\n");
}

function getDefaultConfigCandidates() {
  const candidates = [];
  if (process.env.ANXHUB_CONFIG_DIR) {
    candidates.push(process.env.ANXHUB_CONFIG_DIR);
  }
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "AnxHub", "config"));
    candidates.push(path.join(process.env.APPDATA, "AnxOS Control Center", "config"));
  }
  candidates.push(path.join(os.homedir(), ".config", "AnxOS Control Center", "config"));
  candidates.push(path.join(os.homedir(), ".config", "AnxHub", "config"));
  candidates.push(path.join(os.homedir(), ".config", "anxhub", "config"));
  return candidates;
}

function toSecurityPath(configPath) {
  if (!configPath) {
    return "";
  }
  return path.basename(configPath).toLowerCase() === "security.json"
    ? configPath
    : path.join(configPath, "security.json");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findSecurityPath(configPath, username) {
  const normalizedUsername = String(username || "").toLowerCase();
  const candidates = configPath ? [configPath] : getDefaultConfigCandidates();
  const existing = candidates
    .map(toSecurityPath)
    .filter(Boolean)
    .filter((filePath, index, all) => all.indexOf(filePath) === index)
    .filter((filePath) => fs.existsSync(filePath));

  const matchingUser = existing.find((filePath) => {
    try {
      const state = readJson(filePath);
      return Array.isArray(state.users)
        && state.users.some((user) => String(user.username || "").toLowerCase() === normalizedUsername);
    } catch {
      return false;
    }
  });

  if (matchingUser) {
    return matchingUser;
  }

  if (existing.length > 0) {
    return existing[0];
  }

  const expected = toSecurityPath(candidates[0] || "");
  throw new Error(`Could not find security.json${expected ? ` at ${expected}` : ""}. Pass --config with the AnxOS config directory.`);
}

function validatePassword(password) {
  if (String(password || "").length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
}

function readPasswordFromStdin() {
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      value += chunk;
    });
    process.stdin.on("end", () => resolve(value.replace(/\r?\n$/, "")));
    process.stdin.on("error", reject);
  });
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const output = process.stdout;
    const rl = readline.createInterface({ input, output });
    const wasRaw = input.isRaw;

    output.write(question);
    if (input.isTTY) {
      input.setRawMode(true);
    }

    let value = "";
    const onData = (buffer) => {
      const text = buffer.toString("utf8");
      if (text === "\r" || text === "\n" || text === "\r\n") {
        output.write("\n");
        input.removeListener("data", onData);
        if (input.isTTY) {
          input.setRawMode(Boolean(wasRaw));
        }
        rl.close();
        resolve(value);
        return;
      }
      if (text === "\u0003") {
        process.exit(130);
      }
      if (text === "\b" || text === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += text;
    };

    input.on("data", onData);
  });
}

async function getNewPassword(options) {
  if (process.env.ANXOS_RESET_PASSWORD) {
    return process.env.ANXOS_RESET_PASSWORD;
  }
  if (options.passwordStdin) {
    return readPasswordFromStdin();
  }
  if (!process.stdin.isTTY) {
    throw new Error("No TTY available for password prompt. Set ANXOS_RESET_PASSWORD or use --password-stdin.");
  }

  const first = await promptHidden("New password: ");
  const second = await promptHidden("Confirm new password: ");
  if (first !== second) {
    throw new Error("Passwords did not match.");
  }
  return first;
}

function writeAudit(configDir, username, securityPath) {
  const auditPath = path.join(configDir, "audit.log");
  const record = {
    at: new Date().toISOString(),
    actor: null,
    action: "security.password.reset",
    outcome: "ok",
    target: username,
    reason: "LOCAL_RESET_TOOL",
    securityPath,
  };
  fs.appendFileSync(auditPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

function resetLocalPassword({ securityPath, username, password }) {
  validatePassword(password);
  const state = readJson(securityPath);
  if (!Array.isArray(state.users)) {
    throw new Error("security.json does not contain a valid users array.");
  }

  const user = state.users.find((entry) => String(entry.username || "").toLowerCase() === String(username || "").toLowerCase());
  if (!user) {
    const available = state.users.map((entry) => entry.username).filter(Boolean).join(", ") || "none";
    throw new Error(`Could not find local user "${username}". Available users: ${available}.`);
  }

  const configDir = path.dirname(securityPath);
  const backupPath = path.join(configDir, `security.json.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  fs.copyFileSync(securityPath, backupPath);

  user.passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  user.updatedAt = new Date().toISOString();
  state.persistentSessions = [];
  fs.writeFileSync(securityPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.rmSync(path.join(configDir, "session.dat"), { force: true });
  writeAudit(configDir, user.username, securityPath);

  return {
    username: user.username,
    securityPath,
    backupPath,
    clearedPersistentSessions: true,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const securityPath = findSecurityPath(options.config, options.username);
  const password = await getNewPassword(options);
  const result = resetLocalPassword({ securityPath, username: options.username, password });
  console.log(`Password reset for local user "${result.username}".`);
  console.log(`Security file: ${result.securityPath}`);
  console.log(`Backup file: ${result.backupPath}`);
  console.log("Remembered sessions were cleared. Restart AnxOS and sign in with the new password.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  findSecurityPath,
  resetLocalPassword,
};
