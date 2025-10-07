import { addDays, format, parseISO, startOfDay } from "date-fns";

export const formatDate = (date: string | Date) =>
  format(typeof date === "string" ? parseISO(date) : date, "yyyy-MM-dd");

export const toDate = (date: string | Date) =>
  startOfDay(typeof date === "string" ? parseISO(date) : date);

export const range = (start: Date, end: Date) => {
  const dates: Date[] = [];
  let current = startOfDay(start);
  const last = startOfDay(end);
  while (current <= last) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
};
