@echo off
echo ========================================
echo Building Schedule Manager for Windows
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if Node.js is available
call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js/npm is not installed or not in PATH
    echo Please install Node.js
    pause
    exit /b 1
)

echo Step 1: Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
python -m pip install pyinstaller

echo.
echo Step 2: Building frontend...
cd frontend\client
call npm install
call npm run build
cd ..\..

if not exist "frontend\client\dist" (
    echo ERROR: Frontend build failed
    pause
    exit /b 1
)

echo.
echo Step 3: Creating standalone executable with PyInstaller...
pyinstaller schedule-manager.spec --clean -y

if not exist "dist\ScheduleManager" (
    echo ERROR: PyInstaller build failed
    pause
    exit /b 1
)

REM Create uploads directory in dist
mkdir "dist\ScheduleManager\uploads" 2>nul

echo.
echo Step 4: Creating installer package...
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
    echo.
    echo ========================================
    echo Build complete!
    echo Executable: dist\ScheduleManager\ScheduleManager.exe
    echo Installer: Output\ScheduleManagerSetup.exe
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Build complete!
    echo Executable: dist\ScheduleManager\ScheduleManager.exe
    echo.
    echo Note: Inno Setup not found. Installer was not created.
    echo To create an installer, install Inno Setup from:
    echo https://jrsoftware.org/isdl.php
    echo Then run: "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
    echo ========================================
)

echo.
pause
