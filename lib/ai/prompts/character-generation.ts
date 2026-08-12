import { DIRECTOR_PREAMBLE } from "./director";
import type { StoryAnalysis } from "../types";

export function characterBiblePrompt(analysis: StoryAnalysis) {
  return `${DIRECTOR_PREAMBLE}

Create a Character Bible for every character in this analysis.
Appearance must stay frozen for the entire film (clothing, colors, size, species, accessories, age, face).
Use stylized animal or fantasy designs, never photorealistic humans.
Age must be one of: young, adult, elder. Never describe characters as a child or child-equivalent.

STORY SUMMARY:
${analysis.summary}

CHARACTERS TO EXPAND:
${JSON.stringify(analysis.characters, null, 2)}

Return JSON { "characters": [ { id, name, species, age, appearance, clothing, personality, visual_features[] } ] }`;
}
