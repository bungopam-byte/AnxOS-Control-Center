# Windows Code Signing

AnxOS supports Windows Authenticode signing through Electron Builder's Azure Trusted Signing integration. The publisher name is supplied by environment or GitHub Secret configuration.

Signing is not faked. If Anx does not have a trusted code-signing certificate configured yet, Windows will still show `Unknown Publisher`.

## Signed Release Build Flow

Tagged GitHub Actions releases build Windows artifacts with:

```bash
npm run dist:win
```

When all Azure Trusted Signing values below are present, Electron Builder signs:

- `dist/win-unpacked/AnxOS Control Center.exe`
- `dist/AnxOS-Control-Center-Setup-<version>-build<build>.exe`
- the NSIS uninstaller embedded in the setup package

The signed installer should show the publisher configured in `AZURE_TRUSTED_SIGNING_PUBLISHER_NAME`:

```text
Verified Publisher: Anx
```

The Azure identity must be authorized for the Trusted Signing account and certificate profile. Do not disable Windows Defender, SmartScreen, Smart App Control, or any Windows security feature to work around trust prompts.

## Required GitHub Secrets

Set these repository secrets for signed Windows release builds (the same names are used for local builds):

```text
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
AZURE_TRUSTED_SIGNING_ENDPOINT
AZURE_TRUSTED_SIGNING_ACCOUNT_NAME
AZURE_TRUSTED_SIGNING_CERTIFICATE_PROFILE_NAME
AZURE_TRUSTED_SIGNING_PUBLISHER_NAME
```

The endpoint must match the Trusted Signing account region. The publisher name must match the certificate profile publisher. Electron Builder installs its required `TrustedSigning` PowerShell module on the Windows build host.

Never commit `.pfx`, `.p12`, `.cer`, `.key`, `.pem`, `.pvk`, or signing passwords. The repo `.gitignore` blocks common signing file extensions, but secrets must still be handled carefully.

## Unsigned Local Dev Build Flow

Local development builds work without signing secrets:

```bash
npm run dist:win:installer
```

If none of the Azure variables are configured, Electron Builder produces an unsigned installer. That is dev-only. Windows may show:

```text
Unknown Publisher
```

Do not distribute unsigned builds as trusted Anx releases.

If only some Azure variables are configured, the build fails before Electron Builder starts and lists the missing variables. This prevents an accidentally unsigned release caused by incomplete credentials.

## Verify Signatures

On Windows, verify the setup installer:

```powershell
signtool verify /pa "dist\AnxOS-Control-Center-Setup-<version>-build<build>.exe"
```

Verify the unpacked Electron app executable:

```powershell
signtool verify /pa "dist\win-unpacked\AnxOS Control Center.exe"
```

Inspect signer details:

```powershell
Get-AuthenticodeSignature "dist\AnxOS-Control-Center-Setup-<version>-build<build>.exe" | Format-List
```

Expected signed release result:

```text
Status: Valid
SignerCertificate.Subject: CN=<configured publisher>, ...
```

If the status is not valid, or the signer does not match the configured publisher, treat the artifact as unsigned or incorrectly signed.
