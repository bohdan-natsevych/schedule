import { useEffect, useState } from "react";
import { Task, TaskOccurrence, TaskDayOverride } from "../types";
import { format, parseISO } from "date-fns";

interface EventTimeEditorProps {
  date: Date;
  tasks: Task[];
  overrides: TaskDayOverride[];
  onUpdateTime: (taskId: number, date: string, startTime: string | null) => Promise<void>;
  onClose: () => void;
}

interface EventWithTime {
  task: Task;
  startTime: string;
  occurrence: TaskOccurrence | null;
}

export default function EventTimeEditor({
  date,
  tasks,
  overrides,
  onUpdateTime,
  onClose,
}: EventTimeEditorProps) {
  const [events, setEvents] = useState<EventWithTime[]>([]);
  const dateStr = format(date, "yyyy-MM-dd");

  useEffect(() => {
    // CURSOR: Build override map for quick lookup
    const overrideMap = new Map<number, TaskDayOverride>();
    for (const override of overrides) {
      if (override.date === dateStr) {
        overrideMap.set(override.task_id, override);
      }
    }
    
    // CURSOR: Filter tasks that occur on this date and set their times
    const eventsForDay: EventWithTime[] = [];
    
    for (const task of tasks) {
      const taskStartDate = parseISO(task.start_date);
      const taskEndDate = task.end_date ? parseISO(task.end_date) : taskStartDate;
      
      // CURSOR: Compare only dates, not times
      const selectedDateStr = format(date, "yyyy-MM-dd");
      const taskStartStr = format(taskStartDate, "yyyy-MM-dd");
      const taskEndStr = format(taskEndDate, "yyyy-MM-dd");
      
      // Check if task occurs on this date
      let occursOnDate = false;
      
      if (task.recurrence === "once") {
        occursOnDate = selectedDateStr >= taskStartStr && selectedDateStr <= taskEndStr;
      } else if (task.recurrence === "daily") {
        occursOnDate = selectedDateStr >= taskStartStr && selectedDateStr <= taskEndStr;
      } else if (task.recurrence === "weekly") {
        const weekdays = task.weekday_mask?.split(",").map(d => d.trim().toLowerCase()) || [];
        const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const dayName = dayNames[date.getDay()];
        occursOnDate = weekdays.includes(dayName) && selectedDateStr >= taskStartStr && selectedDateStr <= taskEndStr;
      }
      
      if (occursOnDate) {
        // CURSOR: Use override time if exists, otherwise use task's default time
        const override = overrideMap.get(task.id);
        const startTime = override?.start_time || task.start_time || "09:00";
        eventsForDay.push({
          task,
          startTime,
          occurrence: null,
        });
      }
    }
    
    // Sort by time
    eventsForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));
    setEvents(eventsForDay);
  }, [date, tasks, overrides, dateStr]);

  const handleTimeChange = (index: number, newTime: string) => {
    setEvents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], startTime: newTime };
      // Re-sort by time
      return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  };

  const handleSave = async () => {
    // Save all time changes
    for (const event of events) {
      await onUpdateTime(event.task.id, dateStr, event.startTime);
    }
    onClose();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    setEvents((prev) => {
      const updated = [...prev];
      // Swap times with previous event
      const temp = updated[index - 1].startTime;
      updated[index - 1] = { ...updated[index - 1], startTime: updated[index].startTime };
      updated[index] = { ...updated[index], startTime: temp };
      // Re-sort by time
      return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === events.length - 1) return;
    
    setEvents((prev) => {
      const updated = [...prev];
      // Swap times with next event
      const temp = updated[index + 1].startTime;
      updated[index + 1] = { ...updated[index + 1], startTime: updated[index].startTime };
      updated[index] = { ...updated[index], startTime: temp };
      // Re-sort by time
      return updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Event Order - {format(date, "MMMM d, yyyy")}</h2>
        
        {events.length === 0 ? (
          <p>No events on this day.</p>
        ) : (
          <div className="event-time-list">
            {events.map((event, index) => (
              <div key={`${event.task.id}-${index}`} className="event-time-item">
                <div className="event-time-controls">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="icon-button"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === events.length - 1}
                    className="icon-button"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
                
                <input
                  type="time"
                  value={event.startTime}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="time-input"
                />
                
                <div className="event-title">
                  {event.task.title}
                  {event.task.recurrence !== "once" && (
                    <span className="event-recurrence-badge">
                      {event.task.recurrence}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="button-group" style={{ marginTop: "1rem" }}>
          <button type="button" className="primary-button" onClick={handleSave}>
            Save Order
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

