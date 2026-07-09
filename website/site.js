const config = window.ANXOS_DOWNLOAD_CONFIG || {};

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value || "";
  });
}

function applyConfigText() {
  document.querySelectorAll("[data-logo]").forEach((node) => {
    if (config.logoPath) {
      node.src = config.logoPath;
    }
  });
  document.querySelectorAll("[data-config]").forEach((node) => {
    const key = node.dataset.config;
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      node.textContent = config[key];
    }
  });
  document.querySelectorAll("[data-config-href]").forEach((node) => {
    const key = node.dataset.configHref;
    if (config[key]) {
      node.href = config[key];
    }
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
  if (release.datetime) {
    date.dateTime = release.datetime;
  }

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

applyConfigText();
applyDownloads();
applyReleaseNotes();
