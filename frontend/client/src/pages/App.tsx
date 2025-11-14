import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Header from "../components/Header";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import CalendarView from "../components/CalendarView";
import IconUploader from "../components/IconUploader";
import EventTimeEditor from "../components/EventTimeEditor";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  uploadTaskIcon,
} from "../api/tasks";
import { fetchAllOverrides, upsertOverride } from "../api/overrides";
import { sendHeartbeat } from "../api/client";
import { Task, TaskCreate, TaskUpdate } from "../types";
import { differenceInCalendarDays, parseISO } from "date-fns";

export default function App() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });
  const { data: overrides = [] } = useQuery({
    queryKey: ["overrides"],
    queryFn: fetchAllOverrides,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [editingEventDate, setEditingEventDate] = useState<Date | null>(null);

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
      end_time: null,
      description: null,
      font_size: null,
      is_all_day: false,
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

  const handleCancelEdit = () => {
    setSelectedTask(null);
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

  const handleUpdateEventTime = async (taskId: number, date: string, startTime: string | null) => {
    await upsertOverride(taskId, date, startTime, null);
    queryClient.invalidateQueries({ queryKey: ["overrides"] });
  };

  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find((task) => task.id === selectedTask.id);
    if (updated) {
      setSelectedTask(updated);
    }
  }, [tasks, selectedTask?.id]);

  // Heartbeat to keep server alive
  useEffect(() => {
    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 3 seconds
    const heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 3000);

    // CURSOR: Removed automatic shutdown on beforeunload as it triggers on page refresh

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, []);

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
          <h2 style={{ marginTop: 0 }}>{selectedTask ? 'Edit Task' : 'Create Task'}</h2>
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={selectedTask ? handleCancelEdit : undefined}
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
              overrides={overrides}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(date)}
              onEditDayEvents={(date) => setEditingEventDate(date)}
            />
          </div>
        </main>
      </div>

      {editingEventDate && (
        <EventTimeEditor
          date={editingEventDate}
          tasks={tasks}
          overrides={overrides}
          onUpdateTime={handleUpdateEventTime}
          onClose={() => setEditingEventDate(null)}
        />
      )}
    </div>
  );
}
