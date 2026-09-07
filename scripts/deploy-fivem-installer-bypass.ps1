# Deploys the FiveM fixes to the Debian agent node.
# Files: agent/src/routes/instances.js, src/shared/instances/instanceServiceCore.js
# Pattern proven by deploy-palworld-agent-fix.ps1 (b194): agent token decrypted
# in-memory from the local credential store, never printed.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Security

$localState = Get-Content -Raw -LiteralPath (Join-Path $env:LOCALAPPDATA "AnxHub\SessionData\Local State") | ConvertFrom-Json
$wrappedKey = [Convert]::FromBase64String($localState.os_crypt.encrypted_key)
$key = [Security.Cryptography.ProtectedData]::Unprotect(
  $wrappedKey[5..($wrappedKey.Length - 1)],
  $null,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)

$credentialStore = Get-Content -Raw -LiteralPath (Join-Path $env:APPDATA "AnxHub\config\node-agent-credentials.json") | ConvertFrom-Json
$encrypted = [Convert]::FromBase64String($credentialStore.encrypted.data)
$nonce = $encrypted[3..14]
$cipherLength = $encrypted.Length - 31
$cipher = $encrypted[15..(14 + $cipherLength)]
$tag = $encrypted[(15 + $cipherLength)..($encrypted.Length - 1)]
$plain = New-Object byte[] $cipherLength
$aes = [Security.Cryptography.AesGcm]::new($key, 16)
$aes.Decrypt($nonce, $cipher, $tag, $plain)
$credentials = [Text.Encoding]::UTF8.GetString($plain) | ConvertFrom-Json
$token = $credentials.nodes."agent-device-b4c39d2e-efdf-4b3b-864e-721c50f0a7e5".agentToken

if (-not $token) {
  throw "Agent token unavailable."
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}
$baseUri = "http://192.168.1.134:47131"
$endpoint = "$baseUri/api/v1/files/mutate"

$health = Invoke-RestMethod -Uri "$baseUri/api/v1/health" -Headers $headers -Method Get
Write-Output ("Health: ok={0} service={1} uptimeSeconds={2}" -f $health.ok, $health.service, $health.process.uptimeSeconds)

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$files = @(
  @{
    Local = "agent\src\routes\instances.js"
    Remote = "/home/anx/Projects/AnxOS-Control-Center/agent/src/routes/instances.js"
    Tag = "pre-fivem-installer-bypass"
  },
  @{
    Local = "src\shared\instances\instanceServiceCore.js"
    Remote = "/home/anx/Projects/AnxOS-Control-Center/src/shared/instances/instanceServiceCore.js"
    Tag = "pre-fivem-installer-bypass"
  }
)

$results = foreach ($file in $files) {
  $backup = "$($file.Remote).$($file.Tag)-$stamp"
  $statUri = "$baseUri/api/v1/files/stat?path=$([uri]::EscapeDataString($file.Remote))"
  $remoteExists = $true
  try {
    Invoke-RestMethod -Uri $statUri -Headers $headers -Method Get | Out-Null
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
      $remoteExists = $false
    } else {
      throw
    }
  }
  if ($remoteExists) {
    $copyBody = @{
      action = "copy"
      sourcePath = $file.Remote
      destinationPath = $backup
    } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Post -Body $copyBody | Out-Null
  }

  $bytes = [IO.File]::ReadAllBytes((Resolve-Path $file.Local))
  $uploadBody = @{
    action = "upload"
    path = $file.Remote
    content = [Convert]::ToBase64String($bytes)
  } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Post -Body $uploadBody | Out-Null

  $downloadUri = "$baseUri/api/v1/files/download?path=$([uri]::EscapeDataString($file.Remote))"
  $tempFile = Join-Path $env:TEMP ([IO.Path]::GetRandomFileName())
  try {
    Invoke-WebRequest -Uri $downloadUri -Headers @{ Authorization = "Bearer $token" } -OutFile $tempFile | Out-Null
    $localHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Resolve-Path $file.Local)).Hash
    $remoteHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $tempFile).Hash
    [pscustomobject]@{
      Remote = $file.Remote
      Backup = if ($remoteExists) { $backup } else { "New file (no prior copy)" }
      HashMatch = $localHash -eq $remoteHash
      SHA256 = $remoteHash.Substring(0, 16) + "..."
    }
  } finally {
    Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
  }
}

$results | Format-List
