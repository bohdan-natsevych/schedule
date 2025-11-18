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
        occurrences = []
        while current <= end_date:
            override = overrides.get(current)
            # COPILOT: Skip hidden occurrences
            if not (override and override.is_hidden):
                occurrences.append((current, override))
            current += timedelta(days=1)
        
        for idx, (occ_date, override) in enumerate(occurrences):
            yield _create_occurrence(task, occ_date, override, idx, len(occurrences))
        return

    task_end = task.end_date or end

    if task.recurrence == "daily":
        current = max(task.start_date, start)
        end_date = min(task_end, end)
        occurrences = []
        while current <= end_date:
            override = overrides.get(current)
            # COPILOT: Skip hidden occurrences
            if not (override and override.is_hidden):
                occurrences.append((current, override))
            current += timedelta(days=1)
        
        for idx, (occ_date, override) in enumerate(occurrences):
            yield _create_occurrence(task, occ_date, override, idx, len(occurrences))
        return

    if task.recurrence == "weekly":
        weekdays = parse_weekday_mask(task.weekday_mask)
        if not weekdays:
            return
        current = max(task.start_date, start)
        end_date = min(task_end, end)
        delta = timedelta(days=1)
        occurrences = []
        while current <= end_date:
            if current.weekday() in weekdays:
                override = overrides.get(current)
                # COPILOT: Skip hidden occurrences
                if not (override and override.is_hidden):
                    occurrences.append((current, override))
            current += delta
        
        for idx, (occ_date, override) in enumerate(occurrences):
            yield _create_occurrence(task, occ_date, override, idx, len(occurrences))
        return


def _create_occurrence(
    task: Task,
    occurrence_date: date,
    override: TaskDayOverride | None = None,
    index: int = 0,
    total: int = 1
) -> TaskOccurrence:
    """CURSOR: Create occurrence, applying override if present. Handles icon display modes and per-occurrence icons."""
    start_time = (override.start_time if override and override.start_time else task.start_time)
    end_time = (override.end_time if override and override.end_time else task.end_time)
    
    # CURSOR: Default to 09:00 for legacy tasks without time
    if start_time is None:
        start_time = time(9, 0)
    
    # COPILOT: Handle icon display based on mode and per-occurrence overrides
    icon_path = None
    icon_width = None
    icon_height = None
    
    # Check if override has custom icon
    if override and override.icon_path:
        icon_path = override.icon_path
        icon_width = override.icon_width
        icon_height = override.icon_height
    else:
        # Use task's icon based on display mode
        display_mode = task.icon_display_mode or "all"
        if display_mode == "all":
            icon_path = task.icon_path
            icon_width = task.icon_width
            icon_height = task.icon_height
        elif display_mode == "first" and index == 0:
            icon_path = task.icon_path
            icon_width = task.icon_width
            icon_height = task.icon_height
        elif display_mode == "last" and index == total - 1:
            icon_path = task.icon_path
            icon_width = task.icon_width
            icon_height = task.icon_height
    
    return TaskOccurrence(
        task_id=task.id,
        title=task.title,
        description=task.description,
        date=occurrence_date,
        start_time=start_time,
        end_time=end_time,
        icon_path=icon_path,
        icon_width=icon_width,
        icon_height=icon_height,
        font_size=task.font_size,
        is_all_day=task.is_all_day,
    )
