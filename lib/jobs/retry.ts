import { MAX_SCENE_RETRIES } from "@/lib/config";

export function backoffMs(attempt: number) {
  return Math.min(30_000, 1000 * 2 ** attempt);
}

export function canRetry(attemptCount: number) {
  return attemptCount < MAX_SCENE_RETRIES;
}
