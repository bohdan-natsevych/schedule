from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session

from app import models, schemas


def create_task(db: Session, task: schemas.TaskCreate) -> models.Task:
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def get_tasks(db: Session) -> List[models.Task]:
    return db.query(models.Task).all()


def get_tasks_in_range(db: Session, start: date, end: date) -> List[models.Task]:
    return (
        db.query(models.Task)
        .filter(models.Task.start_date <= end)
        .filter((models.Task.end_date == None) | (models.Task.end_date >= start))
        .all()
    )


def update_task(db: Session, task_id: int, task_update: schemas.TaskUpdate) -> Optional[models.Task]:
    db_task = get_task(db, task_id)
    if not db_task:
        return None

    for key, value in task_update.dict(exclude_unset=True).items():
        setattr(db_task, key, value)

    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int) -> bool:
    db_task = get_task(db, task_id)
    if not db_task:
        return False
    
    try:
        db.delete(db_task)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Error deleting task {task_id}: {str(e)}")
        raise
