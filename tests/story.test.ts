import { describe, expect, it } from "vitest";
import { MockTextProvider } from "@/lib/ai/providers/mock-text-provider";
import { validateStoryInput } from "@/lib/story/validate";
import { detectLanguage } from "@/lib/story/language";

const SCRIPT = `Once upon a time, in a beautiful jungle, there lived a little elephant named Momo. Momo loved flowers. He was afraid of the river. Then he found courage and stepped into the water.`;

describe("story parsing", () => {
  it("extracts Momo and plans enough scenes", () => {
    const mock = new MockTextProvider();
    const plan = mock.analyze({
      title: "The Little Elephant Who Was Afraid of Water",
      topic: "An elephant learning to overcome fear",
      script: SCRIPT,
      targetSeconds: 30,
    });
    expect(plan.safety.safe).toBe(true);
    expect(plan.characters.some((c) => c.name === "Momo")).toBe(true);
    expect(plan.characters[0].clothing).toContain("scarf");
    expect(plan.scenes.length).toBe(1);
    expect(plan.scenes.reduce((a, s) => a + s.duration, 0)).toBeGreaterThanOrEqual(4);
    expect(plan.scenes.reduce((a, s) => a + s.duration, 0)).toBeLessThan(30);
  });

  it("keeps a 3-scene script as 3 scenes", () => {
    const mock = new MockTextProvider();
    const script = `Scene 1
Momo stands by the river. He says, "The water looks so big."

Scene 2
He takes one small step. "The water feels cool."

Scene 3
Momo trumpets. "I'm not unsure anymore!"`;
    const plan = mock.analyze({
      title: "Momo",
      topic: "courage",
      script,
      targetSeconds: 0,
      sceneCount: 3,
    });
    expect(plan.scenes).toHaveLength(3);
  });

  it("keeps a baby boy as a human, not a cartoon animal", () => {
    const mock = new MockTextProvider();
    const plan = mock.analyze({
      title: "Arjun's Morning",
      topic: "A baby boy learning to crawl",
      script: `Scene 1
A baby boy named Arjun wakes up and smiles.

Scene 2
Arjun crawls toward his toy.

Scene 3
Arjun laughs with his mother.`,
      targetSeconds: 0,
      sceneCount: 3,
    });
    expect(plan.characters[0].species).toMatch(/human/);
    expect(plan.characters[0].appearance.toLowerCase()).toContain("baby boy");
    expect(plan.characters[0].species).not.toMatch(/animal/);
  });

  it("rejects empty title", () => {
    expect(() => validateStoryInput({ title: " ", topic: "kindness", script: SCRIPT })).toThrow();
  });

  it("detects english vs hindi", () => {
    expect(detectLanguage(SCRIPT)).toBe("en");
    expect(detectLanguage("एक बार की बात है एक हाथी था।")).toBe("hi");
  });
});
