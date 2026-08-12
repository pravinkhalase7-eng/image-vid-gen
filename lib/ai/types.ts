export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Resolution = "720p" | "1080p";
export type VoiceStyle = "male" | "female" | "child_friendly";
export type AnimationStyle =
  | "cinematic_3d"
  | "watercolor"
  | "storybook"
  | "educational";

export type CharacterBible = {
  id: string;
  name: string;
  species: string;
  age: string;
  appearance: string;
  clothing: string;
  personality: string;
  visual_features: string[];
};

export type WorldBible = {
  environment: string;
  color_palette: string[];
  lighting: string;
  time_of_day: string;
  architecture: string;
  background_elements: string[];
  bible: string;
};

export type StoryAnalysis = {
  summary: string;
  story_arc: {
    beginning: string;
    middle: string;
    end: string;
    moral: string;
  };
  characters: CharacterBible[];
  locations: string[];
  objects: string[];
  events: string[];
  emotions: string[];
};

export type PlannedScene = {
  scene_id: string;
  order: number;
  duration: number;
  title: string;
  script_segment: string;
  narration: string;
  characters: string[];
  location: string;
  time_of_day: string;
  emotion: string;
  visual_prompt: string;
  camera: string;
  transition: string;
  shot_type: string;
};

export type MoviePlan = {
  title: string;
  topic: string;
  style_bible: string;
  story: StoryAnalysis;
  world: WorldBible;
  characters: CharacterBible[];
  scenes: PlannedScene[];
  estimated_duration: number;
};

export type SafetyVerdict = {
  safe: boolean;
  categories: string[];
  reason: string;
};

export type VideoGenerateRequest = {
  prompt: string;
  durationSeconds: 4 | 6 | 8;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  negativePrompt?: string;
  referenceImages?: { mimeType: string; data: Buffer }[];
  onProgress?: (event: { phase: "submitted" | "polling"; elapsedMs: number }) => void | Promise<void>;
};

export type VideoGenerateResult = {
  providerJobId: string;
  localPath: string;
  durationSeconds: number;
  mimeType: string;
};

export type TTSRequest = {
  text: string;
  language: string;
  voice: VoiceStyle;
};

export type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "failed" | "retrying";
  detail?: string;
};
