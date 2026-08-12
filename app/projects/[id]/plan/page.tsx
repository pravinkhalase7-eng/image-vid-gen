"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MoviePlan } from "@/components/story/movie-plan";

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<null | {
    id: string;
    title: string;
    topic: string;
    estimatedScenes?: number | null;
    duration: number;
    characters: { name: string; species: string; appearance: string; clothing: string; personality: string }[];
    scenes: { id: string; order: number; title: string; duration: number; camera: string }[];
    world?: { environment: string } | null;
    promptPack?: {
      title: string;
      instructions: string;
      masterLock: string;
      negative: string;
      scenes: { order: number; title: string; duration: number; prompt: string }[];
      all: string;
    } | null;
  }>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}/plan`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  if (!project) return <p className="text-muted">Loading your movie plan...</p>;
  return <MoviePlan project={project} />;
}
