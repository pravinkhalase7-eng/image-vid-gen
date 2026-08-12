export function ttsPerformancePrompt(input: {
  narration: string;
  language: string;
  voice: string;
}) {
  return `Read this children's story narration exactly as written. Do not add lines, do not skip lines, do not summarize.

Language: ${input.language}
Voice style: warm, gentle, clear, ${input.voice}, suitable for ages 4–10.
Pace: unhurried, with small pauses at sentence ends.

NARRATION:
${input.narration}`;
}
