"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/projects/project-card";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<
    { id: string; title: string; status: string; duration: number; createdAt: string; thumbnailUrl?: string | null }[]
  >([]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl">Your stories</h1>
      <p className="mt-2 text-muted">Every movie you&apos;ve started lives here.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-muted">No movies yet. Create one from the studio home.</p>
        )}
      </div>
    </div>
  );
}
