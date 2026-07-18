@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0AnxDev.ps1"
set "ANXDEV_EXIT=%ERRORLEVEL%"
echo.
echo AnxDev exited with code %ANXDEV_EXIT%.
pause
exit /b %ANXDEV_EXIT%
