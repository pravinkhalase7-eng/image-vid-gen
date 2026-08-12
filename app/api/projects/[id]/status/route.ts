import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { serializeStatus } from "@/lib/api/serialize";
import { AppError } from "@/lib/errors";
import { startBackgroundWorker } from "@/lib/jobs/worker";
import type { IdRoute } from "@/lib/api/context";

export async function GET(_req: Request, ctx: IdRoute) {
  try {
    startBackgroundWorker();
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: { characters: true, world: true, story: true, scenes: true, jobs: true },
    });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    return ok(serializeStatus(project));
  } catch (error) {
    return jsonError(error);
  }
}
