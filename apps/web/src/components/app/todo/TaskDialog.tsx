"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faBoxArchive, faBan, faCheck, faCircleCheck, faPlus, faRotateLeft, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { Task, TaskList } from "../../../lib/workspace";
import type { Draft } from "../../../lib/tasks";
import { useState } from "react";
import Modal from "../../ui/Modal";
import TaskForm from "./TaskForm";

/** Quick add (task = null) and edit (task = the task) share one dialog. */
export default function TaskDialog({
  task,
  initial,
  lists,
  onSave,
  onClose,
  onToggle,
  onCancelTask,
  onArchive,
  onDelete,
  subtasks = [],
  onAddSub,
  onDeleteSub,
}: {
  task: Task | null;
  initial: Draft;
  lists: TaskList[];
  onSave: (d: Draft) => Promise<void>;
  onClose: () => void;
  onToggle?: (t: Task) => void;
  onCancelTask?: (t: Task) => void;
  onArchive?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  /** Sub-tasks of `task` (edit mode only). */
  subtasks?: Task[];
  onAddSub?: (title: string) => Promise<void> | void;
  onDeleteSub?: (t: Task) => void;
}) {
  const [sub, setSub] = useState("");
  const list = task ? lists.find((l) => l.id === task.list_id) : undefined;
  return (
    <Modal label={task ? "Edit task" : "Add task"} onClose={onClose} size={task ? "side" : "md"}>
      <div className="td">
        <div className="td-head">
          <h2 className="h3">{task ? `Task · ${list?.name ?? "Inbox"}` : "Add task"}</h2>
          <button className="ne-btn" aria-label="Close" onClick={onClose}>
            <FA icon={faXmark} />
          </button>
        </div>
        <TaskForm
          initial={initial}
          draftKey={task ? undefined : "todo:new-task"}
          lists={lists}
          submitLabel={task ? "Save" : "Add task"}
          onSubmit={async (d) => {
            await onSave(d);
            onClose();
          }}
          onCancel={onClose}
        />
        {task && (
          <section className="td-subs" aria-label="Sub-tasks">
            <h3>
              Sub-tasks{subtasks.length > 0 && <small>{subtasks.filter((s) => s.done).length}/{subtasks.length}</small>}
            </h3>
            <ul>
              {subtasks.map((s) => (
                <li key={s.id} data-done={s.done}>
                  <button
                    className="ti-check"
                    data-p={s.priority}
                    role="checkbox"
                    aria-checked={s.done}
                    aria-label={`Mark “${s.title}” ${s.done ? "not done" : "done"}`}
                    onClick={() => onToggle?.(s)}
                  >
                    {s.done && <FA icon={faCheck} />}
                  </button>
                  <span>{s.title}</span>
                  <button className="icon-btn" aria-label={`Delete sub-task “${s.title}”`} onClick={() => onDeleteSub?.(s)}>
                    <FA icon={faTrash} />
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const v = sub.trim();
                if (!v) return;
                setSub("");
                await onAddSub?.(v.slice(0, 300));
              }}
            >
              <FA icon={faPlus} />
              <input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Add a sub-task" maxLength={300} aria-label="Add a sub-task" />
            </form>
          </section>
        )}
        {task && (
          <div className="td-extra">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onToggle?.(task);
                onClose();
              }}
            >
              <FA icon={task.done ? faRotateLeft : faCircleCheck} /> {task.done ? "Mark not done" : "Complete"}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onCancelTask?.(task);
                onClose();
              }}
            >
              <FA icon={task.cancelled ? faRotateLeft : faBan} /> {task.cancelled ? "Restore" : "Cancel task"}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                onArchive?.(task);
                onClose();
              }}
            >
              <FA icon={task.archived ? faRotateLeft : faBoxArchive} /> {task.archived ? "Unarchive" : "Archive"}
            </button>
            <button className="btn btn-secondary btn-sm td-del" onClick={() => onDelete?.(task)}>
              <FA icon={faTrash} /> Delete
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
