const assert = require("assert");

const service = require("../agent/src/services/systemService");
const system = service._test;

async function withPlatform(platform, fn) {
  const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: platform });
  try {
    return await fn();
  } finally {
    Object.defineProperty(process, "platform", descriptor);
  }
}

function jsonResult(value) {
  return { ok: true, stdout: JSON.stringify(value), stderr: "" };
}

async function run() {
  assert(system.scoreWindowsCpuTemperatureSensor({ Name: "CPU Package", SensorType: "Temperature" }) > 90, "CPU package sensors should be preferred.");
  assert(system.isRejectedTemperatureSensor({ Name: "GPU Core", SensorType: "Temperature" }), "GPU temperature must not be used as CPU temperature.");
  assert(system.isRejectedTemperatureSensor({ Name: "SSD Temperature", SensorType: "Temperature" }), "Disk temperature must not be used as CPU temperature.");

  let calls = 0;
  system.setCpuTemperatureExecFileForTest(async () => {
    calls += 1;
    return jsonResult([
      { Name: "GPU Core", Identifier: "/gpu/0/temperature/0", SensorType: "Temperature", Value: 64 },
      { Name: "CPU Core #1", Identifier: "/intelcpu/0/temperature/0", SensorType: "Temperature", Value: 40 },
      { Name: "CPU Package", Identifier: "/intelcpu/0/temperature/1", SensorType: "Temperature", Value: 42.4 },
    ]);
  });

  await withPlatform("win32", async () => {
    const reading = await system.getCpuTemperature();
    assert.strictEqual(reading.temperatureValid, true, "Valid Windows CPU package reading should be accepted.");
    assert.strictEqual(reading.temperatureAvailable, true, "Valid Windows CPU package reading should be available.");
    assert.strictEqual(reading.temperatureCelsius, 42.4, "CPU package temperature should be selected.");
    assert.match(reading.temperatureSensor, /CPU Package/, "Sensor metadata should describe the chosen CPU sensor.");
    const cached = await system.getCpuTemperature();
    assert.strictEqual(cached.temperatureCelsius, 42.4, "Cached temperature should be reused.");
    assert.strictEqual(calls, 1, "Windows temperature provider should be throttled.");
  });

  system.setCpuTemperatureExecFileForTest(async () => jsonResult([
    { Name: "CPU Package", Identifier: "/intelcpu/0/temperature/1", SensorType: "Temperature", Value: 0 },
    { Name: "CPU Core #1", Identifier: "/intelcpu/0/temperature/2", SensorType: "Temperature", Value: "NaN" },
  ]));
  await withPlatform("win32", async () => {
    const reading = await system.getCpuTemperature();
    assert.strictEqual(reading.temperatureValid, false, "Zero and NaN CPU readings should be rejected.");
    assert.strictEqual(reading.temperatureAvailable, false, "Invalid CPU readings should be unavailable.");
    assert.strictEqual(reading.temperatureCelsius, null, "Invalid CPU readings must not become zero.");
  });

  system.setCpuTemperatureExecFileForTest(async () => jsonResult([
    { Name: "GPU Core", Identifier: "/gpu/0/temperature/0", SensorType: "Temperature", Value: 55 },
    { Name: "SSD Temperature", Identifier: "/hdd/0/temperature/0", SensorType: "Temperature", Value: 31 },
  ]));
  await withPlatform("win32", async () => {
    const reading = await system.getCpuTemperature();
    assert.strictEqual(reading.temperatureValid, false, "Non-CPU sensors should not be used.");
    assert.strictEqual(reading.temperatureReason, "not_reported", "Wrong sensor types should degrade as not reported.");
  });

  system.setCpuTemperatureExecFileForTest(async () => ({ ok: false, stdout: "", stderr: "namespace missing" }));
  await withPlatform("win32", async () => {
    const reading = await system.getCpuTemperature();
    assert.strictEqual(reading.temperatureValid, false, "Provider failure should degrade safely.");
    assert.strictEqual(reading.temperatureReason, "provider_unavailable", "Provider failure should be categorized.");
  });

  const linuxReading = system.createTemperatureReading(48, { source: "linux-sysfs", sensor: "x86_pkg_temp" });
  assert.strictEqual(linuxReading.temperatureValid, true, "Linux temperature readings should remain valid.");
  assert.strictEqual(linuxReading.temperatureCelsius, 48, "Linux temperature values should be preserved.");

  system.setCpuTemperatureExecFileForTest(null);
}

run()
  .then(() => console.log("Windows CPU temperature smoke checks passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
