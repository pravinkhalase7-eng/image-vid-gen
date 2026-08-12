import { clamp, countWords } from "@/lib/utils";
import { MIN_CLIP_SECONDS, MAX_VIDEO_SECONDS, NARRATION_WPM, VEO_DURATIONS } from "@/lib/config";

export function estimateNarrationSeconds(script: string) {
  const words = countWords(script);
  return Math.max(1, Math.round((words / NARRATION_WPM) * 60));
}

export function countScriptBeats(script: string) {
  const beats = script
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return Math.max(1, beats.length);
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
 * Film length follows the script. User duration is only a maximum cap.
 * Veo clips are 4/6/8s, so the total is the closest valid combination.
 */
export function planClipDurations(input: {
  script: string;
  targetSeconds: number;
}) {
  const narration = estimateNarrationSeconds(input.script);
  const cap = input.targetSeconds > 0 ? input.targetSeconds : MAX_VIDEO_SECONDS;
  const target = clamp(narration, MIN_CLIP_SECONDS, Math.min(cap, MAX_VIDEO_SECONDS));
  const beats = countScriptBeats(input.script);

  let sceneCount = Math.round(target / 6) || 1;
  sceneCount = clamp(sceneCount, 1, Math.min(12, beats));

  const durations: Array<4 | 6 | 8> = [];
  let remaining = target;
  for (let i = 0; i < sceneCount; i++) {
    const left = sceneCount - i;
    if (left === 1) {
      durations.push(snapDuration(Math.max(MIN_CLIP_SECONDS, remaining)));
      break;
    }
    const even = remaining / left;
    const snapped = snapDuration(even);
    durations.push(snapped);
    remaining -= snapped;
  }

  let total = durations.reduce((a, b) => a + b, 0);
  let guard = 0;
  while (total > target + 1 && guard < 20) {
    const idx = [...durations].reverse().findIndex((d) => d > 4);
    if (idx === -1) break;
    const real = durations.length - 1 - idx;
    durations[real] = durations[real] === 8 ? 6 : 4;
    total = durations.reduce((a, b) => a + b, 0);
    guard += 1;
  }

  return {
    sceneCount: durations.length,
    durations,
    total,
    narrationSeconds: narration,
    padded: false,
  };
}
