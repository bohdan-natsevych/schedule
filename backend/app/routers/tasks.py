import os
from datetime import time, timedelta
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db
from app.utils.recurrence import TaskOccurrence, expand_task

# Use environment variable if set (for bundled app), otherwise use default
uploads_path_str = os.environ.get('UPLOADS_PATH')
if uploads_path_str:
    UPLOAD_DIR = Path(uploads_path_str)
else:
    UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=schemas.Task)
def create_task(
    task: schemas.TaskCreate, db: Session = Depends(get_db)
) -> schemas.Task:
    return crud.create_task(db, task)


@router.get("/", response_model=List[schemas.Task])
def list_tasks(db: Session = Depends(get_db)) -> List[schemas.Task]:
    return crud.get_tasks(db)


@router.get("/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(get_db)) -> schemas.Task:
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


@router.put("/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)
) -> schemas.Task:
    db_task = crud.update_task(db, task_id, task_update)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)) -> None:
    success = crud.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/icon", response_model=schemas.Task)
def upload_icon(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> schemas.Task:
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    file_path = UPLOAD_DIR / f"task_{task_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        buffer.write(file.file.read())

    db_task.icon_path = f"/uploads/{file_path.name}"
    db.commit()
    db.refresh(db_task)
    return db_task


@router.post("/print", response_model=schemas.PrintResponse)
def prepare_print(
    request: schemas.PrintRequest, db: Session = Depends(get_db)
) -> schemas.PrintResponse:
    from app.crud import overrides as override_crud
    
    tasks = crud.get_tasks_in_range(db, request.from_date, request.to_date)
    all_overrides = override_crud.get_overrides_in_range(db, request.from_date, request.to_date)
    
    # CURSOR: Group overrides by task_id and date for efficient lookup
    overrides_by_task = {}
    for override in all_overrides:
        if override.task_id not in overrides_by_task:
            overrides_by_task[override.task_id] = {}
        overrides_by_task[override.task_id][override.date] = override
    
    occurrences: List[TaskOccurrence] = []
    for task in tasks:
        task_overrides = overrides_by_task.get(task.id, {})
        occurrences.extend(list(expand_task(task, request.from_date, request.to_date, task_overrides)))

    # CURSOR: Sort by date and time (legacy tasks default to 09:00)
    occurrences.sort(
        key=lambda t: (
            t.date,
            t.start_time or time(9, 0),
        )
    )

    date_cursor = request.from_date
    missing_days: List[str] = []
    occurrence_dates = {occ.date for occ in occurrences}
    while date_cursor <= request.to_date:
        if date_cursor not in occurrence_dates:
            missing_days.append(date_cursor.isoformat())
        date_cursor += timedelta(days=1)

    return schemas.PrintResponse(
        occurrences=[schemas.TaskOccurrence.from_model(o) for o in occurrences],
        missing_days=missing_days,
    )
