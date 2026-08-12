function bool(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "StoryMotion AI",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  mock: bool(process.env.MOCK_VIDEO_GENERATION, true),
  enableVideoGeneration: bool(process.env.ENABLE_VIDEO_GENERATION, false),
  jobRunner: (process.env.JOB_RUNNER ?? "inline") as "inline" | "worker",
  enableCharacterReferences: bool(process.env.ENABLE_CHARACTER_REFERENCES, false),
  enableNativeVideoAudio: bool(process.env.ENABLE_NATIVE_VIDEO_AUDIO, true),
  google: {
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "",
    textModel: process.env.GOOGLE_TEXT_MODEL || "gemini-3.6-flash",
    videoModel: process.env.GOOGLE_VIDEO_MODEL || "veo-3.1-fast-generate-preview",
    ttsModel: process.env.GOOGLE_TTS_MODEL || "gemini-3.1-flash-tts-preview",
    imageModel: process.env.GOOGLE_IMAGE_MODEL || "imagen-4.0-generate-001",
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER || "local") as "local" | "gcs" | "s3",
    path: process.env.STORAGE_PATH || "./storage",
    gcsBucket: process.env.GCS_BUCKET,
    s3Bucket: process.env.S3_BUCKET,
    s3Endpoint: process.env.S3_ENDPOINT,
  },
};

export const VEO_DURATIONS = [4, 6, 8] as const;
export const NARRATION_WPM = 140;
export const MAX_SCENE_RETRIES = 3;
export const MIN_CLIP_SECONDS = 4;
export const MAX_VIDEO_SECONDS = 90;
export const MAX_SCRIPT_CHARS = 12_000;
export const MIN_SCRIPT_CHARS = 40;
