import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { probeDuration, runFfmpeg } from "@/lib/video/ffmpeg";
import { misplacedElevenLabsKeyMessage } from "./api-keys";
import type { TTSProvider, TTSRequest, TTSResult } from "./tts-provider";

const DEFAULT_VOICES = {
  male: "pNInz6obpgDQGcFmaJgB",
  female: "EXAVITQu4vr4xnSDxMaL",
  child_friendly: "MF3mGyEYCl7XYWbV9V6O",
} as const;

export class ElevenLabsTTSProvider implements TTSProvider {
  readonly name = "elevenlabs-tts";
  readonly model = appConfig.elevenlabs.model;
  private apiKey: string;

  constructor(apiKey = appConfig.elevenlabs.apiKey) {
    const misplaced = misplacedElevenLabsKeyMessage(apiKey);
    if (misplaced) throw new Error(misplaced);
    this.apiKey = apiKey.trim();
  }

  async synthesize(request: TTSRequest, outputPath: string): Promise<TTSResult> {
    await mkdir(path.dirname(outputPath), { recursive: true });
    const voiceId =
      appConfig.elevenlabs.voices[request.voice] ||
      appConfig.elevenlabs.voiceId ||
      DEFAULT_VOICES[request.voice];
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: request.text.slice(0, 5000),
        model_id: this.model,
        voice_settings: { stability: 0.45, similarity_boost: 0.75 },
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw elevenLabsError(response.status, body);
    }
    const mp3 = Buffer.from(await response.arrayBuffer());
    if (!mp3.length) throw new Error("ElevenLabs returned no audio");
    const wavPath = outputPath.replace(/\.mp3$/i, "").replace(/\.wav$/i, "") + ".wav";
    const mp3Path = wavPath.replace(/\.wav$/i, ".mp3");
    await writeFile(mp3Path, mp3);
    await runFfmpeg(["-y", "-i", mp3Path, "-ar", "24000", "-ac", "1", wavPath]);
    return {
      path: wavPath,
      durationSeconds: await probeDuration(wavPath),
      mimeType: "audio/wav",
    };
  }
}

function elevenLabsError(status: number, body: string) {
  const lower = body.toLowerCase();
  if (status === 401 || (lower.includes("invalid") && lower.includes("api"))) {
    return new AppError(
      "elevenlabs_unauthorized",
      "elevenlabs_unauthorized",
      401,
      "ElevenLabs rejected this API key. In the Jenkins secret file use ELEVENLABS_API_KEY=sk_... (not GOOGLE_AI_API_KEY), then rebuild. Get a key from elevenlabs.io → Profile → API keys.",
    );
  }
  if (status === 402 || lower.includes("quota") || lower.includes("payment")) {
    return new AppError(
      "elevenlabs_quota",
      "elevenlabs_quota",
      402,
      "ElevenLabs quota is used up on this key. Check usage at elevenlabs.io, then try again.",
    );
  }
  return new Error(`ElevenLabs TTS failed (${status}): ${body.slice(0, 240)}`);
}
