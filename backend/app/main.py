import os
import threading
import time
from pathlib import Path

from app.database import Base, engine
from app.routers import google_calendar, overrides, tasks, update
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Schedule Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use environment variable if set (for bundled app), otherwise use default
uploads_path_str = os.environ.get("UPLOADS_PATH")
if uploads_path_str:
    uploads_path = Path(uploads_path_str)
else:
    uploads_path = Path(__file__).resolve().parents[1] / "uploads"
uploads_path.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(tasks.router)
app.include_router(overrides.router)
app.include_router(google_calendar.router)
app.include_router(update.router)


@app.post("/shutdown")
async def shutdown():
    """Explicit shutdown endpoint"""

    def delayed_shutdown():
        time.sleep(0.5)  # Give time for response to be sent
        print("\nShutdown requested by client. Closing server...")
        os._exit(0)

    threading.Thread(target=delayed_shutdown, daemon=True).start()
    return {"status": "shutting down"}
