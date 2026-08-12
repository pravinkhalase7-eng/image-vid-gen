import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runFfmpeg, probeDuration } from "./ffmpeg";

export class VideoAssembler {
  async concat(input: {
    clips: { path: string; duration: number }[];
    outputPath: string;
    width: number;
    height: number;
    narrationPath?: string | null;
    musicPath?: string | null;
    keepSourceAudio?: boolean;
  }) {
    await mkdir(path.dirname(input.outputPath), { recursive: true });
    const normalized: string[] = [];
    for (const [i, clip] of input.clips.entries()) {
      const out = path.join(path.dirname(input.outputPath), `norm_${i}.mp4`);
      await runFfmpeg([
        "-y",
        "-i",
        clip.path,
        "-vf",
        `scale=${input.width}:${input.height}:force_original_aspect_ratio=decrease,pad=${input.width}:${input.height}:(ow-iw)/2:(oh-ih)/2,fps=24,format=yuv420p`,
        "-t",
        String(clip.duration),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        out,
      ]);
      normalized.push(out);
    }

    const listFile = path.join(path.dirname(input.outputPath), "concat.txt");
    await writeFile(
      listFile,
      normalized.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
    );
    const concatPath = path.join(path.dirname(input.outputPath), "concat.mp4");
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-c",
      "copy",
      concatPath,
    ]);

    const filters: string[] = [];
    const maps = ["-map", "0:v:0"];
    const hasNarration = Boolean(input.narrationPath);
    const hasMusic = Boolean(input.musicPath);

    if (hasNarration && hasMusic) {
      filters.push(
        "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0[narr]",
        "[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.14[music]",
        "[narr]asplit=2[narr_mix][narr_env]",
        "[narr_env]highpass=f=200,lowpass=f=4000,volume=2[env]",
        "[music][env]sidechaincompress=threshold=0.05:ratio=8:attack=80:release=400:makeup=1[ducked]",
        "[narr_mix][ducked]amix=inputs=2:duration=longest:dropout_transition=2[aout]",
      );
    } else if (hasNarration) {
      filters.push("[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0[aout]");
    } else if (hasMusic) {
      filters.push("[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.18[aout]");
    }

    const args = ["-y", "-i", concatPath];
    if (hasNarration) args.push("-i", input.narrationPath!);
    if (hasMusic) args.push("-i", input.musicPath!);

    if (filters.length) {
      args.push("-filter_complex", filters.join(";"), "-map", "0:v:0", "-map", "[aout]");
    } else {
      args.push(...maps);
    }

    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      "-movflags",
      "+faststart",
      input.outputPath,
    );
    await runFfmpeg(args, 180_000);
    return { path: input.outputPath, duration: await probeDuration(input.outputPath) };
  }

  async thumbnail(videoPath: string, outputPath: string, atSeconds = 1) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await runFfmpeg([
      "-y",
      "-ss",
      String(atSeconds),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputPath,
    ]);
    return outputPath;
  }
}

export const videoAssembler = new VideoAssembler();

export function frameSize(aspect: string, resolution: string) {
  const h = resolution === "1080p" ? 1080 : 720;
  if (aspect === "9:16") return { width: Math.round((h * 9) / 16) & ~1, height: h };
  if (aspect === "1:1") return { width: h, height: h };
  return { width: Math.round((h * 16) / 9) & ~1, height: h };
}
