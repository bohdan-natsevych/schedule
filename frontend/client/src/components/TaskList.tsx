import { Task } from "../types";
import { format, parseISO } from "date-fns";
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

export default function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
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
                  <span 
                    className="task-recurrence-badge" 
                    style={{ backgroundColor: getRecurrenceColor(task.recurrence) }}
                  >
                    {getRecurrenceLabel(task.recurrence)}
                  </span>
                </div>
                <div className="task-card-meta">
                  <span className="task-meta-item">
                    📅 {format(new Date(task.start_date), "MMM d, yyyy")}
                  </span>
                  <span className="task-meta-item">
                    🕐 {task.start_time || "09:00"}
                  </span>
                  {task.recurrence !== "once" && task.end_date && (
                    <span className="task-meta-item">
                      ↔ {format(new Date(task.end_date), "MMM d, yyyy")}
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
