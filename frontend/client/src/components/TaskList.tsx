import { Task } from "../types";
import { format, parseISO, isValid } from "date-fns";
import { useState, useMemo } from "react";

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

const getRecurrenceLabel = (recurrence: string) => {
  switch (recurrence) {
    case "daily": return "Daily";
    case "weekly": return "Weekly";
    case "once": return "Single";
    default: return recurrence;
  }
};

const getRecurrenceColor = (recurrence: string) => {
  switch (recurrence) {
    case "daily": return "#3b82f6";
    case "weekly": return "#8b5cf6";
    case "once": return "#6b7280";
    default: return "#6b7280";
  }
};

const WEEKDAY_LABELS: Record<string, string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

const formatDateLabel = (isoDate?: string | null) => {
  if (!isoDate) return "No date";
  const parsed = parseISO(isoDate);
  return isValid(parsed) ? format(parsed, "MMM d, yyyy") : isoDate;
};

const formatTimeLabel = (timeValue?: string | null) => {
  const source = timeValue ?? "09:00";
  const [hourPart, minutePart] = source.split(":");
  const hour = Number.parseInt(hourPart ?? "9", 10);
  const minute = Number.parseInt(minutePart ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return source;
  }
  const safeHour = String(Math.min(Math.max(hour, 0), 23)).padStart(2, "0");
  const paddedMinute = String(Math.min(Math.max(minute, 0), 59)).padStart(2, "0");
  return `${safeHour}:${paddedMinute}`;
};

const formatWeekdayMask = (mask?: string | null) => {
  if (!mask) return null;
  const labels = mask
    .split(",")
    .map((value) => value.trim().toLowerCase().slice(0, 3))
    .map((key) => WEEKDAY_LABELS[key])
    .filter(Boolean);
  return labels.length ? labels.join(", ") : null;
};

export default function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date range filter
      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        const taskStartDate = parseISO(task.start_date);
        const taskEndDate = task.end_date ? parseISO(task.end_date) : taskStartDate;
        
        if (startDateFilter) {
          const filterStart = parseISO(startDateFilter);
          // Task overlaps with filter if task end >= filter start
          matchesDateRange = matchesDateRange && taskEndDate >= filterStart;
        }
        
        if (endDateFilter) {
          const filterEnd = parseISO(endDateFilter);
          // Task overlaps with filter if task start <= filter end
          matchesDateRange = matchesDateRange && taskStartDate <= filterEnd;
        }
      }
      
      return matchesSearch && matchesDateRange;
    });
    const getStartDateTime = (task: Task) => {
      const datePart = task.start_date;
      const timePart = task.start_time ?? "00:00";
      const composed = `${datePart}T${timePart}`;
      const parsed = parseISO(composed);
      return isValid(parsed) ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
    };

    return filtered.sort((a, b) => {
      const diff = getStartDateTime(a) - getStartDateTime(b);
      if (diff !== 0) {
        return diff;
      }
      return a.title.localeCompare(b.title);
    });
  }, [tasks, searchQuery, startDateFilter, endDateFilter]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const hasActiveFilters = searchQuery !== "" || startDateFilter !== "" || endDateFilter !== "";

  if (!tasks.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📅</div>
        <p className="empty-state-text">No tasks yet</p>
        <p className="empty-state-subtext">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="task-filters">
        <div className="filter-group">
          <input
            type="text"
            className="filter-input"
            placeholder="🔍 Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label className="filter-label">Date Range:</label>
          <div className="date-range-inputs">
            <input
              type="date"
              className="filter-date-input"
              placeholder="From"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
            <span className="date-separator">to</span>
            <input
              type="date"
              className="filter-date-input"
              placeholder="To"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
        </div>
        {hasActiveFilters && (
          <button 
            className="clear-filters-btn"
            onClick={handleClearFilters}
            type="button"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No tasks found</p>
          <p className="empty-state-subtext">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-card-content">
                <div className="task-card-header">
                  <h4 className="task-card-title">{task.title}</h4>
                  {task.icon_path && (
                    <span className="task-icon-badge" title="This task uses a custom icon">🖼</span>
                  )}
                  <span 
                    className="task-recurrence-badge" 
                    style={{ backgroundColor: getRecurrenceColor(task.recurrence) }}
                  >
                    {getRecurrenceLabel(task.recurrence)}
                  </span>
                </div>
                <div className="task-card-meta">
                  <span className="task-meta-item">
                    📅 {formatDateLabel(task.start_date)}
                    {task.recurrence !== "once" && (
                      <>
                        <span className="task-meta-separator" aria-hidden>→</span>
                        {task.end_date
                          ? formatDateLabel(task.end_date)
                          : <span className="task-meta-fallback">No end date</span>}
                      </>
                    )}
                  </span>
                  <span className="task-meta-item">
                    🕒 {formatTimeLabel(task.start_time)}
                  </span>
                  {task.recurrence === "weekly" && (
                    <span className="task-meta-item">
                      📆 {formatWeekdayMask(task.weekday_mask) ?? "No days"}
                    </span>
                  )}
                </div>
              </div>
              <div className="task-card-actions">
                <button
                  className="icon-action-button edit-button"
                  onClick={() => onEdit(task)}
                  type="button"
                  title="Edit task"
                >
                  ✏️
                </button>
                <button
                  className="icon-action-button delete-button"
                  onClick={() => onDelete(task)}
                  type="button"
                  title="Delete task"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
