$ErrorActionPreference = "Stop"

$AppName = "AnxOS Development Launcher"
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-AnxHeader {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor DarkMagenta
    Write-Host "  $AppName" -ForegroundColor Magenta
    Write-Host "  Trusted source development mode" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor DarkMagenta
    Write-Host ""
}

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

function Prepare-Repo {
    Set-Location -LiteralPath $RepoDir
    if (-not (Test-Path -LiteralPath (Join-Path $RepoDir "package.json"))) {
        Fail-Anx "package.json was not found in $RepoDir"
    }

    Assert-Command "node"
    Assert-Command "npm"

    Write-Host "Repository: $RepoDir"
    Write-Host "Node: $(node --version)"
    Write-Host "npm: $(npm --version)"

    if (-not (Test-Path -LiteralPath (Join-Path $RepoDir "node_modules"))) {
        Write-Host ""
        Write-Host "Installing dependencies because node_modules is missing..."
        & npm install
        if ($LASTEXITCODE -ne 0) {
            Fail-Anx "Dependency installation failed." $LASTEXITCODE
        }
    }
}

function Invoke-NpmScript {
    param([Parameter(Mandatory = $true)][string]$ScriptName)
    & npm run $ScriptName
    return $LASTEXITCODE
}

function Invoke-WithDevelopmentEnvironment {
    param(
        [Parameter(Mandatory = $true)][scriptblock]$Body,
        [switch]$DevTools
    )

    $oldNodeEnv = $env:NODE_ENV
    $oldTrusted = $env:ANXOS_TRUSTED_DEVELOPMENT_MODE
    $oldDevTools = $env:ANXOS_OPEN_DEVTOOLS

    try {
        $env:NODE_ENV = "development"
        $env:ANXOS_TRUSTED_DEVELOPMENT_MODE = "1"
        if ($DevTools) {
            $env:ANXOS_OPEN_DEVTOOLS = "1"
        } else {
            Remove-Item Env:\ANXOS_OPEN_DEVTOOLS -ErrorAction SilentlyContinue
        }

        & $Body
        return $LASTEXITCODE
    } finally {
        if ($null -eq $oldNodeEnv) { Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue } else { $env:NODE_ENV = $oldNodeEnv }
        if ($null -eq $oldTrusted) { Remove-Item Env:\ANXOS_TRUSTED_DEVELOPMENT_MODE -ErrorAction SilentlyContinue } else { $env:ANXOS_TRUSTED_DEVELOPMENT_MODE = $oldTrusted }
        if ($null -eq $oldDevTools) { Remove-Item Env:\ANXOS_OPEN_DEVTOOLS -ErrorAction SilentlyContinue } else { $env:ANXOS_OPEN_DEVTOOLS = $oldDevTools }
    }
}

function Launch-AnxOS {
    Write-Host ""
    Write-Host "Launching AnxOS from source..."
    Write-Host "Development owner fallback is available only because this is an unpackaged Electron run." -ForegroundColor Yellow
    Write-Host ""
    Invoke-WithDevelopmentEnvironment -Body { & npm run start }
    exit $LASTEXITCODE
}

function Launch-AnxOSDevTools {
    Write-Host ""
    Write-Host "Launching AnxOS from source with DevTools..."
    Write-Host ""
    Invoke-WithDevelopmentEnvironment -DevTools -Body { & npm run start }
    exit $LASTEXITCODE
}

function Show-Menu {
    Write-Host ""
    Write-Host "Choose an action:"
    Write-Host "  1. Launch AnxOS Development"
    Write-Host "  2. Launch with DevTools"
    Write-Host "  3. Run owner workspace smoke test"
    Write-Host "  4. Run marketplace smoke test"
    Write-Host "  5. Exit"
    Write-Host ""
}

Write-AnxHeader
Prepare-Repo

while ($true) {
    Show-Menu
    $choice = Read-Host "AnxDev"
    switch ($choice) {
        "1" { Launch-AnxOS }
        "2" { Launch-AnxOSDevTools }
        "3" {
            $code = Invoke-NpmScript "owner:smoke"
            Write-Host ""
            Write-Host "Owner workspace smoke test exited with code $code."
        }
        "4" {
            $code = Invoke-NpmScript "marketplace:smoke"
            Write-Host ""
            Write-Host "Marketplace smoke test exited with code $code."
        }
        { $_ -in @("5", "q", "Q", "exit") } {
            Write-Host "Exiting AnxDev."
            exit 0
        }
        default {
            Write-Host "Unknown choice. Select 1, 2, 3, 4, or 5." -ForegroundColor Yellow
        }
    }
}
