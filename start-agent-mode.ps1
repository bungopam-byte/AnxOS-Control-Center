param(
    [string]$AgentUrl = "http://127.0.0.1:47131",
    [switch]$NoStartAgent
)

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentDir = Join-Path $RepoDir "agent"
$ConfigDir = if ($env:ANXHUB_CONFIG_DIR) { $env:ANXHUB_CONFIG_DIR } else { Join-Path $RepoDir "config" }
$ConfigPath = Join-Path $ConfigDir "agent.json"
$WeakAgentTokens = @("test-token", "AnxOS-Token", "anxos-token", "")

function Fail-Anx {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [int]$Code = 1
    )
    Write-Host "AnxOS error: $Message" -ForegroundColor Red
    exit $Code
}

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail-Anx "$Name is required but was not found in PATH."
    }
}

function New-AgentToken {
    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }

    $encoded = [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
    return "anx_$encoded"
}

function Normalize-AgentUrl {
    param([Parameter(Mandatory = $true)][string]$Value)

    try {
        $uri = [Uri]$Value
    } catch {
        Fail-Anx "Invalid AGENT_URL: $Value"
    }

    if (-not $uri.Scheme -or -not $uri.Host) {
        Fail-Anx "Invalid AGENT_URL: $Value"
    }

    if ($uri.Scheme -ne "http" -and $uri.Scheme -ne "https") {
        Fail-Anx "AGENT_URL must use http or https."
    }

    if ($uri.IsDefaultPort -and $uri.Scheme -eq "http") {
        return "http://$($uri.Host):47131"
    }

    return $uri.GetLeftPart([UriPartial]::Authority)
}

function Get-AgentPort {
    param([Parameter(Mandatory = $true)][Uri]$Uri)

    if ($Uri.IsDefaultPort -and $Uri.Scheme -eq "http") {
        return 47131
    }

    return $Uri.Port
}

function Test-LocalAgentHost {
    param([Parameter(Mandatory = $true)][Uri]$Uri)

    $hostName = $Uri.Host.ToLowerInvariant()
    return $hostName -eq "localhost" -or $hostName -eq "127.0.0.1" -or $hostName -eq "::1"
}

function Test-PortOpen {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port,
        [int]$TimeoutMs = 750
    )

    $client = New-Object Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Wait-AgentPort {
    param(
        [Parameter(Mandatory = $true)][string]$HostName,
        [Parameter(Mandatory = $true)][int]$Port
    )

    for ($i = 0; $i -lt 20; $i++) {
        if (Test-PortOpen -HostName $HostName -Port $Port) {
            return $true
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Ensure-AgentConfig {
    New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

    $config = [ordered]@{
        backendMode = "agent"
        agentUrl = $AgentUrl
        agentToken = ""
    }

    if (Test-Path -LiteralPath $ConfigPath) {
        try {
            $existing = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
            if ($existing.backendMode) { $config.backendMode = [string]$existing.backendMode }
            if ($existing.agentUrl) { $config.agentUrl = [string]$existing.agentUrl }
            if ($existing.agentToken) { $config.agentToken = [string]$existing.agentToken }
        } catch {
            Write-Host "Replacing unreadable agent config at $ConfigPath" -ForegroundColor Yellow
        }
    }

    $config.backendMode = "agent"
    $config.agentUrl = $AgentUrl

    if ($WeakAgentTokens -contains $config.agentToken) {
        $config.agentToken = New-AgentToken
    }

    $config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $ConfigPath -Encoding UTF8
}

function Start-LocalAgentIfNeeded {
    param(
        [Parameter(Mandatory = $true)][Uri]$Uri,
        [Parameter(Mandatory = $true)][int]$Port
    )

    if ($NoStartAgent -or -not (Test-LocalAgentHost -Uri $Uri)) {
        return
    }

    if (Test-PortOpen -HostName $Uri.Host -Port $Port) {
        Write-Host "Agent already appears to be listening on $AgentUrl"
        return
    }

    if (-not (Test-Path -LiteralPath (Join-Path $AgentDir "package.json"))) {
        Fail-Anx "Agent package.json was not found in $AgentDir"
    }

    if (-not (Test-Path -LiteralPath (Join-Path $AgentDir "node_modules"))) {
        Write-Host "Installing agent dependencies because agent\node_modules is missing..."
        Push-Location -LiteralPath $AgentDir
        try {
            & npm install
            if ($LASTEXITCODE -ne 0) {
                Fail-Anx "Agent dependency installation failed." $LASTEXITCODE
            }
        } finally {
            Pop-Location
        }
    }

    $powerShellExe = (Get-Process -Id $PID).Path
    if (-not $powerShellExe) {
        $powerShellExe = "powershell"
    }

    $agentCommand = @"
`$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "$AgentDir"
`$env:ANXHUB_CONFIG_DIR = "$ConfigDir"
`$env:ANXHUB_AGENT_CONFIG_PATH = "$ConfigPath"
`$env:AGENT_HOST = "127.0.0.1"
`$env:AGENT_PORT = "$Port"
npm start
"@

    Write-Host "Starting local AnxOS agent on $AgentUrl..."
    Start-Process -FilePath $powerShellExe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $agentCommand | Out-Null

    if (-not (Wait-AgentPort -HostName $Uri.Host -Port $Port)) {
        Write-Host "Agent did not open port $Port yet. Check the agent PowerShell window if Electron cannot connect." -ForegroundColor Yellow
    }
}

Set-Location -LiteralPath $RepoDir
if (-not (Test-Path -LiteralPath (Join-Path $RepoDir "package.json"))) {
    Fail-Anx "package.json was not found in $RepoDir"
}

Assert-Command "node"
Assert-Command "npm"

if (-not (Test-Path -LiteralPath (Join-Path $RepoDir "node_modules"))) {
    Write-Host "Installing dependencies because node_modules is missing..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Fail-Anx "Dependency installation failed." $LASTEXITCODE
    }
}

$AgentUrl = Normalize-AgentUrl -Value $AgentUrl
$AgentUri = [Uri]$AgentUrl
$AgentPort = Get-AgentPort -Uri $AgentUri

Ensure-AgentConfig

$env:ANXHUB_CONFIG_DIR = $ConfigDir
$env:ANXHUB_AGENT_CONFIG_PATH = $ConfigPath
$env:backendMode = "agent"
$env:BACKEND_MODE = "agent"
$env:AGENT_URL = $AgentUrl

Start-LocalAgentIfNeeded -Uri $AgentUri -Port $AgentPort

Write-Host "Launching AnxOS in agent mode."
Write-Host "Agent URL: $AgentUrl"
Write-Host "Agent config: $ConfigPath"
& npm start
