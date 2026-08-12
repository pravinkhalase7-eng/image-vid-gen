import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { serializeProject } from "@/lib/api/serialize";
import { AppError } from "@/lib/errors";
import { z } from "zod";
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

const editSchema = z.object({
  scenes: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(80).optional(),
        camera: z.string().max(200).optional(),
      }),
    )
    .optional(),
});

export async function PATCH(request: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    if (project.status !== "READY_TO_GENERATE" && project.status !== "DRAFT") {
      throw new AppError("locked", "locked", 409, "The plan is locked while we film.");
    }
    const body = editSchema.parse(await request.json());
    for (const scene of body.scenes ?? []) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: {
          ...(scene.title ? { title: scene.title } : {}),
          ...(scene.camera ? { camera: scene.camera } : {}),
        },
      });
    }
    const updated = await prisma.videoProject.findUniqueOrThrow({
      where: { id },
      include: { characters: true, world: true, story: true, scenes: true, jobs: true },
    });
    return ok({ project: serializeProject(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
