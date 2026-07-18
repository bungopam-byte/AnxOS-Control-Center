const AMP_RESPONSE_LIMIT_BYTES = 8 * 1024 * 1024;
const AMP_REQUEST_TIMEOUT_MS = 15000;
const SAFE_API_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;
const RESERVED_API_IDENTIFIERS = new Set(["constructor", "prototype", "__proto__"]);

function isSafeApiIdentifier(value) {
  return SAFE_API_IDENTIFIER.test(String(value || "")) && !RESERVED_API_IDENTIFIERS.has(String(value));
}

async function readBoundedResponse(response, limitBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limitBytes) {
      await reader.cancel();
      throw Object.assign(new Error("AMP response exceeded the safe size limit."), { code: "AMP_RESPONSE_TOO_LARGE" });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
}

class AMPAPI {
  constructor(baseUri, options = {}) {
    const parsed = new URL(String(baseUri || ""));
    if (!/^https?:$/.test(parsed.protocol)) throw Object.assign(new Error("AMP URL must use HTTP or HTTPS."), { code: "AMP_URL_INVALID" });
    if (parsed.username || parsed.password) throw Object.assign(new Error("AMP URL must not contain embedded credentials."), { code: "AMP_URL_CREDENTIALS_FORBIDDEN" });
    this.baseUri = parsed.toString().replace(/\/$/, "");
    this.dataSource = `${this.baseUri}/API`;
    this.sessionId = "";
    this.API = { Core: { GetAPISpec: { Parameters: [] } } };
    this.timeoutMs = Math.max(1000, Number(options.timeoutMs) || AMP_REQUEST_TIMEOUT_MS);
    this.responseLimitBytes = Math.max(1024, Number(options.responseLimitBytes) || AMP_RESPONSE_LIMIT_BYTES);
  }

  async initAsync(stage2 = false) {
    this.bindMethods();
    if (stage2) return true;
    const specification = await this.Core.GetAPISpecAsync();
    if (!specification || typeof specification !== "object" || Array.isArray(specification)) return false;
    this.API = specification;
    this.bindMethods();
    return true;
  }

  bindMethods() {
    for (const [moduleName, methods] of Object.entries(this.API || {})) {
      if (!isSafeApiIdentifier(moduleName)) continue;
      const module = Object.create(null);
      for (const methodName of Object.keys(methods || {})) {
        if (!isSafeApiIdentifier(methodName)) continue;
        module[`${methodName}Async`] = (...args) => this.APICall(moduleName, methodName, args);
      }
      this[moduleName] = module;
    }
  }

  async APICall(moduleName, methodName, args = []) {
    const parameters = this.API?.[moduleName]?.[methodName]?.Parameters;
    if (!isSafeApiIdentifier(moduleName) || !isSafeApiIdentifier(methodName)) {
      throw Object.assign(new Error("AMP API method name is invalid."), { code: "AMP_METHOD_INVALID" });
    }
    const body = Object.assign(Object.create(null), { SESSIONID: this.sessionId });
    (Array.isArray(parameters) ? parameters : []).forEach((parameter, index) => {
      if (isSafeApiIdentifier(parameter?.Name)) body[parameter.Name] = args[index];
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    timeout.unref?.();
    try {
      const response = await fetch(`${this.dataSource}/${encodeURIComponent(moduleName)}/${encodeURIComponent(methodName)}`, {
        method: "POST",
        headers: {
          Accept: "application/vnd.cubecoders-ampapi",
          "Content-Type": "application/json",
          "User-Agent": "AnxOS-Control-Center/AMP",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: "error",
      });
      const declaredBytes = Number(response.headers.get("content-length") || 0);
      if (declaredBytes > this.responseLimitBytes) throw Object.assign(new Error("AMP response exceeded the safe size limit."), { code: "AMP_RESPONSE_TOO_LARGE" });
      const bytes = await readBoundedResponse(response, this.responseLimitBytes);
      let payload;
      try {
        payload = bytes.length ? JSON.parse(bytes.toString("utf8")) : null;
      } catch (error) {
        throw Object.assign(new Error("AMP returned an invalid JSON response."), { code: "AMP_RESPONSE_INVALID", cause: error });
      }
      if (!response.ok) {
        throw Object.assign(new Error(`AMP request failed with HTTP ${response.status}.`), { code: "AMP_HTTP_ERROR", status: response.status });
      }
      return payload && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 1 && payload.result !== undefined
        ? payload.result
        : payload;
    } catch (error) {
      if (error?.name === "AbortError") throw Object.assign(new Error("AMP request timed out."), { code: "AMP_TIMEOUT" });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { AMPAPI, AMP_REQUEST_TIMEOUT_MS, AMP_RESPONSE_LIMIT_BYTES };
