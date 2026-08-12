import { countWords } from "@/lib/utils";
import { estimateNarrationSeconds } from "@/lib/ai/video/duration";
import { MAX_SCRIPT_CHARS, MIN_SCRIPT_CHARS } from "@/lib/config";
import { AppError } from "@/lib/errors";

export function validateStoryInput(input: {
  title: string;
  topic: string;
  script: string;
}) {
  const title = input.title.trim();
  const topic = input.topic.trim();
  const script = input.script.trim();
  if (!title) throw new AppError("Title is required", "invalid_title", 400, "Please give your movie a title.");
  if (!topic) throw new AppError("Topic is required", "invalid_topic", 400, "Please add a topic for your story.");
  if (!script) throw new AppError("Script is required", "invalid_script", 400, "Please paste your story.");
  if (script.length < MIN_SCRIPT_CHARS) {
    throw new AppError(
      "Script too short",
      "script_too_short",
      400,
      "Your story is a little too short. Add a sentence or two so we can film it.",
    );
  }
  if (script.length > MAX_SCRIPT_CHARS) {
    throw new AppError(
      "Script too long",
      "script_too_long",
      400,
      "That's a wonderful epic — try a shorter chapter so we can finish the movie.",
    );
  }
  return { title, topic, script, words: countWords(script), estimatedSeconds: estimateNarrationSeconds(script) };
}
