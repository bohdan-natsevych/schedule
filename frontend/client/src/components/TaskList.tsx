import { Task } from "../types";

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  if (!tasks.length) {
    return <p style={{ marginTop: "1rem" }}>No tasks yet.</p>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <div key={task.id} className="task-card">
          <h4 style={{ margin: 0 }}>{task.title}</h4>
          <div className="button-group">
            <button
              className="secondary-button"
              onClick={() => onEdit(task)}
              type="button"
            >
              Edit
            </button>
            <button
              className="secondary-button"
              onClick={() => onDelete(task)}
              type="button"
              style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
