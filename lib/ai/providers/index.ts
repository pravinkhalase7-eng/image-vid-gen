import { appConfig } from "@/lib/config";
import type { TextProvider } from "./text-provider";
import type { VideoGenerationProvider } from "./video-generation-provider";
import type { TTSProvider } from "./tts-provider";
import { MockTextProvider } from "./mock-text-provider";
import { MockVideoProvider } from "./mock-video-provider";
import { MockTTSProvider } from "./mock-tts-provider";
import { GeminiTextProvider } from "./gemini-text-provider";
import { GeminiVideoProvider } from "./gemini-video-provider";
import { GoogleTTSProvider } from "./google-tts-provider";
import { ElevenLabsTTSProvider } from "./elevenlabs-tts-provider";

export function getTextProvider(): TextProvider {
  if (appConfig.mock) return new MockTextProvider();
  return new GeminiTextProvider();
}

export function getVideoProvider(): VideoGenerationProvider {
  if (appConfig.mock) return new MockVideoProvider();
  return new GeminiVideoProvider();
}

export function getTTSProvider(): TTSProvider {
  if (appConfig.mock) return new MockTTSProvider();
  if (appConfig.elevenlabs.apiKey) return new ElevenLabsTTSProvider();
  return new GoogleTTSProvider();
}

export function isMockMode() {
  return appConfig.mock;
}
