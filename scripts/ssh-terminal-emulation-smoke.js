const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const appSource = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
const sshServiceSource = fs.readFileSync(path.join(rootDir, "src", "services", "sshService.js"), "utf8");

assert(appSource.includes("function createSshTerminalBuffer"), "Renderer must use a terminal buffer for SSH output.");
assert(!appSource.includes("function stripAnsi"), "SSH renderer must not strip ANSI with regex.");
assert(!appSource.includes("function normalizeSshOutput"), "SSH renderer must not flatten PTY output into plain lines.");
assert(appSource.includes("function bindSshXtermInput") && appSource.includes("terminal.onData((data) => {") && appSource.includes("writeSshInput(data);"), "xterm onData must send emitted terminal input directly to the PTY.");
assert(!appSource.includes("const arrowMap = {"), "SSH input must not manually reconstruct arrow-key escape sequences.");
assert(!/sshKeyboardInputBuffer\s*=\s*sshKeyboardInputBuffer\.slice\(0,\s*-1\)/.test(appSource), "SSH input must not use manual last-character deletion.");
assert(sshServiceSource.includes('term: "xterm-256color"'), "SSH shell must request xterm-256color.");
assert(sshServiceSource.includes("client.shell("), "SSH service must allocate an interactive PTY shell.");
assert(sshServiceSource.includes("stream.setWindow(rows, cols"), "SSH resize must synchronize the PTY window.");

const start = appSource.indexOf("function createSshTerminalBuffer");
const end = appSource.indexOf("function getSshTerminalBuffer", start);
assert(start > -1 && end > start, "Could not extract SSH terminal buffer implementation.");

const sandbox = {
  SSH_OUTPUT_LINE_LIMIT: 1500,
  SSH_TERMINAL_DEFAULT_COLS: 80,
  SSH_TERMINAL_DEFAULT_ROWS: 24,
};
vm.runInNewContext(`${appSource.slice(start, end)}\nthis.createSshTerminalBuffer = createSshTerminalBuffer;`, sandbox);

const terminal = sandbox.createSshTerminalBuffer({ cols: 80, rows: 24 });
terminal.write("sdawdsada");
for (let index = 0; index < "sdawdsada".length; index += 1) {
  terminal.write("\b \b");
}
assert.strictEqual(terminal.toText().trim(), "", "Repeated Backspace must erase typed characters without visible control bytes.");

terminal.clear();
terminal.write("prompt$ \u0007");
assert.strictEqual(terminal.toText(), "prompt$ ", "Bell must be ignored, not rendered.");

terminal.clear();
terminal.write("abcdef\u001b[3DXYZ");
assert.strictEqual(terminal.toText(), "abcXYZ", "CSI cursor movement must redraw in place.");

terminal.clear();
terminal.write("download 10%\rdownload 90%\u001b[K");
assert.strictEqual(terminal.toText(), "download 90%", "Carriage-return redraw and clear-line must render correctly.");

terminal.clear();
terminal.write("\u001b[31mred\u001b[0m plain");
assert.strictEqual(terminal.toText(), "red plain", "ANSI color SGR must be consumed without visible escape bytes.");

terminal.clear();
terminal.write("hello 世界");
assert.strictEqual(terminal.toText(), "hello 世界", "UTF-8 output must be preserved.");

terminal.clear();
terminal.resize({ cols: 40, rows: 12 });
terminal.write("x".repeat(42));
assert.strictEqual(JSON.stringify(terminal.toRows()), JSON.stringify(["x".repeat(40), "xx"]), "Terminal buffer must wrap at the resized column width.");

const sshRendererSource = appSource.slice(
  appSource.indexOf("function getSshSessionList"),
  appSource.indexOf("function writeStoredSettings"),
);
assert(!/console\.(?:log|warn|error)\([^)]*(?:password|command|input|chunk)/i.test(sshRendererSource), "SSH output, typed commands, and credentials must not be logged directly.");
assert(!/console\.(?:log|warn|error)\([^)]*(?:password|command|input|chunk)/i.test(sshServiceSource), "SSH service must not log output, typed commands, or credentials directly.");

console.log("SSH terminal emulation smoke checks passed.");
