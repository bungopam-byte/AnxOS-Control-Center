const config = window.ANXOS_DOWNLOAD_CONFIG || {};
const accountConfig = window.ANXOS_ACCOUNT_CONFIG || {};

let supabaseClient = null;
let currentSession = null;
let currentProfile = null;
let currentDeviceCode = "";
let currentDeviceRequest = null;
let authState = "loading";
let profileDirty = false;
let lastProfileSnapshot = "";
let lastAppliedRoute = "";
let latestAccountDevices = [];
let latestAccountSessions = [];
let revokedDevicesExpanded = false;
let accountCleanupBusy = false;

function redirectToCanonicalSiteOrigin() {
  const configuredOrigin = String(accountConfig.siteUrl || "").replace(/\/+$/, "");
  if (!configuredOrigin) return;
  let target;
  try {
    target = new URL(configuredOrigin);
  } catch {
    return;
  }
  if (window.location.origin === target.origin) return;
  const pagesPreviewHost = `.${target.hostname}`;
  if (!window.location.hostname.endsWith(pagesPreviewHost)) return;
  const next = new URL(window.location.href);
  next.protocol = target.protocol;
  next.host = target.host;
  window.location.replace(next.toString());
}

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

function getCurrentRoute() {
  const hash = window.location.hash || "";
  return hash.replace(/^#/, "").split("?")[0] || document.body?.dataset?.standaloneRoute || "top";
}

function getInitials(value) {
  const text = String(value || "AnxOS Account").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : text.slice(0, 2)).toUpperCase();
}

function maskIdentifier(value) {
  const text = String(value || "");
  if (text.length <= 12) return text || "Unavailable";
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function getProfileValue(key, fallback = "") {
  return currentProfile && currentProfile[key] !== null && currentProfile[key] !== undefined ? currentProfile[key] : fallback;
}

function getProfileFormData(form) {
  return {
    username: form.elements.username.value.trim(),
    display_name: form.elements.displayName.value.trim(),
    avatar_url: form.elements.avatarUrl.value.trim() || null,
    bio: form.elements.bio.value.trim() || null,
    time_zone: form.elements.timeZone.value.trim() || null,
    preferred_platform: form.elements.preferredPlatform.value || null,
    website_url: form.elements.websiteUrl.value.trim() || null,
    github_url: form.elements.githubUrl.value.trim() || null,
  };
}

function profileSnapshotFromForm(form) {
  return JSON.stringify(getProfileFormData(form));
}

function validateProfileData(data) {
  if (!/^[A-Za-z0-9_][A-Za-z0-9_-]{2,31}$/.test(data.username || "")) {
    return "Use 3-32 letters, numbers, underscores, or dashes. Usernames must start with a letter, number, or underscore.";
  }
  if (!data.display_name || data.display_name.length > 80) {
    return "Display name is required and must be 80 characters or fewer.";
  }
  for (const [key, label] of [["avatar_url", "Avatar URL"], ["website_url", "Website"], ["github_url", "GitHub"]]) {
    if (!data[key]) continue;
    try {
      const parsed = new URL(data[key]);
      if (!["http:", "https:"].includes(parsed.protocol)) return `${label} must be an HTTP or HTTPS URL.`;
    } catch {
      return `${label} must be a valid URL.`;
    }
  }
  return "";
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

function logAuthVisibility(operation, context = {}) {
  const snapshot = {
    authState,
    hasSession: Boolean(currentSession?.user),
    route: getCurrentRoute(),
    ...context,
  };
  console.info("[AnxOS][WebsiteAuth]", {
    timestamp: new Date().toISOString(),
    severity: "info",
    source: "website-auth",
    operation,
    context: snapshot,
  });
}

function setFormDisabled(form, disabled) {
  form.querySelectorAll("button, input, select, textarea").forEach((node) => {
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
  authState = "loading";
  applyAuthVisibility("initialize-start");
  if (!isAccountConfigured()) {
    disableAccountForms("AnxOS account sign-in is not configured for this deployment. Local desktop mode still works without an online account.");
    return;
  }
  const client = getSupabase();
  if (!client) {
    disableAccountForms("Account scripts could not load. Check your connection and try again.");
    return;
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentSession = data.session?.user ? data.session : null;
  } catch (error) {
    currentSession = null;
    authState = "signed-out";
    setMessage("signin", "Unable to verify your session. You can still try signing in.", "warn");
    logWebsiteDiagnostic("warn", "auth-session-restore", error);
    applyAuthVisibility("initialize-error");
    return;
  }
  client.auth.onAuthStateChange((event, session) => {
    currentSession = session?.user ? session : null;
    authState = currentSession ? "signed-in" : "signed-out";
    logAuthVisibility("auth-state-change", { event });
    renderAuthState().catch((error) => {
      logWebsiteDiagnostic("error", "auth-state-render", error);
      currentSession = null;
      authState = "signed-out";
      setMessage("signin", "Unable to verify your session. You can still try signing in.", "warn");
      applyAuthVisibility("auth-state-render-error");
    });
  });
  authState = currentSession ? "signed-in" : "signed-out";
  await renderAuthState();
}

function disableAccountForms(message) {
  authState = "signed-out";
  document.querySelectorAll("[data-device-login-form]").forEach((form) => setFormDisabled(form, true));
  document.querySelectorAll("[data-auth-message], [data-device-login-message]").forEach((node) => {
    node.textContent = message;
    node.dataset.tone = "warn";
  });
  applyAuthVisibility("account-disabled");
}

async function renderAuthState() {
  if (!currentSession) {
    currentProfile = null;
    latestAccountDevices = [];
    latestAccountSessions = [];
    updateCleanupControls();
    authState = "signed-out";
    applyAuthVisibility("render-signed-out");
    if (getCurrentRoute() === "profile") window.location.hash = "signin?return=profile";
    return;
  }
  await loadProfile().catch((error) => {
    currentProfile = null;
    setMessage("profile", friendlyAuthError(error), "warn");
    logWebsiteDiagnostic("warn", "profile-load", error);
  });
  authState = "signed-in";
  renderSignedIn();
  await Promise.allSettled([loadDevices(), loadSessions(), loadSecurityEvents()]);
}

function setScopedAuthView(container, selectedState) {
  const views = Array.from(container.querySelectorAll("[data-auth-view]"));
  const fallbackState = views.some((node) => node.dataset.authView === selectedState) ? selectedState : "signed-out";
  views.forEach((node) => {
    const show = node.dataset.authView === fallbackState;
    node.hidden = !show;
  });
}

function applyAuthVisibility(operation = "apply") {
  document.querySelectorAll("[data-account-route]").forEach((section) => {
    let selectedState = authState;
    if (section.dataset.accountRoute === "signin" && authState === "loading") selectedState = "signed-out";
    if (section.dataset.accountRoute === "profile" && authState === "signed-out") selectedState = "signed-out";
    setScopedAuthView(section, selectedState);
  });
  logAuthVisibility(operation, {
    selectedState: authState,
    signinDisplays: Array.from(document.querySelectorAll("#signin [data-auth-view]")).map((node) => ({
      state: node.dataset.authView,
      hidden: node.hidden,
      display: window.getComputedStyle ? window.getComputedStyle(node).display : "",
    })),
  });
}

function renderSignedIn() {
  applyAuthVisibility("render-signed-in");
  setText("[data-account-display-name]", currentProfile?.display_name || currentProfile?.username || currentSession?.user?.email || "AnxOS Account");
  setText("[data-account-email]", currentSession?.user?.email || "");
  renderProfileViews();
}

async function loadProfile() {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id,username,display_name,avatar_url,role,bio,time_zone,preferred_platform,website_url,github_url,created_at,updated_at")
    .eq("id", currentSession.user.id)
    .maybeSingle();
  if (error) throw error;
  currentProfile = data || null;
}

function setAvatarNode(node, imageUrl, fallbackText) {
  node.replaceChildren();
  const fallback = getInitials(fallbackText);
  node.textContent = fallback;
  node.classList.remove("has-image");
  if (!imageUrl) return;
  const image = document.createElement("img");
  image.alt = "";
  image.src = imageUrl;
  image.addEventListener("load", () => {
    node.textContent = "";
    node.append(image);
    node.classList.add("has-image");
  }, { once: true });
  image.addEventListener("error", () => {
    node.textContent = fallback;
    node.classList.remove("has-image");
    setMessage("avatar", "Avatar image could not be loaded. Check the URL or remove it.", "warn");
  }, { once: true });
}

function calculateProfileCompletion(profile) {
  const fields = ["username", "display_name", "avatar_url", "bio", "time_zone", "preferred_platform", "website_url", "github_url"];
  const complete = fields.filter((field) => Boolean(profile?.[field])).length;
  return Math.round((complete / fields.length) * 100);
}

function renderProfileViews() {
  const displayName = currentProfile?.display_name || currentProfile?.username || currentSession?.user?.email || "AnxOS Account";
  const username = currentProfile?.username || "account";
  const avatarUrl = currentProfile?.avatar_url || "";
  setText("[data-profile-display-name]", displayName);
  setText("[data-profile-username]", `@${username}`);
  setText("[data-profile-role]", currentProfile?.role || "Account");
  setText("[data-profile-member-since]", currentProfile?.created_at ? `Member since ${formatDate(currentProfile.created_at)}` : "Member since unavailable");
  setText("[data-profile-completion]", `${calculateProfileCompletion(currentProfile)}%`);
  setText("[data-profile-summary-name]", displayName);
  setText("[data-profile-summary-meta]", `@${username} · ${currentProfile?.role || "user"} · ${calculateProfileCompletion(currentProfile)}% complete`);
  setText("[data-profile-account-id]", maskIdentifier(currentSession?.user?.id));
  setText("[data-profile-created]", formatDate(currentProfile?.created_at || currentSession?.user?.created_at));
  setText("[data-profile-updated]", formatDate(currentProfile?.updated_at));
  setText("[data-profile-status]", currentSession?.user?.email_confirmed_at ? "Verified" : "Active");
  document.querySelectorAll("[data-profile-avatar], [data-profile-avatar-preview]").forEach((node) => setAvatarNode(node, avatarUrl, displayName));
  document.querySelectorAll('[data-auth-form="profile"]').forEach((form) => {
    form.elements.username.value = getProfileValue("username", "");
    form.elements.displayName.value = getProfileValue("display_name", "");
    form.elements.avatarUrl.value = getProfileValue("avatar_url", "");
    form.elements.bio.value = getProfileValue("bio", "");
    form.elements.timeZone.value = getProfileValue("time_zone", "");
    form.elements.preferredPlatform.value = getProfileValue("preferred_platform", "");
    form.elements.websiteUrl.value = getProfileValue("website_url", "");
    form.elements.githubUrl.value = getProfileValue("github_url", "");
    lastProfileSnapshot = profileSnapshotFromForm(form);
    setProfileDirty(false);
  });
}

function setProfileDirty(dirty) {
  profileDirty = Boolean(dirty);
  document.querySelectorAll("[data-profile-save], [data-profile-action=\"cancel\"]").forEach((button) => {
    button.disabled = !profileDirty;
  });
}

function updateProfileDirtyState() {
  const form = document.querySelector('[data-auth-form="profile"]');
  if (!form) return;
  setProfileDirty(profileSnapshotFromForm(form) !== lastProfileSnapshot);
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
    window.location.hash = params.get("return") === "profile" ? "profile" : "account";
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
      redirectTo: `${accountConfig.siteUrl || window.location.origin}/reset-password.html`,
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
  if (form.elements.passwordConfirm && form.elements.password.value !== form.elements.passwordConfirm.value) {
    setMessage("reset", "Passwords do not match.", "error");
    return;
  }
  setFormDisabled(form, true);
  setMessage("reset", "Updating password...");
  try {
    const { error } = await getSupabase().auth.updateUser({ password: form.elements.password.value });
    if (error) throw error;
    setMessage("reset", "Password updated.", "ok");
    window.location.assign("account.html");
  } catch (error) {
    setMessage("reset", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleProfile(form) {
  if (!currentSession?.user) {
    setMessage("profile", "Sign in before editing your profile.", "error");
    return;
  }
  const patch = {
    id: currentSession.user.id,
    ...getProfileFormData(form),
  };
  const validationMessage = validateProfileData(patch);
  if (validationMessage) {
    setMessage("profile", validationMessage, "error");
    return;
  }
  setFormDisabled(form, true);
  form.querySelectorAll("[data-profile-save], [data-profile-action=\"cancel\"]").forEach((button) => { button.disabled = true; });
  setMessage("profile", "Saving...");
  try {
    const { error } = await getSupabase().from("profiles").upsert(patch, { onConflict: "id" });
    if (error) throw error;
    await loadProfile();
    renderSignedIn();
    setMessage("profile", "Profile saved.", "ok");
  } catch (error) {
    setMessage("profile", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
    updateProfileDirtyState();
  }
}

async function loadDevices() {
  const container = document.querySelector("[data-account-devices]");
  if (!container || !currentSession) return;
  renderListLoading(container);
  try {
    const { devices = [] } = await apiFetch("/api/account/devices", { method: "GET" });
    latestAccountDevices = devices;
    renderDeviceList(container, devices);
    renderProfileDeviceList(devices);
    updateCleanupControls();
  } catch (error) {
    latestAccountDevices = [];
    renderListMessage(container, friendlyAuthError(error));
    renderProfileDeviceList([]);
    updateCleanupControls();
  }
}

async function loadSessions() {
  const container = document.querySelector("[data-account-sessions]");
  if (!container || !currentSession) return;
  renderListLoading(container);
  try {
    const { sessions = [] } = await apiFetch("/api/account/sessions", { method: "GET" });
    latestAccountSessions = sessions;
    renderSessionList(container, sessions);
    updateCleanupControls();
  } catch (error) {
    latestAccountSessions = [];
    renderListMessage(container, friendlyAuthError(error));
    updateCleanupControls();
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
    const listItem = createListItem(mapped.title, mapped.meta);
    if (mapped.status) {
      listItem.append(createStatusBadge(mapped.status, mapped.status.toLowerCase()));
    }
    container.append(listItem);
  });
}

function renderDeviceList(container, devices) {
  container.replaceChildren();
  if (!devices.length) {
    container.append(createListItem("No devices", "Approved desktop apps will appear here."));
    return;
  }
  const activeDevices = devices.filter((device) => !device.revoked_at);
  const revokedDevices = devices.filter((device) => device.revoked_at);
  activeDevices.forEach((device) => container.append(createDeviceListItem(device)));
  if (revokedDevices.length) {
    const toggle = document.createElement("button");
    toggle.className = "account-list-toggle";
    toggle.type = "button";
    toggle.textContent = `${revokedDevicesExpanded ? "Hide" : "Show"} revoked devices (${revokedDevices.length})`;
    toggle.setAttribute("aria-expanded", String(revokedDevicesExpanded));
    toggle.addEventListener("click", () => {
      revokedDevicesExpanded = !revokedDevicesExpanded;
      renderDeviceList(container, latestAccountDevices);
    });
    container.append(toggle);
    if (revokedDevicesExpanded) {
      revokedDevices.forEach((device) => container.append(createDeviceListItem(device)));
    }
  }
}

function createDeviceListItem(device) {
  const item = createListItem(
    device.device_name || "Desktop device",
    `${device.platform || "desktop"} · ${device.app_version || "version not reported"} · last active ${formatDate(device.last_seen_at || device.created_at)}`
  );
  item.append(createStatusBadge(device.revoked_at ? "Revoked" : "Active", device.revoked_at ? "revoked" : "active"));
  if (!device.revoked_at) {
    const button = document.createElement("button");
    button.className = "button button-ghost";
    button.type = "button";
    button.textContent = "Revoke";
    button.addEventListener("click", async () => {
      if (!confirm("Revoke this desktop device? It will need to sign in again.")) return;
      await apiFetch("/api/account/devices/revoke", { body: { deviceId: device.id } });
      showToast("Device revoked.", "ok");
      await refreshAccountLists();
    });
    item.append(button);
  }
  return item;
}

function renderSessionList(container, sessions) {
  renderGenericList(container, sessions, (session) => {
    const device = session.registered_devices || {};
    const state = getSessionState(session);
    return {
      title: device.device_name || "Desktop session",
      meta: `${device.platform || "desktop"} · ${formatDate(session.last_seen_at || session.created_at)} · ${state}`,
      status: state,
    };
  });
}

function getSessionState(session) {
  if (session.revoked_at) return "Revoked";
  if (isPast(session.expires_at)) return "Expired";
  return "Active";
}

function isInactiveSession(session) {
  return Boolean(session.revoked_at || isPast(session.expires_at));
}

function isPast(value) {
  return Boolean(value && Date.parse(value) <= Date.now());
}

function createStatusBadge(label, tone = "active") {
  const badge = document.createElement("span");
  badge.className = `account-status-badge account-status-badge--${tone}`;
  badge.textContent = label;
  return badge;
}

function renderProfileDeviceList(devices) {
  const container = document.querySelector("[data-profile-devices]");
  if (!container) return;
  container.replaceChildren();
  if (!devices.length) {
    container.append(createListItem("No connected apps", "Approved desktop installations will appear here."));
    return;
  }
  devices.slice(0, 4).forEach((device, index) => {
    container.append(createListItem(
      `${device.device_name || "Desktop device"}${index === 0 ? " · Current" : ""}`,
      `${device.platform || "desktop"} · ${device.app_version || "version not reported"} · last active ${formatDate(device.last_seen_at || device.created_at)}`
    ));
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

function getCleanupCounts() {
  return {
    revokedDevices: latestAccountDevices.filter((device) => device.revoked_at).length,
    expiredSessions: latestAccountSessions.filter(isInactiveSession).length,
  };
}

function updateCleanupControls() {
  const counts = getCleanupCounts();
  const inactiveTotal = counts.revokedDevices + counts.expiredSessions;
  document.querySelectorAll('[data-auth-action="clear-revoked-devices"]').forEach((button) => {
    button.textContent = `Clear Revoked (${counts.revokedDevices})`;
    button.disabled = accountCleanupBusy || counts.revokedDevices === 0;
  });
  document.querySelectorAll('[data-auth-action="clear-expired-sessions"]').forEach((button) => {
    button.textContent = `Clear Expired (${counts.expiredSessions})`;
    button.disabled = accountCleanupBusy || counts.expiredSessions === 0;
  });
  document.querySelectorAll('[data-auth-action="cleanup-revoked-devices"]').forEach((button) => {
    button.textContent = `Clear revoked devices (${counts.revokedDevices})`;
    button.disabled = accountCleanupBusy || counts.revokedDevices === 0;
  });
  document.querySelectorAll('[data-auth-action="cleanup-expired-sessions"]').forEach((button) => {
    button.textContent = `Clear expired sessions (${counts.expiredSessions})`;
    button.disabled = accountCleanupBusy || counts.expiredSessions === 0;
  });
  document.querySelectorAll('[data-auth-action="cleanup-inactive-records"]').forEach((button) => {
    button.textContent = `Clear all inactive records (${inactiveTotal})`;
    button.disabled = accountCleanupBusy || inactiveTotal === 0;
  });
  document.querySelectorAll('[data-auth-action="clear-local-cache"]').forEach((button) => {
    button.disabled = accountCleanupBusy;
  });
}

async function refreshAccountLists() {
  await Promise.allSettled([loadDevices(), loadSessions(), loadSecurityEvents()]);
}

function setCleanupBusy(busy) {
  accountCleanupBusy = Boolean(busy);
  updateCleanupControls();
}

async function runAccountCleanup(action, endpoint, counts, successLabel) {
  if (accountCleanupBusy) return;
  const confirmed = await confirmCleanup(action, counts);
  if (!confirmed) return;
  setCleanupBusy(true);
  setMessage("cleanup", "Cleaning account records...");
  try {
    const result = await apiFetch(endpoint, { body: {} });
    const deletedDevices = Number(result.deletedDevices || 0);
    const deletedSessions = Number(result.deletedSessions || 0);
    const summary = [
      deletedDevices ? `${deletedDevices} device${deletedDevices === 1 ? "" : "s"}` : null,
      deletedSessions ? `${deletedSessions} session${deletedSessions === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" and ") || "No records";
    setMessage("cleanup", `${summary} removed.`, "ok");
    showToast(`${successLabel}: ${summary} removed.`, "ok");
    revokedDevicesExpanded = false;
    await refreshAccountLists();
  } catch (error) {
    const message = friendlyAuthError(error);
    setMessage("cleanup", message, "error");
    showToast(message, "error");
  } finally {
    setCleanupBusy(false);
  }
}

function confirmCleanup(action, counts) {
  const modal = document.querySelector("[data-cleanup-modal]");
  if (!modal) return Promise.resolve(window.confirm("Confirm account cleanup?"));
  const title = modal.querySelector("[data-cleanup-modal-title]");
  const message = modal.querySelector("[data-cleanup-modal-message]");
  const confirmButton = modal.querySelector("[data-cleanup-modal-confirm]");
  const cancelButtons = modal.querySelectorAll("[data-cleanup-modal-cancel]");
  const focusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const copy = getCleanupModalCopy(action, counts);
  title.textContent = copy.title;
  message.textContent = copy.message;
  confirmButton.textContent = copy.confirmLabel;
  modal.hidden = false;
  confirmButton.focus();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      modal.hidden = true;
      confirmButton.removeEventListener("click", onConfirm);
      cancelButtons.forEach((button) => button.removeEventListener("click", onCancel));
      window.removeEventListener("keydown", onKeydown);
      focusTarget?.focus?.();
      resolve(value);
    };
    const onConfirm = () => finish(true);
    const onCancel = () => finish(false);
    const onKeydown = (event) => {
      if (event.key === "Escape") finish(false);
    };
    confirmButton.addEventListener("click", onConfirm);
    cancelButtons.forEach((button) => button.addEventListener("click", onCancel));
    window.addEventListener("keydown", onKeydown);
  });
}

function getCleanupModalCopy(action, counts) {
  const revoked = Number(counts.revokedDevices || 0);
  const sessions = Number(counts.expiredSessions || 0);
  if (action === "revoked-devices") {
    return {
      title: "Clear revoked devices?",
      message: `This will permanently remove ${revoked} revoked device record${revoked === 1 ? "" : "s"} from your account history. Active devices will not be removed.`,
      confirmLabel: "Confirm Cleanup",
    };
  }
  if (action === "expired-sessions") {
    return {
      title: "Clear expired sessions?",
      message: `This will permanently remove ${sessions} expired or revoked session record${sessions === 1 ? "" : "s"}. Active sessions will not be removed.`,
      confirmLabel: "Confirm Cleanup",
    };
  }
  return {
    title: "Clear all inactive records?",
    message: `This will permanently remove ${revoked} revoked device record${revoked === 1 ? "" : "s"} and ${sessions} expired or revoked session record${sessions === 1 ? "" : "s"}. Active devices and the current signed-in website session will not be removed.`,
    confirmLabel: "Confirm Cleanup",
  };
}

async function clearLocalWebsiteCache() {
  if (accountCleanupBusy) return;
  setCleanupBusy(true);
  try {
    const removedStorage = clearSafeStorageEntries(localStorage) + clearSafeStorageEntries(sessionStorage);
    let removedCaches = 0;
    if (window.caches?.keys) {
      const cacheNames = await window.caches.keys();
      const safeNames = cacheNames.filter((name) => /anxos|anxhub|account-api|website|ui-cache/i.test(name) && !/supabase|auth|session|token/i.test(name));
      await Promise.all(safeNames.map((name) => window.caches.delete(name).then((removed) => { if (removed) removedCaches += 1; })));
    }
    const message = `Cleared ${removedStorage} cached storage entr${removedStorage === 1 ? "y" : "ies"} and ${removedCaches} cache bucket${removedCaches === 1 ? "" : "s"}.`;
    setMessage("cleanup", message, "ok");
    showToast("Local website cache cleared.", "ok");
  } catch (error) {
    const message = friendlyAuthError(error);
    setMessage("cleanup", message, "error");
    showToast(message, "error");
  } finally {
    setCleanupBusy(false);
  }
}

function clearSafeStorageEntries(storage) {
  if (!storage) return 0;
  const safeKeys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || /supabase|sb-|auth|token|session|profile|preferences/i.test(key)) continue;
    if (/anxos|anxhub|account-cache|api-cache|ui-state|temporary|stale/i.test(key)) safeKeys.push(key);
  }
  safeKeys.forEach((key) => storage.removeItem(key));
  return safeKeys.length;
}

function showToast(message, tone = "muted") {
  const region = document.querySelector("[data-toast-region]");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
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
      currentProfile = null;
      authState = "signed-out";
      applyAuthVisibility("signout");
      window.location.hash = "signin";
    });
  });
  document.querySelectorAll('[data-auth-action="refresh-devices"]').forEach((button) => {
    button.addEventListener("click", refreshAccountLists);
  });
  document.querySelectorAll('[data-auth-action="revoke-sessions"]').forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Sign out all desktop sessions for this account?")) return;
      await apiFetch("/api/account/sessions/revoke-all", { body: {} });
      showToast("All desktop sessions were signed out.", "ok");
      await refreshAccountLists();
    });
  });
  document.querySelectorAll('[data-auth-action="clear-revoked-devices"], [data-auth-action="cleanup-revoked-devices"]').forEach((button) => {
    button.addEventListener("click", () => runAccountCleanup("revoked-devices", "/api/account/devices/clear-revoked", getCleanupCounts(), "Revoked devices cleared"));
  });
  document.querySelectorAll('[data-auth-action="clear-expired-sessions"], [data-auth-action="cleanup-expired-sessions"]').forEach((button) => {
    button.addEventListener("click", () => runAccountCleanup("expired-sessions", "/api/account/sessions/clear-expired", getCleanupCounts(), "Expired sessions cleared"));
  });
  document.querySelectorAll('[data-auth-action="cleanup-inactive-records"]').forEach((button) => {
    button.addEventListener("click", () => runAccountCleanup("inactive-records", "/api/account/cleanup-inactive", getCleanupCounts(), "Inactive records cleared"));
  });
  document.querySelectorAll('[data-auth-action="clear-local-cache"]').forEach((button) => {
    button.addEventListener("click", clearLocalWebsiteCache);
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
  document.querySelectorAll('[data-auth-form="profile"]').forEach((form) => {
    form.addEventListener("input", updateProfileDirtyState);
    form.addEventListener("change", updateProfileDirtyState);
  });
  document.querySelectorAll('[data-profile-action="cancel"]').forEach((button) => {
    button.addEventListener("click", () => {
      renderProfileViews();
      setMessage("profile", "Profile edits reset.", "muted");
    });
  });
  document.querySelectorAll('[data-profile-action="remove-avatar"]').forEach((button) => {
    button.addEventListener("click", () => {
      const form = document.querySelector('[data-auth-form="profile"]');
      if (!form) return;
      form.elements.avatarUrl.value = "";
      const preview = document.querySelector("[data-profile-avatar-preview]");
      if (preview) setAvatarNode(preview, "", form.elements.displayName.value || currentSession?.user?.email);
      updateProfileDirtyState();
    });
  });
}

function applyHashRoute() {
  const hash = window.location.hash || "";
  const standaloneRoute = document.body?.dataset?.standaloneRoute || "";
  const route = getCurrentRoute();
  const accountAnchorRoutes = new Set(["account-devices", "account-security"]);
  const activeRoute = accountAnchorRoutes.has(route) ? "account" : route;
  if (profileDirty && lastAppliedRoute === "profile" && activeRoute !== "profile") {
    const leave = confirm("You have unsaved profile changes. Leave without saving?");
    if (!leave) {
      window.location.hash = "profile";
      return;
    }
    setProfileDirty(false);
  }
  if (!standaloneRoute && route === "activate") {
    const hashQuery = hash.includes("?") ? `?${hash.split("?").slice(1).join("?")}` : "";
    const query = window.location.search || hashQuery;
    window.location.replace(`activate.html${query}`);
    return;
  }
  if (activeRoute === "profile" && authState === "signed-out") {
    window.location.hash = "signin?return=profile";
    return;
  }
  const supportedRoutes = new Set([
    "signin",
    "signup",
    "account",
    "profile",
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
  if (!supportedRoutes.has(activeRoute)) return;
  applyDeviceLoginPage();
  document.querySelectorAll("[data-account-route]").forEach((section) => {
    section.classList.toggle("account-route--active", section.dataset.accountRoute === activeRoute);
  });
  const target = document.getElementById(route);
  if (target && activeRoute !== "top") target.scrollIntoView({ block: "start" });
  applyAuthVisibility("route-change");
  lastAppliedRoute = activeRoute;
}

redirectToCanonicalSiteOrigin();
applyConfigText();
applyDownloads();
applyReleaseNotes();
bindAccountForms();
applyDeviceLoginPage();
initializeAccount().catch((error) => {
  disableAccountForms(friendlyAuthError(error));
});
window.addEventListener("hashchange", applyHashRoute);
window.addEventListener("beforeunload", (event) => {
  if (!profileDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
applyHashRoute();

function logWebsiteDiagnostic(severity, operation, error) {
  const message = redactSecret(error?.message || String(error || "Website account error"));
  console[severity === "error" ? "error" : "warn"]("[AnxOS][Website]", { timestamp: new Date().toISOString(), severity, source: "website-account", process: "browser", operation, message, errorCode: error?.code || null });
}
window.addEventListener("error", (event) => logWebsiteDiagnostic("error", "window-error", event.error || new Error(event.message)));
window.addEventListener("unhandledrejection", (event) => logWebsiteDiagnostic("error", "unhandled-rejection", event.reason));
