import { describe, expect, it } from "vitest";
import { asString, normalizeWorld } from "@/lib/ai/normalize";

describe("AI JSON normalize", () => {
  it("turns nested bible objects into strings", () => {
    const world = normalizeWorld({
      environment: { forest: "sunlit oaks" },
      color_palette: ["gold", "green"],
      bible: { title: "The Brave Little Rabbit", art_style: "3D" },
    });
    expect(typeof world.bible).toBe("string");
    expect(world.bible).toContain("Brave Little Rabbit");
    expect(typeof world.environment).toBe("string");
  });

  it("flattens objects with asString", () => {
    expect(asString({ a: "one", b: "two" })).toContain("one");
  });
});
