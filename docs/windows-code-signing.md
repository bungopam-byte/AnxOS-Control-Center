# Windows Code Signing

AnxHub supports proper Windows Authenticode signing through electron-builder. The publisher/company name is `Anx`.

Signing is not faked. If Anx does not have a trusted code-signing certificate configured yet, Windows will still show `Unknown Publisher`.

## Signed Release Build Flow

Tagged GitHub Actions releases build Windows artifacts with:

```bash
npm run dist:win
```

When the repository secrets below are present, electron-builder signs:

- `dist/win-unpacked/AnxOS Control Center.exe`
- `dist/AnxOS-Control-Center-Setup-<version>.exe`
- the NSIS uninstaller embedded in the setup package

The signed installer should show:

```text
Verified Publisher: Anx
```

This requires a real trusted code-signing certificate issued to `Anx`, or Microsoft Trusted Signing configured through an electron-builder-compatible signing path. Do not disable Windows Defender, SmartScreen, Smart App Control, or any Windows security feature to work around trust prompts.

## Required GitHub Secrets

Set these repository secrets for signed Windows release builds:

```text
CSC_LINK
CSC_KEY_PASSWORD
```

The workflow also passes electron-builder's Windows-specific aliases if you prefer those names:

```text
WIN_CSC_LINK
WIN_CSC_KEY_PASSWORD
```

`CSC_LINK` can be an electron-builder-supported certificate reference, commonly one of:

- a base64-encoded `.pfx` certificate
- a secure HTTPS URL to a `.pfx` certificate
- a path available to the build runner

`CSC_KEY_PASSWORD` or `WIN_CSC_KEY_PASSWORD` is the password for that certificate.

Never commit `.pfx`, `.p12`, `.cer`, `.key`, `.pem`, `.pvk`, or signing passwords. The repo `.gitignore` blocks common signing file extensions, but secrets must still be handled carefully.

## Unsigned Local Dev Build Flow

Local development builds work without signing secrets:

```bash
npm run dist:win:installer
```

If no certificate is available, electron-builder produces an unsigned installer. That is dev-only. Windows may show:

```text
Unknown Publisher
```

Do not distribute unsigned builds as trusted Anx releases.

## Verify Signatures

On Windows, verify the setup installer:

```powershell
signtool verify /pa "dist\AnxOS-Control-Center-Setup-<version>.exe"
```

Verify the unpacked Electron app executable:

```powershell
signtool verify /pa "dist\win-unpacked\AnxOS Control Center.exe"
```

Inspect signer details:

```powershell
Get-AuthenticodeSignature "dist\AnxOS-Control-Center-Setup-<version>.exe" | Format-List
```

Expected signed release result:

```text
Status: Valid
SignerCertificate.Subject: CN=Anx, ...
```

If the status is not valid, or the signer is not `Anx`, treat the artifact as unsigned or incorrectly signed.
