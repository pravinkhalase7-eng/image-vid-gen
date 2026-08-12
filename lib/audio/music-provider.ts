import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runFfmpeg, probeDuration } from "@/lib/video/ffmpeg";

export interface MusicProvider {
  createBed(durationSeconds: number, outputPath: string): Promise<{ path: string; durationSeconds: number }>;
}

export class LibraryMusicProvider implements MusicProvider {
  async createBed(durationSeconds: number, outputPath: string) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    const d = Math.max(8, durationSeconds);
    await runFfmpeg([
      "-y",
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=261.63:duration=${d}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=329.63:duration=${d}`,
      "-f",
      "lavfi",
      "-i",
      `sine=frequency=392:duration=${d}`,
      "-filter_complex",
      "[0][1][2]amix=inputs=3:duration=longest,lowpass=f=1200,volume=0.08,afade=t=in:st=0:d=1.5,afade=t=out:st=" +
        Math.max(1, d - 2) +
        ":d=2",
      outputPath,
    ]);
    return { path: outputPath, durationSeconds: await probeDuration(outputPath) };
  }
}

export const musicProvider = new LibraryMusicProvider();
