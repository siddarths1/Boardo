import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/KanbanBoard";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const project = await prisma.project.findFirst({ where: { id: (await params).id, userId: user.id, archived: false } });
  if (!project) notFound();
  return <KanbanBoard projectId={project.id} projectName={project.name} />;
}
