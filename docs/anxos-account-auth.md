# AnxOS Account Auth Setup

AnxOS desktop account sign-in is optional. Single-Device Mode and Local Owner Login continue to work without an account or internet connection.

## Desktop Environment

Set these only when an auth backend is deployed:

```bash
ANXOS_WEBSITE_BASE_URL=https://anxoscontrolcenter.org
ANXOS_ACCOUNT_API_URL=https://your-anxos-auth-api.example
ANXOS_SUPABASE_URL=https://your-project-ref.supabase.co
ANXOS_SUPABASE_ANON_KEY=your-public-anon-key
```

Local development may use `http://localhost` or `http://127.0.0.1`. Non-local URLs must use HTTPS.

By default, the desktop app only opens approved AnxOS auth hosts. During local development only, set:

```bash
ANXOS_ACCOUNT_ALLOW_UNTRUSTED_HOSTS=1
```

## Required Backend Endpoints

The desktop app expects these JSON endpoints:

```text
POST /api/auth/device/start
POST /api/auth/device/poll
POST /api/auth/refresh
POST /api/auth/logout
```

The website approval flow should provide:

```text
POST /api/auth/device/approve
POST /api/auth/device/deny
```

## Desktop Supabase Owner Login

The desktop app can also sign in directly with Supabase email/password from Settings -> Security -> AnxOS Account. This uses Supabase Auth with the public anon key and stores only the returned session through the existing secure session store. The desktop app never stores or logs the account password.

Owner access is not granted by the renderer or by Supabase signup metadata. The main process resolves owner access from a trusted local allowlist:

```bash
ANXOS_OWNER_ACCOUNT_IDS=comma-separated-supabase-user-uuids
ANXOS_OWNER_EMAILS=comma-separated-owner-emails
```

For a local bootstrap without editing `.env`, run:

```bash
node scripts/bootstrap-owner-account.js --email owner@example.com
# or, preferably:
node scripts/bootstrap-owner-account.js --id <supabase-user-uuid>
```

The bootstrap file is stored in the desktop app config directory as `owner-accounts.json`. On Windows, the current desktop profile is `%APPDATA%\AnxHub\config\owner-accounts.json`. To target a specific app profile, pass `--config-dir`:

```bash
node scripts/bootstrap-owner-account.js --email owner@example.com --config-dir "C:\Users\You\AppData\Roaming\AnxHub\config"
```

It stores only owner UUIDs/emails, not passwords, tokens, service-role keys, or agent tokens. Restart AnxOS after changing the owner allowlist.

## Device Start Response

`POST /api/auth/device/start`

Request:

```json
{
  "app": "AnxOS-Control-Center",
  "appVersion": "1.0.28",
  "deviceName": "Gaming-PC",
  "platform": "win32",
  "arch": "x64",
  "requestedAt": "2026-07-10T00:00:00.000Z"
}
```

Response:

```json
{
  "deviceCode": "secret-long-random-value",
  "userCode": "ABCD1234",
  "verificationUrl": "https://anxoscontrolcenter.org/activate/?code=ABCD1234",
  "expiresIn": 600,
  "pollInterval": 3
}
```

## Device Poll Response

`POST /api/auth/device/poll`

Pending:

```json
{ "state": "pending", "pollInterval": 3 }
```

Denied:

```json
{ "state": "denied" }
```

Expired:

```json
{ "state": "expired" }
```

Approved:

```json
{
  "state": "approved",
  "accessToken": "short-lived-access-token",
  "refreshToken": "rotating-refresh-token",
  "expiresIn": 3600,
  "provider": "Supabase",
  "account": {
    "id": "account-id",
    "username": "Anx",
    "email": "user@example.com",
    "displayName": "Anx"
  }
}
```

Tokens are returned exactly once. After approval is consumed, the device authorization record must be deleted or marked unusable.

## Supabase Recommendation

Use Supabase Auth for website sign-in/sign-up. Do not store passwords in this repo.

Recommended backend flow:

1. Website signs users in with Supabase Auth.
2. `POST /api/auth/device/approve` verifies the Supabase session cookie/JWT.
3. Backend approves the short-lived device authorization record.
4. Desktop polls `POST /api/auth/device/poll`.
5. Backend returns a short-lived access token plus refresh token exactly once.
6. Desktop stores tokens with Electron `safeStorage`.
7. `POST /api/auth/refresh` rotates refresh tokens.
8. `POST /api/auth/logout` revokes the current desktop session.

## Security Notes

- Hash device codes in backend storage with `ANXOS_DEVICE_CODE_SECRET`.
- Expire device requests quickly, typically 10 minutes.
- Rate-limit device start, poll, approve, deny, refresh, and logout endpoints.
- Do not reveal whether an email account exists.
- Use CSRF protection for browser approval actions.
- Never log access tokens, refresh tokens, device codes, passwords, or authorization headers.
- Use HTTPS outside local development.
- Keep deep links optional; device-code polling is the reliable fallback.

## Included Backend Helper

`backend/auth/deviceAuthorizationHandlers.js` provides reusable provider-neutral handlers:

- `start(payload)`
- `poll({ deviceCode })`
- `approve({ userCode }, authenticatedUser)`
- `deny({ userCode }, authenticatedUser)`

It does not implement password storage. Pass an authenticated website user from Supabase or another provider into `approve`/`deny`.
