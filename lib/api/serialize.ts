import { mediaUrl } from "@/lib/utils";
import { buildFlowPromptPack } from "@/lib/ai/video/flow-pack";
import type { CharacterBible, PlannedScene, WorldBible } from "@/lib/ai/types";
import type { Character, Scene, VideoProject, World, Story, GenerationJob } from "@prisma/client";

type ProjectBundle = VideoProject & {
  characters?: Character[];
  world?: World | null;
  story?: Story | null;
  scenes?: Scene[];
  jobs?: GenerationJob[];
};

export function serializeProject(project: ProjectBundle) {
  const scenes = (project.scenes ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const activeJob = (project.jobs ?? [])
    .filter((j) => j.status === "QUEUED" || j.status === "RUNNING")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  return {
    id: project.id,
    title: project.title,
    topic: project.topic,
    script: project.script,
    language: project.language,
    status: project.status,
    duration: project.duration,
    actualDuration: project.actualDuration,
    aspectRatio: project.aspectRatio,
    resolution: project.resolution,
    style: project.style,
    voice: project.voice,
    enableNarration: project.enableNarration,
    enableMusic: project.enableMusic,
    styleBible: project.styleBible,
    estimatedScenes: project.estimatedScenes,
    thumbnailUrl: mediaUrl(project.thumbnailPath),
    videoUrl: mediaUrl(project.finalVideoPath),
    errorMessage: project.errorMessage,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    story: project.story
      ? {
          summary: project.story.summary,
          storyArc: project.story.storyArc,
          events: project.story.events,
          emotions: project.story.emotions,
          locations: project.story.locations,
        }
      : null,
    world: project.world
      ? {
          environment: project.world.environment,
          colorPalette: project.world.colorPalette,
          lighting: project.world.lighting,
          timeOfDay: project.world.timeOfDay,
          architecture: project.world.architecture,
          backgroundElements: project.world.backgroundElements,
          bible: project.world.bible,
        }
      : null,
    characters: (project.characters ?? []).map((c) => ({
      id: c.slug,
      name: c.name,
      species: c.species,
      age: c.age,
      appearance: c.appearance,
      clothing: c.clothing,
      personality: c.personality,
      visualFeatures: c.visualFeatures,
      referenceImageUrl: mediaUrl(c.referenceImagePath),
    })),
    scenes: scenes.map((s) => ({
      id: s.id,
      sceneId: s.sceneKey,
      order: s.orderIndex,
      duration: s.duration,
      title: s.title,
      scriptSegment: s.scriptSegment,
      narration: s.narration,
      characters: s.characterSlugs,
      location: s.location,
      timeOfDay: s.timeOfDay,
      emotion: s.emotion,
      camera: s.camera,
      transition: s.transition,
      shotType: s.shotType,
      status: s.status,
      thumbnailUrl: mediaUrl(s.thumbnailPath),
      videoUrl: mediaUrl(s.videoPath),
      startOffset: s.startOffset,
    })),
    job: activeJob
      ? {
          id: activeJob.id,
          type: activeJob.type,
          status: activeJob.status,
          stage: activeJob.stage,
          progress: activeJob.progress,
          message: activeJob.message,
        }
      : null,
    promptPack: serializePromptPack(project),
  };
}

export function serializePromptPack(project: ProjectBundle) {
  if (!project.world || !(project.scenes ?? []).length) return null;
  const scenes = (project.scenes ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const characters: CharacterBible[] = (project.characters ?? []).map((c) => ({
    id: c.slug,
    name: c.name,
    species: c.species,
    age: c.age,
    appearance: c.appearance,
    clothing: c.clothing,
    personality: c.personality,
    visual_features: Array.isArray(c.visualFeatures) ? (c.visualFeatures as string[]) : [],
  }));
  const world: WorldBible = {
    environment: project.world.environment,
    color_palette: Array.isArray(project.world.colorPalette) ? (project.world.colorPalette as string[]) : [],
    lighting: project.world.lighting,
    time_of_day: project.world.timeOfDay,
    architecture: project.world.architecture,
    background_elements: Array.isArray(project.world.backgroundElements)
      ? (project.world.backgroundElements as string[])
      : [],
    bible: project.world.bible,
  };
  const planned: PlannedScene[] = scenes.map((s) => ({
    scene_id: s.sceneKey,
    order: s.orderIndex,
    duration: s.duration,
    title: s.title,
    script_segment: s.scriptSegment,
    narration: s.narration,
    characters: Array.isArray(s.characterSlugs) ? (s.characterSlugs as string[]) : [],
    location: s.location,
    time_of_day: s.timeOfDay,
    emotion: s.emotion,
    visual_prompt: s.visualPrompt,
    camera: s.camera,
    transition: s.transition,
    shot_type: s.shotType,
  }));
  return buildFlowPromptPack({
    title: project.title,
    styleBible: project.styleBible,
    characters,
    world,
    scenes: planned,
    aspectRatio: project.aspectRatio,
  });
}

export function serializeStatus(project: ProjectBundle) {
  const dto = serializeProject(project);
  const steps = buildSteps(project);
  return {
    project_id: project.id,
    job_id: dto.job?.id ?? null,
    status: project.status,
    progress: dto.job?.progress ?? (project.status === "COMPLETED" ? 100 : 0),
    message: dto.job?.message ?? statusCopy(project.status),
    error: project.errorMessage,
    steps,
    scenes: dto.scenes.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      thumbnailUrl: s.thumbnailUrl,
    })),
    videoUrl: dto.videoUrl,
    estimatedScenes: project.estimatedScenes,
  };
}

function statusCopy(status: string) {
  switch (status) {
    case "ANALYZING":
      return "Understanding your story...";
    case "PLANNING":
      return "Designing your characters...";
    case "READY_TO_GENERATE":
      return "Your movie plan is ready.";
    case "GENERATING":
      return "Filming your scenes...";
    case "ASSEMBLING":
      return "Stitching your movie together...";
    case "COMPLETED":
      return "Your movie is ready!";
    case "FAILED":
      return "We hit a snag. You can try again.";
    case "CANCELLED":
      return "Generation cancelled.";
    default:
      return "Ready when you are.";
  }
}

function buildSteps(project: ProjectBundle) {
  const scenes = (project.scenes ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const analyzed = ["PLANNING", "READY_TO_GENERATE", "GENERATING", "ASSEMBLING", "COMPLETED"].includes(project.status);
  const charactersDone = analyzed && (project.characters?.length ?? 0) > 0;
  const worldDone = analyzed && Boolean(project.world);
  const planDone = ["READY_TO_GENERATE", "GENERATING", "ASSEMBLING", "COMPLETED"].includes(project.status);

  const steps: { id: string; label: string; status: string; detail?: string }[] = [
    {
      id: "story",
      label: "Story analyzed",
      status: analyzed ? "completed" : project.status === "ANALYZING" ? "active" : "pending",
    },
    {
      id: "characters",
      label: "Characters created",
      status: charactersDone ? "completed" : project.status === "PLANNING" ? "active" : "pending",
    },
    {
      id: "world",
      label: "World created",
      status: worldDone ? "completed" : "pending",
    },
    {
      id: "plan",
      label: "Movie plan ready",
      status: planDone ? "completed" : "pending",
    },
  ];

  for (const scene of scenes) {
    steps.push({
      id: scene.sceneKey,
      label: scene.title,
      status:
        scene.status === "COMPLETED"
          ? "completed"
          : scene.status === "GENERATING"
            ? "active"
            : scene.status === "FAILED"
              ? "retrying"
              : "pending",
      detail:
        scene.status === "FAILED"
          ? `${scene.title} needs another try...`
          : scene.status === "GENERATING"
            ? "Google is drawing this clip. It usually takes 1–3 minutes."
            : undefined,
    });
  }

  steps.push({
    id: "assemble",
    label: "Final video assembly",
    status:
      project.status === "COMPLETED"
        ? "completed"
        : project.status === "ASSEMBLING"
          ? "active"
          : "pending",
  });

  return steps;
}
