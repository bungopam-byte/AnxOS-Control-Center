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
let latestSecurityEvents = [];
let revokedDevicesExpanded = false;
let accountCleanupBusy = false;
let securityHistoryFilter = "all";
let securityHistoryHideOld = true;
let authRestoreFallbackTimer = null;
let authStateSubscription = null;

const AUTH_RESTORE_TIMEOUT_MS = 5000;

function withTimeout(promise, timeoutMs, code) {
  let timeoutId = null;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      const error = new Error("Account session verification timed out.");
      error.code = code;
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

function readLocalStorageFlag(key) {
  try {
    return window.localStorage?.getItem?.(key) === "1";
  } catch {
    return false;
  }
}

const WEBSITE_DEBUG = new URLSearchParams(window.location.search).has("debug")
  || readLocalStorageFlag("anxos.websiteDebug");

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
    if (config[key]) {
      node.href = config[key];
      node.removeAttribute("aria-disabled");
      node.classList.remove("is-disabled");
      return;
    }
    node.removeAttribute("href");
    node.setAttribute("aria-disabled", "true");
    node.classList.add("is-disabled");
  });
  setText("[data-release-title]", `Version ${config.latestVersion || ""}`.trim());
}

function applyDownloads() {
  const downloads = config.downloads || {};
  let availableDownloads = 0;
  document.querySelectorAll("[data-download]").forEach((node) => {
    const item = downloads[node.dataset.download];
    if (!item?.url) {
      node.removeAttribute("href");
      node.removeAttribute("download");
      node.setAttribute("aria-disabled", "true");
      node.classList.add("is-disabled");
      const label = node.querySelector("span") || node;
      label.textContent = "Unavailable";
      return;
    }
    availableDownloads += 1;
    node.href = item.url;
    node.setAttribute("download", item.fileName);
    node.setAttribute("aria-label", `${item.label}: ${item.fileName}`);
    node.removeAttribute("aria-disabled");
    node.classList.remove("is-disabled");
  });
  document.querySelectorAll("[data-file]").forEach((node) => {
    const item = downloads[node.dataset.file];
    if (!item) {
      node.textContent = "Release metadata unavailable";
      return;
    }
    node.textContent = `${item.fileName} · ${item.size}`;
  });
  document.querySelectorAll("[data-download-status]").forEach((node) => {
    if (availableDownloads > 0) {
      node.textContent = `Release metadata loaded for ${availableDownloads} package${availableDownloads === 1 ? "" : "s"}.`;
      node.dataset.tone = "ok";
    } else {
      node.textContent = "Release metadata is unavailable. Use the GitHub release page or try again later.";
      node.dataset.tone = "warn";
    }
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
  return new URLSearchParams(window.location.search);
}

function routeFromPathname() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const route = pathname.split("/").filter(Boolean)[0] || "top";
  if (route === "index.html") return "top";
  if (route === "forgot-password.html") return "forgot-password";
  if (route === "reset-password.html") return "reset-password";
  if (route === "activate.html") return "activate";
  if (route === "account.html") return "account";
  if (route === "profile.html") return "profile";
  return route;
}

function getCurrentRoute() {
  const standaloneRoute = document.body?.dataset?.standaloneRoute;
  if (standaloneRoute) return standaloneRoute;
  return routeFromPathname();
}

function normalizeReturnTarget(value, fallback = "/account") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  const aliases = {
    account: "/account",
    profile: "/profile",
    activate: "/activate",
    signin: "/signin",
    signup: "/signup",
    "forgot-password": "/forgot-password",
    "reset-password": "/reset-password",
  };
  if (aliases[raw]) return aliases[raw];
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    if (!parsed.pathname.startsWith("/")) return fallback;
    if (parsed.pathname.startsWith("//")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function buildSignInUrl(returnTarget) {
  const params = new URLSearchParams({ returnTo: normalizeReturnTarget(returnTarget) });
  return `/signin?${params.toString()}`;
}

function getReturnTargetFromParams(fallback = "/account") {
  const params = getRouteParams();
  return normalizeReturnTarget(params.get("returnTo") || params.get("return"), fallback);
}

function getAccountSectionTarget() {
  const section = String(getRouteParams().get("section") || "").toLowerCase();
  if (section === "devices") return "account-devices";
  if (section === "security") return "account-security";
  return "";
}

function redirectToSignInForCurrentRoute() {
  const target = `${window.location.pathname}${window.location.search}`;
  window.location.replace(buildSignInUrl(target));
}

function redirectLegacyHashRoutes() {
  const hash = window.location.hash || "";
  const [route, hashQuery = ""] = hash.replace(/^#/, "").split("?");
  const routes = {
    signin: "/signin",
    signup: "/signup",
    account: "/account",
    profile: "/profile",
    "account-devices": "/account?section=devices",
    "account-security": "/account?section=security",
    download: "/download",
    downloads: "/download",
    features: "/features",
    "getting-started": "/getting-started",
    install: "/getting-started",
    changelog: "/release-notes.html",
    release: "/release-notes.html",
    "release-notes": "/release-notes.html",
    top: "/",
  };
  if (!routes[route]) return false;
  const params = new URLSearchParams(window.location.search);
  if (hashQuery) {
    const legacyParams = new URLSearchParams(hashQuery);
    legacyParams.forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  const query = params.toString();
  const separator = routes[route].includes("?") ? "&" : "?";
  window.location.replace(`${routes[route]}${query ? `${separator}${query}` : ""}`);
  return true;
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
  if (!WEBSITE_DEBUG) return;
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
  if (authRestoreFallbackTimer) window.clearTimeout(authRestoreFallbackTimer);
  authRestoreFallbackTimer = window.setTimeout(() => {
    if (authState !== "loading") return;
    currentSession = null;
    currentProfile = null;
    authState = "signed-out";
    setMessage("signin", "Unable to verify your session quickly. You can still sign in.", "warn");
    applyAuthVisibility("initialize-timeout-fallback");
  }, AUTH_RESTORE_TIMEOUT_MS + 1000);
  if (!isAccountConfigured()) {
    disableAccountForms("AnxOS account sign-in is not configured for this deployment. Local desktop mode still works without an online account.");
    return;
  }
  const client = getSupabase();
  if (!client) {
    disableAccountForms("Account scripts could not load. Check your connection and try again.");
    return;
  }
  if (!authStateSubscription) {
    const listener = client.auth.onAuthStateChange((event, session) => {
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
    authStateSubscription = listener?.data?.subscription || listener?.subscription || true;
  }
  try {
    const { data, error } = await withTimeout(client.auth.getSession(), AUTH_RESTORE_TIMEOUT_MS, "AUTH_SESSION_RESTORE_TIMEOUT");
    if (error) throw error;
    currentSession = data.session?.user ? data.session : null;
  } catch (error) {
    currentSession = null;
    authState = "signed-out";
    setMessage("signin", "Unable to verify your session. You can still try signing in.", "warn");
    logWebsiteDiagnostic("warn", "auth-session-restore", error);
    applyAuthVisibility("initialize-error");
    return;
  } finally {
    if (authRestoreFallbackTimer) {
      window.clearTimeout(authRestoreFallbackTimer);
      authRestoreFallbackTimer = null;
    }
  }
  authState = currentSession ? "signed-in" : "signed-out";
  await renderAuthState();
}

function disableAccountForms(message) {
  if (authRestoreFallbackTimer) {
    window.clearTimeout(authRestoreFallbackTimer);
    authRestoreFallbackTimer = null;
  }
  authState = "signed-out";
  document.querySelectorAll("[data-device-login-form]").forEach((form) => setFormDisabled(form, true));
  document.querySelectorAll("[data-account-unavailable]").forEach((node) => {
    node.hidden = false;
  });
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
    latestSecurityEvents = [];
    updateCleanupControls();
    authState = "signed-out";
    applyAuthVisibility("render-signed-out");
    if (["account", "profile"].includes(getCurrentRoute())) redirectToSignInForCurrentRoute();
    return;
  }
  await loadProfile().catch((error) => {
    currentProfile = null;
    setMessage("profile", friendlyAuthError(error), "warn");
    logWebsiteDiagnostic("warn", "profile-load", error);
  });
  authState = "signed-in";
  renderSignedIn();
  if (["signin", "signup"].includes(getCurrentRoute())) {
    window.location.replace("/profile");
    return;
  }
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

function applyAuthNavigation() {
  document.querySelectorAll("[data-auth-nav]").forEach((node) => {
    const show = authState !== "loading" && node.dataset.authNav === authState;
    node.hidden = !show;
    if ("disabled" in node) node.disabled = !show;
    node.setAttribute("aria-hidden", show ? "false" : "true");
  });
}

function applyAuthVisibility(operation = "apply") {
  applyAuthNavigation();
  document.querySelectorAll("[data-account-route]").forEach((section) => {
    let selectedState = authState;
    if (section.dataset.accountRoute === "signin" && authState === "loading") selectedState = "loading";
    if (["account", "profile"].includes(section.dataset.accountRoute) && authState === "loading") selectedState = "loading";
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
      window.location.href = `/activate${code ? `?code=${encodeURIComponent(code)}` : ""}`;
      return;
    }
    window.location.assign(getReturnTargetFromParams("/account"));
  } catch (error) {
    setMessage("signin", friendlyAuthError(error), "error");
  } finally {
    setFormDisabled(form, false);
  }
}

async function handleSignUp(form) {
  if (form.elements.passwordConfirm && form.elements.password.value !== form.elements.passwordConfirm.value) {
    setMessage("signup", "Passwords do not match.", "error");
    return;
  }
  setFormDisabled(form, true);
  setMessage("signup", "Creating account...");
  try {
    const username = form.elements.username.value.trim();
    const displayName = form.elements.displayName.value.trim();
    const { data, error } = await getSupabase().auth.signUp({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
      options: {
        emailRedirectTo: `${accountConfig.siteUrl || window.location.origin}/signin?verified=1`,
        data: { username, display_name: displayName },
      },
    });
    if (error) throw error;
    if (data?.session?.user) {
      currentSession = data.session;
      authState = "signed-in";
      await renderAuthState();
      window.location.assign("/profile");
      return;
    }
    setMessage("signup", "Account created. Check your email to verify your address.", "ok");
    window.location.assign("/signin?created=1");
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
      redirectTo: `${accountConfig.siteUrl || window.location.origin}/reset-password`,
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
    window.location.assign("/account");
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
    latestSecurityEvents = events;
    renderSecurityEvents();
  } catch (error) {
    latestSecurityEvents = [];
    renderListMessage(container, friendlyAuthError(error));
  }
}

function renderSecurityEvents() {
  const container = document.querySelector("[data-account-events]");
  if (!container) return;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = latestSecurityEvents.filter((event) => {
    const category = getSecurityEventCategory(event);
    const old = event.created_at ? Date.parse(event.created_at) < cutoff : false;
    return (securityHistoryFilter === "all" || category === securityHistoryFilter)
      && (!securityHistoryHideOld || !old);
  });
  renderGenericList(container, filtered, (event) => {
    const category = getSecurityEventCategory(event);
    return {
      title: event.event_type || "Security event",
      meta: `${event.outcome || "ok"} · ${formatDate(event.created_at)}`,
      status: category === "error" ? "Error" : titleCase(category),
    };
  });
  if (!filtered.length && latestSecurityEvents.length) {
    container.replaceChildren(createListItem("No matching events", "Adjust the filter or show older audit records."));
  }
}

function getSecurityEventCategory(event) {
  const type = String(event?.event_type || "").toLowerCase();
  const outcome = String(event?.outcome || "").toLowerCase();
  if (outcome.includes("error") || outcome.includes("fail") || outcome.includes("denied")) return "error";
  if (type.includes("cleanup") || type.includes("cleared")) return "cleanup";
  if (type.includes("session") || type.includes("login") || type.includes("logout")) return "session";
  if (type.includes("device")) return "device";
  return "all";
}

function titleCase(value) {
  const text = String(value || "");
  return text ? `${text.slice(0, 1).toUpperCase()}${text.slice(1)}` : "";
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
      const confirmed = await confirmUserAction({
        eyebrow: "Account security",
        title: "Revoke this desktop device?",
        message: "This device will need to sign in again before it can access your AnxOS account.",
        confirmLabel: "Revoke Device",
        confirmTone: "danger",
        fallback: "Revoke this desktop device? It will need to sign in again.",
      });
      if (!confirmed) return;
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
  const copy = getCleanupModalCopy(action, counts);
  return confirmUserAction({
    eyebrow: "Account cleanup",
    title: copy.title,
    message: copy.message,
    confirmLabel: copy.confirmLabel,
    confirmTone: action === "inactive-records" ? "danger" : "primary",
    fallback: "Confirm account cleanup?",
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

function confirmUserAction({
  eyebrow = "Confirm action",
  title = "Confirm action",
  message = "This action needs confirmation.",
  confirmLabel = "Confirm",
  confirmTone = "primary",
  fallback = "Confirm this action?",
} = {}) {
  const modal = document.querySelector("[data-confirm-modal], [data-cleanup-modal]");
  if (!modal) return Promise.resolve(window.confirm(fallback));
  const eyebrowNode = modal.querySelector("[data-confirm-modal-eyebrow]");
  const titleNode = modal.querySelector("[data-confirm-modal-title], [data-cleanup-modal-title]");
  const messageNode = modal.querySelector("[data-confirm-modal-message], [data-cleanup-modal-message]");
  const confirmButton = modal.querySelector("[data-confirm-modal-confirm], [data-cleanup-modal-confirm]");
  const cancelButtons = modal.querySelectorAll("[data-confirm-modal-cancel], [data-cleanup-modal-cancel]");
  const focusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (eyebrowNode) eyebrowNode.textContent = eyebrow;
  if (titleNode) titleNode.textContent = title;
  if (messageNode) messageNode.textContent = message;
  if (confirmButton) {
    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle("button-danger", confirmTone === "danger");
  }
  modal.hidden = false;
  confirmButton?.focus?.();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      modal.hidden = true;
      confirmButton?.removeEventListener("click", onConfirm);
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
    confirmButton?.addEventListener("click", onConfirm);
    cancelButtons.forEach((button) => button.addEventListener("click", onCancel));
    window.addEventListener("keydown", onKeydown);
  });
}

function applyDeviceLoginPage() {
  const params = getRouteParams();
  const code = normalizeDeviceCode(params.get("code")) || currentDeviceCode;
  if (code) setDeviceCode(code);
}

function getSignInUrlForActivation() {
  const code = normalizeDeviceCode(document.querySelector("[data-device-code-input]")?.value || currentDeviceCode);
  const returnTo = `/activate${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  const params = new URLSearchParams({ returnTo });
  return `/signin?${params.toString()}`;
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
      window.location.href = "/signin";
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
  const confirmed = await confirmUserAction(action === "approve" ? {
    eyebrow: "Device activation",
    title: "Approve this desktop app?",
    message: "This allows the requesting AnxOS Control Center desktop app to connect to your account. Approve only devices you recognize.",
    confirmLabel: "Approve Device",
    fallback: "Approve this AnxOS desktop app for your account?",
  } : {
    eyebrow: "Device activation",
    title: "Deny this sign-in request?",
    message: "This denies the current desktop sign-in request. The desktop app will need to start activation again to request a new code.",
    confirmLabel: "Deny Request",
    confirmTone: "danger",
    fallback: "Deny this AnxOS desktop sign-in request?",
  });
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
      window.location.assign("/");
    });
  });
  document.querySelectorAll('[data-auth-action="refresh-devices"]').forEach((button) => {
    button.addEventListener("click", refreshAccountLists);
  });
  document.querySelectorAll('[data-auth-action="revoke-sessions"]').forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = await confirmUserAction({
        eyebrow: "Account security",
        title: "Sign out all desktop sessions?",
        message: "All registered desktop sessions for this account will be revoked. The website session you are using stays active.",
        confirmLabel: "Sign Out Sessions",
        confirmTone: "danger",
        fallback: "Sign out all desktop sessions for this account?",
      });
      if (!confirmed) return;
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
  document.querySelectorAll("[data-security-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      securityHistoryFilter = button.dataset.securityFilter || "all";
      document.querySelectorAll("[data-security-filter]").forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      renderSecurityEvents();
    });
  });
  document.querySelectorAll("[data-security-hide-old]").forEach((input) => {
    input.addEventListener("change", () => {
      securityHistoryHideOld = input.checked;
      renderSecurityEvents();
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

function closeSiteMenu() {
  const nav = document.querySelector("[data-site-nav]");
  const toggle = document.querySelector("[data-site-menu-toggle]");
  nav?.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
}

function bindSiteNavigation() {
  const nav = document.querySelector("[data-site-nav]");
  const toggle = document.querySelector("[data-site-menu-toggle]");
  if (!nav || !toggle) return;
  toggle.addEventListener("click", () => {
    const nextOpen = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", nextOpen);
    toggle.setAttribute("aria-expanded", String(nextOpen));
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeSiteMenu();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSiteMenu();
  });
}

async function applyRouteState() {
  if (redirectLegacyHashRoutes()) return;
  const route = getCurrentRoute();
  const activeRoute = route;
  if (profileDirty && lastAppliedRoute === "profile" && activeRoute !== "profile") {
    const leave = await confirmUserAction({
      eyebrow: "Unsaved profile changes",
      title: "Leave without saving?",
      message: "Your profile edits have not been saved. Stay on this page to keep editing, or leave and discard the changes.",
      confirmLabel: "Leave Page",
      confirmTone: "danger",
      fallback: "You have unsaved profile changes. Leave without saving?",
    });
    if (!leave) {
      window.location.assign("/profile");
      return;
    }
    setProfileDirty(false);
  }
  if (activeRoute === "profile" && authState === "signed-out") {
    redirectToSignInForCurrentRoute();
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
    "release-notes",
    "features",
    "getting-started",
    "download",
    "top",
    "not-found",
  ]);
  if (!supportedRoutes.has(activeRoute)) {
    return;
  }
  applyDeviceLoginPage();
  document.querySelectorAll("[data-account-route]").forEach((section) => {
    section.classList.toggle("account-route--active", section.dataset.accountRoute === activeRoute);
  });
  const accountSectionTarget = activeRoute === "account" ? getAccountSectionTarget() : "";
  const target = document.getElementById(accountSectionTarget || route);
  if (target && activeRoute !== "top") target.scrollIntoView({ block: "start" });
  applyAuthVisibility("route-change");
  lastAppliedRoute = activeRoute;
}

redirectToCanonicalSiteOrigin();
applyConfigText();
applyDownloads();
applyReleaseNotes();
bindSiteNavigation();
bindAccountForms();
applyDeviceLoginPage();
initializeAccount().catch((error) => {
  disableAccountForms(friendlyAuthError(error));
});
window.addEventListener("beforeunload", (event) => {
  if (!profileDirty) return;
  event.preventDefault();
  event.returnValue = "";
});
applyRouteState().catch((error) => logWebsiteDiagnostic("error", "initial-route", error));

function logWebsiteDiagnostic(severity, operation, error) {
  const message = redactSecret(error?.message || String(error || "Website account error"));
  console[severity === "error" ? "error" : "warn"]("[AnxOS][Website]", { timestamp: new Date().toISOString(), severity, source: "website-account", process: "browser", operation, message, errorCode: error?.code || null });
}
window.addEventListener("error", (event) => logWebsiteDiagnostic("error", "window-error", event.error || new Error(event.message)));
window.addEventListener("unhandledrejection", (event) => logWebsiteDiagnostic("error", "unhandled-rejection", event.reason));
