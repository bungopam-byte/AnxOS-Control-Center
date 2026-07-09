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

applyConfigText();
applyDownloads();
