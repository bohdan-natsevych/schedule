import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Header from "../components/Header";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import CalendarView from "../components/CalendarView";
import IconUploader from "../components/IconUploader";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  uploadTaskIcon,
} from "../api/tasks";
import { Task, TaskCreate, TaskUpdate } from "../types";
import { differenceInCalendarDays, parseISO } from "date-fns";

export default function App() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TaskUpdate }) =>
      updateTask(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const iconMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      uploadTaskIcon(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSubmit = (data: TaskCreate) => {
    const payload: TaskCreate = {
      ...data,
      start_time: null,
      end_time: null,
      description: null,
      font_size: null,
      is_all_day: true,
      weekday_mask: data.recurrence === "weekly" ? data.weekday_mask : null,
    };

    if (selectedTask) {
      updateMutation.mutate({ id: selectedTask.id, payload });
    } else {
      createMutation.mutate(payload);
    }
    setSelectedTask(null);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
  };

  const handleDelete = (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
    }
  };

  const handleUpload = async (task: Task, file: File) => {
    await iconMutation.mutateAsync({ id: task.id, file });
  };

  const handleResize = (task: Task, dimensions: { icon_width: number; icon_height: number }) => {
    updateMutation.mutate({
      id: task.id,
      payload: dimensions,
    });
  };

  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find((task) => task.id === selectedTask.id);
    if (updated) {
      setSelectedTask(updated);
    }
  }, [tasks, selectedTask?.id]);

  const defaultStartDate = useMemo(() => {
    if (!selectedDate) return new Date().toISOString().slice(0, 10);
    return selectedDate.toISOString().slice(0, 10);
  }, [selectedDate]);

  const hasRecurrence = selectedTask?.recurrence !== "once";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header />
      <div className="app-shell">
        <aside className="sidebar">
          <h2 style={{ marginTop: 0 }}>Create Task</h2>
          <TaskForm
            onSubmit={handleSubmit}
            submitting={createMutation.isPending || updateMutation.isPending}
            defaultValues={{
              ...(selectedTask ?? {}),
              start_date: selectedTask?.start_date ?? defaultStartDate,
              end_date: selectedTask?.end_date,
            }}
          />

          <h3>Existing Tasks</h3>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
          )}

          {selectedTask && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Icon</h3>
              <IconUploader
                taskId={selectedTask.id}
                iconPath={selectedTask.icon_path ?? undefined}
                iconWidth={selectedTask.icon_width ?? undefined}
                iconHeight={selectedTask.icon_height ?? undefined}
                onUpload={(file) => handleUpload(selectedTask, file)}
                onResize={(dimensions) => handleResize(selectedTask, dimensions)}
              />
            </div>
          )}
        </aside>
        <main className="main-content">
          <div className="calendar-container">
            <CalendarView
              tasks={tasks}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
