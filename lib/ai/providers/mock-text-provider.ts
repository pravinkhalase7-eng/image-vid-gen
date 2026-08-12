import { slugify } from "@/lib/utils";
import { DEFAULT_STYLE_BIBLE } from "@/lib/ai/prompts";
import { planClipDurations } from "@/lib/ai/video/duration";
import type {
  CharacterBible,
  PlannedScene,
  SafetyVerdict,
  StoryAnalysis,
  WorldBible,
} from "@/lib/ai/types";
import type { TextProvider, TextGenerateJsonOptions } from "./text-provider";

const UNSAFE =
  /\b(gore|murder|suicide|porn|nude|nazi|kill yourself|explicit sex|rape|torture)\b/i;

export class MockTextProvider implements TextProvider {
  readonly name = "mock-text";
  readonly model = "mock";

  async generateJson<T>(options: TextGenerateJsonOptions): Promise<T> {
    const prompt = options.prompt;
    if (options.schemaName === "safety") {
      return { safe: !UNSAFE.test(prompt), categories: [], reason: "ok" } as T;
    }
    throw new Error(`MockTextProvider cannot handle ${options.schemaName} directly`);
  }

  analyze(input: { title: string; topic: string; script: string; targetSeconds: number }) {
    const safety: SafetyVerdict = {
      safe: !UNSAFE.test(input.script),
      categories: [],
      reason: safetyReason(input.script),
    };
    const characters = extractCharacters(input.title, input.script);
    const locations = extractLocations(input.script);
    const sentences = splitSentences(input.script);
    const story: StoryAnalysis = {
      summary: sentences.slice(0, 3).join(" ") || input.script.slice(0, 240),
      story_arc: {
        beginning: sentences[0] || input.script.slice(0, 120),
        middle: sentences[Math.floor(sentences.length / 2)] || "",
        end: sentences[sentences.length - 1] || "",
        moral: input.topic,
      },
      characters,
      locations,
      objects: extractNouns(input.script, ["ball", "river", "tree", "star", "boat", "scarf", "flower"]),
      events: sentences.slice(0, 8),
      emotions: extractEmotions(input.script),
    };
    const world: WorldBible = {
      environment: locations[0]
        ? `A lush, painterly ${locations[0]} filled with gentle light and friendly details.`
        : "A warm, whimsical storybook world with soft hills and golden light.",
      color_palette: ["warm gold", "soft teal", "cream", "leaf green", "sunset peach"],
      lighting: "Soft morning cinematic light with gentle volumetric haze",
      time_of_day: "golden morning",
      architecture: "Organic natural forms, cozy dens, no harsh modern buildings",
      background_elements: ["tall grass", "fireflies", "distant mountains", "sparkling water"],
      bible: `A cohesive family-friendly world for "${input.title}". Palette stays warm gold, soft teal, and cream. Lighting is gentle and readable. ${locations.join(", ") || "storybook meadows"} remain geographically consistent.`,
    };
    const plan = planClipDurations({ script: input.script, targetSeconds: input.targetSeconds });
    const scenes = buildScenes(input.script, characters, locations, plan.durations);
    return {
      safety,
      story,
      characters,
      world,
      styleBible: DEFAULT_STYLE_BIBLE,
      scenes,
    };
  }
}

function safetyReason(script: string) {
  if (UNSAFE.test(script)) return "unsafe";
  return "ok";
}

function splitSentences(script: string) {
  return script
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function extractCharacters(title: string, script: string): CharacterBible[] {
  const named = [...script.matchAll(/(?:named|called)\s+([A-Z][a-zA-Z]+)/g)].map((m) => m[1]);
  const caps = [...script.matchAll(/\b([A-Z][a-z]{2,})\b/g)]
    .map((m) => m[1])
    .filter((n) => !["Once", "The", "There", "Then", "When", "After", "Soon"].includes(n));
  const names = Array.from(new Set([...named, ...caps])).slice(0, 4);
  if (names.length === 0) {
    names.push(title.split(" ").find((w) => /^[A-Z]/.test(w)) || "Momo");
  }
  const speciesGuess = guessSpecies(script + " " + title);
  return names.map((name, i) => ({
    id: slugify(name),
    name,
    species: i === 0 ? speciesGuess : "animal friend",
    age: "young",
    appearance: `Stylized 3D animated ${speciesGuess} with large expressive eyes, soft rounded features, and a friendly silhouette.`,
    clothing: i === 0 ? "a small yellow scarf" : "a tiny blue vest",
    personality: "curious, gentle, brave-in-the-end",
    visual_features: ["large eyes", "soft rounded shapes", i === 0 ? "yellow scarf" : "blue vest"],
  }));
}

function guessSpecies(text: string) {
  const t = text.toLowerCase();
  if (t.includes("elephant")) return "baby elephant";
  if (t.includes("rabbit")) return "rabbit";
  if (t.includes("fox")) return "fox";
  if (t.includes("star")) return "tiny star spirit";
  if (t.includes("bear")) return "bear cub";
  if (t.includes("bird")) return "songbird";
  return "friendly animal";
}

function extractLocations(script: string) {
  const hints = ["jungle", "forest", "river", "village", "ocean", "mountain", "garden", "sky", "meadow", "cave"];
  const found = hints.filter((h) => script.toLowerCase().includes(h));
  return found.length ? found : ["storybook meadow"];
}

function extractNouns(script: string, catalog: string[]) {
  return catalog.filter((n) => script.toLowerCase().includes(n));
}

function extractEmotions(script: string) {
  const map: Record<string, string> = {
    afraid: "fear",
    scared: "fear",
    brave: "courage",
    happy: "joy",
    sad: "sadness",
    kind: "kindness",
    friend: "friendship",
    curious: "curiosity",
  };
  const found = Object.entries(map)
    .filter(([k]) => script.toLowerCase().includes(k))
    .map(([, v]) => v);
  return Array.from(new Set(["curiosity", ...found]));
}

const CAMERAS = [
  "wide aerial establishing shot, slow drift",
  "slow cinematic push-in toward the character",
  "close-up of the character's face, shallow depth of field",
  "gentle tracking shot following the character",
  "low-angle heroic shot as courage grows",
  "wide environmental shot with the character small in frame",
  "over-the-shoulder reaction shot",
  "warm wraparound close shot for the ending",
];

const SHOTS = ["establishing", "character", "close_up", "tracking", "action", "wide", "reaction", "character"];

function buildScenes(
  script: string,
  characters: CharacterBible[],
  locations: string[],
  durations: Array<4 | 6 | 8>,
): PlannedScene[] {
  const sentences = splitSentences(script);
  const chunks = chunk(sentences.length ? sentences : [script], durations.length);
  const lead = characters[0];
  return durations.map((duration, i) => {
    const segment = chunks[i]?.join(" ") || sentences[sentences.length - 1] || script;
    return {
      scene_id: `scene_${String(i + 1).padStart(2, "0")}`,
      order: i + 1,
      duration,
      title: titleFrom(segment, i),
      script_segment: segment,
      narration: segment,
      characters: [lead.id],
      location: locations[i % locations.length],
      time_of_day: "golden morning",
      emotion: i === 0 ? "curiosity" : i === durations.length - 1 ? "joy" : "courage",
      visual_prompt: `${lead.name} acts out: ${segment}`,
      camera: CAMERAS[i % CAMERAS.length],
      transition: i === 0 ? "fade_in" : "soft_dissolve",
      shot_type: SHOTS[i % SHOTS.length],
    };
  });
}

function titleFrom(segment: string, i: number) {
  const words = segment.split(/\s+/).slice(0, 6).join(" ");
  return words.length > 8 ? words.replace(/[.,!?].*$/, "") : `Scene ${i + 1}`;
}

function chunk<T>(items: T[], parts: number) {
  const out: T[][] = Array.from({ length: parts }, () => []);
  items.forEach((item, i) => {
    out[Math.min(parts - 1, Math.floor((i / items.length) * parts))].push(item);
  });
  if (out.some((c) => c.length === 0)) {
    let j = 0;
    for (const c of out) {
      if (c.length === 0 && items[j]) {
        c.push(items[Math.min(j, items.length - 1)]);
      }
      j += 1;
    }
  }
  return out;
}
