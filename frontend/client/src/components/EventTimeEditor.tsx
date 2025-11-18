import { useEffect, useState } from "react";
import { Task, TaskOccurrence, TaskDayOverride } from "../types";
import { format, parseISO } from "date-fns";

interface EventTimeEditorProps {
  date: Date;
  tasks: Task[];
  overrides: TaskDayOverride[];
  onUpdateTime: (taskId: number, date: string, startTime: string | null) => Promise<void>;
  onClose: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onDeleteOccurrence?: (taskId: number, date: string) => Promise<void>;
}

interface EventWithTime {
  task: Task;
  startTime: string;
  occurrence: TaskOccurrence | null;
  override?: TaskDayOverride;
}

interface DeleteConfirmModalProps {
  task: Task;
  date: string;
  onConfirm: (deleteAll: boolean) => void;
  onCancel: () => void;
}

const DeleteConfirmModal = ({ task, date, onConfirm, onCancel }: DeleteConfirmModalProps) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.5rem" }}>🗑️ Delete Task</h2>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          <strong>"{task.title}"</strong> is a recurring task. What would you like to delete?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => onConfirm(false)}
            style={{ justifyContent: "flex-start", padding: "1rem" }}
          >
            <div>
              <div style={{ fontWeight: "700", marginBottom: "0.25rem" }}>
                📅 Only this occurrence ({format(parseISO(date), "MMM d, yyyy")})
              </div>
              <div style={{ fontSize: "0.875rem", opacity: 0.9 }}>
                The task will still appear on other dates
              </div>
            </div>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onConfirm(true)}
            style={{
              justifyContent: "flex-start",
              padding: "1rem",
              borderColor: "#ef4444",
              color: "#dc2626",
            }}
          >
            <div>
              <div style={{ fontWeight: "700", marginBottom: "0.25rem" }}>
                🗑️ All occurrences
              </div>
              <div style={{ fontSize: "0.875rem", opacity: 0.9 }}>
                Permanently delete the entire task
              </div>
            </div>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            style={{ marginTop: "0.5rem" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default function EventTimeEditor({
  date,
  tasks,
  overrides,
  onUpdateTime,
  onClose,
  onEditTask,
  onDeleteTask,
  onDeleteOccurrence,
}: EventTimeEditorProps) {
  const [events, setEvents] = useState<EventWithTime[]>([]);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
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
        if (override?.is_hidden) {
          continue;
        }
        const startTime = override?.start_time || task.start_time || "09:00";
        eventsForDay.push({
          task,
          startTime,
          occurrence: null,
          override,
        });
      }
    }
    
    // Sort by time
    eventsForDay.sort((a, b) => a.startTime.localeCompare(b.startTime));
    setEvents(eventsForDay);
  }, [date, tasks, overrides, dateStr]);

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
      const currentEvent = updated[index];
      const previousEvent = updated[index - 1];
      
      // Simply swap the positions in the array
      updated[index] = previousEvent;
      updated[index - 1] = currentEvent;
      
      // Then reassign times based on the new order to maintain proper sequencing
      // If they had the same time, give them distinct times
      const baseTime = previousEvent.startTime;
      const [hours, minutes] = baseTime.split(':').map(Number);
      
      for (let i = Math.max(0, index - 1); i <= Math.min(index, updated.length - 1); i++) {
        const offsetMinutes = minutes + (i - index + 1);
        let newHours = hours;
        let newMinutes = offsetMinutes;
        
        while (newMinutes < 0) {
          newMinutes += 60;
          newHours -= 1;
        }
        while (newMinutes >= 60) {
          newMinutes -= 60;
          newHours += 1;
        }
        
        if (newHours < 0) newHours = 0;
        if (newHours >= 24) newHours = 23;
        
        updated[i] = { 
          ...updated[i], 
          startTime: `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`
        };
      }
      
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === events.length - 1) return;
    
    setEvents((prev) => {
      const updated = [...prev];
      const currentEvent = updated[index];
      const nextEvent = updated[index + 1];
      
      // Simply swap the positions in the array
      updated[index] = nextEvent;
      updated[index + 1] = currentEvent;
      
      // Then reassign times based on the new order to maintain proper sequencing
      const baseTime = nextEvent.startTime;
      const [hours, minutes] = baseTime.split(':').map(Number);
      
      for (let i = index; i <= Math.min(index + 1, updated.length - 1); i++) {
        const offsetMinutes = minutes + (i - index);
        let newHours = hours;
        let newMinutes = offsetMinutes;
        
        while (newMinutes >= 60) {
          newMinutes -= 60;
          newHours += 1;
        }
        
        if (newHours >= 24) newHours = 23;
        
        updated[i] = { 
          ...updated[i], 
          startTime: `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`
        };
      }
      
      return updated;
    });
  };

  const handleDeleteClick = (task: Task) => {
    // COPILOT: For recurring tasks, show confirmation modal
    if (task.recurrence !== "once") {
      setDeleteConfirmTask(task);
    } else {
      // COPILOT: For single tasks, delete directly and keep modal open
      onDeleteTask(task);
      setEvents((prev) => prev.filter((event) => event.task.id !== task.id));
    }
  };

  const handleDeleteConfirm = async (deleteAll: boolean) => {
    if (!deleteConfirmTask) return;

    if (deleteAll) {
      // COPILOT: Delete entire task (all occurrences)
      onDeleteTask(deleteConfirmTask);
      setEvents((prev) => prev.filter((event) => event.task.id !== deleteConfirmTask.id));
    } else {
      // COPILOT: Hide only this occurrence
      if (onDeleteOccurrence) {
        await onDeleteOccurrence(deleteConfirmTask.id, dateStr);
      }
      setEvents((prev) => prev.filter((event) => event.task.id !== deleteConfirmTask.id));
    }

    setDeleteConfirmTask(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-order-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-order-header">
          <h2>📅 Daily Schedule</h2>
          <p className="event-order-date">{format(date, "MMMM d, yyyy")}</p>
        </div>
        
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-text">No events on this day</p>
          </div>
        ) : (
          <div className="event-order-list">
            {events.map((event, index) => (
              <div key={`${event.task.id}-${index}`} className="event-order-item">
                <div className="event-order-number">
                  {index + 1}
                </div>
                
                <div className="event-order-controls">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="order-arrow-button"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === events.length - 1}
                    className="order-arrow-button"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
                
                <div className="event-order-info">
                  <div className="event-order-title">
                    {event.task.title}
                  </div>
                  <div className="event-order-meta">
                    <span className="event-time-badge">🕐 {event.startTime}</span>
                    {event.task.recurrence !== "once" && (
                      <span className="event-recurrence-badge">
                        {event.task.recurrence}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="event-order-actions">
                  <button
                    type="button"
                    onClick={() => onEditTask(event.task)}
                    className="event-action-btn edit-btn"
                    title="Edit task"
                  >
                    <span className="btn-icon">✏️</span>
                    <span className="btn-label">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(event.task)}
                    className="event-action-btn delete-btn"
                    title="Delete task"
                  >
                    <span className="btn-icon">🗑️</span>
                    <span className="btn-label">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="event-order-footer">
          <button type="button" className="primary-button" onClick={handleSave}>
            OK
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>

      {deleteConfirmTask && (
        <DeleteConfirmModal
          task={deleteConfirmTask}
          date={dateStr}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmTask(null)}
        />
      )}
    </div>
  );
}

