const fs = require("fs");
const path = require("path");
const { getDefaultConfigDirectory } = require("./secureSessionStore");

const OWNER_ACCOUNTS_FILE = "owner-accounts.json";

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUuid(value) {
  return String(value || "").trim().toLowerCase();
}

function getOwnerAccountsPath(configDirectory = getDefaultConfigDirectory()) {
  return path.join(configDirectory, OWNER_ACCOUNTS_FILE);
}

function readOwnerAccountsFile(configDirectory = getDefaultConfigDirectory()) {
  try {
    const parsed = JSON.parse(fs.readFileSync(getOwnerAccountsPath(configDirectory), "utf8"));
    return {
      userIds: Array.isArray(parsed.userIds) ? parsed.userIds.map(normalizeUuid).filter(Boolean) : [],
      emails: Array.isArray(parsed.emails) ? parsed.emails.map(normalizeEmail).filter(Boolean) : [],
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { userIds: [], emails: [], updatedAt: null };
  }
}

function getConfiguredOwnerAccounts(options = {}) {
  const fileConfig = readOwnerAccountsFile(options.configDirectory);
  const envUserIds = splitList(process.env.ANXOS_OWNER_ACCOUNT_IDS || process.env.ANXOS_OWNER_SUPABASE_USER_IDS).map(normalizeUuid);
  const envEmails = splitList(process.env.ANXOS_OWNER_EMAILS || process.env.ANXOS_OWNER_ACCOUNT_EMAILS).map(normalizeEmail);
  return {
    userIds: [...new Set([...fileConfig.userIds, ...envUserIds])],
    emails: [...new Set([...fileConfig.emails, ...envEmails])],
    sourcePath: getOwnerAccountsPath(options.configDirectory),
    hasFileConfig: Boolean(fileConfig.userIds.length || fileConfig.emails.length),
    hasEnvConfig: Boolean(envUserIds.length || envEmails.length),
  };
}

function isOwnerAccount(account = {}, options = {}) {
  const config = getConfiguredOwnerAccounts(options);
  const id = normalizeUuid(account.id || account.userId || account.sub);
  const email = normalizeEmail(account.email);
  return Boolean((id && config.userIds.includes(id)) || (email && config.emails.includes(email)));
}

function writeOwnerAccounts({ userIds = [], emails = [] }, options = {}) {
  const configDirectory = options.configDirectory || getDefaultConfigDirectory();
  const payload = {
    userIds: [...new Set(userIds.map(normalizeUuid).filter(Boolean))],
    emails: [...new Set(emails.map(normalizeEmail).filter(Boolean))],
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(configDirectory, { recursive: true });
  fs.writeFileSync(getOwnerAccountsPath(configDirectory), `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  return payload;
}

module.exports = {
  getConfiguredOwnerAccounts,
  getOwnerAccountsPath,
  isOwnerAccount,
  normalizeEmail,
  normalizeUuid,
  readOwnerAccountsFile,
  writeOwnerAccounts,
};
