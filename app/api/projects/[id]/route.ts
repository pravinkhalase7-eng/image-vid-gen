import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { serializeProject } from "@/lib/api/serialize";
import { AppError } from "@/lib/errors";
import { createProjectSchema } from "@/lib/api/schemas";
import type { IdRoute } from "@/lib/api/context";

export async function GET(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: { characters: true, world: true, story: true, scenes: true, jobs: true },
    });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    return ok({ project: serializeProject(project) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    if (["GENERATING", "ASSEMBLING"].includes(project.status)) {
      throw new AppError("locked", "locked", 409, "This movie is being filmed right now.");
    }
    const body = createProjectSchema.partial().parse(await request.json());
    const updated = await prisma.videoProject.update({
      where: { id },
      data: body,
      include: { characters: true, world: true, story: true, scenes: true, jobs: true },
    });
    return ok({ project: serializeProject(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
