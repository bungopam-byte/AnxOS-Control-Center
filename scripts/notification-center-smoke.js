const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const settings = fs.readFileSync(path.join(root, "src", "services", "settingsPreferenceService.js"), "utf8");

function requireIndex(needle, message) {
  assert(index.includes(needle), message || `index.html is missing ${needle}`);
}

function requireApp(needle, message) {
  assert(app.includes(needle), message || `app.js is missing ${needle}`);
}

function requireStyle(needle, message) {
  assert(styles.includes(needle), message || `styles.css is missing ${needle}`);
}

[
  'data-page-target="notifications"',
  'data-page="notifications"',
  "data-notification-nav-count",
  "data-notification-summary=\"unread\"",
  "data-notification-filter=\"unread\"",
  "data-notification-filter=\"pinned\"",
  "data-notification-filter=\"critical\"",
  "data-notification-category",
  "data-notification-severity",
  "data-notification-action=\"mark-all-read\"",
  "data-notification-action=\"clear-read\"",
  "data-notification-action=\"clear-noncritical\"",
  "data-notification-list",
  "data-notification-status",
].forEach((needle) => requireIndex(needle, `Notification Center shell must expose ${needle}.`));

[
  "NOTIFICATIONS_STORAGE_KEY",
  "NOTIFICATION_HISTORY_LIMIT",
  "NOTIFICATION_OCCURRENCE_LIMIT",
  "NOTIFICATION_DEDUP_WINDOW_MS",
  "NOTIFICATION_CATEGORIES",
  "NOTIFICATION_SEVERITIES",
  "const notificationState",
  "function sanitizeNotificationText",
  "function serializeNotification",
  "function persistNotificationHistory",
  "function loadNotificationHistory",
  "function createNotification",
  "function createOperationNotification",
  "function renderNotificationCenter",
  "function markAllNotificationsRead",
  "function clearReadNotifications",
  "function clearNoncriticalNotifications",
].forEach((needle) => requireApp(needle, `Notification Center renderer must implement ${needle}.`));

[
  "openOperations",
  "openDiagnostics",
  "reconnectAgent",
  "recheckDependencies",
  "checkUpdates",
  "copyMessage",
].forEach((needle) => requireApp(needle, `Notification action allowlist missing ${needle}.`));

assert(app.includes("createOperationNotification(operation)"), "Finished Operations must create linked Notification Center records.");
assert(app.includes("shouldPersistToastNotification(message, nextTone)"), "Important warning/error toasts must be eligible for durable notification history.");
assert(app.includes("settings[\"notifications.enabled\"] === false"), "Toast visibility preference must be enforced.");
assert(app.includes("settings[\"notifications.persistHistory\"] === false"), "Notification persistence preference must be enforced.");
assert(app.includes("notification.severity === \"critical\" && notification.resolved === false"), "Unresolved critical notifications must be protected from ordinary clear actions.");
assert(app.includes("notification.occurrenceCount") && app.includes("occurrences = [") && app.includes("slice(-NOTIFICATION_OCCURRENCE_LIMIT)"), "Repeated notifications must be grouped with bounded occurrence history.");
assert(app.includes("window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY") && app.includes("window.localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY)"), "Notification history must be bounded localStorage with corrupted-history recovery/reset support.");
assert(!app.includes("notificationList.innerHTML"), "Notification rendering must avoid raw HTML injection.");
assert(app.includes('id: "notifications"') && app.includes('type: "Notification"'), "Global Search must include Notification Center results.");
assert(app.includes('id: "notifications.open"') && app.includes('id: "notifications.markAllRead"') && app.includes('id: "notifications.clearRead"'), "Command Palette must expose Notification Center actions.");
assert(settings.includes('"notifications.persistHistory"') && settings.includes('"notifications"'), "Notification persistence preference must be part of trusted settings schema.");

[
  ".notification-center",
  ".notification-summary-grid",
  ".notification-toolbar",
  ".notification-list",
  ".notification-item",
  ".notification-item[data-read=\"false\"]",
  ".notification-occurrences",
  ".notification-empty",
].forEach((needle) => requireStyle(needle, `Notification Center CSS must include ${needle}.`));

console.log("Notification Center smoke checks passed.");
