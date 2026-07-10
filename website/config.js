window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
  logoPath: "assets/anxos-logo.jpg",
  latestVersion: "1.0.46",
  releaseDate: "July 10, 2026",
  releaseTag: "v1.0.46",
  repositoryUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center",
  releaseUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.46",
  downloads: {
    windows: {
      label: "Download for Windows",
      fileName: "AnxOS-Control-Center-Setup-1.0.46.exe",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.46/AnxOS-Control-Center-Setup-1.0.46.exe",
    },
    linuxDeb: {
      label: "Linux .deb",
      fileName: "AnxOS-Control-Center-1.0.46.deb",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.46/AnxOS-Control-Center-1.0.46.deb",
    },
    linuxAppImage: {
      label: "Linux AppImage",
      fileName: "AnxOS-Control-Center-1.0.46.AppImage",
      size: "",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.46/AnxOS-Control-Center-1.0.46.AppImage",
    },
  },
  releaseNotes: [
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
