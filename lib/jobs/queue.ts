import { JobStatus, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EnqueueInput } from "./state-machine";

export class DatabaseJobQueue {
  async enqueue(input: EnqueueInput) {
    return prisma.generationJob.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        status: JobStatus.QUEUED,
        sceneId: input.sceneId,
        message: input.message ?? "Waiting to start...",
        progress: 0,
      },
    });
  }

  async claimNext() {
    const staleBefore = new Date(Date.now() - 12 * 60 * 1000);
    await prisma.generationJob.updateMany({
      where: {
        status: JobStatus.RUNNING,
        heartbeatAt: { lt: staleBefore },
      },
      data: { status: JobStatus.QUEUED, message: "Resuming after a pause..." },
    });

    const next = await prisma.generationJob.findFirst({
      where: { status: JobStatus.QUEUED },
      orderBy: { createdAt: "asc" },
    });
    if (!next) return null;

    const claimed = await prisma.generationJob.updateMany({
      where: { id: next.id, status: JobStatus.QUEUED },
      data: {
        status: JobStatus.RUNNING,
        startedAt: next.startedAt ?? new Date(),
        heartbeatAt: new Date(),
      },
    });
    if (claimed.count === 0) return null;
    return prisma.generationJob.findUnique({ where: { id: next.id } });
  }

  async heartbeat(id: string, patch: { stage?: string; progress?: number; message?: string; provider?: string; model?: string }) {
    await prisma.generationJob.update({
      where: { id },
      data: {
        heartbeatAt: new Date(),
        ...patch,
      },
    });
  }

  async complete(id: string, message = "Done") {
    await prisma.generationJob.update({
      where: { id },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        message,
        completedAt: new Date(),
        heartbeatAt: new Date(),
      },
    });
  }

  async fail(id: string, error: string, message: string) {
    await prisma.generationJob.update({
      where: { id },
      data: {
        status: JobStatus.FAILED,
        error,
        message,
        completedAt: new Date(),
      },
    });
  }

  async cancelProject(projectId: string) {
    await prisma.generationJob.updateMany({
      where: {
        projectId,
        status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      },
      data: { status: JobStatus.CANCELLED, message: "Cancelled", completedAt: new Date() },
    });
  }

  async hasActiveGenerate(projectId: string) {
    const job = await prisma.generationJob.findFirst({
      where: {
        projectId,
        type: { in: [JobType.GENERATE, JobType.REGENERATE_SCENE, JobType.ASSEMBLE] },
        status: { in: [JobStatus.QUEUED, JobStatus.RUNNING] },
      },
    });
    return Boolean(job);
  }
}

export const jobQueue = new DatabaseJobQueue();
