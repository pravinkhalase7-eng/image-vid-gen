"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CharacterCard } from "./character-card";
import { PromptPack, type PromptPackData } from "./prompt-pack";
import { formatDuration } from "@/lib/utils";

type Project = {
  id: string;
  title: string;
  topic: string;
  estimatedScenes?: number | null;
  duration: number;
  characters: { name: string; species: string; appearance: string; clothing: string; personality: string }[];
  scenes: { id: string; order: number; title: string; duration: number; camera: string }[];
  world?: { environment: string } | null;
  promptPack?: PromptPackData | null;
};

export function MoviePlan({ project }: { project: Project }) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gold">Your Movie Plan</p>
          <h1 className="mt-2 font-display text-4xl">{project.title}</h1>
          <p className="mt-2 text-muted">{project.topic}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          New story
        </Button>
      </div>

      <Card>
        <p className="text-sm text-muted">
          {project.scenes.length || project.estimatedScenes} scenes ·{" "}
          {formatDuration(project.scenes.reduce((a, s) => a + s.duration, 0) || project.duration)} · copy each
          prompt into Gemini or Google Flow. The character lock is identical on every scene on purpose.
        </p>
      </Card>

      <section>
        <h2 className="font-display text-2xl">Characters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {project.characters.map((c) => (
            <CharacterCard key={c.name} character={c} />
          ))}
        </div>
      </section>

      {project.world && (
        <Card>
          <h2 className="font-display text-2xl">World</h2>
          <p className="mt-3 text-sm text-muted">{project.world.environment}</p>
        </Card>
      )}

      <section>
        <h2 className="font-display text-2xl">Scenes</h2>
        <ol className="mt-4 space-y-3">
          {project.scenes.map((scene) => (
            <li key={scene.id} className="glass flex items-start gap-4 rounded-2xl p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/15 font-display text-gold">
                {scene.order}
              </span>
              <div>
                <p className="font-medium">{scene.title}</p>
                <p className="text-xs text-muted">
                  {scene.duration}s · {scene.camera}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {project.promptPack && <PromptPack pack={project.promptPack} />}
    </div>
  );
}
