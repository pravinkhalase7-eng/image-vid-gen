import { DIRECTOR_PREAMBLE, DEFAULT_STYLE_BIBLE } from "./director";
import type { StoryAnalysis } from "../types";

export function worldBiblePrompt(analysis: StoryAnalysis, topic: string) {
  return `${DIRECTOR_PREAMBLE}

Build a World Bible for this children's film. Keep one coherent place, palette, and lighting language.

TOPIC: ${topic}
LOCATIONS: ${analysis.locations.join(", ")}
SUMMARY: ${analysis.summary}
BASE STYLE: ${DEFAULT_STYLE_BIBLE}

Return JSON with environment, color_palette[], lighting, time_of_day, architecture, background_elements[], bible.`;
}
