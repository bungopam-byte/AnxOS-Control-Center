$ErrorActionPreference = "Stop"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

$Project = "C:\Users\anjor\Desktop\AnxHub"

$Rocket  = [char]::ConvertFromUtf32(0x1F680)
$Folder  = [char]::ConvertFromUtf32(0x1F4C2)
$Branch  = [char]::ConvertFromUtf32(0x1F33F)
$Package = [char]::ConvertFromUtf32(0x1F4E6)
$Check   = [char]::ConvertFromUtf32(0x2705)
$Party   = [char]::ConvertFromUtf32(0x1F389)
$Cross   = [char]::ConvertFromUtf32(0x274C)

function Step($Title) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "$Rocket $Title" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Run-WithSpinner {
    param(
        [string]$Title,
        [scriptblock]$Command,
        [string[]]$PreviewLines = @()
    )

    Step $Title

    foreach ($line in $PreviewLines) {
        Write-Host $line
    }

    if ($PreviewLines.Count -gt 0) {
        Write-Host ""
    }

    $frames = @("⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏")
    $start = Get-Date
    $commandText = $Command.ToString()

    $job = Start-Job -ScriptBlock {
        param($CommandText)

        try {
            $output = Invoke-Expression $CommandText 2>&1 | ForEach-Object {
                $_.ToString()
            }

            $code = $LASTEXITCODE
            if ($null -eq $code) {
                $code = 0
            }

            [pscustomobject]@{
                ExitCode = $code
                Output = $output
                ErrorMessage = $null
            }
        }
        catch {
            [pscustomobject]@{
                ExitCode = 1
                Output = @()
                ErrorMessage = $_.Exception.Message
            }
        }
    } -ArgumentList $commandText

    $i = 0
    while ($job.State -eq "Running") {
        $elapsed = [int]((Get-Date) - $start).TotalSeconds
        $frame = $frames[$i % $frames.Count]

        Write-Host "`r$frame Working... ${elapsed}s" -NoNewline -ForegroundColor Yellow

        Start-Sleep -Milliseconds 100
        $i++
    }

    Write-Host "`r                                                            `r" -NoNewline

    $result = Receive-Job $job
    Remove-Job $job -Force

    if ($result.ErrorMessage) {
        Write-Host "$Cross $Title failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host $result.ErrorMessage -ForegroundColor Red
        exit 1
    }

    if ($result.ExitCode -ne 0) {
        Write-Host "$Cross $Title failed!" -ForegroundColor Red
        Write-Host ""
        $result.Output
        exit $result.ExitCode
    }

    $total = [int]((Get-Date) - $start).TotalSeconds
    Write-Host "$Check Done! (${total}s)" -ForegroundColor Green
}

Clear-Host

Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "                  $Rocket AnxBuild Utility" -ForegroundColor Magenta
Write-Host "           Pull | Install | Build | Launch" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

if (-not (Test-Path $Project)) {
    throw "Project folder not found:`n$Project"
}

Set-Location $Project

Step "Project"
Write-Host "$Folder $Project"

Step "Current Branch"
Write-Host "$Branch $(git branch --show-current)"

Run-WithSpinner "Pulling latest changes" {
    Set-Location "C:\Users\anjor\Desktop\AnxHub"
    git pull origin dev
}

Run-WithSpinner "Installing dependencies" {
    Set-Location "C:\Users\anjor\Desktop\AnxHub"
    npm install --loglevel=error
}

Run-WithSpinner "Building installer" {
    Set-Location "C:\Users\anjor\Desktop\AnxHub"
    npm run dist -- --publish never
} @(
    "> anxos-control-center@1.0.0 dist",
    "> electron-builder --publish never"
)

Step "Finding newest installer"

$installer = Get-ChildItem ".\dist" -Filter "*Setup*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $installer) {
    throw "No installer was found in .\dist"
}

Write-Host "$Package Found: $($installer.Name)" -ForegroundColor Green

Step "Launching installer"
Start-Process $installer.FullName

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "$Party Build completed successfully!" -ForegroundColor Green
Write-Host "$Rocket Installer launched!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green