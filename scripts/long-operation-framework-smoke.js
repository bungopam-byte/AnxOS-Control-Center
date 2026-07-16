const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anxos-long-operation-"));
  process.env.ANXHUB_CONFIG_DIR = path.join(root, "config");

  const modulePath = require.resolve("../src/services/longOperationService");
  let longOperations = require(modulePath);

  // Basic lifecycle: create -> update -> complete.
  const created = longOperations.createOperation({
    kind: "smoke-download",
    nodeId: "node-a",
    lockKey: "smoke-download:node-a:template-x",
    stage: "Preparing",
    progressMode: "determinate",
    canCancel: true,
    retryable: true,
    metadata: { fileName: "server.jar" },
  });
  assert(created.id, "createOperation should assign an id.");
  assert.strictEqual(created.status, "queued", "New operations should start queued.");

  longOperations.updateOperation(created.id, { status: "running", progress: 40, stage: "Downloading" });
  const running = longOperations.getOperation(created.id);
  assert.strictEqual(running.status, "running", "Operation status should update.");
  assert.strictEqual(running.progress, 40, "Operation progress should update.");
  assert.strictEqual(running.metadata.fileName, "server.jar", "Metadata should be preserved across updates.");

  longOperations.completeOperation(created.id);
  const completed = longOperations.getOperation(created.id);
  assert.strictEqual(completed.status, "complete", "completeOperation should mark the operation complete.");
  assert.strictEqual(completed.progress, 100, "completeOperation should default progress to 100.");
  assert(completed.completedAt, "completeOperation should stamp completedAt.");

  // Duplicate-prevention / operation locking by lockKey.
  const first = longOperations.createOperation({
    kind: "smoke-lock",
    lockKey: "smoke-lock:shared",
    stage: "Running",
  });
  assert.throws(
    () => longOperations.createOperation({ kind: "smoke-lock", lockKey: "smoke-lock:shared" }),
    (error) => error?.code === "DUPLICATE_OPERATION" && error?.details?.existingOperationId === first.id,
    "Creating an operation with an active lock key should be rejected as a duplicate.",
  );
  longOperations.completeOperation(first.id);
  const afterCompletion = longOperations.createOperation({ kind: "smoke-lock", lockKey: "smoke-lock:shared" });
  assert(afterCompletion.id !== first.id, "A new operation should be allowed once the prior lock holder is terminal.");

  // Cancellation invokes the registered cancel handler.
  const cancellable = longOperations.createOperation({ kind: "smoke-cancel", canCancel: true });
  let cancelInvoked = false;
  longOperations.registerCancelHandler(cancellable.id, () => {
    cancelInvoked = true;
  });
  longOperations.cancelOperation(cancellable.id);
  assert(cancelInvoked, "cancelOperation should invoke the registered cancel handler.");
  assert.strictEqual(longOperations.getOperation(cancellable.id).status, "cancelled", "Operation should be marked cancelled.");
  assert.throws(
    () => longOperations.cancelOperation(cancellable.id),
    /cannot be cancelled/,
    "Cancelling an already-terminal operation should be rejected.",
  );

  // Retry invokes the registered retry handler.
  const retryable = longOperations.createOperation({ kind: "smoke-retry", canRetry: true });
  let retryInvoked = false;
  longOperations.registerRetryHandler(retryable.id, async () => {
    retryInvoked = true;
    return { retried: true };
  });
  const retryResult = await longOperations.retryOperation(retryable.id);
  assert(retryInvoked, "retryOperation should invoke the registered retry handler.");
  assert.deepStrictEqual(retryResult, { retried: true }, "retryOperation should return the retry handler result.");

  const notRetryable = longOperations.createOperation({ kind: "smoke-retry", canRetry: false });
  await assert.rejects(
    () => longOperations.retryOperation(notRetryable.id),
    (error) => error?.code === "OPERATION_NOT_RETRYABLE",
    "Retrying a non-retryable operation should be rejected.",
  );

  // Failure captures a standardized error shape and marks retryable by default.
  const failing = longOperations.createOperation({ kind: "smoke-fail" });
  longOperations.failOperation(failing.id, { code: "NETWORK_ERROR", message: "Connection reset." });
  const failed = longOperations.getOperation(failing.id);
  assert.strictEqual(failed.status, "failed", "failOperation should mark the operation failed.");
  assert.strictEqual(failed.error.code, "NETWORK_ERROR", "failOperation should preserve the error code.");
  assert.strictEqual(failed.canRetry, true, "failOperation should default canRetry to true.");

  // Timeout handling: an operation with a short timeout should auto-fail.
  const timingOut = longOperations.createOperation({ kind: "smoke-timeout", status: "running", timeoutMs: 30 });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const timedOut = longOperations.getOperation(timingOut.id);
  assert.strictEqual(timedOut.status, "failed", "An operation exceeding its timeout should be auto-failed.");
  assert.strictEqual(timedOut.error.code, "OPERATION_TIMEOUT", "Timeout failures should use a standardized error code.");

  // listOperations supports filtering by kind/nodeId/status.
  longOperations.createOperation({ kind: "smoke-filter", nodeId: "node-b", status: "running" });
  const filtered = longOperations.listOperations({ kind: "smoke-filter", nodeId: "node-b" });
  assert.strictEqual(filtered.length, 1, "listOperations should filter by kind and nodeId.");

  // Persistence + crash recovery: force a flush, reload the module fresh, and confirm
  // active operations are marked interrupted rather than silently resumed or lost.
  const persistent = longOperations.createOperation({
    kind: "smoke-persist",
    status: "running",
    retryable: true,
    metadata: { note: "in-flight at simulated crash" },
  });
  longOperations._test.flushPersist();
  const statePath = longOperations.getOperationsStatePath();
  assert(fs.existsSync(statePath), "Long-operation state should be persisted to disk.");
  const persistedRaw = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert(persistedRaw.operations.some((entry) => entry.id === persistent.id), "Persisted snapshot should include the in-flight operation.");

  delete require.cache[modulePath];
  longOperations = require(modulePath);
  const recovered = longOperations.getOperation(persistent.id);
  assert(recovered, "Recovered operation should exist after simulated restart.");
  assert.strictEqual(recovered.status, "interrupted", "An operation active at restart should be marked interrupted, not left running.");
  assert.strictEqual(recovered.error.code, "INTERRUPTED_BY_RESTART", "Interrupted operations should carry a standardized error code.");
  assert.strictEqual(recovered.canCancel, false, "Interrupted operations should not claim to be cancellable.");
  assert.strictEqual(recovered.canRetry, true, "A retryable interrupted operation should remain retryable.");
  assert.strictEqual(recovered.metadata.note, "in-flight at simulated crash", "Recovered metadata should be preserved.");

  // Persisted snapshots must never contain non-serializable runtime handles.
  const withController = longOperations.createOperation({
    kind: "smoke-controller",
    status: "running",
    metadata: { controller: new AbortController() },
  });
  longOperations._test.flushPersist();
  const persistedAfterController = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const controllerEntry = persistedAfterController.operations.find((entry) => entry.id === withController.id);
  assert(controllerEntry, "Operation with a controller should still be persisted.");
  assert.strictEqual(controllerEntry.metadata.controller, undefined, "Non-serializable controller objects must be stripped before persistence.");
  assert.strictEqual(longOperations.getOperation(withController.id).metadata.controller instanceof AbortController, true, "The live in-memory metadata reference must retain the controller for runtime cancellation.");

  fs.rmSync(root, { recursive: true, force: true });
  console.log("Long-operation framework smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
