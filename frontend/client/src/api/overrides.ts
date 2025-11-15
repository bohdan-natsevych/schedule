import { TaskDayOverride, TaskDayOverrideCreate } from "../types";
import { api } from "./client";

export async function fetchAllOverrides(): Promise<TaskDayOverride[]> {
  const response = await api.get("/overrides/");
  return response.data;
}

export async function createOverride(override: TaskDayOverrideCreate): Promise<TaskDayOverride> {
  const response = await api.post("/overrides/", override);
  return response.data;
}

export async function fetchOverridesForTask(taskId: number): Promise<TaskDayOverride[]> {
  const response = await api.get(`/overrides/task/${taskId}`);
  return response.data;
}

export async function upsertOverride(
  taskId: number,
  date: string,
  startTime?: string | null,
  endTime?: string | null
): Promise<TaskDayOverride> {
  const params = new URLSearchParams();
  params.append("task_id", taskId.toString());
  params.append("override_date", date);
  if (startTime) params.append("start_time", startTime);
  if (endTime) params.append("end_time", endTime);
  
  const response = await api.put(`/overrides/upsert?${params.toString()}`);
  return response.data;
}

export async function deleteOverride(overrideId: number): Promise<void> {
  await api.delete(`/overrides/${overrideId}`);
}

export async function uploadOverrideIcon(overrideId: number, file: File): Promise<TaskDayOverride> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<TaskDayOverride>(`/overrides/${overrideId}/icon`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateOverrideIconSize(
  overrideId: number,
  iconWidth: number,
  iconHeight: number
): Promise<TaskDayOverride> {
  const { data } = await api.put<TaskDayOverride>(`/overrides/${overrideId}`, {
    icon_width: iconWidth,
    icon_height: iconHeight,
  });
  return data;
}

