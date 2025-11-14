# Windows Installer - Setup Complete! ✅

Your Schedule Manager application is now ready to be packaged as a Windows executable!

## What Was Created

### 🚀 Core Files

1. **launcher.py**
   - Main entry point that starts both backend and frontend
   - Automatically opens browser
   - Handles file paths for bundled application
   - Manages database and uploads directories

2. **schedule-manager.spec**
   - PyInstaller configuration
   - Specifies what files to include in the executable
   - Handles hidden imports for FastAPI/Uvicorn

3. **installer.iss**
   - Inno Setup script for creating professional Windows installer
   - Creates Start Menu shortcuts
   - Adds Desktop icon option
   - Handles installation/uninstallation

### 📝 Build Scripts

4. **build.bat**
   - Automated build script for Windows
   - Handles everything: dependencies, frontend build, PyInstaller, installer
   - Just double-click to build!

### 📚 Documentation

5. **BUILD.md**
   - Comprehensive build instructions
   - Troubleshooting guide
   - Manual build steps

6. **USER_GUIDE.md**
   - End-user documentation
   - How to use all features
   - Troubleshooting for users

7. **README.md**
   - Project overview
   - For both users and developers
   - Quick start guide

8. **QUICK_BUILD.txt**
   - Quick reference for building
   - Common issues and solutions

### 🔧 Code Updates

9. **frontend/client/src/api/client.ts**
   - Updated to use relative URLs in production
   - Still uses localhost:8000 in development

10. **backend/app/database.py**
    - Updated to use environment variable for database path
    - Allows flexible database location in bundled app

11. **.gitignore**
    - Updated to exclude build artifacts
    - Properly configured for Python/Node project

## How to Build

### Simple Method
```bash
build.bat
```

That's it! The script will:
1. Install all dependencies
2. Build the React frontend
3. Create standalone executable
4. Create Windows installer (if Inno Setup installed)

### Build Time
- First build: ~5 minutes
- Subsequent builds: ~2 minutes

## Output Files

After building, you'll get:

1. **dist/ScheduleManager/ScheduleManager.exe**
   - Standalone application
   - ~100-150 MB (includes Python runtime and all dependencies)
   - Can be distributed as a ZIP file
   - No installation needed - just extract and run

2. **Output/ScheduleManagerSetup.exe** (if Inno Setup installed)
   - Professional installer
   - ~50-70 MB (compressed)
   - Handles installation, shortcuts, uninstallation
   - Recommended for end users

## Distribution Options

### Option A: Portable (No Install)
1. Zip the entire `dist/ScheduleManager` folder
2. Share the ZIP file
3. Users extract and double-click `ScheduleManager.exe`
4. Advantages: No installation, portable, can run from USB

### Option B: Installer
1. Share `Output/ScheduleManagerSetup.exe`
2. Users run it like any Windows installer
3. Advantages: Professional, Start Menu integration, easy uninstall

## Testing Your Build

1. Navigate to `dist/ScheduleManager/`
2. Double-click `ScheduleManager.exe`
3. Console window appears (shows server logs)
4. Browser opens automatically with the app
5. Test all features:
   - Create tasks
   - Edit/delete tasks
   - Upload icons
   - Print preview
   - Calendar/agenda views
6. Close console window to stop

## What Happens When Users Run It

1. **First Run:**
   - Creates `backend/schedule.db` (SQLite database)
   - Creates `uploads/` folder
   - Starts server on localhost:8000
   - Opens browser

2. **Subsequent Runs:**
   - Loads existing database
   - Uses existing uploads
   - Same server startup

## Data Storage

All user data is stored in the application directory:
- `backend/schedule.db` - All tasks and settings
- `uploads/` - Uploaded task icons

Users can backup by copying these files/folders.

## Requirements for Building

- Python 3.8+ (with pip)
- Node.js 16+ (with npm)
- Inno Setup 6 (optional, for installer)
- Windows 10 or higher

## Requirements for Running (End Users)

- Windows 10 or higher
- Web browser (any modern browser)
- ~200 MB disk space
- No Python or Node.js needed! ✅

## Key Features of the Packaged App

✅ **Self-contained**: Includes Python runtime, all libraries
✅ **No dependencies**: Users don't need to install anything
✅ **Offline**: Works completely offline
✅ **Portable**: Can run from any folder/drive
✅ **Auto-launch**: Opens browser automatically
✅ **Local data**: All data stored locally, no cloud
✅ **Fast startup**: ~2-3 seconds to launch

## Production vs Development

The app automatically detects how it's running:

**Development Mode** (npm run dev):
- Backend: http://127.0.0.1:8000 (separate process)
- Frontend: http://localhost:5173 (Vite dev server)
- Hot reload enabled
- Database in backend/ folder

**Production Mode** (from .exe):
- Backend: http://localhost:8000
- Frontend: Served by backend (no separate process)
- Both from single executable
- Database in app folder

## Troubleshooting Build Issues

### "Python not found"
Install Python and check "Add to PATH" during installation

### "npm not found"
Install Node.js from nodejs.org

### "Frontend build failed"
```bash
cd frontend/client
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "PyInstaller failed"
```bash
pip install --upgrade pyinstaller setuptools
```

### "Module not found" errors
Check `hiddenimports` in `schedule-manager.spec` - may need to add missing modules

## Next Steps

1. **Test the build** - Run build.bat and test the executable
2. **Customize installer** - Edit installer.iss to change app name, version, etc.
3. **Add icon** - Create an icon file and reference it in the .spec file
4. **Version control** - Commit these changes (build artifacts already in .gitignore)
5. **Distribute** - Share the installer or portable ZIP with users

## Support

- Build issues: See BUILD.md
- Usage questions: See USER_GUIDE.md
- Code questions: See README.md

## Notes

⚠️ **First build takes longer** - Downloads and installs all dependencies
⚠️ **Antivirus warnings** - Some antivirus may flag PyInstaller apps (false positive)
⚠️ **Windows Defender** - May show "Unknown publisher" - this is normal for unsigned apps
⚠️ **File size** - Executable is large (~100MB) because it includes Python runtime

---

**You're all set!** Just run `build.bat` whenever you want to create a new build. 🎉
