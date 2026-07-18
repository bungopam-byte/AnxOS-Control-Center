From 41fe2a334a48b3f9925f2cebddb573288e48c23c Mon Sep 17 00:00:00 2001
From: Bungo Pamploma <Bungopam@gmail.com>
Date: Sat, 4 Jul 2026 03:54:02 -0600
Subject: [PATCH 1/2] chore: add temporary AMP runtime diagnostics

---
 package.json         |  3 [32m++[m[31m-[m
 scripts/amp-debug.js | 40 [32m++++++++++++++++++++++++++++++++++++++++[m
 2 files changed, 42 insertions(+), 1 deletion(-)
 create mode 100644 scripts/amp-debug.js

[1mdiff --git a/package.json b/package.json[m
[1mindex 8505c3a..69e7381 100644[m
[1m--- a/package.json[m
[1m+++ b/package.json[m
[36m@@ -7,7 +7,8 @@[m
   "private": true,[m
   "scripts": {[m
     "start": "electron .",[m
[31m-    "dist": "electron-builder"[m
[32m+[m[32m    "dist": "electron-builder",[m
[32m+[m[32m    "amp:debug": "node scripts/amp-debug.js"[m
   },[m
   "devDependencies": {[m
     "electron": "^43.0.0"[m
[1mdiff --git a/scripts/amp-debug.js b/scripts/amp-debug.js[m
[1mnew file mode 100644[m
[1mindex 0000000..fd24c4d[m
[1m--- /dev/null[m
[1m+++ b/scripts/amp-debug.js[m
[36m@@ -0,0 +1,40 @@[m
[32m+[m[32m#!/usr/bin/env node[m
[32m+[m
[32m+[m[32mconst { inspect } = require("util");[m
[32m+[m[32mconst { inspectManagedMinecraftRuntime } = require("../src/services/ampService");[m
[32m+[m
[32m+[m[32mconst instanceHint = process.argv[2] || "Coolpals01";[m
[32m+[m
[32m+[m[32mfunction findCall(diagnostic, label) {[m
[32m+[m[32m  return diagnostic.readOnlyCalls.find((call) => call.label === label) || null;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction findRuntimeCalls(diagnostic) {[m
[32m+[m[32m  return diagnostic.readOnlyCalls.filter((call) => /status|metric/i.test(call.label));[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32minspectManagedMinecraftRuntime({ instanceHint })[m
[32m+[m[32m  .then((diagnostic) => {[m
[32m+[m[32m    const selected = diagnostic.selectedInstance || {};[m
[32m+[m[32m    const getStatus = findCall(diagnostic, "Core.GetStatusAsync");[m
[32m+[m[32m    const runtimeCalls = findRuntimeCalls(diagnostic);[m
[32m+[m[32m    const output = {[m
[32m+[m[32m      selectedInstance: {[m
[32m+[m[32m        id: selected.id || selected.InstanceID || selected.InstanceId || selected.ID || null,[m
[32m+[m[32m        name: selected.name || selected.InstanceName || selected.FriendlyName || selected.Name || null,[m
[32m+[m[32m      },[m
[32m+[m[32m      managedUrl: diagnostic.managedUrl,[m
[32m+[m[32m      getStatusAsync: getStatus,[m
[32m+[m[32m      runtimeStatusOrMetricCalls: runtimeCalls,[m
[32m+[m[32m    };[m
[32m+[m
[32m+[m[32m    console.log("===== AMP DEBUG JSON.stringify =====");[m
[32m+[m[32m    console.log(JSON.stringify(output, null, 2));[m
[32m+[m[32m    console.log("\n===== AMP DEBUG util.inspect depth:null =====");[m
[32m+[m[32m    console.log(inspect(output, { depth: null, colors: false, compact: false }));[m
[32m+[m[32m  })[m
[32m+[m[32m  .catch((error) => {[m
[32m+[m[32m    console.error("AMP_DEBUG_FAILED");[m
[32m+[m[32m    console.error(error && error.stack ? error.stack : error);[m
[32m+[m[32m    process.exit(1);[m
[32m+[m[32m  });[m
-- 
2.47.3


From 2142ee74dd7bd7ec8f6bdb838f7d47d48f28c2ad Mon Sep 17 00:00:00 2001
From: Bungo Pamploma <Bungopam@gmail.com>
Date: Sat, 4 Jul 2026 04:29:47 -0600
Subject: [PATCH 2/2] fix: read AMP runtime metrics through ADS

---
 scripts/amp-debug.js       |  13 [32m+[m[31m-[m
 src/services/ampService.js | 259 [32m++++++++++++++++++++[m[31m-----------------[m
 2 files changed, 142 insertions(+), 130 deletions(-)

[1mdiff --git a/scripts/amp-debug.js b/scripts/amp-debug.js[m
[1mindex fd24c4d..2f04f4e 100644[m
[1m--- a/scripts/amp-debug.js[m
[1m+++ b/scripts/amp-debug.js[m
[36m@@ -5,18 +5,13 @@[m [mconst { inspectManagedMinecraftRuntime } = require("../src/services/ampService")[m
 [m
 const instanceHint = process.argv[2] || "Coolpals01";[m
 [m
[31m-function findCall(diagnostic, label) {[m
[31m-  return diagnostic.readOnlyCalls.find((call) => call.label === label) || null;[m
[31m-}[m
[31m-[m
 function findRuntimeCalls(diagnostic) {[m
[31m-  return diagnostic.readOnlyCalls.filter((call) => /status|metric/i.test(call.label));[m
[32m+[m[32m  return diagnostic.readOnlyCalls.filter((call) => /GetInstanceAsync|status|metric/i.test(call.label));[m
 }[m
 [m
 inspectManagedMinecraftRuntime({ instanceHint })[m
   .then((diagnostic) => {[m
     const selected = diagnostic.selectedInstance || {};[m
[31m-    const getStatus = findCall(diagnostic, "Core.GetStatusAsync");[m
     const runtimeCalls = findRuntimeCalls(diagnostic);[m
     const output = {[m
       selectedInstance: {[m
[36m@@ -24,8 +19,10 @@[m [minspectManagedMinecraftRuntime({ instanceHint })[m
         name: selected.name || selected.InstanceName || selected.FriendlyName || selected.Name || null,[m
       },[m
       managedUrl: diagnostic.managedUrl,[m
[31m-      getStatusAsync: getStatus,[m
[31m-      runtimeStatusOrMetricCalls: runtimeCalls,[m
[32m+[m[32m      runtimeMetricsDiagnostics: diagnostic.runtimeMetricsDiagnostics,[m
[32m+[m[32m      runtimeMetrics: diagnostic.runtimeMetrics,[m
[32m+[m[32m      adsRuntimeStatusOrMetricCalls: runtimeCalls,[m
[32m+[m[32m      adsReadOnlyCalls: diagnostic.readOnlyCalls,[m
     };[m
 [m
     console.log("===== AMP DEBUG JSON.stringify =====");[m
[1mdiff --git a/src/services/ampService.js b/src/services/ampService.js[m
[1mindex a73e90f..0f76710 100644[m
[1m--- a/src/services/ampService.js[m
[1m+++ b/src/services/ampService.js[m
[36m@@ -227,6 +227,10 @@[m [mfunction createDiagnostics(config, stage, details = {}) {[m
     stage,[m
     loginFailed: stage === "login",[m
     serverUnreachable: stage === "preflight" || stage === "api_spec" || stage === "client_error",[m
[32m+[m[32m    runtimeMetricsMethod: details.runtimeMetricsMethod || null,[m
[32m+[m[32m    runtimeMetricsSource: details.runtimeMetricsSource || null,[m
[32m+[m[32m    runtimeMetricsErrorCode: details.runtimeMetricsErrorCode || null,[m
[32m+[m[32m    runtimeMetricsCandidates: details.runtimeMetricsCandidates || [],[m
   };[m
 }[m
 [m
[36m@@ -465,23 +469,6 @@[m [masync function authenticate(api, config) {[m
   return withTimeout(api.initAsync(), AMP_TIMEOUT_MS);[m
 }[m
 [m
[31m-async function authenticateWithToken(api, username, token) {[m
[31m-  const loginResult = await callMethod(api.Core, "LoginAsync", [username, "", token, false]);[m
[31m-  const sessionId = extractSessionId(loginResult);[m
[31m-[m
[31m-  if (sessionId) {[m
[31m-    api.sessionId = sessionId;[m
[31m-  }[m
[31m-[m
[31m-  const authenticated = didLoginSucceed(loginResult, sessionId);[m
[31m-[m
[31m-  if (!authenticated) {[m
[31m-    return false;[m
[31m-  }[m
[31m-[m
[31m-  return withTimeout(api.initAsync(), AMP_TIMEOUT_MS);[m
[31m-}[m
[31m-[m
 function hasAnyKey(value, keys) {[m
   if (!value || typeof value !== "object") {[m
     return false;[m
[36m@@ -762,6 +749,61 @@[m [mfunction normalizeStatusPayload(value) {[m
   return pickFirstObject(...asArray(unwrapped));[m
 }[m
 [m
[32m+[m[32mfunction hasRuntimeMetrics(metrics) {[m
[32m+[m[32m  return ["Active Users", "TPS", "CPU Usage", "Memory Usage"].some((metricName) => Boolean(metrics[metricName]));[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction findRuntimeMetrics(value, depth = 0) {[m
[32m+[m[32m  if (!value || typeof value !== "object" || depth > 4) {[m
[32m+[m[32m    return {};[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  const normalized = normalizeMetrics(value);[m
[32m+[m
[32m+[m[32m  if (hasRuntimeMetrics(normalized)) {[m
[32m+[m[32m    return normalized;[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  if (Array.isArray(value)) {[m
[32m+[m[32m    for (const item of value) {[m
[32m+[m[32m      const metrics = findRuntimeMetrics(item, depth + 1);[m
[32m+[m
[32m+[m[32m      if (hasRuntimeMetrics(metrics)) {[m
[32m+[m[32m        return metrics;[m
[32m+[m[32m      }[m
[32m+[m[32m    }[m
[32m+[m
[32m+[m[32m    return {};[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  for (const key of ["Metrics", "metrics", "MetricData", "metricData", "Status", "status", "Result", "result", "Data", "data"]) {[m
[32m+[m[32m    const metrics = findRuntimeMetrics(value[key], depth + 1);[m
[32m+[m
[32m+[m[32m    if (hasRuntimeMetrics(metrics)) {[m
[32m+[m[32m      return metrics;[m
[32m+[m[32m    }[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  return {};[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32mfunction normalizeRuntimeMetrics(value, version = null) {[m
[32m+[m[32m  const scopedValue = unwrapResult(value);[m
[32m+[m[32m  const status = normalizeStatusPayload(scopedValue);[m
[32m+[m[32m  const metrics = findRuntimeMetrics(scopedValue);[m
[32m+[m
[32m+[m[32m  return pickDefinedValues({[m
[32m+[m[32m    state: findValue(status, ["State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState", "StateText", "Running", "state"]),[m
[32m+[m[32m    playerCount: getMetricRawValue(metrics, "Active Users"),[m
[32m+[m[32m    maxPlayers: getMetricMaxValue(metrics, "Active Users"),[m
[32m+[m[32m    tps: getMetricRawValue(metrics, "TPS"),[m
[32m+[m[32m    cpuUsage: getMetricRawValue(metrics, "CPU Usage"),[m
[32m+[m[32m    ramUsage: getMetricRawValue(metrics, "Memory Usage"),[m
[32m+[m[32m    uptime: normalizeUptime(findValue(status, ["Uptime", "uptime"])),[m
[32m+[m[32m    version,[m
[32m+[m[32m  });[m
[32m+[m[32m}[m
[32m+[m
 function mergeStatusRows(instance, statuses) {[m
   const instanceId = getInstanceId(instance);[m
 [m
[36m@@ -897,94 +939,96 @@[m [masync function getAdsInstance(api, instanceId) {[m
   return null;[m
 }[m
 [m
[31m-async function authenticateManagedInstance(adsApi, config, selectedInstance) {[m
[31m-  const instanceId = getInstanceId(selectedInstance);[m
[31m-[m
[31m-  if (!instanceId) {[m
[31m-    return null;[m
[31m-  }[m
[31m-[m
[31m-  const adsInstance = await getAdsInstance(adsApi, instanceId);[m
[31m-  const managedUrl = adsInstance ? buildManagedInstanceUrl(config, adsInstance) : null;[m
[31m-[m
[31m-  if (!adsInstance || !managedUrl) {[m
[31m-    return null;[m
[31m-  }[m
[31m-[m
[31m-  const handoffResult = await callMethodDetailed(adsApi.ADSModule, "ManageInstanceAsync", [instanceId]);[m
[31m-  const handoffToken = handoffResult.ok ? extractActionResultValue(handoffResult.value) : null;[m
[31m-[m
[31m-  if (!handoffToken) {[m
[31m-    return null;[m
[31m-  }[m
[31m-[m
[31m-  const managedApi = new AMPAPI(managedUrl);[m
[31m-  const initialized = await withTimeout(managedApi.initAsync(), AMP_TIMEOUT_MS);[m
[31m-  const authenticated = initialized ? await authenticateWithToken(managedApi, config.username, handoffToken) : false;[m
[31m-[m
[31m-  return authenticated ? managedApi : null;[m
[32m+[m[32mfunction hasRuntimeMetricValues(metrics) {[m
[32m+[m[32m  return ["playerCount", "maxPlayers", "tps", "cpuUsage", "ramUsage", "uptime"].some((key) => metrics[key] !== undefined);[m
 }[m
 [m
[31m-async function getMinecraftVersion(managedApi) {[m
[31m-  const result = await callMethodDetailed(managedApi.Core, "GetConfigAsync", ["MinecraftModule.Minecraft.SpecificVersion"]);[m
[31m-[m
[31m-  if (!result.ok || !result.value) {[m
[31m-    return null;[m
[31m-  }[m
[31m-[m
[31m-  const config = pickFirstObject(unwrapResult(result.value));[m
[31m-  return findValue(config, ["CurrentValue", "currentValue", "Value", "value"]);[m
[31m-}[m
[32m+[m[32masync function getSelectedInstanceAdsMetrics(api, selectedInstance) {[m
[32m+[m[32m  const instanceId = getInstanceId(selectedInstance);[m
[32m+[m[32m  const candidates = [];[m
 [m
[31m-async function getManagedInstanceMetrics(managedApi) {[m
[31m-  if (!managedApi) {[m
[31m-    return null;[m
[32m+[m[32m  if (!instanceId) {[m
[32m+[m[32m    return {[m
[32m+[m[32m      managedMetrics: null,[m
[32m+[m[32m      runtimeDiagnostics: {[m
[32m+[m[32m        runtimeMetricsSource: "ads",[m
[32m+[m[32m        runtimeMetricsMethod: null,[m
[32m+[m[32m        runtimeMetricsErrorCode: "NO_INSTANCE_ID",[m
[32m+[m[32m        runtimeMetricsCandidates: [],[m
[32m+[m[32m      },[m
[32m+[m[32m    };[m
   }[m
 [m
[31m-  const statusResult = await callMethodDetailed(managedApi.Core, "GetStatusAsync");[m
[32m+[m[32m  const label = "ADSModule.GetInstanceAsync";[m
[32m+[m[32m  const result = await callMethodDetailed(api.ADSModule, "GetInstanceAsync", [instanceId]);[m
[32m+[m[32m  candidates.push({[m
[32m+[m[32m    method: label,[m
[32m+[m[32m    ok: result.ok,[m
[32m+[m[32m    missing: result.missing,[m
[32m+[m[32m    errorCode: result.errorCode,[m
[32m+[m[32m    hasPayload: Boolean(result.value),[m
[32m+[m[32m    topLevelKeys: result.value && typeof result.value === "object" ? Object.keys(unwrapResult(result.value)) : [],[m
[32m+[m[32m  });[m
 [m
[31m-  if (!statusResult.ok || !statusResult.value) {[m
[31m-    return null;[m
[32m+[m[32m  if (result.ok && result.value) {[m
[32m+[m[32m    const metrics = normalizeRuntimeMetrics(result.value, selectedInstance.version || null);[m
[32m+[m
[32m+[m[32m    if (hasRuntimeMetricValues(metrics)) {[m
[32m+[m[32m      return {[m
[32m+[m[32m        managedMetrics: metrics,[m
[32m+[m[32m        runtimeDiagnostics: {[m
[32m+[m[32m          runtimeMetricsSource: "ads",[m
[32m+[m[32m          runtimeMetricsMethod: label,[m
[32m+[m[32m          runtimeMetricsErrorCode: null,[m
[32m+[m[32m          runtimeMetricsCandidates: candidates,[m
[32m+[m[32m        },[m
[32m+[m[32m      };[m
[32m+[m[32m    }[m
   }[m
 [m
[31m-  const status = normalizeStatusPayload(statusResult.value);[m
[31m-  const metrics = normalizeMetrics(status.Metrics);[m
[31m-  const version = await getMinecraftVersion(managedApi);[m
[31m-[m
[31m-  const normalized = pickDefinedValues({[m
[31m-    state: findValue(status, ["State", "Status", "ApplicationState", "DaemonState", "AppState", "InstanceState", "StateText", "Running", "state"]),[m
[31m-    playerCount: getMetricRawValue(metrics, "Active Users"),[m
[31m-    maxPlayers: getMetricMaxValue(metrics, "Active Users"),[m
[31m-    tps: getMetricRawValue(metrics, "TPS"),[m
[31m-    cpuUsage: getMetricRawValue(metrics, "CPU Usage"),[m
[31m-    ramUsage: getMetricRawValue(metrics, "Memory Usage"),[m
[31m-    uptime: normalizeUptime(findValue(status, ["Uptime", "uptime"])),[m
[31m-    version,[m
[31m-  });[m
[31m-[m
[31m-  return normalized;[m
[32m+[m[32m  return {[m
[32m+[m[32m    managedMetrics: null,[m
[32m+[m[32m    runtimeDiagnostics: {[m
[32m+[m[32m      runtimeMetricsSource: "ads",[m
[32m+[m[32m      runtimeMetricsMethod: null,[m
[32m+[m[32m      runtimeMetricsErrorCode: "NO_RUNTIME_METRICS",[m
[32m+[m[32m      runtimeMetricsCandidates: candidates,[m
[32m+[m[32m    },[m
[32m+[m[32m  };[m
 }[m
 [m
[31m-async function getSelectedInstanceChildMetrics(api, config, selectedInstance) {[m
[32m+[m[32masync function getSelectedInstanceChildMetrics(api, selectedInstance) {[m
   if (!selectedInstance) {[m
     return {[m
       managedInstanceApi: null,[m
       managedMetrics: null,[m
[32m+[m[32m      runtimeDiagnostics: {[m
[32m+[m[32m        runtimeMetricsSource: null,[m
[32m+[m[32m        runtimeMetricsMethod: null,[m
[32m+[m[32m        runtimeMetricsErrorCode: "NO_SELECTED_INSTANCE",[m
[32m+[m[32m        runtimeMetricsCandidates: [],[m
[32m+[m[32m      },[m
     };[m
   }[m
 [m
   try {[m
[31m-    const managedInstanceApi = await authenticateManagedInstance(api, config, selectedInstance);[m
[31m-    const managedMetrics = await getManagedInstanceMetrics(managedInstanceApi);[m
[32m+[m[32m    const adsMetrics = await getSelectedInstanceAdsMetrics(api, selectedInstance);[m
 [m
     return {[m
[31m-      managedInstanceApi,[m
[31m-      managedMetrics,[m
[32m+[m[32m      managedInstanceApi: null,[m
[32m+[m[32m      managedMetrics: adsMetrics.managedMetrics,[m
[32m+[m[32m      runtimeDiagnostics: adsMetrics.runtimeDiagnostics,[m
     };[m
[31m-  } catch {[m
[32m+[m[32m  } catch (error) {[m
     return {[m
       managedInstanceApi: null,[m
       managedMetrics: null,[m
[32m+[m[32m      runtimeDiagnostics: {[m
[32m+[m[32m        runtimeMetricsSource: "ads",[m
[32m+[m[32m        runtimeMetricsMethod: null,[m
[32m+[m[32m        runtimeMetricsErrorCode: getSafeErrorCode(error),[m
[32m+[m[32m        runtimeMetricsCandidates: [],[m
[32m+[m[32m      },[m
     };[m
   }[m
 }[m
[36m@@ -1144,20 +1188,20 @@[m [masync function getAmpSnapshot() {[m
 [m
     markSuccessfulAmpPoll("connected", adsInstances);[m
 [m
[32m+[m[32m    const { managedInstanceApi, managedMetrics, runtimeDiagnostics } = await getSelectedInstanceChildMetrics(api, adsSelectedInstance);[m
[32m+[m
     const adsSnapshot = createAmpSnapshot({[m
       connected: true,[m
       configured: true,[m
       status: "connected",[m
       message: "Connected to AMP.",[m
[31m-      diagnostics: createDiagnostics(config, "connected"),[m
[32m+[m[32m      diagnostics: createDiagnostics(config, "connected", runtimeDiagnostics),[m
       instances: adsInstances,[m
       selectedInstance: adsSelectedInstance,[m
       minecraftInstances: adsMinecraftInstances,[m
       minecraftSelectionMode: selection.mode,[m
     });[m
 [m
[31m-    const { managedInstanceApi, managedMetrics } = await getSelectedInstanceChildMetrics(api, config, adsSelectedInstance);[m
[31m-[m
     if (!managedMetrics) {[m
       return adsSnapshot;[m
     }[m
[36m@@ -1177,7 +1221,7 @@[m [masync function getAmpSnapshot() {[m
       configured: true,[m
       status: "connected",[m
       message: "Connected to AMP.",[m
[31m-      diagnostics: createDiagnostics(config, "connected"),[m
[32m+[m[32m      diagnostics: createDiagnostics(config, "connected", runtimeDiagnostics),[m
       instances: finalInstances,[m
       selectedInstance: finalSelectedInstance,[m
       minecraftInstances: finalMinecraftInstances,[m
[36m@@ -1281,10 +1325,6 @@[m [mfunction summarizeDiagnosticCall(label, result) {[m
   };[m
 }[m
 [m
[31m-function isSafeRuntimeMethod(methodName) {[m
[31m-  return /^Get/i.test(methodName) && /status|metric|player|user|tps|performance|usage|state|uptime|memory|ram|cpu|version/i.test(methodName);[m
[31m-}[m
[31m-[m
 function collectMetricCandidates(calls) {[m
   const wanted = /player|user|tps|cpu|processor|ram|memory|uptime|state|version/i;[m
   const candidates = [];[m
[36m@@ -1351,51 +1391,26 @@[m [masync function inspectManagedMinecraftRuntime({ instanceHint = "Coolpals01" } =[m
   }[m
 [m
   const adsSelectedInstance = await enrichSelectedInstance(api, selected);[m
[31m-  const managedApi = await authenticateManagedInstance(api, config, adsSelectedInstance);[m
[31m-[m
[31m-  if (!managedApi) {[m
[31m-    throw new Error("Managed Minecraft instance authentication failed.");[m
[31m-  }[m
[31m-[m
   const readOnlyCalls = [];[m
[31m-  const coreCalls = [[m
[31m-    ["Core.GetStatusAsync", managedApi.Core, "GetStatusAsync", []],[m
[31m-    ["Core.GetUpdatesAsync", managedApi.Core, "GetUpdatesAsync", []],[m
[31m-    ["Core.GetModuleInfoAsync", managedApi.Core, "GetModuleInfoAsync", []],[m
[31m-    [[m
[31m-      "Core.GetConfigAsync(MinecraftModule.Minecraft.SpecificVersion)",[m
[31m-      managedApi.Core,[m
[31m-      "GetConfigAsync",[m
[31m-      ["MinecraftModule.Minecraft.SpecificVersion"],[m
[31m-    ],[m
[31m-  ];[m
[32m+[m[32m  const instanceId = getInstanceId(adsSelectedInstance);[m
[32m+[m[32m  const adsCalls = [["ADSModule.GetInstanceAsync", api.ADSModule, "GetInstanceAsync", [instanceId]]];[m
 [m
[31m-  for (const [label, moduleValue, methodName, args] of coreCalls) {[m
[32m+[m[32m  for (const [label, moduleValue, methodName, args] of adsCalls) {[m
     readOnlyCalls.push(summarizeDiagnosticCall(label, await callMethodDetailed(moduleValue, methodName, args)));[m
   }[m
 [m
[31m-  const managedMethods = getApiMethods(managedApi);[m
[31m-[m
[31m-  for (const [moduleName, methods] of Object.entries(managedMethods)) {[m
[31m-    if (moduleName === "Core") {[m
[31m-      continue;[m
[31m-    }[m
[31m-[m
[31m-    for (const methodName of methods.filter(isSafeRuntimeMethod)) {[m
[31m-      readOnlyCalls.push([m
[31m-        summarizeDiagnosticCall(`${moduleName}.${methodName}`, await callMethodDetailed(managedApi[moduleName], methodName, [])),[m
[31m-      );[m
[31m-    }[m
[31m-  }[m
[32m+[m[32m  const runtimeMetrics = await getSelectedInstanceAdsMetrics(api, adsSelectedInstance);[m
 [m
   return {[m
     envPath: config.env?.resolvedEnvPath || null,[m
     ampUrl: config.url,[m
     selectedInstance: sanitizeDiagnosticValue(adsSelectedInstance),[m
     managedUrl: adsSelectedInstance ? buildManagedInstanceUrl(config, adsSelectedInstance) : null,[m
[31m-    managedAuthenticated: true,[m
[32m+[m[32m    managedAuthenticated: false,[m
[32m+[m[32m    runtimeMetricsDiagnostics: runtimeMetrics.runtimeDiagnostics,[m
[32m+[m[32m    runtimeMetrics: runtimeMetrics.managedMetrics,[m
     adsMethods: getApiMethods(api),[m
[31m-    managedMethods,[m
[32m+[m[32m    managedMethods: {},[m
     readOnlyCalls,[m
     metricCandidates: collectMetricCandidates(readOnlyCalls),[m
   };[m
-- 
2.47.3

