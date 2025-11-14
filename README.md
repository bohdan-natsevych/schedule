# Schedule Manager

A desktop application for managing recurring tasks with a calendar interface and print preview functionality.

## Features

- 📅 **Calendar View**: Visual monthly calendar with all your tasks
- 📋 **Agenda View**: List of upcoming tasks for the next year
- 🔄 **Recurring Tasks**: Support for daily, weekly, monthly, and yearly tasks
- 🖼️ **Task Icons**: Upload and customize icons for tasks
- 🖨️ **Print Preview**: Preview and print your schedule with customizable formatting
- 💾 **Local Storage**: All data stored locally on your computer

## For Users

### Quick Start

1. **Download** the latest `ScheduleManagerSetup.exe` from the releases page
2. **Run** the installer
3. **Launch** Schedule Manager from your Start Menu or Desktop shortcut
4. The application opens automatically in your web browser

### Documentation

- [User Guide](USER_GUIDE.md) - Complete guide on how to use the application
- [Troubleshooting](USER_GUIDE.md#troubleshooting) - Solutions to common issues

### System Requirements

- **OS**: Windows 10 or higher
- **RAM**: 2GB minimum
- **Disk Space**: 200MB
- **Browser**: Any modern web browser (Chrome, Firefox, Edge, etc.)

## For Developers

### Build from Source

Want to build the application yourself or contribute to development?

1. **Clone** the repository:
   ```bash
   git clone https://github.com/yourusername/schedule.git
   cd schedule
   ```

2. **Build** the application:
   ```bash
   build.bat
   ```

See [BUILD.md](BUILD.md) for detailed build instructions.

### Development Setup

#### Backend (Python/FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs on: `http://localhost:8000`

#### Frontend (React/TypeScript)

```bash
cd frontend/client
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Project Structure

```
schedule/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── crud/        # Database operations
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API endpoints
│   │   ├── schemas/     # Pydantic schemas
│   │   └── utils/       # Utility functions
│   └── requirements.txt
├── frontend/
│   └── client/          # React frontend
│       ├── src/
│       │   ├── api/     # API client
│       │   ├── components/  # React components
│       │   ├── pages/   # Page components
│       │   └── types/   # TypeScript types
│       └── package.json
├── launcher.py          # Application launcher
├── schedule-manager.spec  # PyInstaller config
├── installer.iss        # Inno Setup config
└── build.bat           # Build script

```

### Technologies Used

**Backend:**
- FastAPI - Modern Python web framework
- SQLAlchemy - SQL toolkit and ORM
- SQLite - Lightweight database
- Uvicorn - ASGI server

**Frontend:**
- React 19 - UI library
- TypeScript - Type-safe JavaScript
- Vite - Build tool
- React Big Calendar - Calendar component
- TanStack Query - Data fetching
- Axios - HTTP client
- date-fns - Date utilities

**Packaging:**
- PyInstaller - Python to executable
- Inno Setup - Windows installer creator

### Building the Installer

See [BUILD.md](BUILD.md) for comprehensive build instructions.

Quick build:
```bash
build.bat
```

Output:
- `dist/ScheduleManager/ScheduleManager.exe` - Standalone application
- `Output/ScheduleManagerSetup.exe` - Windows installer

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Testing

#### Backend Tests
```bash
cd backend
pytest
```

#### Frontend Tests
```bash
cd frontend/client
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/yourusername/schedule/issues)
- **Documentation**: See [User Guide](USER_GUIDE.md) for detailed usage instructions
- **Build Help**: See [BUILD.md](BUILD.md) for build troubleshooting

## Changelog

### Version 1.0.0
- Initial release
- Calendar and Agenda views
- Recurring task support
- Task icons with custom sizing
- Print preview with page count
- Windows installer

## Acknowledgments

- React Big Calendar for the calendar component
- FastAPI for the excellent Python web framework
- All open-source contributors

---

Made with ❤️ by Schedule Manager Team
