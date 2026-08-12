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
}) {
  return `${DIRECTOR_PREAMBLE}

Split the script into exactly ${input.sceneCount} scenes that cover ONLY what the user wrote.
Durations in seconds (must use these, in order): ${input.durations.join(", ")}
Total: ${input.targetSeconds} seconds.

Do not invent extra story events, characters, dialogue, establishing shots, reaction shots, or pauses.
Do not pad the film. Do not repeat the same beat to fill time.
Each scene's script_segment and narration must be a consecutive slice of the user's script.
Together the scenes must cover the entire script with no additions and no omissions.
Visuals may only illustrate what that slice of the script already says.

TITLE: ${input.title}
SCRIPT (source of truth):
${input.script}

CHARACTERS:
${JSON.stringify(input.characters, null, 2)}

WORLD:
${input.world.bible}

STORY ARC:
${JSON.stringify(input.analysis.story_arc, null, 2)}

Return JSON { "scenes": [ { scene_id, order, duration, title, script_segment, narration, characters, location, time_of_day, emotion, visual_prompt, camera, transition, shot_type } ] }
narration must be faithful to the user's script (you may split it across scenes, not rewrite the story).
scene_id like scene_01. shot_type one of: establishing, character, action, reaction, close_up, wide, tracking.`;
}
