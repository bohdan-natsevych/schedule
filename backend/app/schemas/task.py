from datetime import date, time
from typing import Optional, Literal, List

from pydantic import BaseModel, ConfigDict

RecurrenceType = Literal["once", "daily", "weekly"]


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None  # CURSOR: Optional for legacy tasks
    end_time: Optional[time] = None
    recurrence: RecurrenceType = "once"
    weekday_mask: Optional[str] = None
    icon_path: Optional[str] = None
    icon_width: Optional[int] = None
    icon_height: Optional[int] = None
    icon_display_mode: Optional[str] = "all"
    font_size: Optional[int] = None
    is_all_day: bool = False


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    start_time: time  # CURSOR: REQUIRED for new tasks
    end_time: Optional[time] = None
    recurrence: RecurrenceType = "once"
    weekday_mask: Optional[str] = None
    icon_path: Optional[str] = None
    icon_width: Optional[int] = None
    icon_height: Optional[int] = None
    icon_display_mode: Optional[str] = "all"
    font_size: Optional[int] = None
    is_all_day: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    recurrence: Optional[RecurrenceType] = None
    weekday_mask: Optional[str] = None
    icon_path: Optional[str] = None
    icon_width: Optional[int] = None
    icon_height: Optional[int] = None
    icon_display_mode: Optional[str] = None
    font_size: Optional[int] = None
    is_all_day: Optional[bool] = None


class Task(TaskBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class TaskOccurrence(BaseModel):
    task_id: int
    title: str
    description: Optional[str]
    date: date
    start_time: Optional[time]  # CURSOR: Optional for legacy tasks
    end_time: Optional[time]
    icon_path: Optional[str]
    icon_width: Optional[int]
    icon_height: Optional[int]
    font_size: Optional[int]
    is_all_day: bool

    @classmethod
    def from_model(cls, occurrence) -> "TaskOccurrence":
        payload = occurrence.__dict__.copy()
        payload.setdefault("icon_width", occurrence.icon_width or 150)
        payload.setdefault("icon_height", occurrence.icon_height or 150)
        return cls(**payload)


class PrintRequest(BaseModel):
    from_date: date
    to_date: date
    font_size: int


class PrintResponse(BaseModel):
    occurrences: List[TaskOccurrence]
    missing_days: List[str]


class TaskDayOverrideBase(BaseModel):
    task_id: int
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    icon_path: Optional[str] = None
    icon_width: Optional[int] = None
    icon_height: Optional[int] = None


class TaskDayOverrideCreate(TaskDayOverrideBase):
    pass


class TaskDayOverrideUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    icon_path: Optional[str] = None
    icon_width: Optional[int] = None
    icon_height: Optional[int] = None


class TaskDayOverride(TaskDayOverrideBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
