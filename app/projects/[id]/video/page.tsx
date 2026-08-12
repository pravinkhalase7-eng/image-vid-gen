"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/video/player";
import { SceneList } from "@/components/video/scene-list";
import { CharacterCard } from "@/components/story/character-card";
import { Button } from "@/components/ui/button";

type Project = {
  id: string;
  title: string;
  script: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  characters: { name: string; species: string; appearance: string; clothing: string; personality: string }[];
  scenes: {
    id: string;
    title: string;
    duration: number;
    startOffset?: number | null;
    thumbnailUrl?: string | null;
    status: string;
  }[];
};

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((d) => setProject(d.project));
  }, [id]);

  if (!project) return <p className="text-muted">Loading your movie...</p>;
  if (!project.videoUrl) {
    return <p className="text-muted">The movie isn&apos;t ready yet.</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Now playing</p>
        <h1 className="mt-2 font-display text-4xl">{project.title}</h1>
      </div>
      <VideoPlayer src={project.videoUrl} poster={project.thumbnailUrl} title={project.title} />

      <section>
        <h2 className="font-display text-2xl">Story</h2>
        <p className="mt-3 max-w-3xl whitespace-pre-wrap text-muted">{project.script}</p>
      </section>

      <section>
        <h2 className="font-display text-2xl">Characters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {project.characters.map((c) => (
            <CharacterCard key={c.name} character={c} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl">Scenes</h2>
        <p className="mt-1 text-sm text-muted">Tap a scene to jump there.</p>
        <div className="mt-4">
          <SceneList scenes={project.scenes} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.scenes.map((scene) => (
            <Button
              key={scene.id}
              size="sm"
              variant="outline"
              disabled={busyId === scene.id}
              onClick={async () => {
                setBusyId(scene.id);
                await fetch(`/api/projects/${id}/scenes/${scene.id}/regenerate`, { method: "POST" });
                window.location.href = `/projects/${id}/generate`;
              }}
            >
              Redo {scene.title}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
