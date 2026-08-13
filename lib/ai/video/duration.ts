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
  /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*{0,2})(?:scene|shot|act|screen|दृश्य)\s*(?:#|no\.?)?\s*[:.\-–—]?\s*\d+[a-z]?\b[^\n]*/gi;

const SLUGLINE = /(?:^|\n)\s*(?:INT|EXT)(?:\s|\.)/gi;

const NUMBERED_BLOCK = /(?:^|\n)\s*\d+[\.\)\:]\s+/g;

function speechSeconds(text: string) {
  return clamp(estimateNarrationSeconds(text), MIN_CLIP_SECONDS, MAX_SCENE_SECONDS);
}

/** Highest "Scene N" / "Shot N" number in the script. 3 labels → 3 scenes. */
export function detectLabeledSceneCount(script: string) {
  const text = script.replace(/\r\n/g, "\n");
  const nums = [...text.matchAll(/\b(?:scene|shot|act|screen|दृश्य)\s*(?:#|no\.?)?\s*[:.\-–—]?\s*(\d+)/gi)].map((m) =>
    Number(m[1]),
  );
  if (nums.length >= 2) {
    const unique = new Set(nums);
    return Math.max(Math.max(...nums), unique.size);
  }
  const numbered = [...text.matchAll(/^(?:\s*)(\d+)[\.\)\:]\s+\S/gm)].map((m) => Number(m[1]));
  if (numbered.length >= 2 && numbered[0] <= 2) {
    return Math.max(...numbered);
  }
  return 0;
}

function splitByMatches(text: string, matches: RegExpMatchArray[]): string[] {
  if (matches.length < 2) return [];
  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const scene = text.slice(start, end).replace(/^\n/, "").trim();
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

function looksLikeTitle(block: string) {
  const words = countWords(block);
  const stops = (block.match(/[.!?।]/g) || []).length;
  return words <= 20 && stops <= 1;
}

/** 6 paragraphs that are title/body/title/body → 3 scenes. */
export function pairTitleBodyBlocks(paras: string[]): string[] {
  if (paras.length < 4 || paras.length % 2 !== 0) return paras;
  let pairs = 0;
  for (let i = 0; i < paras.length; i += 2) {
    if (looksLikeTitle(paras[i]) && countWords(paras[i]) <= countWords(paras[i + 1])) pairs += 1;
  }
  if (pairs !== paras.length / 2) return paras;
  const out: string[] = [];
  for (let i = 0; i < paras.length; i += 2) {
    out.push(`${paras[i]}\n\n${paras[i + 1]}`.trim());
  }
  return out;
}

export function mergeSceneBodies(bodies: string[], count: number): string[] {
  const clean = bodies.map((b) => b.trim()).filter(Boolean);
  if (count < 1 || clean.length === 0) return clean.length ? clean : [""];
  if (clean.length === count) return clean;
  if (clean.length < count) return clean;
  if (clean.length === count * 2) {
    return Array.from({ length: count }, (_, i) => `${clean[i * 2]}\n\n${clean[i * 2 + 1]}`.trim());
  }
  const out = Array.from({ length: count }, () => "");
  clean.forEach((body, i) => {
    const idx = Math.min(count - 1, Math.floor((i / clean.length) * count));
    out[idx] = [out[idx], body].filter(Boolean).join("\n\n");
  });
  return out.filter(Boolean);
}

/**
 * Honor the author's scene breaks. Do not turn every sentence into its own clip.
 * Priority: Scene N labels → INT/EXT → numbered blocks → blank-line groups (with title/body pairing).
 */
export function splitScriptScenes(script: string, requestedCount = 0): string[] {
  const text = script.replace(/\r\n/g, "\n").trim();
  if (!text) return [""];

  const labeled = requestedCount > 0 ? requestedCount : detectLabeledSceneCount(text);

  const headerParts = splitByMatches(text, [...text.matchAll(new RegExp(SCENE_HEADER.source, SCENE_HEADER.flags))]);
  if (headerParts.length >= 2) {
    return labeled >= 2 ? mergeSceneBodies(headerParts, labeled) : headerParts;
  }

  const slugParts = splitByMatches(text, [...text.matchAll(new RegExp(SLUGLINE.source, SLUGLINE.flags))]);
  if (slugParts.length >= 2) {
    return labeled >= 2 ? mergeSceneBodies(slugParts, labeled) : slugParts;
  }

  const numbered = splitNumberedScenes(text);
  if (numbered.length >= 2 && numbered.length <= 12) {
    return labeled >= 2 ? mergeSceneBodies(numbered, labeled) : numbered;
  }

  const paras = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) >= 4);
  const paired = pairTitleBodyBlocks(paras);
  if (paired.length >= 2 && paired.length <= 8) {
    return labeled >= 2 ? mergeSceneBodies(paired, labeled) : paired;
  }

  if (labeled >= 2) return mergeSceneBodies(paras.length ? paras : [text], labeled);
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
 * `sceneCount` (from the form or Scene 1/2/3 labels) wins over paragraph splitting.
 */
export function planClipDurations(input: {
  script: string;
  targetSeconds: number;
  sceneCount?: number;
}) {
  const requested = input.sceneCount && input.sceneCount > 0 ? input.sceneCount : detectLabeledSceneCount(input.script);
  const bodies = splitScriptScenes(input.script, requested).filter((s) => s.trim());
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
