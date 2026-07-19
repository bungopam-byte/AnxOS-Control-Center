# Cloudflare Pages deployment

The `Deploy Website to Cloudflare Pages` workflow runs after a successful
tag-triggered `Desktop Release` workflow. It checks out the `dev` branch and
deploys only the `website/` directory.

Configure the repository with:

- Secret `CLOUDFLARE_API_TOKEN`: a scoped Cloudflare API token with Pages
  project deployment permission for the target account.
- Secret `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID that owns the Pages
  project.
- Repository variable `CLOUDFLARE_PAGES_PROJECT`: the exact Pages project name
  serving `anxoscontrolcenter.org`.

The workflow fails closed when any value is missing. It does not print token
values. The Pages project must have `website/` as its deployed output and the
production custom domain configured in Cloudflare. After deployment, verify
`/config.js`, the download page, and `/api/download/latest/windows` against the
tagged release assets.
