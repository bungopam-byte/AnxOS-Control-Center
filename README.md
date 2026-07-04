# AnxOS Control Center

AnxOS Control Center is a private, lightweight local desktop dashboard for a homelab server. It uses Electron to open the existing static HTML/CSS/JS interface in a desktop window and reads local system metrics through a narrow Electron IPC service.

This project intentionally does not include secrets, tokens, API keys, credentials, or backend service controls.

## Files

```text
AnxHub/
├── README.md
├── app.js
├── anxhub.desktop
├── index.html
├── main.js
├── package.json
├── package-lock.json
├── preload.js
├── src
│   ├── api
│   ├── amp
│   ├── assets
│   ├── backups
│   ├── components
│   ├── docker
│   ├── ipc
│   │   └── systemIpc.js
│   ├── minecraft
│   ├── pages
│   ├── playit
│   ├── services
│   │   └── systemService.js
│   ├── ssh
│   ├── system
│   └── utils
├── start-anxhub.sh
└── styles.css
```

## Current Dashboard Features

The dashboard refreshes once per second and displays:

- Current time
- Hostname
- OS version
- CPU usage
- RAM usage
- Disk usage
- Network upload/download rate
- System uptime
- CPU temperature when the OS exposes it

Missing platform data is shown as unavailable instead of using fake values.

## AMP API Integration

AnxOS Control Center can connect to a local AMP API using `@cubecoders/ampapi`. Credentials are loaded from `.env` with `dotenv`; `.env` is ignored by git and must not be committed.

Create your local environment file:

```bash
cd /home/anx/Projects/AnxHub
cp .env.example .env
```

Edit `.env` with your local AMP details:

```text
AMP_URL=http://192.168.1.134:8080
AMP_USERNAME=your_amp_username
AMP_PASSWORD=your_amp_password
```

The dashboard reports AMP connection status, instances, server state, player count, TPS, CPU usage, and RAM usage when those values are exposed by the AMP API. Missing or unavailable AMP data is shown as unavailable without crashing the app.

## Architecture

- `main.js` creates the Electron desktop window and blocks in-app navigation to external URLs.
- `preload.js` exposes a small `window.anxhub` API to the browser context.
- `src/ipc/systemIpc.js` registers the system metrics IPC route.
- `src/ipc/ampIpc.js` registers the AMP IPC route.
- `src/services/systemService.js` reads local OS metrics with Node APIs and platform commands.
- `src/services/ampService.js` authenticates with AMP and normalizes available instance metrics.
- Empty domain folders under `src/` reserve clean module boundaries for Minecraft, AMP, playit.gg, SSH, Docker, backups, pages, and shared UI as those integrations are implemented.

The renderer still uses plain HTML/CSS/JavaScript. Node integration remains disabled in the browser window.

## Run as a Desktop App

Install dependencies once:

```bash
cd /home/anx/Projects/AnxHub
npm install
```

Start AnxOS Control Center:

```bash
npm start
```

This opens AnxOS Control Center as a local desktop window. The app loads `index.html` from disk and does not start a public web server.

## Add to the Debian App Launcher

After `npm install`, copy or symlink the desktop entry into your local applications folder:

```bash
mkdir -p ~/.local/share/applications
cp /home/anx/Projects/AnxHub/anxhub.desktop ~/.local/share/applications/
chmod +x /home/anx/Projects/AnxHub/start-anxhub.sh
```

Then look for `AnxOS Control Center` in your desktop app launcher. You can also double-click `anxhub.desktop` from a file manager if your desktop environment allows trusted launchers.

## Run as a Static Web Page

From the project directory:

```bash
cd /home/anx/Projects/AnxHub
python3 -m http.server 8088
```

Open:

```text
http://127.0.0.1:8088
```

From another device on the same LAN, replace `127.0.0.1` with the Debian server IP address:

```text
http://192.168.1.134:8088
```

## Static Hosting on Debian

Because AnxOS Control Center is static, it can be served by any local web server, including Apache, nginx, Caddy, or Python's built-in server.

For a simple local-only setup, keep it bound to your LAN or localhost. Do not expose it publicly until you add proper hardening such as HTTPS, authentication, firewall rules, and reverse proxy access controls.

## Quick Links Included

- AMP panel: `http://192.168.1.134:8080`
- Minecraft address: `coolpals.playit.fan`

## Notes

- Status cards are manual/static placeholders.
- The CoolPals Bot card is reserved for future service health or controls.
- No existing bot code is required or modified.
