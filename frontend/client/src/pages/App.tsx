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
  const [isTaskListOpen, setIsTaskListOpen] = useState(() => {
    const saved = sessionStorage.getItem('isTaskListOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(() => {
    const saved = sessionStorage.getItem('isLeftSidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const iconUploaderRef = useRef<IconUploaderRef>(null);
  const newTaskIconUploaderRef = useRef<IconUploaderRef>(null);
  const googleCalendarSectionRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
      setSuccessMessage("Task updated successfully!");
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
      setSuccessMessage("Task created successfully!");
      // Clear the icon uploader
      newTaskIconUploaderRef.current?.applyPendingChanges();
    }
    setSelectedTask(null);
    setIsEditModalOpen(false);
    
    // Hide success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setSelectedTask(null);
    setPendingIconFile(null);
    setPendingIconDimensions({ width: 150, height: 150 });
    setIsEditModalOpen(false);
  };

  const handleDelete = (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
        setIsEditModalOpen(false);
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

  // Save toggle states to session storage
  useEffect(() => {
    sessionStorage.setItem('isTaskListOpen', JSON.stringify(isTaskListOpen));
  }, [isTaskListOpen]);

  useEffect(() => {
    sessionStorage.setItem('isLeftSidebarOpen', JSON.stringify(isLeftSidebarOpen));
  }, [isLeftSidebarOpen]);

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
      {successMessage && (
        <div className="success-notification">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}
      <div className="app-shell">
        <aside className={`sidebar ${isLeftSidebarOpen ? 'open' : 'closed'}`} ref={sidebarRef}>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            title={isLeftSidebarOpen ? 'Hide panel' : 'Show panel'}
          >
            {isLeftSidebarOpen ? '◀' : '▶'}
          </button>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem" }}>Create New Task</h2>
          <TaskForm
            onSubmit={handleSubmit}
            onClear={handleRemovePendingIcon}
            submitting={createMutation.isPending}
            defaultValues={{
              start_date: defaultStartDate,
            }}
          >
            <IconUploader
              ref={newTaskIconUploaderRef}
                iconPath={pendingIconFile ? URL.createObjectURL(pendingIconFile) : undefined}
                iconWidth={pendingIconDimensions.width}
                iconHeight={pendingIconDimensions.height}
                onUpload={handlePendingIconUpload}
                onResize={handlePendingIconResize}
                onRemove={handleRemovePendingIcon}
              />
          </TaskForm>

          <div ref={googleCalendarSectionRef} style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
            <GoogleCalendarSync onConnectStart={() => {
              // Scroll to make Google Calendar section visible with more space
              setTimeout(() => {
                const section = googleCalendarSectionRef.current;
                const sidebar = sidebarRef.current;
                if (section && sidebar) {
                  const sectionTop = section.offsetTop;
                  sidebar.scrollTo({ top: sectionTop - 20, behavior: 'smooth' });
                }
              }, 100);
            }} />
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
        <aside className={`task-sidebar ${isTaskListOpen ? 'open' : 'closed'}`}>
          <button 
            className="task-sidebar-toggle"
            onClick={() => setIsTaskListOpen(!isTaskListOpen)}
            title={isTaskListOpen ? 'Hide tasks' : 'Show tasks'}
          >
            {isTaskListOpen ? '▶' : '◀'}
          </button>
          <div className="task-sidebar-content">
            <div className="task-sidebar-header">
              <h3>All Tasks</h3>
              <span className="task-count-badge">{tasks.length}</span>
            </div>
            {isLoading ? (
              <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>
            ) : (
              <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </div>
        </aside>
      </div>

      {editingEventDate && (
        <EventTimeEditor
          date={editingEventDate}
          tasks={tasks}
          overrides={overrides}
          onUpdateTime={handleUpdateEventTime}
          onClose={() => setEditingEventDate(null)}
          onEditTask={handleEdit}
          onDeleteTask={handleDelete}
        />
      )}

      {isEditModalOpen && selectedTask && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Edit Task</h2>
            <TaskForm
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              submitting={updateMutation.isPending}
              defaultValues={{
                ...selectedTask,
              }}
            >
              <div style={{ marginTop: "1rem" }}>
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
              </div>
            </TaskForm>
          </div>
        </div>
      )}
    </div>
  );
}
