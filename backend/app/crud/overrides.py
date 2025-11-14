from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session

from app import models, schemas


def create_override(db: Session, override: schemas.TaskDayOverrideCreate) -> models.TaskDayOverride:
    """CURSOR: Create a new per-day time override"""
    db_override = models.TaskDayOverride(**override.dict())
    db.add(db_override)
    db.commit()
    db.refresh(db_override)
    return db_override


def get_override(db: Session, override_id: int) -> Optional[models.TaskDayOverride]:
    """CURSOR: Get a specific override by ID"""
    return db.query(models.TaskDayOverride).filter(models.TaskDayOverride.id == override_id).first()


def get_override_by_task_and_date(
    db: Session, task_id: int, override_date: date
) -> Optional[models.TaskDayOverride]:
    """CURSOR: Get override for a specific task on a specific date"""
    return (
        db.query(models.TaskDayOverride)
        .filter(
            models.TaskDayOverride.task_id == task_id,
            models.TaskDayOverride.date == override_date
        )
        .first()
    )


def get_overrides_for_task(db: Session, task_id: int) -> List[models.TaskDayOverride]:
    """CURSOR: Get all overrides for a specific task"""
    return db.query(models.TaskDayOverride).filter(models.TaskDayOverride.task_id == task_id).all()


def get_overrides_in_range(db: Session, start: date, end: date) -> List[models.TaskDayOverride]:
    """CURSOR: Get all overrides within a date range"""
    return (
        db.query(models.TaskDayOverride)
        .filter(
            models.TaskDayOverride.date >= start,
            models.TaskDayOverride.date <= end
        )
        .all()
    )


def update_override(
    db: Session, override_id: int, override_update: schemas.TaskDayOverrideUpdate
) -> Optional[models.TaskDayOverride]:
    """CURSOR: Update an existing override"""
    db_override = get_override(db, override_id)
    if not db_override:
        return None

    for key, value in override_update.dict(exclude_unset=True).items():
        setattr(db_override, key, value)

    db.commit()
    db.refresh(db_override)
    return db_override


def upsert_override(
    db: Session, task_id: int, override_date: date, start_time, end_time
) -> models.TaskDayOverride:
    """CURSOR: Create or update an override for a specific task and date"""
    existing = get_override_by_task_and_date(db, task_id, override_date)
    
    if existing:
        existing.start_time = start_time
        existing.end_time = end_time
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_override = models.TaskDayOverride(
            task_id=task_id,
            date=override_date,
            start_time=start_time,
            end_time=end_time
        )
        db.add(new_override)
        db.commit()
        db.refresh(new_override)
        return new_override


def delete_override(db: Session, override_id: int) -> bool:
    """CURSOR: Delete an override"""
    db_override = get_override(db, override_id)
    if not db_override:
        return False
    db.delete(db_override)
    db.commit()
    return True

