import { DEFAULT_STYLE_BIBLE, DIRECTOR_PREAMBLE, NEGATIVE_VISUALS } from "@/lib/ai/prompts";
import type { CharacterBible, PlannedScene, WorldBible } from "@/lib/ai/types";
import { sanitizeVeoText, softenDistress, VEO_NEGATIVE, VEO_STYLE } from "./sanitize-veo";

export type PromptBuilderInput = {
  styleBible: string;
  characters: CharacterBible[];
  world: WorldBible;
  scene: PlannedScene;
  previous?: PlannedScene | null;
  next?: PlannedScene | null;
  duration: number;
};

export class VideoPromptBuilder {
  build(input: PromptBuilderInput) {
    const present = input.characters.filter((c) =>
      input.scene.characters.includes(c.id) ||
      input.scene.characters.includes(c.name.toLowerCase()),
    );
    const cast = present.length ? present : input.characters;
    const characterBlock = cast
      .map(
        (c) =>
          `${c.name} (${c.id}): ${c.species}, ${c.age}. ${c.appearance} Clothing/accessories (MUST remain identical in every shot): ${c.clothing}. Personality: ${c.personality}. Visual locks: ${c.visual_features.join("; ")}.`,
      )
      .join("\n");

    const previous = input.previous
      ? `Immediately before: ${input.previous.title}. ${input.previous.visual_prompt} Emotion was ${input.previous.emotion}. Characters must look identical.`
      : "Opening scene. Begin with a gentle establishing image of the world.";

    const next = input.next
      ? `This scene should visually prepare for: ${input.next.title} (${input.next.emotion}). Do not jump to that event yet.`
      : "Final scene. End on a warm, resolved image. Hold the last expression.";

    return `${DIRECTOR_PREAMBLE}

GLOBAL STYLE:
${input.styleBible || DEFAULT_STYLE_BIBLE}

CHARACTER CONSISTENCY:
${characterBlock}

WORLD:
${input.world.bible}
Environment: ${input.world.environment}
Time of day: ${input.scene.time_of_day || input.world.time_of_day}
Architecture: ${input.world.architecture}
Background: ${input.world.background_elements.join(", ")}

PREVIOUS SCENE CONTEXT:
${previous}

SCENE:
Duration: ${input.duration} seconds.
Title: ${input.scene.title}
Location: ${input.scene.location}
What happens (from the script, do not change): ${input.scene.script_segment}
Spoken line (lip-sync these exact words): ${input.scene.spoken_line || input.scene.narration}
Visual: ${input.scene.visual_prompt}

NEXT SCENE INTENT:
${next}

CAMERA:
${input.scene.camera}. Cinematic composition, motivated movement, depth of field, film-like framing. Avoid excessive camera movement.

LIGHTING:
${input.world.lighting}. Soft cinematic lighting, warm, readable faces.

MOTION:
Smooth, appealing character animation. Natural, unhurried motion matching a ${input.duration}s shot.
Lip-sync: the speaking character's mouth must match the spoken line syllable by syllable. No silent mouths while dialogue plays.

EMOTION:
${input.scene.emotion}. Expressions clear and readable for children.

COLOR LANGUAGE:
${input.world.color_palette.join(", ")}

STORY FIDELITY:
The user's script is the source of truth. Do not change the story, characters, outcome, or moral.

CONTINUITY LOCK:
Keep clothing, colors, size, species, accessories, age, and facial characteristics identical to the character bible. ${cast.map((c) => `${c.name} must still wear/have: ${c.clothing}`).join(" ")}

Avoid: ${NEGATIVE_VISUALS}`;
  }

  negativePrompt() {
    return VEO_NEGATIVE;
  }

  /** Veo text input is capped (~1024 tokens). Never mention children — Veo blocks that. */
  buildForProvider(input: PromptBuilderInput, options: { safeMode?: boolean } = {}) {
    const full = this.build(input);
    const present = input.characters.filter((c) =>
      input.scene.characters.includes(c.id) ||
      input.scene.characters.includes(c.name.toLowerCase()),
    );
    const cast = present.length ? present : input.characters.slice(0, 3);
    const clean = (value: string, max: number) => {
      const text = options.safeMode ? softenDistress(sanitizeVeoText(value)) : sanitizeVeoText(value);
      return asShort(text, max);
    };
    const locks = cast
      .map((c) => `${c.name}: ${sanitizeVeoText(c.species)}, ${clean(c.appearance, 120)}. Always wears ${clean(c.clothing, 80)}.`)
      .join(" ");
    const visual = clean(input.scene.visual_prompt || input.scene.script_segment, 420);
    const compact = [
      VEO_STYLE,
      `Characters (must stay identical): ${locks}`,
      `World: ${clean(input.world.environment, 180)}. Lighting: ${clean(input.world.lighting, 140)}. Colors: ${input.world.color_palette.slice(0, 5).join(", ")}.`,
      `Scene (${input.duration}s): ${clean(input.scene.title, 80)}. ${visual}`,
      `Camera: ${clean(input.scene.camera, 120)}. Emotion: ${clean(input.scene.emotion, 80)}. Smooth motion, film-like framing.`,
      "Keep clothing and character design identical. Stylized cartoon animals only.",
    ].join("\n");
    const prompt = compact.length > 3200 ? compact.slice(0, 3190) : compact || full.slice(0, 3200);
    return sanitizeVeoText(prompt);
  }
}

function asShort(value: string, max = 140) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export const videoPromptBuilder = new VideoPromptBuilder();
