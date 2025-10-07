import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, parseISO } from "date-fns";

import { Task } from "../types";

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
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
}

interface CalendarEvent extends Event {
  resource: Task;
}

export default function CalendarView({
  tasks,
  selectedDate,
  onSelectDate,
}: CalendarViewProps) {
  const events = useMemo<CalendarEvent[]>(
    () =>
      tasks.map((task) => ({
        title: task.title,
        start: task.start_time
          ? parseISO(`${task.start_date}T${task.start_time}`)
          : parseISO(`${task.start_date}T00:00:00`),
        end: task.end_time
          ? parseISO(`${task.end_date ?? task.start_date}T${task.end_time}`)
          : parseISO(`${task.end_date ?? task.start_date}T23:59:59`),
        allDay: task.is_all_day,
        resource: task,
      })),
    [tasks]
  );

  const handleSelectSlot = ({ start }: { start: Date }) => {
    onSelectDate?.(start);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    onSelectDate?.(event.start as Date);
  };

  return (
    <Calendar
      localizer={localizer}
      events={events}
      defaultView="month"
      date={selectedDate ?? new Date()}
      onNavigate={(date) => onSelectDate?.(date)}
      components={{
        event: ({ event }) => <span>{event.title}</span>,
      }}
      style={{ height: "100%" }}
      selectable
      onSelectSlot={handleSelectSlot}
      onSelectEvent={handleSelectEvent}
      dayPropGetter={(date) => {
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
  );
}
