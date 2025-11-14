from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import Dict, Iterable, List

from app.models import Task, TaskDayOverride

WEEKDAY_MAP = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}


@dataclass
class TaskOccurrence:
    task_id: int
    title: str
    description: str | None
    date: date
    start_time: time | None  # CURSOR: Optional for legacy tasks
    end_time: time | None
    icon_path: str | None
    icon_width: int | None
    icon_height: int | None
    font_size: int | None
    is_all_day: bool


def parse_weekday_mask(mask: str | None) -> List[int]:
    if not mask:
        return []
    parts = [m.strip().lower() for m in mask.split(",") if m.strip()]
    return [WEEKDAY_MAP[p] for p in parts if p in WEEKDAY_MAP]


def expand_task(
    task: Task, start: date, end: date, overrides: Dict[date, TaskDayOverride] | None = None
) -> Iterable[TaskOccurrence]:
    """CURSOR: Expand task into occurrences, applying per-day time overrides"""
    overrides = overrides or {}
    
    if task.recurrence == "once":
        task_end = task.end_date or task.start_date
        current = max(task.start_date, start)
        end_date = min(task_end, end)
        while current <= end_date:
            yield _create_occurrence(task, current, overrides.get(current))
            current += timedelta(days=1)
        return

    task_end = task.end_date or end

    if task.recurrence == "daily":
        current = max(task.start_date, start)
        end_date = min(task_end, end)
        while current <= end_date:
            yield _create_occurrence(task, current, overrides.get(current))
            current += timedelta(days=1)
        return

    if task.recurrence == "weekly":
        weekdays = parse_weekday_mask(task.weekday_mask)
        if not weekdays:
            return
        current = max(task.start_date, start)
        end_date = min(task_end, end)
        delta = timedelta(days=1)
        while current <= end_date:
            if current.weekday() in weekdays:
                yield _create_occurrence(task, current, overrides.get(current))
            current += delta
        return


def _create_occurrence(
    task: Task, occurrence_date: date, override: TaskDayOverride | None = None
) -> TaskOccurrence:
    """CURSOR: Create occurrence, applying override if present. Handles legacy tasks without time."""
    start_time = (override.start_time if override and override.start_time else task.start_time)
    end_time = (override.end_time if override and override.end_time else task.end_time)
    
    # CURSOR: Default to 09:00 for legacy tasks without time
    if start_time is None:
        start_time = time(9, 0)
    
    return TaskOccurrence(
        task_id=task.id,
        title=task.title,
        description=task.description,
        date=occurrence_date,
        start_time=start_time,
        end_time=end_time,
        icon_path=task.icon_path,
        icon_width=task.icon_width,
        icon_height=task.icon_height,
        font_size=task.font_size,
        is_all_day=task.is_all_day,
    )
