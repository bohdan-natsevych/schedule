@echo off
REM CURSOR: Wrapper to launch PowerShell script with proper execution policy
powershell -ExecutionPolicy Bypass -File "%~dp0dev.ps1"
if %errorlevel% neq 0 (
    echo.
    echo Script failed or was interrupted.
    pause
)

