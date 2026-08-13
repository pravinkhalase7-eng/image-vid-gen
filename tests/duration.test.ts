import { describe, expect, it } from "vitest";
import {
  planClipDurations,
  estimateNarrationSeconds,
  snapDuration,
  splitScriptScenes,
  detectLabeledSceneCount,
} from "@/lib/ai/video/duration";
import { extractSpokenLine } from "@/lib/ai/video/dialogue";

const SHORT = "Once upon a time a little star named Luma made a friend.";
const TEN_SEC =
  "Benny the rabbit hops through the green forest. He sniffs a yellow flower. Then he waves to his friends and smiles.";
const LONG = Array.from({ length: 180 }, () => "The little star glowed with kindness.").join(" ");

const THREE_SCENES = `Scene 1
Momo stands by the river. He says, "The water looks so big."

Scene 2
He takes one small step. "The water feels cool."

Scene 3
Momo trumpets. "I'm not unsure anymore!"`;

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
  });

  it("does not invent extra scenes for a tiny script", () => {
    const plan = planClipDurations({ script: SHORT, targetSeconds: 30 });
    expect(plan.total).toBeLessThan(30);
    expect(plan.sceneCount).toBe(1);
  });

  it("keeps labeled Scene 1/2/3 as exactly three scenes", () => {
    const plan = planClipDurations({ script: THREE_SCENES, targetSeconds: 0 });
    expect(splitScriptScenes(THREE_SCENES)).toHaveLength(3);
    expect(plan.sceneCount).toBe(3);
    expect(plan.durations).toHaveLength(3);
    expect(plan.bodies).toHaveLength(3);
  });

  it("does not turn title + body paragraphs into six scenes", () => {
    const titled = `Scene 1
Once upon a time, in a beautiful jungle, there lived a little elephant named Momo. Momo loved flowers, fruit, and his friends. He looks at the river and says, "The water looks so big."

Scene 2
One sunny morning, Momo watched the other animals splash and laugh. He took a tiny step. Then another. "The water feels cool and kind," he says.

Scene 3
Momo trumpeted with joy. "I'm not unsure anymore!" He was brave, and the jungle cheered with him.`;
    expect(detectLabeledSceneCount(titled)).toBe(3);
    expect(splitScriptScenes(titled)).toHaveLength(3);
    expect(planClipDurations({ script: titled, targetSeconds: 0 }).sceneCount).toBe(3);
  });

  it("honors an explicit sceneCount even if paragraphs would split more", () => {
    const sixParas = `The river bank.

Momo looks at the water and says the river looks so big today.

The first step.

He takes one small step into the cool water and smiles.

The trumpet.

Momo trumpets with joy because he is brave now.`;
    expect(planClipDurations({ script: sixParas, targetSeconds: 0, sceneCount: 3 }).sceneCount).toBe(3);
    expect(splitScriptScenes(sixParas, 3)).toHaveLength(3);
  });

  it("does not turn every sentence into its own scene", () => {
    const many =
      "One. Two extra words here. Three extra words here. Four extra words here. Five extra words here. Six extra words here. Seven extra words here. Eight extra words here. Nine extra words here. Ten extra words here. Eleven extra words here.";
    const plan = planClipDurations({ script: many, targetSeconds: 0 });
    expect(plan.sceneCount).toBeLessThan(8);
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

describe("spoken line", () => {
  it("extracts quoted dialogue for lip-sync", () => {
    expect(extractSpokenLine('Momo says, "The water feels cool."')).toBe("The water feels cool.");
  });
});
