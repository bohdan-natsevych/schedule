"""
Schedule Manager Launcher
This script launches the backend server and serves the frontend.
"""
import sys
import os
import webbrowser
import socket
from pathlib import Path
import uvicorn
from threading import Timer


def open_browser(port: int) -> None:
    """Open browser after a short delay"""
    webbrowser.open(f"http://localhost:{port}")


def check_port_available(port: int = 8000) -> bool:
    """CURSOR: Check if specific port is available. Returns True if available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
            return True
        except OSError:
            return False


def get_base_path():
    """Get the base path for bundled or development mode"""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        return Path(sys._MEIPASS)
    else:
        # Running in development
        return Path(__file__).parent


def get_app_data_path():
    """Get the path where data should be stored (outside of _MEIPASS)"""
    if getattr(sys, 'frozen', False):
        # Running as compiled executable - store data in LocalAppData
        local_app_data = os.environ.get('LOCALAPPDATA')
        if local_app_data:
            return Path(local_app_data) / "Schedule Manager"
        else:
            # Fallback to user's home directory
            return Path.home() / ".schedule-manager"
    else:
        # Running in development
        return Path(__file__).parent


def main():
    base_path = get_base_path()
    app_data_path = get_app_data_path()
    
    # Create uploads directory in app data location
    uploads_path = app_data_path / "uploads"
    uploads_path.mkdir(parents=True, exist_ok=True)
    
    # Set database path environment variable BEFORE importing app
    db_path = app_data_path / "backend"
    db_path.mkdir(parents=True, exist_ok=True)
    os.environ['DATABASE_PATH'] = str(db_path / "schedule.db")
    os.environ['UPLOADS_PATH'] = str(uploads_path)
    
    # Set up paths
    backend_path = base_path / "backend"
    sys.path.insert(0, str(backend_path))
    
    # Import FastAPI app (it will use the env vars set above)
    from app.main import app
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    # Mount static files for frontend
    frontend_dist = base_path / "frontend" / "client" / "dist"
    if frontend_dist.exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
        
        @app.get("/")
        async def serve_frontend():
            return FileResponse(str(frontend_dist / "index.html"))
        
        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            # Serve API routes normally, others get index.html for SPA routing
            if full_path.startswith("api/") or full_path.startswith("uploads/"):
                return {"detail": "Not found"}
            file_path = frontend_dist / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(frontend_dist / "index.html"))
    
    # CURSOR: Use fixed port 8000 for Google OAuth compatibility
    port = 8000
    
    # CURSOR: Check if port is available
    if not check_port_available(port):
        print("=" * 50)
        print("ERROR: Port 8000 is already in use!")
        print("=" * 50)
        print(f"Schedule Manager requires port {port} to be available for Google Calendar integration.")
        print("Please close any application using this port and try again.")
        print("\nCommon causes:")
        print("- Another instance of Schedule Manager is running")
        print("- Another web server is using port 8000")
        print("\nPress Enter to exit...")
        print("=" * 50)
        input()
        sys.exit(1)

    # Open browser after 1.5 seconds
    Timer(1.5, open_browser, args=(port,)).start()
    
    # Run the server
    print("=" * 50)
    print("Schedule Manager")
    print("=" * 50)
    print("Starting server...")
    print("The application will open in your browser automatically.")
    print(f"Data location: {app_data_path}")
    print(f"Server URL: http://localhost:{port}")
    print("\nTo stop the application, close this window.")
    print("=" * 50)
    uvicorn.run(app, host="localhost", port=port, log_level="info")


if __name__ == "__main__":
    main()
