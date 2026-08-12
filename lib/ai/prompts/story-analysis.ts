import { DIRECTOR_PREAMBLE } from "./director";

export function storyAnalysisPrompt(input: {
  title: string;
  topic: string;
  script: string;
}) {
  return `${DIRECTOR_PREAMBLE}

Analyze this children's story. Extract only what is in the script. Do not invent major characters or plot points.

TITLE: ${input.title}
TOPIC: ${input.topic}
SCRIPT:
${input.script}

Return JSON with summary, story_arc (beginning, middle, end, moral), characters, locations, objects, events, emotions.`;
}
