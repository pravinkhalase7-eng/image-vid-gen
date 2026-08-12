import { describe, expect, it } from "vitest";
import { normalizeSafetyVerdict } from "@/lib/ai/safety/classifier";

describe("safety classifier", () => {
  it("allows a normal kids story even if the model is overly cautious", () => {
    expect(
      normalizeSafetyVerdict({
        safe: false,
        categories: ["children"],
        reason: "Story features a child named Momo",
      }).safe,
    ).toBe(true);
  });

  it("allows missing safe flag", () => {
    expect(normalizeSafetyVerdict({ reason: "ok" }).safe).toBe(true);
  });

  it("rejects only real harm categories", () => {
    expect(
      normalizeSafetyVerdict({
        safe: false,
        categories: ["sexual"],
        reason: "explicit content",
      }).safe,
    ).toBe(false);
  });
});
