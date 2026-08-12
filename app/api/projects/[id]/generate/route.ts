import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, ok } from "@/lib/api/http";
import { AppError } from "@/lib/errors";
import { serializeProject } from "@/lib/api/serialize";
import type { IdRoute } from "@/lib/api/context";

export async function POST(_req: Request, ctx: IdRoute) {
  try {
    const { id } = await ctx.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: { characters: true, world: true, story: true, scenes: true, jobs: true },
    });
    if (!project) throw new AppError("Not found", "not_found", 404, "We couldn't find that movie.");
    if (!project.scenes.length) {
      throw new AppError("not_ready", "not_ready", 409, "Please wait for the movie plan first.");
    }
    await prisma.videoProject.update({
      where: { id },
      data: { status: ProjectStatus.READY_TO_GENERATE, errorMessage: null },
    });
    return ok({
      status: "ready",
      message: "Copy the Gemini / Flow prompts from the plan page. We do not generate video.",
      project: serializeProject(project),
    });
  } catch (error) {
    return jsonError(error);
  }
}
