import { describe, expect, it } from "vitest";
import { videoPromptBuilder } from "@/lib/ai/video/prompt-builder";
import { buildFlowPromptPack } from "@/lib/ai/video/flow-pack";
import { DEFAULT_STYLE_BIBLE } from "@/lib/ai/prompts";
import type { CharacterBible, PlannedScene, WorldBible } from "@/lib/ai/types";

const momo: CharacterBible = {
  id: "momo",
  name: "Momo",
  species: "elephant",
  age: "young",
  appearance: "small elephant with large ears",
  clothing: "small yellow scarf",
  personality: "gentle",
  visual_features: ["yellow scarf", "large ears"],
};

const world: WorldBible = {
  environment: "jungle",
  color_palette: ["gold", "green"],
  lighting: "soft morning",
  time_of_day: "morning",
  architecture: "trees",
  background_elements: ["river"],
  bible: "A warm jungle.",
};

const scene = (id: string, extra: Partial<PlannedScene> = {}): PlannedScene => ({
  scene_id: id,
  order: 1,
  duration: 6,
  title: "Momo walks",
  script_segment: "Momo walks through the jungle.",
  narration: "Momo walks through the jungle.",
  characters: ["momo"],
  location: "jungle",
  time_of_day: "morning",
  emotion: "curiosity",
  visual_prompt: "Momo walking",
  camera: "tracking shot",
  transition: "fade",
  shot_type: "tracking",
  ...extra,
});

describe("VideoPromptBuilder", () => {
  it("locks clothing and style bible into every scene", () => {
    const prompt = videoPromptBuilder.build({
      styleBible: DEFAULT_STYLE_BIBLE,
      characters: [momo],
      world,
      scene: scene("scene_02"),
      previous: scene("scene_01"),
      next: scene("scene_03", { title: "Momo enters the water" }),
      duration: 6,
    });
    expect(prompt).toContain("yellow scarf");
    expect(prompt).toContain("GLOBAL STYLE");
    expect(prompt).toContain("CHARACTER CONSISTENCY");
    expect(prompt).toContain("source of truth");
    expect(prompt).toContain("Momo enters the water");
  });

  it("keeps the provider prompt under Veo's text limit", () => {
    const longWorld = { ...world, environment: "lush ".repeat(80), lighting: "golden ".repeat(40) };
    const compact = videoPromptBuilder.buildForProvider({
      styleBible: DEFAULT_STYLE_BIBLE,
      characters: [momo],
      world: longWorld,
      scene: scene("scene_02", { visual_prompt: "Momo walking through ferns. ".repeat(40) }),
      previous: scene("scene_01"),
      next: scene("scene_03"),
      duration: 6,
    });
    expect(compact.length).toBeLessThan(3200);
    expect(compact).toContain("yellow scarf");
    expect(compact.toLowerCase()).toContain("stylized 3d");
  });

  it("does not rewrite a baby boy into a cartoon animal", () => {
    const compact = videoPromptBuilder.buildForProvider({
      styleBible: DEFAULT_STYLE_BIBLE,
      characters: [{
        ...momo,
        name: "Arjun",
        species: "human baby boy",
        age: "baby",
        appearance: "stylized 3D animated baby boy",
        clothing: "a small blue shirt",
        visual_features: ["baby boy", "human"],
      }],
      world,
      scene: scene("scene_01", { visual_prompt: "A baby boy smiles at his mother.", title: "Baby boy smiles" }),
      duration: 6,
    });
    expect(compact.toLowerCase()).toContain("baby boy");
    expect(compact.toLowerCase()).not.toContain("woodland");
    expect(compact.toLowerCase()).not.toContain("cartoon animals only");
    expect(compact.toLowerCase()).not.toContain("young animal");
  });
});

describe("Flow prompt pack", () => {
  it("repeats the same character lock in every scene prompt", () => {
    const pack = buildFlowPromptPack({
      title: "Momo",
      styleBible: DEFAULT_STYLE_BIBLE,
      characters: [momo],
      world,
      scenes: [scene("scene_01"), scene("scene_02", { title: "Momo drinks", order: 2 })],
      aspectRatio: "16:9",
    });
    expect(pack.scenes).toHaveLength(2);
    expect(pack.masterLock).toContain("yellow scarf");
    expect(pack.scenes[0].prompt).toContain(pack.masterLock);
    expect(pack.scenes[1].prompt).toContain(pack.masterLock);
    expect(pack.scenes[1].prompt).toContain("Momo drinks");
    expect(pack.scenes[0].prompt).toContain("LIP SYNC");
    expect(pack.scenes[0].prompt).toContain("DIALOGUE");
    expect(pack.all).toContain("Google Flow");
    expect(pack.masterLock.toLowerCase()).not.toContain("cartoon animals only");
    expect(pack.masterLock.toLowerCase()).not.toContain("woodland creatures");
  });

  it("keeps a baby boy as a human in the prompt pack", () => {
    const pack = buildFlowPromptPack({
      title: "Arjun",
      styleBible: DEFAULT_STYLE_BIBLE,
      characters: [{
        id: "arjun",
        name: "Arjun",
        species: "human baby boy",
        age: "baby",
        appearance: "stylized 3D animated baby boy",
        clothing: "a small blue shirt",
        personality: "curious",
        visual_features: ["baby boy"],
      }],
      world,
      scenes: [scene("scene_01", { visual_prompt: "A baby boy crawls toward a toy.", script_segment: "The baby boy crawls." })],
    });
    expect(pack.masterLock.toLowerCase()).toContain("baby boy");
    expect(pack.masterLock.toLowerCase()).toContain("humans stay human");
    expect(pack.scenes[0].prompt.toLowerCase()).toContain("baby boy");
    expect(pack.masterLock.toLowerCase()).not.toContain("young animal");
  });
});
