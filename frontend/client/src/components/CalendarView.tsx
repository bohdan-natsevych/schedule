import { useMemo, useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Event, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO } from "date-fns";

import { Task, TaskDayOverride } from "../types";

import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": new Intl.DateTimeFormat("en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarViewProps {
  tasks: Task[];
  overrides: TaskDayOverride[];
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
  onEditDayEvents?: (date: Date) => void;
}

interface CalendarEvent extends Event {
  resource: Task;
}

export default function CalendarView({
  tasks,
  overrides,
  selectedDate,
  onSelectDate,
  onEditDayEvents,
}: CalendarViewProps) {
  const [view, setView] = useState<View>("month");
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);
  const [lastClickWasOnEvent, setLastClickWasOnEvent] = useState(false);

  const events = useMemo<CalendarEvent[]>(() => {
    // CURSOR: Build a map of overrides by task_id and date for quick lookup
    const overrideMap = new Map<string, TaskDayOverride>();
    for (const override of overrides) {
      const key = `${override.task_id}-${override.date}`;
      overrideMap.set(key, override);
    }
    
    const calendarEvents: CalendarEvent[] = [];

    for (const task of tasks) {
      if (task.recurrence === "once") {
        // CURSOR: Single day event spanning from start_date to end_date
        const startDate = task.start_date;
        const endDate = task.end_date ?? task.start_date;
        
        // CURSOR: Check for override times for this specific date
        const overrideKey = `${task.id}-${startDate}`;
        const override = overrideMap.get(overrideKey);
        const startTime = override?.start_time || task.start_time;
        const endTime = override?.end_time || task.end_time;
        
        const start = startTime
          ? parseISO(`${startDate}T${startTime}`)
          : parseISO(`${startDate}T00:00:00`);
        const end = endTime
          ? parseISO(`${endDate}T${endTime}`)
          : parseISO(`${endDate}T23:59:59`);
        
        calendarEvents.push({
          title: task.title,
          start,
          end,
          allDay: task.is_all_day,
          resource: task,
        });
      } else if (task.recurrence === "daily" || task.recurrence === "weekly") {
        // CURSOR: Expand recurring tasks into individual daily occurrences
        const startDate = parseISO(task.start_date);
        const endDate = task.end_date ? parseISO(task.end_date) : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        const weekdayMask = task.recurrence === "weekly" && task.weekday_mask
          ? task.weekday_mask.split(",").map(d => d.trim().toLowerCase())
          : [];
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          let includeDate = false;
          
          if (task.recurrence === "daily") {
            includeDate = true;
          } else if (task.recurrence === "weekly") {
            const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            const dayName = dayNames[currentDate.getDay()];
            includeDate = weekdayMask.includes(dayName);
          }
          
          if (includeDate) {
            const dateStr = format(currentDate, "yyyy-MM-dd");
            const overrideKey = `${task.id}-${dateStr}`;
            const override = overrideMap.get(overrideKey);
            
            // CURSOR: Use override times if they exist, otherwise use task's default times
            const startTime = override?.start_time || task.start_time;
            const endTime = override?.end_time || task.end_time;
            
            const start = startTime
              ? parseISO(`${dateStr}T${startTime}`)
              : parseISO(`${dateStr}T00:00:00`);
            const end = endTime
              ? parseISO(`${dateStr}T${endTime}`)
              : parseISO(`${dateStr}T23:59:59`);
            
            calendarEvents.push({
              title: task.title,
              start,
              end,
              allDay: task.is_all_day,
              resource: task,
            });
          }
          
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    }

    // CURSOR: Sort events by start time so they appear in correct order on calendar
    calendarEvents.sort((a, b) => {
      if (a.start instanceof Date && b.start instanceof Date) {
        return a.start.getTime() - b.start.getTime();
      }
      return 0;
    });

    return calendarEvents;
  }, [tasks, overrides]);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const now = Date.now();
    const timeDiff = now - lastClickTime;
    
    // Check if this is a double-click (within 300ms and same date)
    if (timeDiff < 300 && lastClickedDate && 
        lastClickedDate.getDate() === start.getDate() &&
        lastClickedDate.getMonth() === start.getMonth() &&
        lastClickedDate.getFullYear() === start.getFullYear()) {
      // Double-click detected - check if there are events on this day
      const dateStr = format(start, "yyyy-MM-dd");
      const hasEventsOnDay = events.some(event => {
        if (event.start instanceof Date) {
          return format(event.start, "yyyy-MM-dd") === dateStr;
        }
        return false;
      });
      
      if (hasEventsOnDay && onEditDayEvents) {
        onEditDayEvents(start);
      }
    } else {
      // Single click
      onSelectDate?.(start);
    }
    
    setLastClickTime(now);
    setLastClickedDate(start);
    setLastClickWasOnEvent(false);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.start instanceof Date) {
      const now = Date.now();
      const timeDiff = now - lastClickTime;
      
      // Check if this is a double-click
      if (timeDiff < 300 && lastClickedDate && 
          lastClickedDate.getDate() === event.start.getDate() &&
          lastClickedDate.getMonth() === event.start.getMonth() &&
          lastClickedDate.getFullYear() === event.start.getFullYear() &&
          lastClickWasOnEvent) {
        // Double-click on event - open event order modal
        if (onEditDayEvents) {
          onEditDayEvents(event.start);
        }
      } else {
        // Single click on event - just select the date
        onSelectDate?.(event.start);
      }
      
      setLastClickTime(now);
      setLastClickedDate(event.start);
      setLastClickWasOnEvent(true);
    }
  };

  const handleDoubleClickEvent = (event: CalendarEvent) => {
    if (event.start instanceof Date && onEditDayEvents) {
      onEditDayEvents(event.start);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {selectedDate && onEditDayEvents && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => onEditDayEvents(selectedDate)}
          >
            Edit Event Order for {format(selectedDate, "MMM d, yyyy")}
          </button>
        </div>
      )}
      
      <Calendar
        localizer={localizer}
        events={events}
        view={view}
        onView={setView}
        views={["month", "agenda"]}
        date={selectedDate ?? new Date()}
        onNavigate={(date: Date) => onSelectDate?.(date)}
        length={30}
        formats={{
          agendaDateFormat: "dd/MM/yyyy",
          agendaHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
            `${format(start, "dd/MM/yyyy")} — ${format(end, "dd/MM/yyyy")}`,
          agendaTimeFormat: () => "",
          agendaTimeRangeFormat: () => "",
        }}
        components={{
          event: ({ event }: { event: CalendarEvent }) => <span>{event.title}</span>,
        }}
        style={{ height: "100%" }}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onDoubleClickEvent={handleDoubleClickEvent}
        dayPropGetter={(date: Date) => {
          const isSelected =
            selectedDate &&
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate();
          return {
            className: isSelected ? "rbc-selected-day" : undefined,
          };
        }}
      />
    </div>
  );
}
