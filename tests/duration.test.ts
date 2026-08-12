import { describe, expect, it } from "vitest";
import { planClipDurations, estimateNarrationSeconds, snapDuration } from "@/lib/ai/video/duration";

const SHORT = "Once upon a time a little star named Luma made a friend.";
const TEN_SEC =
  "Benny the rabbit hops through the green forest. He sniffs a yellow flower. Then he waves to his friends and smiles.";
const LONG = Array.from({ length: 180 }, () => "The little star glowed with kindness.").join(" ");

describe("duration planner", () => {
  it("estimates narration from word count", () => {
    expect(estimateNarrationSeconds("one two three four five")).toBeGreaterThan(0);
  });

  it("snaps to Veo 4/6/8", () => {
    expect(snapDuration(5)).toBe(6);
    expect(snapDuration(8)).toBe(8);
    expect(snapDuration(3)).toBe(4);
  });

  it("follows a short script instead of padding to 30 seconds", () => {
    const plan = planClipDurations({ script: TEN_SEC, targetSeconds: 0 });
    expect(plan.narrationSeconds).toBeLessThan(20);
    expect(plan.total).toBeLessThan(20);
    expect(plan.total).toBeGreaterThanOrEqual(4);
    expect(plan.padded).toBe(false);
    expect(plan.durations.every((d) => [4, 6, 8].includes(d))).toBe(true);
  });

  it("does not invent extra scenes for a tiny script", () => {
    const plan = planClipDurations({ script: SHORT, targetSeconds: 30 });
    expect(plan.total).toBeLessThan(30);
    expect(plan.sceneCount).toBeLessThan(5);
  });

  it("uses more time for longer scripts", () => {
    const a = planClipDurations({ script: TEN_SEC, targetSeconds: 0 });
    const b = planClipDurations({ script: LONG, targetSeconds: 0 });
    expect(b.total).toBeGreaterThan(a.total);
  });

  it("respects a maximum duration cap", () => {
    const plan = planClipDurations({ script: LONG, targetSeconds: 30 });
    expect(plan.total).toBeLessThanOrEqual(32);
  });
});
