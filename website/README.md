# AnxOS Download Website

Static download page for `AnxOS-Control-Center`.

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
- `assets/anxos-logo.jpg`

For GitHub Pages, publish the `website/` directory as the site root or copy its contents into the configured Pages branch/folder.

## Validation

Run a local static server and open the page in desktop and mobile browser widths. The download buttons should resolve from `config.js`, not hardcoded values in `index.html`.
