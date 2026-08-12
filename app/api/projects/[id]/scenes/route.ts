import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { serializeProject } from "@/lib/api/serialize";
import { AppError } from "@/lib/errors";
import type { IdRoute } from "@/lib/api/context";

export async function GET(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: { scenes: true, characters: true, world: true, story: true, jobs: true },
    });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    return ok({ scenes: serializeProject(project).scenes });
  } catch (error) {
    return jsonError(error);
  }
}
