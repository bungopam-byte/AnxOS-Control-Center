# AnxOS Download Website

Static download page for `AnxOS-Control-Center`.

The page also contains the optional AnxOS account entry points:

- `#signin`
- `#signup`
- `forgot-password.html`
- `reset-password.html`
- `#verify-email`
- `#account`
- `activate.html`

Account features require Supabase configuration in `account-config.js`. Without that public config, the page disables account forms and shows a setup error instead of pretending authentication works.

## Release Data

All public release data is generated into `config.js`:

- latest version
- release date
- GitHub links
- download URLs
- file names
- file sizes

Run this after building release artifacts:

```bash
npm run website:sync
```

The normal `npm run updates:manifest` release step also runs the website sync, so the download site stays aligned with app releases.

## Local Development

From the repository root:

```bash
python3 -m http.server 4173 --directory website
```

Open:

```text
http://localhost:4173
```

The page is static and has no secrets or build step.

## Deployment

Deploy the contents of `website/` to any static host, including GitHub Pages, Nginx, Caddy, or a CDN-backed bucket.

Required files:

- `index.html`
- `styles.css`
- `site.js`
- `config.js`
- `account-config.js`
- `assets/anxos-logo.jpg`

For GitHub Pages, publish the `website/` directory as the site root or copy its contents into the configured Pages branch/folder.

For Cloudflare Pages, deploy the contents of `website/` as the output directory and configure Supabase Auth redirect URLs to the deployed domain.

## Account Configuration

`account-config.js` may contain only public browser-safe values:

```js
window.ANXOS_ACCOUNT_CONFIG = {
  supabaseUrl: "https://<project-ref>.supabase.co",
  supabaseAnonKey: "<public anon key>",
  accountApiUrl: "https://<project-ref>.functions.supabase.co/anxos-account",
  siteUrl: "https://anxos-control-center.pages.dev",
};
```

Never put service-role keys, refresh tokens, desktop token secrets, passwords, or database credentials in this file.

See `../docs/anxos-account-production.md` for migrations, Edge Function deployment, CORS, and desktop integration.

## Validation

Run a local static server and open the page in desktop and mobile browser widths. The download buttons should resolve from `config.js`, not hardcoded values in `index.html`.
