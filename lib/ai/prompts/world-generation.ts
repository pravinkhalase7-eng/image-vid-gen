import { DIRECTOR_PREAMBLE, styleBibleFor } from "./director";
import type { StoryAnalysis } from "../types";

export function worldBiblePrompt(analysis: StoryAnalysis, topic: string, style?: string | null) {
  return `${DIRECTOR_PREAMBLE}

Build a World Bible for this children's film. Keep one coherent place, palette, and lighting language.
The world must fit the characters in the script (a human baby stays in a human-scale world; do not default to a cartoon animal forest unless the script is set there).

TOPIC: ${topic}
LOCATIONS: ${analysis.locations.join(", ")}
SUMMARY: ${analysis.summary}
BASE STYLE: ${styleBibleFor(style)}

Return JSON with environment, color_palette[], lighting, time_of_day, architecture, background_elements[], bible.`;
}
