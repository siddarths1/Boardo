import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProjectBoardClient } from "@/components/ProjectBoardClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectBoardPage({ params }: Props) {
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, archived: false },
    include: {
      tasks: { orderBy: [{ column: "asc" }, { orderInColumn: "asc" }] },
    },
  });
  if (!project) notFound();

  const tasks = project.tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    project: { name: project.name },
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
      <p className="mt-1 text-sm text-gray-600">Drag cards between columns.</p>
      <div className="mt-6 overflow-x-auto">
        <ProjectBoardClient
          projectId={project.id}
          projectName={project.name}
          initialTasks={tasks}
        />
      </div>
    </div>
  );
}
