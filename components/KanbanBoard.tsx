"use client";
import { useState } from "react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, closestCenter, pointerWithin } from "@dnd-kit/core";
import { SortableContext, useSortable, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { request } from "@/lib/client";
import { Task } from "@/lib/types";
import { useToday } from "./useToday";
import { TaskForm } from "./TaskForm";
const columns = [{ id: "Todo", label: "To do" }, { id: "InProgress", label: "In progress" }, { id: "Done", label: "Done" }];
function Card({ task, index, busy, edit, move }: { task: Task; index: number; busy: boolean; edit: () => void; move: (column: string, index: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: busy, data: { columnId: task.column, index } });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 }} className="board-card">
    <div className="section-heading"><span className={"priority priority-" + task.priority.toLowerCase()}>{task.priority}</span><button className="drag-handle" {...attributes} {...listeners} aria-label={"Move " + task.title}>⠿</button></div>
    <h3>{task.title}</h3><p className="small muted">{task.estimatedMinutes} min · {task.energy} energy{task.dueDate ? " · " + task.dueDate.slice(0,10) : ""}</p>
    {task.blockedReason && <p className="small notice">{task.blockedReason}</p>}
    <div className="actions"><button className="button-text" onClick={edit}>Edit</button><select aria-label={"Status of " + task.title} value={task.column} disabled={busy} onChange={(e) => move(e.target.value, 0)}>{columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select><button className="button-text" disabled={busy || index === 0} onClick={() => move(task.column, index - 1)} aria-label={"Move " + task.title + " up"}>↑</button></div>
  </li>;
}
function Column({ id, label, tasks, busy, edit, move }: { id: string; label: string; tasks: Task[]; busy: boolean; edit: (task: Task) => void; move: (task: Task, column: string, index: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { columnId: id, index: tasks.length } });
  return <section ref={setNodeRef} className={"board-column " + (isOver ? "is-over" : "")}><div className="section-heading"><h2>{label}</h2><span className="pill">{tasks.length}</span></div><SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}><ul>{tasks.map((task, index) => <Card key={task.id} task={task} index={index} busy={busy} edit={() => edit(task)} move={(column, position) => move(task, column, position)} />)}</ul></SortableContext>{!tasks.length && <p className="small muted">Drop a task here.</p>}</section>;
}
export function KanbanBoard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data, error, busy, mutate, reload, setError } = useToday(); const [editing, setEditing] = useState<Task | null>(null); const [adding, setAdding] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const move = (task: Task, column: string, index: number) => { void mutate(() => request("/api/tasks/" + task.id, "PATCH", { version: task.version, column, orderInColumn: index })).catch(() => {}); };
  function dragEnd(event: DragEndEvent) {
    if (!data || busy || !event.over || event.over.id === event.active.id) return;
    const task = data.tasks.find((t) => t.id === event.active.id); const target = event.over.data.current;
    if (task && target?.columnId) move(task, target.columnId as string, Number(target.index || 0));
  }
  if (!data) return <div className="empty-state"><h1>{projectName}</h1><p>{error || "Loading board…"}</p>{error && <button onClick={() => void reload().catch((e) => setError(e.message))}>Retry</button>}</div>;
  return <div><div className="page-heading"><div><p className="eyebrow">YOUR PROJECT, IN MOTION</p><h1>{projectName}</h1></div><button className="button" onClick={() => { setAdding(!adding); setEditing(null); }}>＋ Add task</button></div>{error && <p role="alert" className="error">{error}<button className="button-text" onClick={() => void reload().then(() => setError("")).catch((e) => setError(e.message))}>Refresh</button></p>}
    {(adding || editing) && <section className="panel capture-panel"><TaskForm key={editing?.id || "new"} projects={data.projects} goals={data.goals} tasks={data.tasks} initial={editing || { projectId }} onCancel={() => { setAdding(false); setEditing(null); }} onSubmit={async (input) => { await mutate(() => request(editing ? "/api/tasks/" + editing.id : "/api/tasks", editing ? "PATCH" : "POST", editing ? { ...input, version: editing.version } : input)); setAdding(false); setEditing(null); }} /></section>}
    <DndContext sensors={sensors} collisionDetection={(args) => { const hits = pointerWithin(args); return hits.length ? hits : closestCenter(args); }} onDragEnd={dragEnd}><div className="kanban">{columns.map((column) => <Column key={column.id} {...column} busy={busy} tasks={data.tasks.filter((t) => t.projectId === projectId && t.column === column.id).sort((a,b) => a.orderInColumn - b.orderInColumn)} edit={(task) => { setEditing(task); setAdding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} move={move} />)}</div></DndContext>
    <p className="small muted">Drag by the handle, use the keyboard, or change status from a card. Dates stay attached to your tasks.</p>
  </div>;
}
