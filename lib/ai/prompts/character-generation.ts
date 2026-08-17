import { DIRECTOR_PREAMBLE } from "./director";
import type { StoryAnalysis } from "../types";

export function characterBiblePrompt(analysis: StoryAnalysis) {
  return `${DIRECTOR_PREAMBLE}

Create a Character Bible for every character in this analysis.
Appearance must stay frozen for the entire film (clothing, colors, size, species, accessories, age, face).

CAST FROM THE SCRIPT:
- A baby boy / little boy / girl / man / woman is a stylized animated human of that description. Do not convert them into an animal or Pixar creature.
- Age may be: baby, toddler, young, adult, elder — use the word that matches the script.
- species is "human" when the character is a person; otherwise the animal/creature named in the script.
- Never photorealistic. Never a real photograph.

STORY SUMMARY:
${analysis.summary}

CHARACTERS TO EXPAND:
${JSON.stringify(analysis.characters, null, 2)}

Return JSON { "characters": [ { id, name, species, age, appearance, clothing, personality, visual_features[] } ] }`;
}
