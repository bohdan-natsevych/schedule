from datetime import date
from typing import List
import os
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud import overrides as override_crud
from app.database import get_db

# COPILOT: Use environment variable if set (for bundled app), otherwise use default
uploads_path_str = os.environ.get('UPLOADS_PATH')
if uploads_path_str:
    UPLOAD_DIR = Path(uploads_path_str)
else:
    UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/overrides", tags=["overrides"])


@router.post("/", response_model=schemas.TaskDayOverride)
def create_override(
    override: schemas.TaskDayOverrideCreate, db: Session = Depends(get_db)
) -> schemas.TaskDayOverride:
    """CURSOR: Create a new per-day time override"""
    return override_crud.create_override(db, override)


@router.get("/{override_id}", response_model=schemas.TaskDayOverride)
def read_override(override_id: int, db: Session = Depends(get_db)) -> schemas.TaskDayOverride:
    """CURSOR: Get a specific override by ID"""
    db_override = override_crud.get_override(db, override_id)
    if not db_override:
        raise HTTPException(status_code=404, detail="Override not found")
    return db_override


@router.get("/", response_model=List[schemas.TaskDayOverride])
def list_all_overrides(db: Session = Depends(get_db)) -> List[schemas.TaskDayOverride]:
    """CURSOR: Get all overrides"""
    return db.query(models.TaskDayOverride).all()


@router.get("/task/{task_id}", response_model=List[schemas.TaskDayOverride])
def list_overrides_for_task(
    task_id: int, db: Session = Depends(get_db)
) -> List[schemas.TaskDayOverride]:
    """CURSOR: Get all overrides for a specific task"""
    return override_crud.get_overrides_for_task(db, task_id)


@router.put("/upsert", response_model=schemas.TaskDayOverride)
def upsert_override(
    task_id: int,
    override_date: date,
    start_time: str | None = None,
    end_time: str | None = None,
    db: Session = Depends(get_db),
) -> schemas.TaskDayOverride:
    """CURSOR: Create or update an override for a specific task and date"""
    from datetime import time as dt_time
    
    parsed_start_time = None
    parsed_end_time = None
    
    if start_time:
        try:
            parts = start_time.split(":")
            parsed_start_time = dt_time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid start_time format. Use HH:MM")
    
    if end_time:
        try:
            parts = end_time.split(":")
            parsed_end_time = dt_time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid end_time format. Use HH:MM")
    
    return override_crud.upsert_override(db, task_id, override_date, parsed_start_time, parsed_end_time)


@router.put("/{override_id}", response_model=schemas.TaskDayOverride)
def update_override(
    override_id: int, override_update: schemas.TaskDayOverrideUpdate, db: Session = Depends(get_db)
) -> schemas.TaskDayOverride:
    """CURSOR: Update an existing override"""
    db_override = override_crud.update_override(db, override_id, override_update)
    if not db_override:
        raise HTTPException(status_code=404, detail="Override not found")
    return db_override


@router.delete("/{override_id}")
def delete_override(override_id: int, db: Session = Depends(get_db)) -> None:
    """CURSOR: Delete an override"""
    success = override_crud.delete_override(db, override_id)
    if not success:
        raise HTTPException(status_code=404, detail="Override not found")


@router.post("/{override_id}/icon", response_model=schemas.TaskDayOverride)
def upload_override_icon(
    override_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.TaskDayOverride:
    """COPILOT: Upload icon for a specific occurrence override"""
    db_override = override_crud.get_override(db, override_id)
    if not db_override:
        raise HTTPException(status_code=404, detail="Override not found")

    file_path = UPLOAD_DIR / f"override_{override_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        buffer.write(file.file.read())

    db_override.icon_path = f"/uploads/{file_path.name}"
    db.commit()
    db.refresh(db_override)
    return db_override

