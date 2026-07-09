window.ANXOS_DOWNLOAD_CONFIG = {
  brandName: "AnxOS",
  appName: "AnxOS-Control-Center",
  subtitle: "A desktop control center for Minecraft servers, modpacks, remote nodes, and automation.",
  logoPath: "assets/anxos-logo.jpg",
  latestVersion: "1.0.27",
  releaseDate: "July 9, 2026",
  releaseTag: "v1.0.27",
  repositoryUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center",
  releaseUrl: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.27",
  downloads: {
    windows: {
      label: "Download for Windows",
      fileName: "AnxOS-Control-Center-Setup-1.0.27.exe",
      size: "111 MB",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.27/AnxOS-Control-Center-Setup-1.0.27.exe",
    },
    linuxDeb: {
      label: "Linux .deb",
      fileName: "AnxOS-Control-Center-1.0.27.deb",
      size: "108 MB",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.27/AnxOS-Control-Center-1.0.27.deb",
    },
    linuxAppImage: {
      label: "Linux AppImage",
      fileName: "AnxOS-Control-Center-1.0.27.AppImage",
      size: "138 MB",
      url: "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/download/v1.0.27/AnxOS-Control-Center-1.0.27.AppImage",
    },
  },
  releaseNotes: [
      {
          "version": "1.0.27",
          "tag": "v1.0.27",
          "date": "July 9, 2026",
          "datetime": "2026-07-09",
          "title": "AnxOS v1.0.27",
          "summary": "Latest AnxOS-Control-Center release.",
          "changes": [
              "Updated application build, website metadata, and downloadable release assets."
          ],
          "url": "https://github.com/bungopam-byte/AnxOS-Control-Center/releases/tag/v1.0.27"
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
