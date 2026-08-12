import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { jobQueue } from "@/lib/jobs/queue";
import type { IdRoute } from "@/lib/api/context";

export async function POST(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    await jobQueue.cancelProject(id);
    await prisma.videoProject.update({
      where: { id },
      data: { status: ProjectStatus.CANCELLED, errorMessage: "Generation cancelled." },
    });
    return ok({ status: "cancelled" });
  } catch (error) {
    return jsonError(error);
  }
}
