import { after } from "next/server";
import { JobType, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { jobQueue } from "@/lib/jobs/queue";
import { startBackgroundWorker } from "@/lib/jobs/worker";
import type { IdRoute } from "@/lib/api/context";

export async function POST(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: { scenes: true },
    });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    const needsPlan = project.scenes.length === 0;
    if (!needsPlan) {
      await prisma.videoProject.update({
        where: { id },
        data: { status: ProjectStatus.READY_TO_GENERATE, errorMessage: null },
      });
      return ok({ status: "ready", message: "Your prompt pack is ready on the plan page." });
    }
    await prisma.videoProject.update({
      where: { id },
      data: { status: ProjectStatus.ANALYZING, errorMessage: null },
    });
    const job = await jobQueue.enqueue({
      projectId: id,
      type: JobType.ANALYZE,
      message: "Understanding your story...",
    });
    after(() => startBackgroundWorker());
    return ok({ job_id: job.id, status: "analyzing" });
  } catch (error) {
    return jsonError(error);
  }
}
