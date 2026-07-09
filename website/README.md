# AnxOS Download Website

Static download page for `AnxOS-Control-Center`.

## Edit Release Data

All public release data is in `config.js`:

- latest version
- release date
- GitHub links
- download URLs
- file names
- file sizes

Update that file whenever a new GitHub release is published.

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
