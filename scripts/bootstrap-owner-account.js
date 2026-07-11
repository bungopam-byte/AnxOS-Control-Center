#!/usr/bin/env node
const os = require("os");
const path = require("path");
const { getConfiguredOwnerAccounts, getOwnerAccountsPath, writeOwnerAccounts } = require("../src/services/ownerAccountConfig");

const PRODUCT_NAME = "AnxHub";

function getDesktopConfigDirectory() {
  if (process.env.ANXHUB_CONFIG_DIR) return process.env.ANXHUB_CONFIG_DIR;
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, PRODUCT_NAME, "config");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", PRODUCT_NAME, "config");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, PRODUCT_NAME, "config");
}

function usage() {
  console.log(`AnxOS Owner Account Bootstrap

Usage:
  node scripts/bootstrap-owner-account.js --email owner@example.com
  node scripts/bootstrap-owner-account.js --id <supabase-user-uuid>
  node scripts/bootstrap-owner-account.js --email owner@example.com --id <supabase-user-uuid>
  node scripts/bootstrap-owner-account.js --email owner@example.com --config-dir "C:\\Users\\You\\AppData\\Roaming\\AnxHub\\config"

This writes a local owner allowlist for the desktop app. It does not store passwords,
tokens, Supabase service-role keys, or agent tokens.`);
}

function parseArgs(argv) {
  const result = { emails: [], userIds: [], configDirectory: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--email") {
      result.emails.push(argv[index + 1] || "");
      index += 1;
    } else if (arg === "--id" || arg === "--user-id" || arg === "--uuid") {
      result.userIds.push(argv[index + 1] || "");
      index += 1;
    } else if (arg === "--config-dir") {
      result.configDirectory = argv[index + 1] || "";
      index += 1;
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const configDirectory = args.configDirectory || getDesktopConfigDirectory();
const existing = getConfiguredOwnerAccounts({ configDirectory });
const next = writeOwnerAccounts({
  userIds: [...existing.userIds, ...args.userIds],
  emails: [...existing.emails, ...args.emails],
}, { configDirectory });

if (!next.userIds.length && !next.emails.length) {
  usage();
  process.exitCode = 1;
} else {
  console.log("AnxOS owner account allowlist updated.");
  console.log(`Path: ${getOwnerAccountsPath(configDirectory)}`);
  console.log(`Owner user IDs configured: ${next.userIds.length}`);
  console.log(`Owner emails configured: ${next.emails.length}`);
  console.log("Restart AnxOS after changing owner account bootstrap settings.");
}
