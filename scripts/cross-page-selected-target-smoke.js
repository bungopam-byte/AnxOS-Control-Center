#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const nodesIpc = fs.readFileSync(path.join(root, "src", "ipc", "nodesIpc.js"), "utf8");

function includes(needle, message) {
  assert(app.includes(needle), message || `Expected renderer source to include ${needle}`);
}

includes("function resolveActiveManagementTarget()", "Renderer must expose one canonical active management target resolver.");
includes('targetType = isApplicationHost ? "application-host" : isLocalAgent ? "local-agent" : "registered-node"', "Resolver must keep application-host, local-agent, and registered-node distinct.");
includes('targetLabel: isApplicationHost ? "application-host" : isLocalAgent ? "local-agent" : `node:${node.id}`', "Resolver must expose safe target labels.");
includes('credentialSource: isApplicationHost ? "local-application-host" : isLocalAgent ? "local-agent-config" : "protected-node-credential"', "Resolver must expose the selected credential source without raw secrets.");
includes("function applyAgentControlRemoteStateToNodes", "Agent Control remote probes must reconcile into node snapshots.");
includes('status: "online"', "Running remote Agent probes must clear stale unavailable node state.");
includes('status: "authentication_failed"', "Authentication rejected remote probes must remain distinct from network unavailable.");
includes("renderNodes();", "Reconciled remote probe state must repaint Nodes and dependent summaries.");
includes("clearDashboardMetricsForActiveTarget", "Dashboard target switching/failure must clear stale machine metrics.");
includes("Local Windows metrics are hidden to avoid mixing sources.", "Dashboard must not show local metrics as remote metrics.");
includes("renderFriendlyDashboard();", "Successful and failed target metric refreshes must update Dashboard context.");
includes('const requestContext = getNodeRequestContext("nodes-refresh")', "Node registry refreshes must capture the canonical selection generation.");
includes("if (!isNodeRequestCurrent(requestContext)) return;", "Delayed node registry responses must not overwrite a newer selection.");
includes("selectedNodeId: previousSelectedNodeId", "Node registry failures must preserve the selected target instead of redirecting to the application host.");
includes('kind: "unavailable", displayName: "Selected target unavailable"', "A missing selected target must remain unavailable rather than being inferred as the application host.");

assert(!app.includes("Authorization") || !/Authorization.*textContent/.test(app), "Renderer must not render Authorization headers.");

[
  'requireNodeContext(payload, "node selection")',
  'requireNodeContext(payload, "node connection test")',
  'requireNodeContext(payload, "node health check")',
  'requireNodeContext(payload, "node credential status")',
  'requireNodeContext(payload, "node deletion")',
  'requireNodeContext(payload, "node credential repair")',
].forEach((needle) => assert(nodesIpc.includes(needle), `Node IPC must reject missing explicit targets: ${needle}`));
assert(!nodesIpc.includes('payload.nodeId || "application-host"'), "Node IPC must never redirect a missing target to the application host.");

console.log("Cross-page selected-target consistency smoke checks passed.");
