import type { VideoGenerateRequest, VideoGenerateResult } from "@/lib/ai/types";

export interface VideoGenerationProvider {
  readonly name: string;
  readonly model: string;
  generate(request: VideoGenerateRequest, outputPath: string): Promise<VideoGenerateResult>;
}
