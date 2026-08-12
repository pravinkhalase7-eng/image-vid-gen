import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { mediaUrl } from "@/lib/utils";
import type { IdRoute } from "@/lib/api/context";

export async function GET(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    if (!project.finalVideoPath) {
      throw new AppError("not_ready", "not_ready", 409, "The movie isn't ready yet.");
    }
    return ok({
      title: project.title,
      videoUrl: mediaUrl(project.finalVideoPath),
      thumbnailUrl: mediaUrl(project.thumbnailPath),
      duration: project.actualDuration,
    });
  } catch (error) {
    return jsonError(error);
  }
}
