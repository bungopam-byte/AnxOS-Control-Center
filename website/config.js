window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
  logoPath: "assets/anxos-logo.jpg",
  latestVersion: "1.0.48",
  releaseDate: "July 11, 2026",
  releaseTag: "v1.0.48",
  repositoryUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center",
  releaseUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.48",
  downloads: {
    windows: {
      label: "Download for Windows",
      fileName: "AnxOS-Control-Center-Setup-1.0.48.exe",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.48/AnxOS-Control-Center-Setup-1.0.48.exe",
    },
    linuxDeb: {
      label: "Linux .deb",
      fileName: "AnxOS-Control-Center-1.0.48.deb",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.48/AnxOS-Control-Center-1.0.48.deb",
    },
    linuxAppImage: {
      label: "Linux AppImage",
      fileName: "AnxOS-Control-Center-1.0.48.AppImage",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.48/AnxOS-Control-Center-1.0.48.AppImage",
    },
  },
  releaseNotes: [
      {
          "version": "1.0.48",
          "tag": "v1.0.48",
          "date": "July 11, 2026",
          "datetime": "2026-07-11",
          "title": "Secure diagnostics and Agent Control Center",
          "summary": "This release adds privacy-safe runtime diagnostics and complete in-app controls for local and remote AnxOS Agents.",
          "changes": [
              "Added structured, rotated, secret-redacted diagnostics for desktop, renderer, IPC, authentication, services, updater, and Agent failures.",
              "Added latest-error and runtime-state snapshots, a combined live log, sanitized exports, and authenticated owner-only remote diagnostic capture.",
              "Added an Agent Control Center with status, lifecycle, service startup, repair, safe configuration, diagnostics, log viewing, and first-run setup.",
              "Added Linux systemd user and Windows background-startup management through privileged main-process operations instead of terminal instructions.",
              "Improved the Add Storage dialog lifecycle and guarded asynchronous submissions against duplicate requests.",
              "Added regression coverage for redaction, rotation, snapshots, failure-safe logging, remote authorization, and real Agent start/restart/stop behavior."
          ],
          "url": "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.48"
      },
      {
          "version": "1.0.47",
          "tag": "v1.0.47",
          "date": "July 10, 2026",
          "datetime": "2026-07-10",
          "title": "Local Owner authentication recovery",
          "summary": "This release restores existing local Owner credentials and adds visible website password recovery actions.",
          "changes": [
              "Restored packaged-app authentication for persisted Owner accounts created with historical local credentials.",
              "Added safe discovery and migration of Owner accounts from legacy AnxOS configuration directories.",
              "Kept local Owner verification independent from Supabase cloud account authentication.",
              "Added development-only authentication diagnostics that never log passwords, hashes, or tokens.",
              "Added standalone website password recovery pages and visible Reset Password and Change Password actions.",
              "Added regression coverage for credential verification, legacy migration, and session logout account preservation."
          ],
          "url": "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.47"
      },
      {
          "version": "1.0.46",
          "tag": "v1.0.46",
          "date": "July 10, 2026",
          "datetime": "2026-07-10",
          "title": "Explicit device identity and workspace routing",
          "summary": "This release separates the desktop host, Agent nodes, and filesystem providers so Windows can reliably control local and remote machines.",
          "changes": [
              "Added stable Agent identities with duplicate-node detection and safe legacy configuration migration.",
              "Made the application host a distinct local node instead of deriving This Device from the configured Agent URL.",
              "Routed Dashboard, Monitoring, Docker, Instances, Files, SSH, Backups, Marketplace, and Security through the selected node.",
              "Separated local, Agent-native, and SFTP filesystem providers so only explicit SFTP connections create SFTP sessions.",
              "Added development routing diagnostics and regression coverage for node switching, persistence, migration, and filesystem routing."
          ],
          "url": "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.46"
      },
      {
          "version": "1.0.19",
          "tag": "v1.0.19",
          "date": "July 9, 2026",
          "datetime": "2026-07-09",
          "title": "Marketplace runtime selector and storefront polish",
          "summary": "This release fixes Marketplace modpack runtime selection and aligns Marketplace card actions like a proper storefront.",
          "changes": [
              "Added a Server Runtime selector so modpacks no longer default to Paper.",
              "Uses provider loader metadata from CurseForge and Modrinth to preselect Fabric, Forge, NeoForge, Quilt, Paper, Purpur, or Vanilla.",
              "Added Quilt server runtime install support through the official Quilt metadata and installer flow.",
              "Stopped the installer from overwriting the selected runtime during submit.",
              "Aligned Marketplace Install buttons across card rows and clamped long descriptions.",
              "Updated smoke coverage for runtime detection, no Paper preselect, provider loader metadata, and Quilt install handling."
          ],
          "url": "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.19"
      }
  ],
};
