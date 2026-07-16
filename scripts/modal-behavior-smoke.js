const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const confirmationStart = source.indexOf("function createSecurityConfirmation(");
const confirmationEnd = source.indexOf("function isGuidedModeEnabled", confirmationStart);
const confirmation = source.slice(confirmationStart, confirmationEnd);

assert(confirmation.includes('dialog.setAttribute("aria-modal", "true")'), "Confirmation dialogs should expose modal semantics.");
assert(confirmation.includes("activateModal(overlay"), "Confirmation dialogs should use shared focus trapping and restoration.");
assert(confirmation.includes('event.key === "Escape"'), "Confirmation dialogs should close with Escape.");
assert(confirmation.includes('event.key === "Enter"') && confirmation.includes("submit();"), "Typed destructive confirmations should submit with Enter.");
assert(confirmation.includes("event.preventDefault();"), "Typed confirmation Enter handling should prevent duplicate native submission.");

const publicModalStart = source.indexOf("function createPublicAccessServiceModal(");
const publicModalEnd = source.indexOf("async function submitProviderAccessService", publicModalStart);
const publicModal = source.slice(publicModalStart, publicModalEnd);
assert(publicModal.includes("if (submitting) return"), "Asynchronous modal submission should reject duplicates.");
assert(publicModal.includes("activateModal(overlay"), "Asynchronous modals should share focus management.");

console.log("Modal behavior smoke checks passed.");
