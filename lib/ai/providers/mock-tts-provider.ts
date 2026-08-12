import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runFfmpeg, probeDuration } from "@/lib/video/ffmpeg";
import { estimateNarrationSeconds } from "@/lib/ai/video/duration";
import type { TTSProvider, TTSRequest, TTSResult } from "./tts-provider";

export class MockTTSProvider implements TTSProvider {
  readonly name = "mock-tts";
  readonly model = "mock-tone";

  async synthesize(request: TTSRequest, outputPath: string): Promise<TTSResult> {
    await mkdir(path.dirname(outputPath), { recursive: true });
    const duration = Math.max(4, estimateNarrationSeconds(request.text));
    await runFfmpeg([
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=330:sample_rate=24000:duration=${duration}`,
      "-af",
      "volume=0.15",
      outputPath.replace(/\.wav$/i, "") + ".wav",
    ]);
    const wavPath = outputPath.replace(/\.wav$/i, "") + ".wav";
    return {
      path: wavPath,
      durationSeconds: await probeDuration(wavPath),
      mimeType: "audio/wav",
    };
  }
}
