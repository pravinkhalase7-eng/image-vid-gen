import path from "node:path";
import { AssetKind, JobType, ProjectStatus, SceneStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appConfig, MAX_SCENE_RETRIES } from "@/lib/config";
import { logError, logJob } from "@/lib/logging";
import { isNonRetryableProviderError, providerErrorMessage, sceneRetryMessage, userFacingError } from "@/lib/errors";
import { isSafetyPolicyError } from "@/lib/ai/video/sanitize-veo";
import { sleep } from "@/lib/utils";
import { jobQueue } from "./queue";
import { backoffMs, canRetry } from "./retry";
import { getTextProvider, getTTSProvider, getVideoProvider } from "@/lib/ai/providers";
import { MockTextProvider } from "@/lib/ai/providers/mock-text-provider";
import {
  characterBiblePrompt,
  DEFAULT_STYLE_BIBLE,
  scenePlanningPrompt,
  storyAnalysisPrompt,
  worldBiblePrompt,
} from "@/lib/ai/prompts";
import { videoPromptBuilder } from "@/lib/ai/video/prompt-builder";
import { planClipDurations } from "@/lib/ai/video/duration";
import { classifyStory } from "@/lib/ai/safety/classifier";
import { resolveLanguage } from "@/lib/story/language";
import { videoAssembler, frameSize } from "@/lib/video/assembler";
import { musicProvider } from "@/lib/audio/music-provider";
import { projectDir, storage } from "@/lib/storage";
import { normalizeCharacters, normalizeScenes, normalizeStory, normalizeWorld, asString, asStringArray } from "@/lib/ai/normalize";
import type { CharacterBible, PlannedScene, StoryAnalysis, WorldBible } from "@/lib/ai/types";

export async function processOneJob() {
  const job = await jobQueue.claimNext();
  if (!job) return false;

  logJob("job.start", {
    job_id: job.id,
    project_id: job.projectId,
    status: job.status,
  });

  try {
    if (job.type === JobType.ANALYZE) {
      await runAnalyze(job.id, job.projectId);
    } else if (
      job.type === JobType.GENERATE ||
      job.type === JobType.RETRY ||
      job.type === JobType.REGENERATE_SCENE ||
      job.type === JobType.ASSEMBLE
    ) {
      logJob("job.skip_video", { job_id: job.id, project_id: job.projectId, status: job.type });
      await prisma.videoProject.update({
        where: { id: job.projectId },
        data: { status: ProjectStatus.READY_TO_GENERATE, errorMessage: null },
      });
      await prisma.scene.updateMany({
        where: { projectId: job.projectId, status: SceneStatus.GENERATING },
        data: { status: SceneStatus.PENDING },
      });
    } else {
      throw new Error(`Unknown job type ${job.type}`);
    }
    await jobQueue.complete(job.id, "All done");
    logJob("job.complete", { job_id: job.id, project_id: job.projectId, status: "COMPLETED" });
  } catch (error) {
    const message = userFacingError(error, "Something went wrong while making your movie. We'll keep your finished scenes.");
    logError("job.fail", error, { job_id: job.id, project_id: job.projectId });
    await jobQueue.fail(job.id, error instanceof Error ? error.message : String(error), message);
    await prisma.videoProject.update({
      where: { id: job.projectId },
      data: { status: ProjectStatus.FAILED, errorMessage: message },
    });
  }
  return true;
}

async function runAnalyze(jobId: string, projectId: string) {
  const project = await prisma.videoProject.findUniqueOrThrow({ where: { id: projectId } });
  await prisma.videoProject.update({
    where: { id: projectId },
    data: { status: ProjectStatus.ANALYZING, errorMessage: null },
  });
  await jobQueue.heartbeat(jobId, { stage: "safety", progress: 8, message: "Making sure this story is kind and safe..." });

  const safety = await classifyStory({
    title: project.title,
    topic: project.topic,
    script: project.script,
  });

  await prisma.videoProject.update({
    where: { id: projectId },
    data: { safetyResult: safety, status: ProjectStatus.PLANNING },
  });
  await jobQueue.heartbeat(jobId, { stage: "story", progress: 20, message: "Understanding your story..." });

  const clipPlan = planClipDurations({ script: project.script, targetSeconds: project.duration });
  const text = getTextProvider();

  let story: StoryAnalysis;
  let characters: CharacterBible[];
  let world: WorldBible;
  let styleBible = DEFAULT_STYLE_BIBLE;
  let scenes: PlannedScene[];

  if (text instanceof MockTextProvider) {
    const bundle = text.analyze({
      title: project.title,
      topic: project.topic,
      script: project.script,
      targetSeconds: clipPlan.total,
    });
    story = bundle.story;
    characters = bundle.characters;
    world = bundle.world;
    styleBible = bundle.styleBible;
    scenes = bundle.scenes;
  } else {
    story = normalizeStory(
      await text.generateJson<unknown>({
        prompt: storyAnalysisPrompt({ title: project.title, topic: project.topic, script: project.script }),
        schemaName: "story",
      }),
    );
    await jobQueue.heartbeat(jobId, { stage: "characters", progress: 40, message: "Designing your characters..." });
    characters = normalizeCharacters(
      await text.generateJson<unknown>({
        prompt: characterBiblePrompt(story),
        schemaName: "characters",
      }),
    );
    if (characters.length === 0) characters = story.characters;
    await jobQueue.heartbeat(jobId, { stage: "world", progress: 55, message: "Building your magical world..." });
    world = normalizeWorld(
      await text.generateJson<unknown>({
        prompt: worldBiblePrompt(story, project.topic),
        schemaName: "world",
      }),
    );
    await jobQueue.heartbeat(jobId, { stage: "scenes", progress: 70, message: "Planning cinematic scenes..." });
    scenes = normalizeScenes(
      await text.generateJson<unknown>({
        prompt: scenePlanningPrompt({
          title: project.title,
          script: project.script,
          analysis: story,
          characters,
          world,
          targetSeconds: clipPlan.total,
          sceneCount: clipPlan.sceneCount,
          durations: clipPlan.durations,
          sceneBlocks: clipPlan.bodies,
        }),
        schemaName: "scenes",
      }),
      clipPlan.durations,
    );
    scenes = scenes.map((scene, i) => ({
      ...scene,
      script_segment: scene.script_segment || clipPlan.bodies[i] || "",
      narration: scene.spoken_line || scene.narration,
      spoken_line: scene.spoken_line || scene.narration,
    }));
  }

  await persistPlan(projectId, { story, characters, world, styleBible, scenes });
  const plannedSeconds = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  await prisma.videoProject.update({
    where: { id: projectId },
    data: {
      status: ProjectStatus.READY_TO_GENERATE,
      styleBible,
      estimatedScenes: scenes.length,
      duration: plannedSeconds || clipPlan.total,
    },
  });
  await jobQueue.heartbeat(jobId, { stage: "plan", progress: 100, message: "Your movie plan is ready." });
}

async function persistPlan(
  projectId: string,
  plan: {
    story: StoryAnalysis;
    characters: CharacterBible[];
    world: WorldBible;
    styleBible: string;
    scenes: PlannedScene[];
  },
) {
  await prisma.story.upsert({
    where: { projectId },
    create: {
      projectId,
      summary: asString(plan.story.summary),
      storyArc: plan.story.story_arc,
      events: asStringArray(plan.story.events),
      emotions: asStringArray(plan.story.emotions),
      objects: asStringArray(plan.story.objects),
      locations: asStringArray(plan.story.locations),
      analysisJson: plan.story as object,
    },
    update: {
      summary: asString(plan.story.summary),
      storyArc: plan.story.story_arc,
      events: asStringArray(plan.story.events),
      emotions: asStringArray(plan.story.emotions),
      objects: asStringArray(plan.story.objects),
      locations: asStringArray(plan.story.locations),
      analysisJson: plan.story as object,
    },
  });

  await prisma.character.deleteMany({ where: { projectId } });
  for (const c of plan.characters) {
    await prisma.character.create({
      data: {
        projectId,
        slug: asString(c.id) || "character",
        name: asString(c.name),
        species: asString(c.species),
        age: asString(c.age),
        appearance: asString(c.appearance),
        clothing: asString(c.clothing),
        personality: asString(c.personality),
        visualFeatures: asStringArray(c.visual_features),
      },
    });
  }

  await prisma.world.upsert({
    where: { projectId },
    create: {
      projectId,
      environment: asString(plan.world.environment),
      colorPalette: asStringArray(plan.world.color_palette),
      lighting: asString(plan.world.lighting),
      timeOfDay: asString(plan.world.time_of_day),
      architecture: asString(plan.world.architecture),
      backgroundElements: asStringArray(plan.world.background_elements),
      bible: asString(plan.world.bible),
    },
    update: {
      environment: asString(plan.world.environment),
      colorPalette: asStringArray(plan.world.color_palette),
      lighting: asString(plan.world.lighting),
      timeOfDay: asString(plan.world.time_of_day),
      architecture: asString(plan.world.architecture),
      backgroundElements: asStringArray(plan.world.background_elements),
      bible: asString(plan.world.bible),
    },
  });

  await prisma.scene.deleteMany({ where: { projectId } });
  for (const scene of plan.scenes) {
    await prisma.scene.create({
      data: {
        projectId,
        sceneKey: asString(scene.scene_id),
        orderIndex: scene.order,
        duration: scene.duration,
        title: asString(scene.title),
        scriptSegment: asString(scene.script_segment),
        narration: asString(scene.narration),
        characterSlugs: asStringArray(scene.characters),
        location: asString(scene.location),
        timeOfDay: asString(scene.time_of_day),
        emotion: asString(scene.emotion),
        visualPrompt: asString(scene.visual_prompt),
        camera: asString(scene.camera),
        transition: asString(scene.transition),
        shotType: asString(scene.shot_type),
        status: SceneStatus.PENDING,
      },
    });
  }
}

async function runGenerate(jobId: string, projectId: string) {
  await prisma.videoProject.update({
    where: { id: projectId },
    data: { status: ProjectStatus.GENERATING, errorMessage: null },
  });
  const scenes = await prisma.scene.findMany({
    where: { projectId },
    orderBy: { orderIndex: "asc" },
  });
  let done = 0;
  for (const scene of scenes) {
    if (scene.status === SceneStatus.COMPLETED && scene.videoPath) {
      done += 1;
      continue;
    }
    await jobQueue.heartbeat(jobId, {
      stage: scene.sceneKey,
      progress: filmingProgress(done, scenes.length),
      message: `Filming scene ${done + 1} of ${scenes.length}: ${scene.title}... Google is drawing this clip (usually 1–3 minutes).`,
    });
    await generateSceneWithRetry(jobId, projectId, scene.id, async (elapsedMs) => {
      const minutes = Math.max(1, Math.ceil(elapsedMs / 60_000));
      await jobQueue.heartbeat(jobId, {
        stage: scene.sceneKey,
        progress: filmingProgress(done, scenes.length),
        message: `Filming scene ${done + 1} of ${scenes.length}: ${scene.title}... still rendering (${minutes} min).`,
      });
    });
    done += 1;
  }
  await assembleProject(jobId, projectId);
}

async function runRegenerate(jobId: string, projectId: string, sceneId: string | null) {
  if (!sceneId) throw new Error("Missing scene");
  await prisma.videoProject.update({
    where: { id: projectId },
    data: { status: ProjectStatus.GENERATING, errorMessage: null },
  });
  const scene = await prisma.scene.findFirstOrThrow({ where: { id: sceneId, projectId } });
  await prisma.scene.update({
    where: { id: scene.id },
    data: { status: SceneStatus.PENDING, videoPath: null },
  });
  await jobQueue.heartbeat(jobId, { stage: scene.sceneKey, message: `Filming ${scene.title} again... Google is drawing this clip (usually 1–3 minutes).`, progress: 20 });
  await generateSceneWithRetry(jobId, projectId, scene.id, async (elapsedMs) => {
    const minutes = Math.max(1, Math.ceil(elapsedMs / 60_000));
    await jobQueue.heartbeat(jobId, {
      stage: scene.sceneKey,
      progress: 20,
      message: `Filming ${scene.title} again... still rendering (${minutes} min).`,
    });
  });
  await assembleProject(jobId, projectId);
}

async function generateSceneWithRetry(
  jobId: string,
  projectId: string,
  sceneRowId: string,
  onWait?: (elapsedMs: number) => Promise<void>,
) {
  const scene = await prisma.scene.findUniqueOrThrow({ where: { id: sceneRowId } });
  const generation = await prisma.sceneGeneration.create({
    data: {
      sceneId: scene.id,
      prompt: "",
      status: SceneStatus.GENERATING,
    },
  });

  let lastError = "";
  let safeMode = false;
  for (let attempt = 1; attempt <= MAX_SCENE_RETRIES; attempt++) {
    const started = Date.now();
    try {
      await prisma.scene.update({ where: { id: scene.id }, data: { status: SceneStatus.GENERATING } });
      await prisma.generationAttempt.create({
        data: {
          jobId,
          sceneGenerationId: generation.id,
          attempt,
          status: "running",
          provider: getVideoProvider().name,
          model: getVideoProvider().model,
        },
      });
      await renderScene(projectId, scene.id, generation.id, safeMode, onWait);
      await prisma.generationAttempt.create({
        data: {
          jobId,
          sceneGenerationId: generation.id,
          attempt,
          status: "completed",
          provider: getVideoProvider().name,
          model: getVideoProvider().model,
          durationMs: Date.now() - started,
          completedAt: new Date(),
        },
      });
      await prisma.sceneGeneration.update({
        where: { id: generation.id },
        data: { status: SceneStatus.COMPLETED, attemptCount: attempt, providerStatus: "completed" },
      });
      return;
    } catch (error) {
      lastError = providerErrorMessage(error);
      logError("scene.generate.fail", error, {
        job_id: jobId,
        project_id: projectId,
        scene_id: scene.sceneKey,
        attempt,
      });
      await prisma.sceneGeneration.update({
        where: { id: generation.id },
        data: {
          attemptCount: attempt,
          lastError,
          providerStatus: "failed",
          status: SceneStatus.FAILED,
        },
      });
      await prisma.generationAttempt.create({
        data: {
          jobId,
          sceneGenerationId: generation.id,
          attempt,
          status: "failed",
          error: lastError.slice(0, 400),
          durationMs: Date.now() - started,
          completedAt: new Date(),
        },
      });
      if (isSafetyPolicyError(error)) safeMode = true;
      if (isNonRetryableProviderError(error) || !canRetry(attempt)) break;
      await jobQueue.heartbeat(jobId, {
        message: sceneRetryMessage(scene.title),
        stage: scene.sceneKey,
      });
      await sleep(backoffMs(attempt));
    }
  }
  await prisma.scene.update({ where: { id: scene.id }, data: { status: SceneStatus.FAILED } });
  throw new Error(lastError || `We're having trouble creating ${scene.title}.`);
}

async function renderScene(
  projectId: string,
  sceneRowId: string,
  generationId: string,
  safeMode = false,
  onWait?: (elapsedMs: number) => Promise<void>,
) {
  const project = await prisma.videoProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { characters: true, world: true, scenes: { orderBy: { orderIndex: "asc" } } },
  });
  const scene = project.scenes.find((s) => s.id === sceneRowId);
  if (!scene || !project.world) throw new Error("Scene plan is missing");
  const idx = project.scenes.findIndex((s) => s.id === scene.id);
  const previous = project.scenes[idx - 1];
  const next = project.scenes[idx + 1];

  const characters: CharacterBible[] = project.characters.map((c) => ({
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
    color_palette: project.world.colorPalette as string[],
    lighting: project.world.lighting,
    time_of_day: project.world.timeOfDay,
    architecture: project.world.architecture,
    background_elements: project.world.backgroundElements as string[],
    bible: project.world.bible,
  };
  const toPlanned = (s: typeof scene): PlannedScene => ({
    scene_id: s.sceneKey,
    order: s.orderIndex,
    duration: s.duration,
    title: s.title,
    script_segment: s.scriptSegment,
    narration: s.narration,
    characters: s.characterSlugs as string[],
    location: s.location,
    time_of_day: s.timeOfDay,
    emotion: s.emotion,
    visual_prompt: s.visualPrompt,
    camera: s.camera,
    transition: s.transition,
    shot_type: s.shotType,
  });

  const promptInput = {
    styleBible: project.styleBible || DEFAULT_STYLE_BIBLE,
    characters,
    world,
    scene: toPlanned(scene),
    previous: previous ? toPlanned(previous) : null,
    next: next ? toPlanned(next) : null,
    duration: scene.duration,
  };
  const prompt = videoPromptBuilder.build(promptInput);
  const providerPrompt = videoPromptBuilder.buildForProvider(promptInput, { safeMode });

  await prisma.sceneGeneration.update({
    where: { id: generationId },
    data: { prompt: providerPrompt || prompt, providerStatus: "generating" },
  });

  const outAbs = path.join(projectDir(projectId), "scenes", `${scene.sceneKey}.mp4`);
  const provider = getVideoProvider();
  const result = await provider.generate(
    {
      prompt: providerPrompt,
      durationSeconds: snapClip(scene.duration, project.resolution),
      aspectRatio: project.aspectRatio as "16:9" | "9:16" | "1:1",
      resolution: project.resolution as "720p" | "1080p",
      negativePrompt: videoPromptBuilder.negativePrompt(),
      onProgress: async (event) => {
        await onWait?.(event.elapsedMs);
      },
    },
    outAbs,
  );

  const thumbAbs = path.join(projectDir(projectId), "thumbs", `${scene.sceneKey}.jpg`);
  await videoAssembler.thumbnail(result.localPath, thumbAbs, 1);
  const videoKey = storage.keyFromAbsolute(result.localPath);
  const thumbKey = storage.keyFromAbsolute(thumbAbs);

  await prisma.scene.update({
    where: { id: scene.id },
    data: {
      status: SceneStatus.COMPLETED,
      videoPath: videoKey,
      thumbnailPath: thumbKey,
    },
  });
  await prisma.videoAsset.create({
    data: {
      projectId,
      kind: AssetKind.SCENE_VIDEO,
      path: videoKey,
      mimeType: "video/mp4",
      duration: result.durationSeconds,
      sceneId: scene.id,
    },
  });
}

function filmingProgress(done: number, sceneCount: number) {
  const n = Math.max(1, sceneCount);
  return Math.min(80, Math.round(((done + 0.4) / n) * 80));
}

function snapClip(n: number, resolution?: string): 4 | 6 | 8 {
  if (resolution === "1080p") return 8;
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  return 8;
}

async function assembleProject(jobId: string, projectId: string) {
  const project = await prisma.videoProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { scenes: { orderBy: { orderIndex: "asc" } } },
  });
  const missing = project.scenes.filter((s) => s.status !== SceneStatus.COMPLETED || !s.videoPath);
  if (missing.length) {
    throw new Error(`We're still missing ${missing[0].title}.`);
  }

  await prisma.videoProject.update({
    where: { id: projectId },
    data: { status: ProjectStatus.ASSEMBLING },
  });
  await jobQueue.heartbeat(jobId, { stage: "assemble", progress: 82, message: "Stitching your movie together..." });

  let narrationPath: string | null = null;
  if (project.enableNarration) {
    await jobQueue.heartbeat(jobId, { stage: "narration", progress: 86, message: "Recording the storyteller..." });
    const tts = getTTSProvider();
    const language = resolveLanguage(project.language, project.script);
    const abs = path.join(projectDir(projectId), "audio", "narration.wav");
    const result = await tts.synthesize(
      { text: project.script, language, voice: project.voice as "male" | "female" | "child_friendly" },
      abs,
    );
    narrationPath = result.path;
    await prisma.audioAsset.create({
      data: {
        projectId,
        kind: "narration",
        path: storage.keyFromAbsolute(result.path),
        mimeType: result.mimeType,
        duration: result.durationSeconds,
      },
    });
  }

  let musicPath: string | null = null;
  if (project.enableMusic) {
    await jobQueue.heartbeat(jobId, { stage: "music", progress: 90, message: "Adding gentle music..." });
    const total = project.scenes.reduce((a, s) => a + s.duration, 0);
    const abs = path.join(projectDir(projectId), "audio", "music.wav");
    const bed = await musicProvider.createBed(total, abs);
    musicPath = bed.path;
    await prisma.audioAsset.create({
      data: {
        projectId,
        kind: "music",
        path: storage.keyFromAbsolute(bed.path),
        mimeType: "audio/wav",
        duration: bed.durationSeconds,
      },
    });
  }

  const size = frameSize(project.aspectRatio, project.resolution);
  const finalAbs = path.join(projectDir(projectId), "final.mp4");
  const assembled = await videoAssembler.concat({
    clips: project.scenes.map((s) => ({
      path: storage.absolute(s.videoPath!),
      duration: s.duration,
    })),
    outputPath: finalAbs,
    width: size.width,
    height: size.height,
    narrationPath,
    musicPath,
    keepSourceAudio: appConfig.enableNativeVideoAudio && !appConfig.mock,
  });

  const posterAbs = path.join(projectDir(projectId), "poster.jpg");
  await videoAssembler.thumbnail(assembled.path, posterAbs, Math.min(2, assembled.duration / 4));
  const videoKey = storage.keyFromAbsolute(assembled.path);
  const posterKey = storage.keyFromAbsolute(posterAbs);

  let offset = 0;
  for (const scene of project.scenes) {
    await prisma.scene.update({
      where: { id: scene.id },
      data: { startOffset: offset },
    });
    offset += scene.duration;
  }

  await prisma.videoAsset.create({
    data: {
      projectId,
      kind: AssetKind.FINAL_VIDEO,
      path: videoKey,
      mimeType: "video/mp4",
      duration: assembled.duration,
    },
  });
  await prisma.videoAsset.create({
    data: {
      projectId,
      kind: AssetKind.THUMBNAIL,
      path: posterKey,
      mimeType: "image/jpeg",
    },
  });
  await prisma.videoProject.update({
    where: { id: projectId },
    data: {
      status: ProjectStatus.COMPLETED,
      finalVideoPath: videoKey,
      thumbnailPath: posterKey,
      actualDuration: assembled.duration,
      errorMessage: null,
    },
  });
  await jobQueue.heartbeat(jobId, { stage: "done", progress: 100, message: "Your movie is ready!" });
}
