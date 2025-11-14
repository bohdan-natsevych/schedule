export type Recurrence = "once" | "daily" | "weekly";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;  // Optional for legacy tasks
  end_time?: string | null;
  recurrence: Recurrence;
  weekday_mask?: string | null;
  icon_path?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  font_size?: number | null;
  is_all_day: boolean;
}

export interface TaskCreateData {
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time: string;  // REQUIRED for new tasks
  end_time?: string | null;
  recurrence: Recurrence;
  weekday_mask?: string | null;
  icon_path?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  font_size?: number | null;
  is_all_day: boolean;
}

export type TaskCreate = TaskCreateData;
export type TaskUpdate = Partial<TaskCreateData>;

export interface TaskOccurrence {
  task_id: number;
  title: string;
  description?: string | null;
  date: string;
  start_time?: string | null;  // Optional for legacy tasks
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

export interface TaskDayOverride {
  id: number;
  task_id: number;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
}

export type TaskDayOverrideCreate = Omit<TaskDayOverride, "id">;
export type TaskDayOverrideUpdate = Partial<Omit<TaskDayOverrideCreate, "task_id" | "date">>;