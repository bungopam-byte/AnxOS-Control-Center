#!/usr/bin/env node

const { inspect } = require("util");
const { inspectManagedMinecraftRuntime } = require("../src/services/ampService");

const instanceHint = process.argv[2] || "Coolpals01";

function findRuntimeCalls(diagnostic) {
  return diagnostic.readOnlyCalls.filter((call) => /GetInstanceAsync|status|metric/i.test(call.label));
}

inspectManagedMinecraftRuntime({ instanceHint })
  .then((diagnostic) => {
    const selected = diagnostic.selectedInstance || {};
    const runtimeCalls = findRuntimeCalls(diagnostic);
    const output = {
      selectedInstance: {
        id: selected.id || selected.InstanceID || selected.InstanceId || selected.ID || null,
        name: selected.name || selected.InstanceName || selected.FriendlyName || selected.Name || null,
      },
      managedUrl: diagnostic.managedUrl,
      runtimeMetricsDiagnostics: diagnostic.runtimeMetricsDiagnostics,
      runtimeMetrics: diagnostic.runtimeMetrics,
      adsRuntimeStatusOrMetricCalls: runtimeCalls,
      adsReadOnlyCalls: diagnostic.readOnlyCalls,
    };

    console.log("===== AMP DEBUG JSON.stringify =====");
    console.log(JSON.stringify(output, null, 2));
    console.log("\n===== AMP DEBUG util.inspect depth:null =====");
    console.log(inspect(output, { depth: null, colors: false, compact: false }));
  })
  .catch((error) => {
    console.error("AMP_DEBUG_FAILED");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
