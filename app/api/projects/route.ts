import { after } from "next/server";
import { JobType, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/api/schemas";
import { jsonError, ok } from "@/lib/api/http";
import { serializeProject } from "@/lib/api/serialize";
import { validateStoryInput } from "@/lib/story/validate";
import { classifyStory } from "@/lib/ai/safety/classifier";
import { jobQueue } from "@/lib/jobs/queue";
import { startBackgroundWorker } from "@/lib/jobs/worker";
import { planClipDurations } from "@/lib/ai/video/duration";
import { mediaUrl } from "@/lib/utils";

export const maxDuration = 60;

export async function GET() {
  try {
    const projects = await prisma.videoProject.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        duration: p.actualDuration ?? p.duration,
        createdAt: p.createdAt.toISOString(),
        thumbnailUrl: mediaUrl(p.thumbnailPath),
        estimatedScenes: p.estimatedScenes,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createProjectSchema.parse(await request.json());
    const story = validateStoryInput(body);
    await classifyStory(story);

    const clips = planClipDurations({
      script: story.script,
      targetSeconds: body.duration,
      sceneCount: body.sceneCount,
    });

    const project = await prisma.videoProject.create({
      data: {
        title: story.title,
        topic: story.topic,
        script: story.script,
        language: body.language,
        aspectRatio: body.aspectRatio,
        resolution: body.resolution,
        duration: clips.total,
        voice: body.voice,
        style: body.style,
        enableNarration: body.enableNarration,
        enableMusic: body.enableMusic,
        status: ProjectStatus.ANALYZING,
        estimatedScenes: clips.sceneCount,
        settings: {
          create: {
            aspectRatio: body.aspectRatio,
            resolution: body.resolution,
            duration: clips.total,
            voice: body.voice,
            language: body.language,
            style: body.style,
            enableNarration: body.enableNarration,
            enableMusic: body.enableMusic,
          },
        },
      },
    });

    const job = await jobQueue.enqueue({
      projectId: project.id,
      type: JobType.ANALYZE,
      message: "Understanding your story...",
    });

    after(() => {
      startBackgroundWorker();
    });

    return ok(
      {
        job_id: job.id,
        project_id: project.id,
        status: "analyzing",
        estimated_scenes: clips.sceneCount,
        estimated_duration: clips.total,
        project: serializeProject(project),
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}
