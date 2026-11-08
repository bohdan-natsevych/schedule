# Building Schedule Manager for Windows

This guide explains how to build a standalone Windows executable and installer for Schedule Manager.

## Prerequisites

Before building, ensure you have the following installed:

1. **Python 3.8 or higher**
   - Download from: https://www.python.org/downloads/
   - During installation, check "Add Python to PATH"

2. **Node.js (v16 or higher)**
   - Download from: https://nodejs.org/
   - Includes npm automatically

3. **Inno Setup (Optional - for installer creation)**
   - Download from: https://jrsoftware.org/isdl.php
   - Only needed if you want to create a `.exe` installer
   - Default installation path: `C:\Program Files (x86)\Inno Setup 6\`

## Quick Build (Windows)

Simply run the build script:

```bash
build.bat
```

This script will:
1. Install Python dependencies
2. Build the frontend
3. Create a standalone executable using PyInstaller
4. Create an installer (if Inno Setup is installed)

## Build Output

After the build completes:

- **Standalone Application**: `dist\ScheduleManager\ScheduleManager.exe`
  - This folder contains everything needed to run the app
  - Can be copied to any Windows PC (no installation needed)
  - Just double-click `ScheduleManager.exe` to start

- **Installer** (if Inno Setup installed): `Output\ScheduleManagerSetup.exe`
  - Professional installer for end users
  - Handles installation, shortcuts, and uninstallation

## Manual Build Steps

If you prefer to build manually:

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
pip install -r build-requirements.txt
cd ..
```

### 2. Build Frontend

```bash
cd frontend/client
npm install
npm run build
cd ../..
```

### 3. Create Executable

```bash
pyinstaller schedule-manager.spec --clean
```

### 4. Create Installer (Optional)

```bash
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

## Distribution

### Option 1: Distribute Folder
Zip the entire `dist\ScheduleManager` folder and share it. Users just extract and run `ScheduleManager.exe`.

### Option 2: Distribute Installer
Share `Output\ScheduleManagerSetup.exe`. Users run it to install the application properly.

## Troubleshooting

### Build Fails at Frontend Step
- Ensure Node.js and npm are installed: `npm --version`
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again

### Updating Python Dependencies

Every Python package is pinned to an exact version, so each build and each
release gets the same libraries. A new version of a library can change its
behaviour without warning (an unpinned `google-auth-oauthlib` once broke the
Google Calendar sign-in), so versions only change when someone changes them.

- `backend/requirements.in` and `backend/build-requirements.in` list the
  packages the app and the build need directly. Edit these by hand.
- `backend/requirements.txt` and `backend/build-requirements.txt` are generated
  from them and pin every package, including indirect ones, for Windows and
  Python 3.11 (what the release build uses). Do not edit them by hand.

After changing a `.in` file, or to move to newer versions, regenerate the pins
with [uv](https://docs.astral.sh/uv/) from the project root, then test the app
(including connecting Google Calendar) before committing:

```bash
uv pip compile backend/requirements.in -o backend/requirements.txt --python-version 3.11 --python-platform windows --upgrade
uv pip compile backend/build-requirements.in -o backend/build-requirements.txt --python-version 3.11 --python-platform windows --upgrade
```

Leave out `--upgrade` to keep the existing versions and only add what changed.

### PyInstaller Fails
- Reinstall the pinned build tools: `pip install -r backend/build-requirements.txt`
- Check Python version: `python --version` (should be 3.8+)
- Try running with admin privileges

### Application Won't Start
- Check if port 8000 is already in use
- Look for error messages in the console window
- Ensure `backend/schedule.db` and `uploads` folders exist

## Development vs Production

The application automatically detects its environment:

- **Development Mode** (running with `npm run dev`):
  - Frontend connects to `http://127.0.0.1:8000`
  - Backend and frontend run separately

- **Production Mode** (running from exe):
  - Frontend uses relative URLs
  - Backend serves both API and frontend
  - Everything runs from a single executable

## File Structure After Build

```
dist/ScheduleManager/
├── ScheduleManager.exe          # Main executable
├── backend/
│   ├── app/                     # Backend Python code
│   └── schedule.db              # SQLite database
├── frontend/
│   └── client/
│       └── dist/                # Built frontend files
├── uploads/                     # User uploaded icons
└── [Various DLLs and dependencies]
```

## Notes

- The executable includes a console window that shows server logs
- The application opens automatically in the default browser
- To stop the application, close the console window
- Database and uploads are stored in the application directory
- First run may take a few seconds to initialize the database


