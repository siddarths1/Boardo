"use client";

import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";

export default function ProjectsSettingsPage() {
  async function handleSubmit(data: { name: string; order?: number }) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create project");
    }
    window.dispatchEvent(new CustomEvent("projects-refresh"));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Manage projects</h1>
      <p className="mt-1 text-sm text-gray-600">Add, rename, reorder, or archive projects.</p>

      <div className="mt-6">
        <h2 className="text-lg font-medium text-gray-900">Add project</h2>
        <div className="mt-2">
          <ProjectForm onSubmit={handleSubmit} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Projects</h2>
        <div className="mt-3">
          <ProjectList />
        </div>
      </div>
    </div>
  );
}
