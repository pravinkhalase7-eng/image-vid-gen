import { slugify } from "@/lib/utils";
import type { CharacterBible, PlannedScene, StoryAnalysis, WorldBible } from "@/lib/ai/types";

export function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean).join("; ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${asString(v)}`)
      .join(". ");
  }
  return fallback;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => asString(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map((v) => asString(v)).filter(Boolean);
  return [];
}

function pick(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  return undefined;
}

export function normalizeWorld(raw: unknown): WorldBible {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const nested = obj.world && typeof obj.world === "object" ? (obj.world as Record<string, unknown>) : obj;
  return {
    environment: asString(pick(nested, "environment", "setting", "description"), "A warm storybook world"),
    color_palette: asStringArray(pick(nested, "color_palette", "colorPalette", "palette")),
    lighting: asString(pick(nested, "lighting"), "Soft cinematic lighting"),
    time_of_day: asString(pick(nested, "time_of_day", "timeOfDay"), "morning"),
    architecture: asString(pick(nested, "architecture"), "Natural, cozy forms"),
    background_elements: asStringArray(pick(nested, "background_elements", "backgroundElements")),
    bible: asString(pick(nested, "bible", "world_bible"), "A cohesive family-friendly animated world."),
  };
}

export function normalizeCharacters(raw: unknown): CharacterBible[] {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(obj.characters)
      ? obj.characters
      : [];
  return list.map((item, i) => {
    const c = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const name = asString(pick(c, "name"), `Friend ${i + 1}`);
    const id = slugify(asString(pick(c, "id", "slug"), name));
    return {
      id: id || `character_${i + 1}`,
      name,
      species: asString(pick(c, "species"), "animal friend"),
      age: asString(pick(c, "age"), "young"),
      appearance: asString(pick(c, "appearance"), "Stylized, friendly animated character"),
      clothing: asString(pick(c, "clothing"), "simple colorful accessory"),
      personality: asString(pick(c, "personality"), "kind and curious"),
      visual_features: asStringArray(pick(c, "visual_features", "visualFeatures")),
    };
  });
}

export function normalizeStory(raw: unknown): StoryAnalysis {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arcRaw = pick(obj, "story_arc", "storyArc");
  const arc = (arcRaw && typeof arcRaw === "object" ? arcRaw : {}) as Record<string, unknown>;
  return {
    summary: asString(pick(obj, "summary"), ""),
    story_arc: {
      beginning: asString(pick(arc, "beginning")),
      middle: asString(pick(arc, "middle")),
      end: asString(pick(arc, "end")),
      moral: asString(pick(arc, "moral")),
    },
    characters: normalizeCharacters(pick(obj, "characters") ?? []),
    locations: asStringArray(pick(obj, "locations")),
    objects: asStringArray(pick(obj, "objects")),
    events: asStringArray(pick(obj, "events")),
    emotions: asStringArray(pick(obj, "emotions")),
  };
}

export function normalizeScenes(raw: unknown, durations: number[]): PlannedScene[] {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(raw) ? raw : Array.isArray(obj.scenes) ? obj.scenes : [];
  const count = list.length > 0 ? Math.min(list.length, Math.max(1, durations.length)) : durations.length;
  return Array.from({ length: count }, (_, i) => {
    const s = (list[i] && typeof list[i] === "object" ? list[i] : {}) as Record<string, unknown>;
    return {
      scene_id: asString(pick(s, "scene_id", "sceneId"), `scene_${String(i + 1).padStart(2, "0")}`),
      order: Number(pick(s, "order", "orderIndex")) || i + 1,
      duration: durations[i] ?? (Number(pick(s, "duration")) || 6),
      title: asString(pick(s, "title"), `Scene ${i + 1}`),
      script_segment: asString(pick(s, "script_segment", "scriptSegment")),
      narration: asString(pick(s, "narration")),
      characters: asStringArray(pick(s, "characters")),
      location: asString(pick(s, "location"), "storybook world"),
      time_of_day: asString(pick(s, "time_of_day", "timeOfDay"), "morning"),
      emotion: asString(pick(s, "emotion"), "wonder"),
      visual_prompt: asString(pick(s, "visual_prompt", "visualPrompt")),
      camera: asString(pick(s, "camera"), "slow cinematic tracking shot"),
      transition: asString(pick(s, "transition"), "soft_dissolve"),
      shot_type: asString(pick(s, "shot_type", "shotType"), "character"),
    };
  });
}
