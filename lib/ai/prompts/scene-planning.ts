import { DIRECTOR_PREAMBLE } from "./director";
import type { CharacterBible, StoryAnalysis, WorldBible } from "../types";

export function scenePlanningPrompt(input: {
  title: string;
  script: string;
  analysis: StoryAnalysis;
  characters: CharacterBible[];
  world: WorldBible;
  targetSeconds: number;
  sceneCount: number;
  durations: number[];
  sceneBlocks?: string[];
}) {
  const blocks = (input.sceneBlocks?.length ? input.sceneBlocks : [])
    .map((block, i) => `--- SCENE BLOCK ${i + 1} (${input.durations[i] ?? 8}s) ---\n${block}`)
    .join("\n\n");

  return `${DIRECTOR_PREAMBLE}

Create EXACTLY ${input.sceneCount} scenes — one per scene block below.
Durations in seconds (must use these, in order): ${input.durations.join(", ")}
Total: ${input.targetSeconds} seconds.

The user already divided the story. Do not split a block into extra shots.
Do not invent extra story events, characters, dialogue, establishing shots, reaction shots, or pauses.
Do not pad the film. Do not repeat the same beat to fill time.
Each scene's script_segment must be that block's text (you may drop the "Scene N" label from the title).
Together the scenes must cover the entire script with no additions and no omissions.
Visuals may only illustrate what that block already says.

SPOKEN AUDIO / LIP-SYNC:
- spoken_line = the exact words heard in this scene.
- If the block has quoted dialogue ("...") or a Name: line, copy those words exactly into spoken_line.
- If there is no quote, put a short first-person line the lead character would actually say that matches THIS block only (1–2 sentences, no new plot).
- narration must equal spoken_line (this is what the mouth must match).

${blocks ? `SCENE BLOCKS (source of truth):\n${blocks}` : `SCRIPT (source of truth):\n${input.script}`}

TITLE: ${input.title}

CHARACTERS:
${JSON.stringify(input.characters, null, 2)}

WORLD:
${input.world.bible}

STORY ARC:
${JSON.stringify(input.analysis.story_arc, null, 2)}

Return JSON { "scenes": [ { scene_id, order, duration, title, script_segment, spoken_line, narration, characters, location, time_of_day, emotion, visual_prompt, camera, transition, shot_type } ] }
You must return exactly ${input.sceneCount} scenes, in order.
scene_id like scene_01. shot_type one of: establishing, character, action, reaction, close_up, wide, tracking.`;
}
