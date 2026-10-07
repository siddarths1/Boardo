import { requirePageUser } from "@/lib/auth";
import { TaskWorkspace } from "@/components/TaskWorkspace";
export default async function TasksPage() { await requirePageUser(); return <TaskWorkspace />; }
