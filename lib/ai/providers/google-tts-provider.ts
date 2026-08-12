import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { appConfig } from "@/lib/config";
import { ttsPerformancePrompt } from "@/lib/ai/prompts";
import { pcmToWav } from "@/lib/audio/wav";
import { probeDuration } from "@/lib/video/ffmpeg";
import type { TTSProvider, TTSRequest, TTSResult } from "./tts-provider";

const VOICE_MAP = {
  male: "Puck",
  female: "Kore",
  child_friendly: "Aoede",
} as const;

export class GoogleTTSProvider implements TTSProvider {
  readonly name = "gemini-tts";
  readonly model = appConfig.google.ttsModel;
  private client: GoogleGenAI;

  constructor(apiKey = appConfig.google.apiKey) {
    if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");
    this.client = new GoogleGenAI({ apiKey });
  }

  async synthesize(request: TTSRequest, outputPath: string): Promise<TTSResult> {
    await mkdir(path.dirname(outputPath), { recursive: true });
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: ttsPerformancePrompt({
        narration: request.text,
        language: request.language,
        voice: request.voice,
      }),
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE_MAP[request.voice] },
          },
        },
      },
    });
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("TTS returned no audio");
    const wav = pcmToWav(Buffer.from(data, "base64"));
    await writeFile(outputPath, wav);
    const duration = await probeDuration(outputPath);
    return { path: outputPath, durationSeconds: duration, mimeType: "audio/wav" };
  }
}
