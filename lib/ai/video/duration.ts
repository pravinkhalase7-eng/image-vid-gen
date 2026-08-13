import { clamp, countWords } from "@/lib/utils";
import { MIN_CLIP_SECONDS, MAX_SCENE_SECONDS, MAX_VIDEO_SECONDS, NARRATION_WPM, VEO_DURATIONS } from "@/lib/config";

export function estimateNarrationSeconds(script: string) {
  const words = countWords(script);
  return Math.max(1, Math.round((words / NARRATION_WPM) * 60));
}

export function countScriptBeats(script: string) {
  return splitScriptScenes(script).length;
}

const SCENE_HEADER =
  /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*{0,2})(?:scene|shot|act)\s*(?:no\.?\s*)?[:.\-–—]?\s*\d+[a-z]?\s*(?:[:.\-–—).]|)\s*(?:\*{0,2})/gi;

const SLUGLINE = /(?:^|\n)\s*(?:INT|EXT)(?:\s|\.)/gi;

const NUMBERED_BLOCK = /(?:^|\n)\s*\d+[\.\)\:]\s+/g;

function speechSeconds(text: string) {
  return clamp(estimateNarrationSeconds(text), MIN_CLIP_SECONDS, MAX_SCENE_SECONDS);
}

function splitByMatches(text: string, matches: RegExpMatchArray[]): string[] {
  if (matches.length < 2) return [];
  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const header = match[0].replace(/^\n/, "").trim();
    const body = text.slice(start, end).trim();
    const scene = [header, body].filter(Boolean).join("\n").trim();
    if (scene) parts.push(scene);
  }
  const prefix = text.slice(0, matches[0].index ?? 0).trim();
  if (prefix.length > 40 && parts[0]) {
    parts[0] = `${prefix}\n${parts[0]}`.trim();
  }
  return parts;
}

function splitNumberedScenes(text: string): string[] {
  const matches = [...text.matchAll(new RegExp(NUMBERED_BLOCK.source, NUMBERED_BLOCK.flags))];
  if (matches.length < 2) return [];
  const nums = matches.map((m) => Number((m[0].match(/\d+/) || ["0"])[0]));
  if (nums[0] > 2) return [];
  const unique = new Set(nums);
  if (unique.size < 2) return [];
  return splitByMatches(text, matches);
}

/**
 * Honor the author's scene breaks. Do not turn every sentence into its own clip.
 * Priority: Scene/Shot headers → INT/EXT → numbered blocks → blank-line groups.
 */
export function splitScriptScenes(script: string): string[] {
  const text = script.replace(/\r\n/g, "\n").trim();
  if (!text) return [""];

  const headerParts = splitByMatches(text, [...text.matchAll(new RegExp(SCENE_HEADER.source, SCENE_HEADER.flags))]);
  if (headerParts.length >= 2) return headerParts;

  const slugParts = splitByMatches(text, [...text.matchAll(new RegExp(SLUGLINE.source, SLUGLINE.flags))]);
  if (slugParts.length >= 2) return slugParts;

  const numbered = splitNumberedScenes(text);
  if (numbered.length >= 2 && numbered.length <= 12) return numbered;

  const paras = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 8);
  if (paras.length >= 2 && paras.length <= 8) return paras;

  return [text];
}

export function snapDuration(seconds: number): 4 | 6 | 8 {
  let best: 4 | 6 | 8 = 6;
  let diff = Infinity;
  for (const option of VEO_DURATIONS) {
    const d = Math.abs(option - seconds);
    if (d < diff || (d === diff && option === 6)) {
      diff = d;
      best = option;
    }
  }
  return best;
}

/**
 * One output scene per script scene. Length follows spoken time in that scene.
 * User duration is only a maximum cap. Sentence count is never used as scene count.
 */
export function planClipDurations(input: {
  script: string;
  targetSeconds: number;
}) {
  const bodies = splitScriptScenes(input.script).filter((s) => s.trim());
  const sceneBodies = bodies.length ? bodies : [input.script];
  const cap = input.targetSeconds > 0 ? Math.min(input.targetSeconds, MAX_VIDEO_SECONDS) : MAX_VIDEO_SECONDS;

  let durations = sceneBodies.map((body) => speechSeconds(body));
  let total = durations.reduce((a, b) => a + b, 0);
  const narrationSeconds = estimateNarrationSeconds(input.script);

  if (total > cap && total > 0) {
    const scale = cap / total;
    durations = durations.map((d) => clamp(Math.round(d * scale), MIN_CLIP_SECONDS, d));
    total = durations.reduce((a, b) => a + b, 0);
  }

  return {
    sceneCount: durations.length,
    durations,
    bodies: sceneBodies,
    total,
    narrationSeconds,
    padded: false,
  };
}
