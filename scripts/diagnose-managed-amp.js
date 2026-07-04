#!/usr/bin/env node

const { inspectManagedMinecraftRuntime } = require("../src/services/ampService");

const instanceHint = process.argv[2] || "Coolpals01";

function printSection(title, value) {
  console.log(`\n===== ${title} =====`);
  console.log(JSON.stringify(value, null, 2));
}

inspectManagedMinecraftRuntime({ instanceHint })
  .then((diagnostic) => {
    printSection("Diagnostic Summary", {
      envPath: diagnostic.envPath,
      ampUrl: diagnostic.ampUrl,
      selectedInstance: diagnostic.selectedInstance,
      managedUrl: diagnostic.managedUrl,
      managedAuthenticated: diagnostic.managedAuthenticated,
    });

    printSection("ADS Methods", diagnostic.adsMethods);
    printSection("Managed Methods", diagnostic.managedMethods);
    printSection("Read Only Calls", diagnostic.readOnlyCalls);
    printSection("Metric Candidates", diagnostic.metricCandidates);
  })
  .catch((error) => {
    console.error("\nDIAGNOSTIC_FAILED");
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
