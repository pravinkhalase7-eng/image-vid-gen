import { DEFAULT_STYLE_BIBLE } from "@/lib/ai/prompts";
import type { CharacterBible, PlannedScene, WorldBible } from "@/lib/ai/types";
import { extractSpokenLine } from "./dialogue";
import { sanitizeVeoText, VEO_NEGATIVE, VEO_STYLE } from "./sanitize-veo";

export type FlowPromptPack = {
  title: string;
  instructions: string;
  masterLock: string;
  negative: string;
  scenes: {
    order: number;
    title: string;
    duration: number;
    prompt: string;
  }[];
  all: string;
};

export function buildMasterLock(input: {
  styleBible?: string | null;
  characters: CharacterBible[];
  world: WorldBible;
}) {
  const style = sanitizeVeoText(input.styleBible || DEFAULT_STYLE_BIBLE);
  const characters = input.characters
    .map((c) => {
      const age = sanitizeVeoText(c.age);
      const look = sanitizeVeoText(`${c.species}, ${c.appearance}`);
      const clothes = sanitizeVeoText(c.clothing);
      const locks = sanitizeVeoText((c.visual_features ?? []).join(", "));
      return `- ${c.name}: ${look}. Age: ${age}. Always wears ${clothes}.${locks ? ` Visual locks: ${locks}.` : ""} Keep this design identical in every shot.`;
    })
    .join("\n");
  const palette = (input.world.color_palette ?? []).slice(0, 6).join(", ");
  return sanitizeVeoText(`CONSISTENCY LOCK — paste this block unchanged into every scene in Gemini or Google Flow.

STYLE: ${VEO_STYLE} ${style}

CHARACTERS (must look identical in every shot, same face, size, colors, and clothing):
${characters || "- Keep the same stylized animal cast in every shot."}

WORLD: ${sanitizeVeoText(input.world.environment)}
${sanitizeVeoText(input.world.bible)}
Architecture: ${sanitizeVeoText(input.world.architecture)}
Background: ${sanitizeVeoText((input.world.background_elements ?? []).join(", "))}
Lighting: ${sanitizeVeoText(input.world.lighting)}
Time of day: ${sanitizeVeoText(input.world.time_of_day)}
Colors: ${palette}

RULES: Stylized cartoon animals only. No photorealistic humans. No on-screen text, captions, logos, or watermarks. Smooth cinematic camera. Do not change character design between scenes.`);
}

export function buildSceneFlowPrompt(input: {
  masterLock: string;
  scene: PlannedScene;
  previous?: PlannedScene | null;
  next?: PlannedScene | null;
  index: number;
  total: number;
  aspectRatio: string;
}) {
  const prev = input.previous
    ? `Previous scene was "${input.previous.title}". Continue from that world. Characters must look identical.`
    : "Opening scene. Establish the world, then play the beat.";
  const next = input.next
    ? `The next scene will be "${input.next.title}". Do not jump to that event yet.`
    : "Final scene. End on a warm, resolved image and hold the last expression.";
  const action = sanitizeVeoText(input.scene.visual_prompt || input.scene.script_segment);
  const script = sanitizeVeoText(input.scene.script_segment);
  const spoken = sanitizeVeoText(
    input.scene.spoken_line || input.scene.narration || extractSpokenLine(input.scene.script_segment),
  );
  const speaker = (input.scene.characters || []).filter(Boolean).join(", ") || "the lead character";

  return `${input.masterLock}

SCENE ${input.index} of ${input.total}: ${sanitizeVeoText(input.scene.title)}
Duration: ${input.scene.duration} seconds. Aspect ratio: ${input.aspectRatio}.

ACTION (only this beat, do not add extra plot): ${action}
SCRIPT BEAT: ${script}
LOCATION: ${sanitizeVeoText(input.scene.location)}
CAMERA: ${sanitizeVeoText(input.scene.camera)}
EMOTION: ${sanitizeVeoText(input.scene.emotion)}
CONTINUITY: ${prev} ${next}

DIALOGUE (speak these exact words; do not paraphrase or add lines):
Speaker: ${sanitizeVeoText(speaker)}
Line: "${spoken}"

LIP SYNC (mandatory):
- ${sanitizeVeoText(speaker)} speaks that line out loud in this shot.
- Mouth, lips, jaw, and teeth animate in sync with each syllable of the line (phoneme-accurate visemes).
- Audio is this line only, clear and natural, starting ~0.3s after the shot begins, finishing before the last 0.4s.
- No frozen mouth, no mumbling, no mismatched words, no extra ad-lib.
- Other characters listen with closed or slightly reacting mouths unless they have a line in this scene.

Generate one continuous ${input.scene.duration}-second shot that matches the consistency lock exactly.`;
}

export function buildFlowPromptPack(input: {
  title: string;
  styleBible?: string | null;
  characters: CharacterBible[];
  world: WorldBible;
  scenes: PlannedScene[];
  aspectRatio?: string;
}): FlowPromptPack {
  const masterLock = buildMasterLock(input);
  const negative = VEO_NEGATIVE;
  const aspectRatio = input.aspectRatio || "16:9";
  const scenes = input.scenes.map((scene, i) => {
    const prompt = buildSceneFlowPrompt({
      masterLock,
      scene,
      previous: input.scenes[i - 1] ?? null,
      next: input.scenes[i + 1] ?? null,
      index: i + 1,
      total: input.scenes.length,
      aspectRatio,
    });
    return {
      order: scene.order || i + 1,
      title: scene.title,
      duration: scene.duration,
      prompt,
    };
  });

  const instructions = `Use these prompts in Google Flow or Gemini. Do not rewrite the character lock — it is identical on purpose so the cast stays consistent.

1. Open Google Flow (or Gemini → Veo / video).
2. Set aspect ratio to ${aspectRatio}.
3. Paste Scene 1 and generate.
4. In Flow, save the characters as ingredients / use the last frame as a reference for the next shot.
5. Paste Scene 2 (the consistency lock is the same). Repeat for every scene.
6. Optionally paste the negative prompt into the negative / avoid field.`;

  const all = [
    `# ${input.title} — Gemini / Flow prompt pack`,
    "",
    instructions,
    "",
    "## Negative prompt",
    negative,
    "",
    "## Consistency lock (included in every scene below)",
    masterLock,
    "",
    ...scenes.flatMap((s) => [`## Scene ${s.order}: ${s.title} (${s.duration}s)`, s.prompt, ""]),
  ].join("\n");

  return { title: input.title, instructions, masterLock, negative, scenes, all };
}
