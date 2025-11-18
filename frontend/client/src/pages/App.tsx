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
import { Task, TaskCreate, TaskUpdate } from "../types";

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
  const [newTaskFormResetKey, setNewTaskFormResetKey] = useState(0);
  type EditIconDraft = {
    file: File | null;
    remove: boolean;
    width: number | null;
    height: number | null;
    hasFileChange: boolean;
    hasSizeChange: boolean;
  };
  const [editIconDraft, setEditIconDraftState] = useState<EditIconDraft | null>(null);
  const editIconDraftRef = useRef<EditIconDraft | null>(null);
  const setEditIconDraft = (
    value: EditIconDraft | null | ((prev: EditIconDraft | null) => EditIconDraft | null)
  ) => {
    setEditIconDraftState((prev) => {
      const next = typeof value === "function" ? (value as (prev: EditIconDraft | null) => EditIconDraft | null)(prev) : value;
      editIconDraftRef.current = next;
      return next;
    });
  };
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
      const draft = editIconDraftRef.current;

      await updateMutation.mutateAsync({ id: selectedTask.id, payload });

      if (draft?.remove && selectedTask.icon_path) {
        await updateMutation.mutateAsync({
          id: selectedTask.id,
          payload: { icon_path: null, icon_width: null, icon_height: null },
        });
      }

      if (!draft?.remove && draft?.hasFileChange && draft.file) {
        await iconMutation.mutateAsync({ id: selectedTask.id, file: draft.file });
      }

      if (!draft?.remove && draft?.hasSizeChange) {
        await updateMutation.mutateAsync({
          id: selectedTask.id,
          payload: {
            icon_width: draft.width,
            icon_height: draft.height,
          },
        });
      }

      setEditIconDraft(null);
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
      setNewTaskFormResetKey((key) => key + 1);
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
    setEditIconDraft(null);
    setIsEditModalOpen(false);
  };

  const handleDelete = (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      deleteMutation.mutate(task.id);
      // If deleting the currently selected task, clear selection but keep modal open
      if (selectedTask?.id === task.id) {
        setSelectedTask(null);
      }
    }
  };

  const handleDeleteOccurrence = async (taskId: number, date: string) => {
    // CURSOR: Hide specific occurrence of recurring task and wait for data to refresh
    const { hideOccurrence } = await import("../api/overrides");
    await hideOccurrence(taskId, date);
    await queryClient.invalidateQueries({ queryKey: ["overrides"] });
  };

  const handleEditIconUpload = (file: File) => {
    if (!selectedTask) {
      return;
    }
    setEditIconDraft((prev) => ({
      file,
      remove: false,
      width: prev?.width ?? selectedTask?.icon_width ?? null,
      height: prev?.height ?? selectedTask?.icon_height ?? null,
      hasFileChange: true,
      hasSizeChange: prev?.hasSizeChange ?? false,
    }));
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
    if (task.id !== selectedTask?.id) {
      updateMutation.mutate({
        id: task.id,
        payload: dimensions,
      });
      return;
    }

    if (!selectedTask) {
      return;
    }

    const originalWidth = selectedTask.icon_width ?? null;
    const originalHeight = selectedTask.icon_height ?? null;
    setEditIconDraft((prev) => {
      const width = dimensions.icon_width ?? null;
      const height = dimensions.icon_height ?? null;
      const hasSizeChange = width !== originalWidth || height !== originalHeight;
      return {
        file: prev?.file ?? null,
        remove: prev?.remove ?? false,
        width,
        height,
        hasFileChange: prev?.hasFileChange ?? false,
        hasSizeChange,
      };
    });
  };

  const handleRemoveIcon = () => {
    setEditIconDraft({
      file: null,
      remove: true,
      width: null,
      height: null,
      hasFileChange: false,
      hasSizeChange: false,
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
    // Don't close modal when task is deleted - user might want to see other tasks
  }, [tasks, selectedTask?.id]);

  // Save toggle states to session storage
  useEffect(() => {
    sessionStorage.setItem('isTaskListOpen', JSON.stringify(isTaskListOpen));
  }, [isTaskListOpen]);

  useEffect(() => {
    if (!selectedTask) {
      setEditIconDraft(null);
      return;
    }

    setEditIconDraft((prev) => {
      if (prev) {
        return prev;
      }
      return {
        file: null,
        remove: false,
        width: selectedTask.icon_width ?? null,
        height: selectedTask.icon_height ?? null,
        hasFileChange: false,
        hasSizeChange: false,
      };
    });
  }, [selectedTask]);

  useEffect(() => {
    sessionStorage.setItem('isLeftSidebarOpen', JSON.stringify(isLeftSidebarOpen));
  }, [isLeftSidebarOpen]);

  const defaultStartDate = useMemo(() => {
    const dateToUse = selectedDate || new Date();
    const year = dateToUse.getFullYear();
    const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const day = String(dateToUse.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const hasRecurrence = selectedTask?.recurrence !== "once";

  const newTaskDefaultValues = useMemo(() => ({
    start_date: defaultStartDate,
  }), [defaultStartDate]);

  const selectedTaskDefaultValues = useMemo(() => (
    selectedTask ? { ...selectedTask } : undefined
  ), [selectedTask]);

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
            key={newTaskFormResetKey}
            onSubmit={handleSubmit}
            onClear={handleRemovePendingIcon}
            submitting={createMutation.isPending}
            defaultValues={newTaskDefaultValues}
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
          onDeleteOccurrence={handleDeleteOccurrence}
        />
      )}

      {isEditModalOpen && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{selectedTask ? 'Edit Task' : 'Task Deleted'}</h2>
            {selectedTask && <TaskForm
              onSubmit={handleSubmit}
              onCancel={handleCancelEdit}
              submitting={updateMutation.isPending}
              defaultValues={selectedTaskDefaultValues}
            >
              <div style={{ marginTop: "1rem" }}>
                <IconUploader
                  ref={iconUploaderRef}
                  taskId={selectedTask.id}
                  iconPath={editIconDraft?.remove ? null : selectedTask.icon_path ?? undefined}
                  iconWidth={editIconDraft?.width ?? selectedTask.icon_width ?? undefined}
                  iconHeight={editIconDraft?.height ?? selectedTask.icon_height ?? undefined}
                  onUpload={handleEditIconUpload}
                  onResize={(dimensions) => handleResize(selectedTask, dimensions)}
                  onRemove={handleRemoveIcon}
                  deferActions
                />
              </div>
            </TaskForm>}
            {!selectedTask && (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ marginBottom: '1rem', color: '#6b7280' }}>This task has been deleted.</p>
                <button className="primary-button" onClick={handleCancelEdit}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
