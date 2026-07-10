# AnxOS Account Production Setup

This repository contains the desktop app plus the static website source in `website/`. The AnxOS website may be deployed from a separate repository; copy the `website/` changes there before deploying that site.

The account system uses:

- Supabase Auth for website email/password authentication.
- Supabase Postgres for profiles, device authorization records, registered devices, desktop session metadata, and security events.
- Supabase Row Level Security for user-owned data.
- Supabase Edge Function `anxos-account` for trusted device-code authorization and desktop session token issuance.
- Electron `safeStorage` through `src/services/secureSessionStore.js` for desktop token persistence.

Single-Device Mode, Use This Device, and Local Owner Login remain separate from online AnxOS accounts.

## Required Supabase Project Setup

1. Create a Supabase project.
2. In Auth settings, enable email/password authentication.
3. Enable email confirmation for production.
4. Configure Site URL:
   - `https://anxos-control-center.pages.dev`
5. Configure redirect URLs:
   - `https://anxos-control-center.pages.dev/#verify-email`
   - `https://anxos-control-center.pages.dev/#reset-password`
   - `http://localhost:4173/#verify-email`
   - `http://localhost:4173/#reset-password`
6. Apply migrations:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Migration added:

- `supabase/migrations/202607100001_anxos_accounts.sql`

## Edge Function Deployment

Deploy the account function:

```bash
supabase functions deploy anxos-account
```

Set server-only secrets:

```bash
supabase secrets set \
  ANXOS_WEBSITE_BASE_URL=https://anxos-control-center.pages.dev \
  ANXOS_ALLOWED_ORIGINS=https://anxos-control-center.pages.dev,http://localhost:4173 \
  ANXOS_DESKTOP_TOKEN_SECRET=<32+ random bytes> \
  ANXOS_DEVICE_CODE_SECRET=<different 32+ random bytes>
```

Supabase automatically provides:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Never put `SUPABASE_SERVICE_ROLE_KEY`, desktop token secrets, refresh tokens, or passwords in browser code.

## Website Configuration

Edit `website/account-config.js` in the website deployment repository:

```js
window.ANXOS_ACCOUNT_CONFIG = {
  supabaseUrl: "https://<project-ref>.supabase.co",
  supabaseAnonKey: "<public anon key>",
  accountApiUrl: "https://<project-ref>.functions.supabase.co/anxos-account",
  siteUrl: "https://anxos-control-center.pages.dev",
};
```

Only the Supabase URL and anonymous key are public. The anonymous key is expected to be visible in browser code and is protected by Auth and RLS policies.

For local development:

```bash
python3 -m http.server 4173 --directory website
```

Open `http://localhost:4173`.

## Desktop Configuration

The desktop app reads:

```bash
ANXOS_WEBSITE_BASE_URL=https://anxos-control-center.pages.dev
ANXOS_ACCOUNT_API_URL=https://<project-ref>.functions.supabase.co/anxos-account
```

The desktop never receives website passwords. It starts a device authorization request, opens `#activate?code=...`, polls the Edge Function, then stores the issued desktop access and refresh tokens through `SecureSessionStore`.

## Device Authorization Flow

1. Desktop calls `POST /api/auth/device/start`.
2. Edge Function creates hashed device and user codes with a ten-minute expiration.
3. Website user signs in with Supabase Auth.
4. Website calls `POST /api/auth/device/lookup`.
5. Website displays real requesting device metadata.
6. Website calls approve or deny.
7. Desktop polls `POST /api/auth/device/poll`.
8. Approved requests register a device and issue a desktop access token plus refresh token exactly once.
9. The request is consumed and cannot be replayed.

## API Endpoints

Base URL:

```text
https://<project-ref>.functions.supabase.co/anxos-account
```

Endpoints:

- `POST /api/auth/device/start`
- `POST /api/auth/device/poll`
- `POST /api/auth/device/lookup`
- `POST /api/auth/device/approve`
- `POST /api/auth/device/deny`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/account/devices`
- `POST /api/account/devices/revoke`
- `GET /api/account/sessions`
- `POST /api/account/sessions/revoke-all`
- `GET /api/account/security-events`

Website account endpoints require a Supabase Auth bearer token. Desktop refresh/logout endpoints use AnxOS desktop session tokens issued by the Edge Function.

## Owner Roles

Normal signup always creates `role = 'user'`. Client-controlled metadata cannot grant `owner` or `admin`.

Provision owner/admin roles only through a trusted SQL operation or Supabase dashboard after verifying the account:

```sql
update public.profiles
set role = 'owner'
where id = '<verified-user-id>';
```

Online AnxOS roles do not unlock the local Owner Workspace by themselves. Local Owner Login remains separate.

## Secret Rotation

If a server-only secret is exposed:

1. Rotate it in Supabase immediately.
2. Revoke active desktop sessions:

```sql
update public.account_sessions
set revoked_at = now()
where revoked_at is null;
```

3. Redeploy the Edge Function.
4. Review `security_events`.

If the anon key is exposed, rotate it in Supabase and update `website/account-config.js`.

## Known Limitations

- Supabase Auth does not expose full browser session management to the client in a way that can safely revoke every provider session from this static site. The account dashboard manages AnxOS desktop sessions and registered devices.
- Rate limiting is partly enforced by Supabase Auth and partly by the device polling interval/slow_down behavior. Production should also configure Supabase/Cloudflare rate limits for the Edge Function.
- The separate website repository is not present in this workspace. Copy `website/`, `supabase/`, and this documentation to the deployment source if Cloudflare Pages builds from another repository.
