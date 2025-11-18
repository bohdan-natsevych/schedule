from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)  # CURSOR: Optional for legacy tasks, required for new
    end_time = Column(Time, nullable=True)
    recurrence = Column(String, nullable=False, default="once")  # once, weekly, daily
    weekday_mask = Column(String, nullable=True)  # CSV of weekdays for weekly recurrence
    icon_path = Column(String, nullable=True)
    icon_width = Column(Integer, nullable=True)
    icon_height = Column(Integer, nullable=True)
    icon_display_mode = Column(String, nullable=True, default="all")  # all, first, last
    font_size = Column(Integer, nullable=True)
    is_all_day = Column(Boolean, default=False)
    
    day_overrides = relationship(
        "TaskDayOverride",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True
    )


class TaskIcon(Base):
    __tablename__ = "task_icons"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, nullable=False)
    path = Column(String, nullable=False)


class TaskDayOverride(Base):
    """CURSOR: Store per-day time overrides for task occurrences"""
    __tablename__ = "task_day_overrides"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    icon_path = Column(String, nullable=True)
    icon_width = Column(Integer, nullable=True)
    icon_height = Column(Integer, nullable=True)
    is_hidden = Column(Boolean, default=False)  # COPILOT: Hide specific occurrence of recurring task

    task = relationship("Task", back_populates="day_overrides")
