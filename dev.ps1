# CURSOR: PowerShell script to start dev servers and handle graceful shutdown
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Schedule Manager - Development Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# CURSOR: Check prerequisites
try {
    $null = python --version 2>&1
    Write-Host "[OK] Python found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    $null = npm --version 2>&1
    Write-Host "[OK] Node.js/npm found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js/npm is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
# CURSOR: Create virtual environment if it doesn't exist
$venvPath = "venv"
if (!(Test-Path $venvPath)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "[OK] Virtual environment exists" -ForegroundColor Green
}

# CURSOR: Set path to venv Python and pip
$venvPythonPath = Join-Path $PWD "$venvPath\Scripts\python.exe"
$venvPipPath = Join-Path $PWD "$venvPath\Scripts\pip.exe"

# CURSOR: Verify venv binaries exist
if (!(Test-Path $venvPythonPath)) {
    Write-Host "ERROR: Virtual environment Python not found at $venvPythonPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 1: Installing Python dependencies in venv..." -ForegroundColor Yellow
Set-Location backend
& $venvPipPath install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python dependencies" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host "Step 2: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend\client
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install npm dependencies" -ForegroundColor Red
    Set-Location ..\..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..\..

Write-Host ""
Write-Host "Step 3: Starting backend server..." -ForegroundColor Yellow
$backendCmd = "Set-Location '$PWD\backend'; & '$venvPythonPath' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host "Step 4: Starting frontend dev server..." -ForegroundColor Yellow
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend\client'; npm run dev" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Both servers are running!" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend: Check frontend window for URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# CURSOR: Register cleanup handler for Ctrl+C
$cleanup = {
    Write-Host ""
    Write-Host "Shutting down servers..." -ForegroundColor Yellow
    
    # CURSOR: Kill backend process tree (PowerShell window and all child processes)
    if ($backendProcess -and !$backendProcess.HasExited) {
        Write-Host "Stopping backend server..." -ForegroundColor Yellow
        # Kill the PowerShell window and its children
        Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $backendProcess.Id } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # CURSOR: Kill frontend process tree (PowerShell window and all child processes)
    if ($frontendProcess -and !$frontendProcess.HasExited) {
        Write-Host "Stopping frontend server..." -ForegroundColor Yellow
        # Kill the PowerShell window and its children
        Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $frontendProcess.Id } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # CURSOR: Aggressive cleanup - kill any remaining Python/node processes from this project
    Start-Sleep -Milliseconds 500
    Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "venv" -or $_.Path -match "schedule" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "schedule" -or $_.Path -match "schedule" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "All servers stopped." -ForegroundColor Green
    Start-Sleep -Seconds 1
    exit 0
}

# CURSOR: Register the event handler
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanup | Out-Null

try {
    # CURSOR: Wait indefinitely until Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
        
        # CURSOR: Check if processes are still running
        if ($backendProcess.HasExited -and $frontendProcess.HasExited) {
            Write-Host ""
            Write-Host "Both servers have stopped unexpectedly." -ForegroundColor Red
            break
        }
    }
} catch {
    # CURSOR: Handle Ctrl+C
    & $cleanup
} finally {
    # CURSOR: Ensure cleanup runs
    & $cleanup
}

