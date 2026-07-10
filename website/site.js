const config = window.ANXOS_DOWNLOAD_CONFIG || {};
const accountConfig = window.ANXOS_ACCOUNT_CONFIG || {};

let supabaseClient = null;
let currentSession = null;
let currentProfile = null;
let currentDeviceCode = "";
let currentDeviceRequest = null;

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value || "";
  });
}

function applyConfigText() {
  document.querySelectorAll("[data-logo]").forEach((node) => {
    if (config.logoPath) node.src = config.logoPath;
  });
  document.querySelectorAll("[data-config]").forEach((node) => {
    const key = node.dataset.config;
    if (Object.prototype.hasOwnProperty.call(config, key)) node.textContent = config[key];
  });
  document.querySelectorAll("[data-config-href]").forEach((node) => {
    const key = node.dataset.configHref;
    if (config[key]) node.href = config[key];
  });
  setText("[data-release-title]", `Version ${config.latestVersion || ""}`.trim());
}

function applyDownloads() {
  const downloads = config.downloads || {};
  document.querySelectorAll("[data-download]").forEach((node) => {
    const item = downloads[node.dataset.download];
    if (!item) return;
    node.href = item.url;
    node.setAttribute("download", item.fileName);
    node.setAttribute("aria-label", `${item.label}: ${item.fileName}`);
  });
  document.querySelectorAll("[data-file]").forEach((node) => {
    const item = downloads[node.dataset.file];
    if (!item) return;
    node.textContent = `${item.fileName} · ${item.size}`;
  });
}

function createReleaseNoteCard(release) {
  const card = document.createElement("article");
  card.className = "release-note-card";
  const heading = document.createElement("div");
  heading.className = "release-note-card__heading";
  const titleGroup = document.createElement("div");
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = release.tag || release.version || "Release";
  const title = document.createElement("h3");
  title.textContent = release.title || `Version ${release.version || ""}`.trim();
  titleGroup.append(badge, title);
  const date = document.createElement("time");
  date.textContent = release.date || "";
  if (release.datetime) date.dateTime = release.datetime;
  heading.append(titleGroup, date);
  const summary = document.createElement("p");
  summary.textContent = release.summary || "";
  const list = document.createElement("ul");
  (release.changes || []).forEach((change) => {
    const item = document.createElement("li");
    item.textContent = change;
    list.append(item);
  });
  const actions = document.createElement("div");
  actions.className = "release-note-card__actions";
  const releaseUrl = release.url || config.releaseUrl;
  if (releaseUrl) {
    const github = document.createElement("a");
    github.className = "button button-ghost";
    github.href = releaseUrl;
    github.textContent = "GitHub release";
    actions.append(github);
  }
  card.append(heading);
  if (summary.textContent) card.append(summary);
  if (list.children.length) card.append(list);
  if (actions.children.length) card.append(actions);
  return card;
}

function applyReleaseNotes() {
  const releases = Array.isArray(config.releaseNotes) ? config.releaseNotes : [];
  const latest = releases[0];
  document.querySelectorAll("[data-release-latest-summary]").forEach((node) => {
    node.textContent = latest?.summary || "Latest AnxOS release notes.";
  });
  document.querySelectorAll("[data-release-notes]").forEach((container) => {
    container.replaceChildren();
    if (!releases.length) {
      const empty = document.createElement("article");
      empty.className = "release-note-card";
      empty.innerHTML = "<h3>No release notes yet</h3><p>Release notes will appear here after the next website sync.</p>";
      container.append(empty);
      return;
    }
    releases.forEach((release) => container.append(createReleaseNoteCard(release)));
  });
}

function isAccountConfigured() {
  return Boolean(accountConfig.supabaseUrl && accountConfig.supabaseAnonKey);
}

function isAccountApiConfigured() {
  return Boolean(accountConfig.accountApiUrl);
}

function getSupabase() {
  if (!isAccountConfigured() || !window.supabase?.createClient) return null;
  if (!supabaseClient) {
    supabaseClient = window.supabase.createClient(accountConfig.supabaseUrl, accountConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseClient;
}

function getAccountApiUrl(path) {
  const base = String(accountConfig.accountApiUrl || "").replace(/\/+$/, "");
  return `${base}${path}`;
}

function getRouteParams() {
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  const hashParams = queryIndex >= 0 ? new URLSearchParams(hash.slice(queryIndex + 1)) : new URLSearchParams();
  const pageParams = new URLSearchParams(window.location.search);
  for (const [key, value] of pageParams.entries()) {
    if (!hashParams.has(key)) hashParams.set(key, value);
  }
  return hashParams;
}

function normalizeDeviceCode(value) {
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return normalized.length >= 6 ? normalized : "";
}

function redactSecret(value) {
  return String(value || "")
    .replace(/(access[_-]?token|refresh[_-]?token|authorization|secret|password|apikey|api[_-]?key)["'=:\s]+[^"',\s}]+/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{28,}\b/g, "[redacted]");
}

function friendlyAuthError(error) {
  const message = redactSecret(error?.message || error?.error_description || error?.code || "Account request failed.");
  if (/email not confirmed/i.test(message)) return "Check your email and verify your account before signing in.";
  if (/invalid login|invalid credentials/i.test(message)) return "Email or password is incorrect.";
  if (/already registered|already exists/i.test(message)) return "An account already exists for that email.";
  if (/rate/i.test(message)) return "Too many attempts. Wait a moment, then try again.";
  return message;
}

function setMessage(key, message, tone = "muted") {
  document.querySelectorAll(`[data-auth-message="${key}"]`).forEach((node) => {
    node.textContent = message || "";
    node.dataset.tone = tone;
  });
}

function setDeviceMessage(message, tone = "muted") {
  document.querySelectorAll("[data-device-login-message]").forEach((node) => {
    node.textContent = message || "";
    node.dataset.tone = tone;
  });
}

function setFormDisabled(form, disabled) {
  form.querySelectorAll("button, input").forEach((node) => {
    node.disabled = Boolean(disabled);
  });
}

async function apiFetch(path, options = {}) {
  if (!isAccountApiConfigured()) {
    const error = new Error("AnxOS account API is not configured for this deployment.");
    error.code = "ACCOUNT_API_NOT_CONFIGURED";
    throw error;
  }
  const session = currentSession || (await getSupabase()?.auth.getSession())?.data?.session;
  const headers = {
    "content-type": "application/json",
    ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
  };
  const response = await fetch(getAccountApiUrl(path), {
    method: options.method || "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || `Request failed with HTTP ${response.status}.`);
    error.code = data.code || `HTTP_${response.status}`;
    throw error;
  }
  return data;
}

async function initializeAccount() {
  if (!isAccountConfigured()) {
    disableAccountForms("AnxOS account sign-in is not configured for this deployment. Local desktop mode still works without an online account.");
    return;
  }
  const client = getSupabase();
  if (!client) {
    disableAccountForms("Account scripts could not load. Check your connection and try again.");
    return;
  }
  const { data } = await client.auth.getSession();
  currentSession = data.session || null;
  client.auth.onAuthStateChange((_event, session) => {
    currentSession = session || null;
    renderAuthState().catch(() => {});
  });
  await renderAuthState();
}

function disableAccountForms(message) {
  document.querySelectorAll("[data-auth-form], [data-device-login-form]").forEach((form) => setFormDisabled(form, true));
  document.querySelectorAll("[data-auth-message], [data-device-login-message]").forEach((node) => {
    node.textContent = message;
    node.dataset.tone = "warn";
  });
  renderSignedOut();
}

async function renderAuthState() {
  if (!currentSession) {
    currentProfile = null;
    renderSignedOut();
    return;
  }
  await loadProfile();
  renderSignedIn();
  await Promise.allSettled([loadDevices(), loadSessions(), loadSecurityEvents()]);
}

function renderSignedOut() {
  document.querySelectorAll('[data-auth-view="signed-in"]').forEach((node) => { node.hidden = true; });
  document.querySelectorAll('[data-auth-view="signed-out"]').forEach((node) => { node.hidden = false; });
}

function renderSignedIn() {
  document.querySelectorAll('[data-auth-view="signed-in"]').forEach((node) => { node.hidden = false; });
  document.querySelectorAll('[data-auth-view="signed-out"]').forEach((node) => { node.hidden = true; });
  setText("[data-account-display-name]", currentProfile?.display_name || currentProfile?.username || currentSession?.user?.email || "AnxOS Account");
  setText("[data-account-email]", currentSession?.user?.email || "");
  document.querySelectorAll('[data-auth-form="profile"]').forEach((form) => {
    form.elements.username.value = currentProfile?.username || "";
    form.elements.displayName.value = currentProfile?.display_name || "";
    form.elements.avatarUrl.value = currentProfile?.avatar_url || "";
  });
}

async function loadProfile() {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id,username,display_name,avatar_url,role,created_at,updated_at")
    .eq("id", currentSession.user.id)
    .maybeSingle();
  if (error) throw error;
  currentProfile = data || null;
}

async function handleSignIn(form) {
  setFormDisabled(form, true);
  setMessage("signin", "Signing in...");
  try {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    });
    if (error) throw error;
    setMessage("signin", "Signed in.", "ok");
    const params = getRouteParams();
    if (params.get("return") === "activate") {
      const code = normalizeDeviceCode(params.get("code"));
      window.location.href = `activate.html${code ? `?code=${encodeURIComponent(code)}` : ""}`;
      return;
    }
    window.location.hash = "account";
  } catch (error) {
    setMessage("signin", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleSignUp(form) {
  setFormDisabled(form, true);
  setMessage("signup", "Creating account...");
  try {
    const username = form.elements.username.value.trim();
    const displayName = form.elements.displayName.value.trim();
    const { error } = await getSupabase().auth.signUp({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
      options: {
        emailRedirectTo: `${accountConfig.siteUrl || window.location.origin}/#verify-email`,
        data: { username, display_name: displayName },
      },
    });
    if (error) throw error;
    setMessage("signup", "Account created. Check your email to verify your address.", "ok");
    window.location.hash = "verify-email";
  } catch (error) {
    setMessage("signup", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleForgot(form) {
  setFormDisabled(form, true);
  setMessage("forgot", "Sending reset link...");
  try {
    const { error } = await getSupabase().auth.resetPasswordForEmail(form.elements.email.value.trim(), {
      redirectTo: `${accountConfig.siteUrl || window.location.origin}/#reset-password`,
    });
    if (error) throw error;
    setMessage("forgot", "If an account exists, a reset email has been sent.", "ok");
  } catch (error) {
    setMessage("forgot", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleReset(form) {
  setFormDisabled(form, true);
  setMessage("reset", "Updating password...");
  try {
    const { error } = await getSupabase().auth.updateUser({ password: form.elements.password.value });
    if (error) throw error;
    setMessage("reset", "Password updated.", "ok");
    window.location.hash = "account";
  } catch (error) {
    setMessage("reset", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleProfile(form) {
  setFormDisabled(form, true);
  setMessage("profile", "Saving...");
  try {
    const patch = {
      username: form.elements.username.value.trim(),
      display_name: form.elements.displayName.value.trim(),
      avatar_url: form.elements.avatarUrl.value.trim() || null,
    };
    const { error } = await getSupabase().from("profiles").update(patch).eq("id", currentSession.user.id);
    if (error) throw error;
    await loadProfile();
    renderSignedIn();
    setMessage("profile", "Profile saved.", "ok");
  } catch (error) {
    setMessage("profile", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function loadDevices() {
  const container = document.querySelector("[data-account-devices]");
  if (!container || !currentSession) return;
  renderListLoading(container);
  try {
    const { devices = [] } = await apiFetch("/api/account/devices", { method: "GET" });
    renderDeviceList(container, devices);
  } catch (error) {
    renderListMessage(container, friendlyAuthError(error));
  }
}

async function loadSessions() {
  const container = document.querySelector("[data-account-sessions]");
  if (!container || !currentSession) return;
  renderListLoading(container);
  try {
    const { sessions = [] } = await apiFetch("/api/account/sessions", { method: "GET" });
    renderGenericList(container, sessions, (session) => {
      const device = session.registered_devices || {};
      return {
        title: device.device_name || "Desktop session",
        meta: `${device.platform || "desktop"} · ${formatDate(session.last_seen_at || session.created_at)}${session.revoked_at ? " · Revoked" : ""}`,
      };
    });
  } catch (error) {
    renderListMessage(container, friendlyAuthError(error));
  }
}

async function loadSecurityEvents() {
  const container = document.querySelector("[data-account-events]");
  if (!container || !currentSession) return;
  renderListLoading(container);
  try {
    const { events = [] } = await apiFetch("/api/account/security-events", { method: "GET" });
    renderGenericList(container, events, (event) => ({
      title: event.event_type || "Security event",
      meta: `${event.outcome || "ok"} · ${formatDate(event.created_at)}`,
    }));
  } catch (error) {
    renderListMessage(container, friendlyAuthError(error));
  }
}

function renderListLoading(container) {
  container.replaceChildren(createListItem("Loading...", "Waiting for account data."));
}

function renderListMessage(container, message) {
  container.replaceChildren(createListItem("Not available", message));
}

function renderGenericList(container, items, mapItem) {
  container.replaceChildren();
  if (!items.length) {
    container.append(createListItem("No records", "Nothing has been reported yet."));
    return;
  }
  items.forEach((item) => {
    const mapped = mapItem(item);
    container.append(createListItem(mapped.title, mapped.meta));
  });
}

function renderDeviceList(container, devices) {
  container.replaceChildren();
  if (!devices.length) {
    container.append(createListItem("No devices", "Approved desktop apps will appear here."));
    return;
  }
  devices.forEach((device) => {
    const item = createListItem(
      device.device_name || "Desktop device",
      `${device.platform || "desktop"} · ${device.app_version || "version not reported"} · ${device.revoked_at ? "Revoked" : "Active"}`
    );
    if (!device.revoked_at) {
      const button = document.createElement("button");
      button.className = "button button-ghost";
      button.type = "button";
      button.textContent = "Revoke";
      button.addEventListener("click", async () => {
        if (!confirm("Revoke this desktop device? It will need to sign in again.")) return;
        await apiFetch("/api/account/devices/revoke", { body: { deviceId: device.id } });
        await loadDevices();
        await loadSessions();
      });
      item.append(button);
    }
    container.append(item);
  });
}

function createListItem(title, meta) {
  const item = document.createElement("article");
  item.className = "account-list-item";
  const text = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = title || "Untitled";
  const small = document.createElement("small");
  small.textContent = meta || "";
  text.append(heading, small);
  item.append(text);
  return item;
}

function formatDate(value) {
  if (!value) return "Not reported";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not reported" : date.toLocaleString();
}

function applyDeviceLoginPage() {
  const params = getRouteParams();
  const code = normalizeDeviceCode(params.get("code")) || currentDeviceCode;
  if (code) setDeviceCode(code);
}

function getSignInUrlForActivation() {
  const code = normalizeDeviceCode(document.querySelector("[data-device-code-input]")?.value || currentDeviceCode);
  const params = new URLSearchParams({ return: "activate" });
  if (code) params.set("code", code);
  return `index.html?${params.toString()}#signin`;
}

function setDeviceCode(code) {
  currentDeviceCode = normalizeDeviceCode(code);
  document.querySelectorAll("[data-device-code-input]").forEach((input) => { input.value = currentDeviceCode; });
  document.querySelectorAll("[data-activation-code]").forEach((node) => { node.textContent = currentDeviceCode || "Enter the code shown in AnxOS"; });
}

async function lookupDevice() {
  if (!currentSession) {
    setDeviceMessage("Sign in before reviewing a desktop device.", "warn");
    if (document.body?.dataset?.standaloneRoute === "activate") {
      window.location.href = getSignInUrlForActivation();
    } else {
      window.location.hash = "signin";
    }
    return;
  }
  setDeviceCode(document.querySelector("[data-device-code-input]")?.value || currentDeviceCode);
  if (!currentDeviceCode) {
    setDeviceMessage("Enter the device code shown in AnxOS.", "error");
    return;
  }
  setDeviceMessage("Looking up device...");
  try {
    const result = await apiFetch("/api/auth/device/lookup", { body: { userCode: currentDeviceCode } });
    if (result.state !== "pending") {
      currentDeviceRequest = null;
      setDeviceActions(false);
      setDeviceMessage(getDeviceStateMessage(result.state), result.state === "expired" ? "error" : "warn");
      return;
    }
    currentDeviceRequest = result.device;
    renderDeviceSummary(result.device);
    setDeviceActions(true);
    setDeviceMessage("Review this device, then approve or deny access.", "ok");
  } catch (error) {
    setDeviceActions(false);
    setDeviceMessage(friendlyAuthError(error), "error");
  }
}

async function approveOrDenyDevice(action) {
  if (!currentDeviceCode || !currentDeviceRequest) {
    await lookupDevice();
    if (!currentDeviceRequest) return;
  }
  const confirmed = action === "approve"
    ? confirm("Approve this AnxOS desktop app for your account?")
    : confirm("Deny this AnxOS desktop sign-in request?");
  if (!confirmed) return;
  setDeviceActions(false);
  setDeviceMessage(action === "approve" ? "Approving device..." : "Denying device...");
  try {
    const result = await apiFetch(`/api/auth/device/${action}`, { body: { userCode: currentDeviceCode } });
    currentDeviceRequest = null;
    setDeviceMessage(getDeviceStateMessage(result.state), result.state === "approved" ? "ok" : "warn");
    if (result.state === "approved") {
      await loadDevices();
      await loadSessions();
    }
  } catch (error) {
    setDeviceActions(true);
    setDeviceMessage(friendlyAuthError(error), "error");
  }
}

function renderDeviceSummary(device) {
  setText("[data-device-name]", device?.deviceName || "Unknown device");
  setText("[data-device-details]", [
    device?.platform || "desktop",
    device?.arch,
    device?.appVersion ? `AnxOS ${device.appVersion}` : null,
    device?.requestedAt ? `requested ${formatDate(device.requestedAt)}` : null,
  ].filter(Boolean).join(" · "));
}

function setDeviceActions(enabled) {
  document.querySelectorAll('[data-device-action="approve"], [data-device-action="deny"]').forEach((button) => {
    button.disabled = !enabled;
  });
}

function getDeviceStateMessage(state) {
  if (state === "approved") return "This device is now connected. You may return to AnxOS.";
  if (state === "denied") return "This sign-in request was denied.";
  if (state === "expired") return "This device code expired. Start sign-in again from AnxOS.";
  if (state === "consumed") return "This device code was already used.";
  return "Device request is not available.";
}

function bindAccountForms() {
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const type = form.dataset.authForm;
      if (!isAccountConfigured()) return;
      if (type === "signin") handleSignIn(form);
      if (type === "signup") handleSignUp(form);
      if (type === "forgot") handleForgot(form);
      if (type === "reset") handleReset(form);
      if (type === "profile") handleProfile(form);
    });
  });
  document.querySelectorAll('[data-auth-action="signout"]').forEach((button) => {
    button.addEventListener("click", async () => {
      await getSupabase()?.auth.signOut();
      currentSession = null;
      renderSignedOut();
      window.location.hash = "signin";
    });
  });
  document.querySelectorAll('[data-auth-action="refresh-devices"]').forEach((button) => {
    button.addEventListener("click", () => Promise.allSettled([loadDevices(), loadSessions(), loadSecurityEvents()]));
  });
  document.querySelectorAll('[data-auth-action="revoke-sessions"]').forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Sign out all desktop sessions for this account?")) return;
      await apiFetch("/api/account/sessions/revoke-all", { body: {} });
      await loadSessions();
    });
  });
  document.querySelectorAll('[data-device-action="lookup"]').forEach((button) => {
    button.addEventListener("click", lookupDevice);
  });
  document.querySelectorAll('[data-device-action="approve"]').forEach((button) => {
    button.addEventListener("click", () => approveOrDenyDevice("approve"));
  });
  document.querySelectorAll('[data-device-action="deny"]').forEach((button) => {
    button.addEventListener("click", () => approveOrDenyDevice("deny"));
  });
}

function applyHashRoute() {
  const hash = window.location.hash || "";
  const standaloneRoute = document.body?.dataset?.standaloneRoute || "";
  const route = hash.replace(/^#/, "").split("?")[0] || standaloneRoute || "top";
  if (!standaloneRoute && route === "activate") {
    const hashQuery = hash.includes("?") ? `?${hash.split("?").slice(1).join("?")}` : "";
    const query = window.location.search || hashQuery;
    window.location.replace(`activate.html${query}`);
    return;
  }
  const supportedRoutes = new Set([
    "signin",
    "signup",
    "account",
    "activate",
    "forgot-password",
    "reset-password",
    "verify-email",
    "release",
    "features",
    "install",
    "downloads",
    "top",
  ]);
  if (!supportedRoutes.has(route)) return;
  applyDeviceLoginPage();
  document.querySelectorAll("[data-account-route]").forEach((section) => {
    section.classList.toggle("account-route--active", section.dataset.accountRoute === route);
  });
  const target = document.getElementById(route);
  if (target && route !== "top") target.scrollIntoView({ block: "start" });
}

applyConfigText();
applyDownloads();
applyReleaseNotes();
bindAccountForms();
applyDeviceLoginPage();
initializeAccount().catch((error) => {
  disableAccountForms(friendlyAuthError(error));
});
window.addEventListener("hashchange", applyHashRoute);
applyHashRoute();
