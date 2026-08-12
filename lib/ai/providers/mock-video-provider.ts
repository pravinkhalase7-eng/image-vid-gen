import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runFfmpeg } from "@/lib/video/ffmpeg";
import { sleep } from "@/lib/utils";
import type { VideoGenerateRequest, VideoGenerateResult } from "@/lib/ai/types";
import type { VideoGenerationProvider } from "./video-generation-provider";

const PALETTE = ["#1b3a4b", "#3d2b56", "#2d4a3e", "#4a3728", "#2a3550", "#3a2f24", "#243b4a", "#4a2744"];

export class MockVideoProvider implements VideoGenerationProvider {
  readonly name = "mock-video";
  readonly model = "mock-ffmpeg";

  async generate(request: VideoGenerateRequest, outputPath: string): Promise<VideoGenerateResult> {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await sleep(400);
    const { width, height } = dimensions(request.aspectRatio, request.resolution);
    const color = PALETTE[hash(request.prompt) % PALETTE.length];
    const title = sanitizeDrawtext(request.prompt.split("\n").find((l) => l.startsWith("Title:"))?.replace("Title:", "") || "Scene");
    const font = fontPath();
    const fontArg = font ? `:fontfile=${font}` : "";
    const base = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `color=c=${color}:s=${width}x${height}:d=${request.durationSeconds}:r=24`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=220:sample_rate=44100:duration=${request.durationSeconds}`,
    ];
    try {
      await runFfmpeg([
        ...base,
        "-vf",
        `drawtext=text='${title}'${fontArg}:fontcolor=white:fontsize=${Math.round(height / 18)}:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=black:shadowx=2:shadowy=2`,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outputPath,
      ]);
    } catch {
      await runFfmpeg([
        ...base,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outputPath,
      ]);
    }
    return {
      providerJobId: `mock-${Date.now()}`,
      localPath: outputPath,
      durationSeconds: request.durationSeconds,
      mimeType: "video/mp4",
    };
  }
}

function dimensions(aspect: VideoGenerateRequest["aspectRatio"], resolution: VideoGenerateRequest["resolution"]) {
  const h = resolution === "1080p" ? 1080 : 720;
  if (aspect === "9:16") return { width: Math.round((h * 9) / 16), height: h };
  if (aspect === "1:1") return { width: h, height: h };
  return { width: Math.round((h * 16) / 9), height: h };
}

function sanitizeDrawtext(text: string) {
  return text.replace(/[:\\'\[\]]/g, " ").slice(0, 42).trim() || "StoryMotion";
}

function hash(s: string) {
  return Math.abs([...s].reduce((a, c) => a + c.charCodeAt(0), 0));
}

function fontPath() {
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ];
  return candidates.find((p) => {
    try {
      require("node:fs").accessSync(p);
      return true;
    } catch {
      return false;
    }
  });
}
