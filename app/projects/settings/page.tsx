import { requirePageUser } from "@/lib/auth";
import { ProjectsClient } from "@/components/ProjectsClient";
export default async function SettingsPage() { const user = await requirePageUser(); return <ProjectsClient timezone={user.timezone} />; }
