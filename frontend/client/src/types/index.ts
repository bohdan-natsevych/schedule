export type Recurrence = "once" | "daily" | "weekly";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  recurrence: Recurrence;
  weekday_mask?: string | null;
  icon_path?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  font_size?: number | null;
  is_all_day: boolean;
}

export type TaskCreate = Omit<Task, "id">;
export type TaskUpdate = Partial<TaskCreate>;

export interface TaskOccurrence {
  task_id: number;
  title: string;
  description?: string | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  icon_path?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  font_size?: number | null;
  is_all_day: boolean;
}

export interface PrintRequest {
  from_date: string;
  to_date: string;
  font_size: number;
}

export interface PrintResponse {
  occurrences: TaskOccurrence[];
  missing_days: string[];
}
