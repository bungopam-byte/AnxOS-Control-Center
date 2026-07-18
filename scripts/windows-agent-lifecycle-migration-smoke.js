const assert = require("assert");
const service = require("../src/services/agentControlService")._test;

const staleTask = `TaskName: \\AnxOSAgent\nTask To Run: cmd.exe /c C:\\Users\\anjor\\Documents\\AnxOS-Control-Center\\agent\\src\\server.js`;
assert.deepStrictEqual(service.classifyWindowsTaskOwnership(staleTask, { valid: false }), { state: "verified-stale", owned: true, stale: true });

const packagedTask = `TaskName: \\AnxOSAgent\nTask To Run: C:\\Users\\anjor\\AppData\\Roaming\\AnxHub\\agent\\bin\\start-local-agent.cmd`;
assert.strictEqual(service.classifyWindowsTaskOwnership(packagedTask, { valid: true }).state, "valid-packaged");

const ambiguousTask = `TaskName: \\AnxOSAgent\nTask To Run: C:\\Tools\\unrelated.exe`;
assert.strictEqual(service.classifyWindowsTaskOwnership(ambiguousTask, { valid: false }).state, "ambiguous");

const legacyService = `DISPLAY_NAME : AnxOS Local Agent\nBINARY_PATH_NAME : "C:\\Users\\anjor\\AppData\\Local\\Programs\\AnxOS Control Center\\AnxOS Control Center.exe" "C:\\Users\\anjor\\AppData\\Local\\Programs\\AnxOS Control Center\\resources\\local-agent-runtime\\agent\\src\\server.js"`;
const anxosBinary = { exists: true, productName: "AnxOS Control Center", fileDescription: "AnxOS Control Center" };
assert.strictEqual(service.classifyLegacyWindowsServiceOwnership(legacyService, "DESCRIPTION : AnxOS Local Agent", anxosBinary).state, "verified-legacy");
assert.strictEqual(service.classifyLegacyWindowsServiceOwnership(legacyService, "DESCRIPTION : AnxOS Local Agent", { exists: true, productName: "Unrelated" }).state, "ambiguous");
assert.strictEqual(service.classifyLegacyWindowsServiceOwnership("DISPLAY_NAME : AnxOS Local Agent\nBINARY_PATH_NAME : C:\\Tools\\other.exe", "").state, "ambiguous");

const fs = require("fs");
const source = fs.readFileSync(require.resolve("../src/services/agentControlService"), "utf8");
assert(source.includes('"windows-scheduled-task"'), "Scheduled Task must remain the authoritative lifecycle.");
assert(source.includes('"/SC", "ONLOGON"') && source.includes('"/RL", "LIMITED"'), "Clean install must create a limited per-user logon task.");
assert(source.includes("removeVerifiedLegacyWindowsService"), "Repair and uninstall must reconcile verified legacy services.");
assert(!source.includes('["create", SERVICE_NAME, "binPath="'), "SCM service creation must remain forbidden.");
assert(source.includes("LEGACY_SERVICE_OWNERSHIP_AMBIGUOUS") && source.includes("STARTUP_TASK_OWNERSHIP_AMBIGUOUS"), "Ambiguous ownership must stop mutation.");
assert(source.includes("current.installed && current.valid"), "Valid packaged registration must be idempotently preserved.");
assert(source.includes("stopVerifiedWindowsTaskAgent(config)"), "Stopping a Scheduled Task must terminate its verified packaged Agent child.");
assert(source.includes("getBundledLocalAgentRuntime"), "Lifecycle must resolve the packaged runtime instead of a source checkout.");

console.log("Windows Agent lifecycle migration smoke checks passed.");
