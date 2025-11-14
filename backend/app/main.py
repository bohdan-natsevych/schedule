import os
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import tasks, overrides

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Schedule Manager")

# Heartbeat tracking
last_heartbeat = {"time": datetime.now()}
heartbeat_timeout = 10  # seconds
shutdown_flag = threading.Event()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use environment variable if set (for bundled app), otherwise use default
uploads_path_str = os.environ.get('UPLOADS_PATH')
if uploads_path_str:
    uploads_path = Path(uploads_path_str)
else:
    uploads_path = Path(__file__).resolve().parents[1] / "uploads"
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(tasks.router)
app.include_router(overrides.router)


# Heartbeat endpoint
@app.post("/heartbeat")
async def heartbeat():
    """Receive heartbeat from client to keep server alive"""
    last_heartbeat["time"] = datetime.now()
    return {"status": "ok"}


@app.post("/shutdown")
async def shutdown():
    """Explicit shutdown endpoint"""
    def delayed_shutdown():
        time.sleep(0.5)  # Give time for response to be sent
        print("\nShutdown requested by client. Closing server...")
        os._exit(0)
    
    threading.Thread(target=delayed_shutdown, daemon=True).start()
    return {"status": "shutting down"}


# Background thread to monitor heartbeats
def monitor_heartbeat():
    """Monitor heartbeats and shutdown if client disconnects"""
    # Wait 5 seconds before starting monitoring (allow initial connection)
    time.sleep(5)
    
    while not shutdown_flag.is_set():
        time_since_heartbeat = (datetime.now() - last_heartbeat["time"]).total_seconds()
        
        if time_since_heartbeat > heartbeat_timeout:
            print(f"\nNo heartbeat received for {heartbeat_timeout} seconds. Shutting down...")
            shutdown_flag.set()
            # Give a moment for the response to be sent
            time.sleep(0.5)
            os._exit(0)
        
        time.sleep(1)


# Start heartbeat monitor on startup
@app.on_event("startup")
async def startup_event():
    """Start background heartbeat monitor only in bundled/production mode"""
    is_bundled = getattr(sys, 'frozen', False)
    
    if is_bundled:
        monitor_thread = threading.Thread(target=monitor_heartbeat, daemon=True)
        monitor_thread.start()
    else:
        print("Development mode: heartbeat monitoring disabled")
