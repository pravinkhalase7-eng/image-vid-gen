import { describe, expect, it } from "vitest";
import { frameSize } from "@/lib/video/assembler";

describe("video assembly geometry", () => {
  it("maps aspect ratios to even pixel sizes", () => {
    const wide = frameSize("16:9", "720p");
    expect(wide.width).toBe(1280);
    expect(wide.height).toBe(720);
    const tall = frameSize("9:16", "720p");
    expect(tall.width).toBeLessThan(tall.height);
    expect(tall.width % 2).toBe(0);
    const square = frameSize("1:1", "720p");
    expect(square.width).toBe(square.height);
  });
});
