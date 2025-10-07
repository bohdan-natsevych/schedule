import { api } from "./client";
import {
  Task,
  TaskCreate,
  TaskUpdate,
  PrintRequest,
  PrintResponse,
} from "../types";

export const fetchTasks = async (): Promise<Task[]> => {
  const { data } = await api.get<Task[]>("/tasks");
  return data;
};

export const createTask = async (payload: TaskCreate): Promise<Task> => {
  const { data } = await api.post<Task>("/tasks", payload);
  return data;
};

export const updateTask = async (
  id: number,
  payload: TaskUpdate
): Promise<Task> => {
  const { data } = await api.put<Task>(`/tasks/${id}`, payload);
  return data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const uploadTaskIcon = async (
  id: number,
  file: File
): Promise<Task> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<Task>(`/tasks/${id}/icon`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const preparePrint = async (
  payload: PrintRequest
): Promise<PrintResponse> => {
  const { data } = await api.post<PrintResponse>("/tasks/print", payload);
  return data;
};
