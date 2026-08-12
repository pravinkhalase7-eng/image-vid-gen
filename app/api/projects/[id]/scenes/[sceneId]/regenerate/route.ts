import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import type { SceneRoute } from "@/lib/api/context";

export async function POST(_req: Request, ctx: SceneRoute) {
  try {
    const { id, sceneId } = await ctx.params;
    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, projectId: id },
    });
    if (!scene) throw new AppError("Not found", "not_found", 404, "We couldn't find that scene.");
    await prisma.videoProject.update({
      where: { id },
      data: { status: ProjectStatus.READY_TO_GENERATE, errorMessage: null },
    });
    return ok({
      status: "ready",
      message: "Copy this scene's prompt from the plan page. We do not generate video.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
