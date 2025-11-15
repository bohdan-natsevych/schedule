import { useEffect, useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Header from "../components/Header";
import TaskForm from "../components/TaskForm";
import TaskList from "../components/TaskList";
import CalendarView from "../components/CalendarView";
import IconUploader, { IconUploaderRef } from "../components/IconUploader";
import EventTimeEditor from "../components/EventTimeEditor";
import GoogleCalendarSync from "../components/GoogleCalendarSync";
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
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
  const [pendingIconDimensions, setPendingIconDimensions] = useState({ width: 150, height: 150 });
  
  const iconUploaderRef = useRef<IconUploaderRef>(null);
  const newTaskIconUploaderRef = useRef<IconUploaderRef>(null);

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
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || error.message || "Failed to delete task";
      alert(`Error deleting task: ${errorMessage}`);
    },
  });

  const iconMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      uploadTaskIcon(id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const handleSubmit = async (data: TaskCreate) => {
    // Apply any pending custom size changes before saving
    if (selectedTask) {
      iconUploaderRef.current?.applyPendingChanges();
    } else {
      newTaskIconUploaderRef.current?.applyPendingChanges();
    }
    
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
      // Create task and upload icon if pending
      const newTask = await createMutation.mutateAsync(payload);
      if (pendingIconFile && newTask) {
        await iconMutation.mutateAsync({ id: newTask.id, file: pendingIconFile });
        // Update dimensions if not default
        if (pendingIconDimensions.width !== 150 || pendingIconDimensions.height !== 150) {
          await updateMutation.mutateAsync({
            id: newTask.id,
            payload: {
              icon_width: pendingIconDimensions.width,
              icon_height: pendingIconDimensions.height,
            },
          });
        }
      }
      setPendingIconFile(null);
      setPendingIconDimensions({ width: 150, height: 150 });
    }
    setSelectedTask(null);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCancelEdit = () => {
    setSelectedTask(null);
    setPendingIconFile(null);
    setPendingIconDimensions({ width: 150, height: 150 });
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

  const handlePendingIconUpload = (file: File) => {
    setPendingIconFile(file);
  };

  const handlePendingIconResize = (dimensions: { icon_width: number; icon_height: number }) => {
    setPendingIconDimensions({ width: dimensions.icon_width, height: dimensions.icon_height });
  };

  const handleRemovePendingIcon = () => {
    setPendingIconFile(null);
    setPendingIconDimensions({ width: 150, height: 150 });
  };

  const handleResize = (task: Task, dimensions: { icon_width: number; icon_height: number }) => {
    updateMutation.mutate({
      id: task.id,
      payload: dimensions,
    });
  };

  const handleRemoveIcon = (task: Task) => {
    if (confirm('Remove icon from this task?')) {
      updateMutation.mutate({
        id: task.id,
        payload: { icon_path: null, icon_width: null, icon_height: null },
      });
    }
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
    const dateToUse = selectedDate || new Date();
    const year = dateToUse.getFullYear();
    const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const day = String(dateToUse.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
            onCancel={selectedTask ? () => setSelectedTask(null) : undefined}
            onClear={handleRemovePendingIcon}
            submitting={
              selectedTask ? updateMutation.isPending : createMutation.isPending
            }
            defaultValues={{
              ...(selectedTask ?? {}),
              start_date: selectedTask?.start_date ?? defaultStartDate,
              end_date: selectedTask?.end_date,
            }}
          >
            <div style={{ marginTop: "1rem" }}>
              {selectedTask ? (
                <IconUploader
                  ref={iconUploaderRef}
                  taskId={selectedTask.id}
                  iconPath={selectedTask.icon_path ?? undefined}
                  iconWidth={selectedTask.icon_width ?? undefined}
                  iconHeight={selectedTask.icon_height ?? undefined}
                  onUpload={(file) => handleUpload(selectedTask, file)}
                  onResize={(dimensions) => handleResize(selectedTask, dimensions)}
                  onRemove={() => handleRemoveIcon(selectedTask)}
                />
              ) : (
                <IconUploader
                  ref={newTaskIconUploaderRef}
                  iconPath={pendingIconFile ? URL.createObjectURL(pendingIconFile) : undefined}
                  iconWidth={pendingIconDimensions.width}
                  iconHeight={pendingIconDimensions.height}
                  onUpload={handlePendingIconUpload}
                  onResize={handlePendingIconResize}
                  onRemove={handleRemovePendingIcon}
                />
              )}
            </div>
          </TaskForm>

          <h3>Existing Tasks</h3>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
          )}

          <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
            <GoogleCalendarSync />
          </div>
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
