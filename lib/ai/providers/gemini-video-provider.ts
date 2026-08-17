import { mkdir } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { appConfig } from "@/lib/config";
import { sleep } from "@/lib/utils";
import { logError, logJob } from "@/lib/logging";
import { providerErrorMessage } from "@/lib/errors";
import type { VideoGenerateRequest, VideoGenerateResult } from "@/lib/ai/types";
import type { VideoGenerationProvider } from "./video-generation-provider";
import { misplacedGoogleKeyMessage } from "./api-keys";

const GEMINI_API_MODELS = [
  "veo-3.1-fast-generate-preview",
  "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-001",
];

/**
 * Veo 3.1 via the official @google/genai SDK (Gemini API).
 * Methods: models.generateVideos({ source }), operations.getVideosOperation, files.download.
 * Clip length is 4/6/8s — longer films are assembled downstream.
 */
export class GeminiVideoProvider implements VideoGenerationProvider {
  readonly name = "gemini-veo";
  readonly model = appConfig.google.videoModel;
  private client: GoogleGenAI;

  constructor(apiKey = appConfig.google.apiKey) {
    const misplaced = misplacedGoogleKeyMessage(apiKey);
    if (misplaced) throw new Error(misplaced);
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(request: VideoGenerateRequest, outputPath: string): Promise<VideoGenerateResult> {
    if (!appConfig.enableVideoGeneration) {
      throw new Error("Video generation is disabled. Use the Gemini / Flow prompt pack instead.");
    }
    await mkdir(path.dirname(outputPath), { recursive: true });
    const aspectRatio = request.aspectRatio === "1:1" ? "16:9" : request.aspectRatio;
    const durationSeconds = request.resolution === "1080p" ? 8 : request.durationSeconds;
    const prompt = request.prompt.length > 3500 ? request.prompt.slice(0, 3490) : request.prompt;

    const { operation: started, model } = await this.startOperation({
      prompt,
      aspectRatio,
      durationSeconds,
      resolution: request.resolution,
      negativePrompt: request.negativePrompt?.slice(0, 400),
      referenceImages: request.referenceImages,
    });

    let operation = started;
    const providerJobId = operation.name ?? `veo-${Date.now()}`;
    logJob("video.poll.start", { provider: this.name, model, job_id: providerJobId });
    await request.onProgress?.({ phase: "submitted", elapsedMs: 0 });

    const timeoutMs = 8 * 60 * 1000;
    const pollStarted = Date.now();
    while (!operation.done) {
      if (!appConfig.enableVideoGeneration) {
        throw new Error("Video generation is disabled. Use the Gemini / Flow prompt pack instead.");
      }
      const elapsedMs = Date.now() - pollStarted;
      if (elapsedMs > timeoutMs) {
        throw new Error("Video generation timed out");
      }
      await request.onProgress?.({ phase: "polling", elapsedMs });
      logJob("video.poll.tick", { provider: this.name, model, job_id: providerJobId, duration: elapsedMs });
      await sleep(10_000);
      operation = await this.client.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
      const message = typeof operation.error.message === "string" ? operation.error.message : JSON.stringify(operation.error);
      throw new Error(message);
    }

    if (operation.response?.raiMediaFilteredCount) {
      throw new Error(
        operation.response.raiMediaFilteredReasons?.join("; ") || "Video blocked by safety filters",
      );
    }

    const generated = operation.response?.generatedVideos?.[0];
    const file = generated?.video;
    if (!file) {
      throw new Error("No video returned by the provider");
    }

    if (typeof this.client.files.download === "function") {
      await this.client.files.download({ file, downloadPath: outputPath });
    } else if (file.uri) {
      const res = await fetch(file.uri, {
        headers: { "x-goog-api-key": appConfig.google.apiKey },
      });
      if (!res.ok) throw new Error("Could not download generated video");
      const buf = Buffer.from(await res.arrayBuffer());
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outputPath, buf);
    } else if (file.videoBytes) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outputPath, Buffer.from(file.videoBytes, "base64"));
    } else {
      throw new Error("Provider returned a video without a downloadable payload");
    }

    return {
      providerJobId,
      localPath: outputPath,
      durationSeconds,
      mimeType: "video/mp4",
    };
  }

  private async startOperation(input: {
    prompt: string;
    aspectRatio: string;
    durationSeconds: number;
    resolution: string;
    negativePrompt?: string;
    referenceImages?: VideoGenerateRequest["referenceImages"];
  }) {
    const models = unique([this.model, ...GEMINI_API_MODELS]);
    let lastError: unknown;
    for (const model of models) {
      try {
        const operation = await this.client.models.generateVideos({
          model,
          source: { prompt: input.prompt },
          config: {
            aspectRatio: input.aspectRatio,
            resolution: input.resolution,
            durationSeconds: input.durationSeconds,
            numberOfVideos: 1,
            negativePrompt: input.negativePrompt,
            ...(input.referenceImages?.length
              ? {
                  personGeneration: "allow_adult",
                  referenceImages: input.referenceImages.map((img) => ({
                    image: {
                      imageBytes: img.data.toString("base64"),
                      mimeType: img.mimeType,
                    },
                  })),
                }
              : {}),
          },
        });
        return { operation, model };
      } catch (error) {
        lastError = error;
        if (!isModelUnavailable(error) || model === models[models.length - 1]) {
          throw wrapProviderError(error);
        }
        logError("video.model.fallback", error, { provider: this.name, model });
      }
    }
    throw wrapProviderError(lastError);
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function isModelUnavailable(error: unknown) {
  const msg = providerErrorMessage(error).toLowerCase();
  return (
    msg.includes("not found") ||
    msg.includes("is not found") ||
    /\b404\b/.test(msg) ||
    msg.includes("no longer available") ||
    msg.includes("has been retired")
  );
}

function wrapProviderError(error: unknown) {
  return new Error(providerErrorMessage(error));
}
