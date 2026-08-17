import { describe, expect, it } from "vitest";
import { misplacedElevenLabsKeyMessage, misplacedGoogleKeyMessage } from "@/lib/ai/providers/api-keys";
import { sanitizeVeoText } from "@/lib/ai/video/sanitize-veo";
import { userFacingError } from "@/lib/errors";

describe("api keys", () => {
  it("rejects an ElevenLabs key in the Google slot", () => {
    expect(misplacedGoogleKeyMessage("sk_test_123")).toMatch(/ElevenLabs/);
    expect(misplacedGoogleKeyMessage("AIzaSyDummy")).toBeNull();
  });

  it("rejects a Gemini key in the ElevenLabs slot", () => {
    expect(misplacedElevenLabsKeyMessage("AIzaSyDummy")).toMatch(/Gemini/);
    expect(misplacedElevenLabsKeyMessage("sk_live_abc")).toBeNull();
  });
});

describe("character wording", () => {
  it("does not turn child or baby boy into an animal", () => {
    expect(sanitizeVeoText("a baby boy smiles")).toBe("a baby boy smiles");
    expect(sanitizeVeoText("the child waves")).toBe("the child waves");
    expect(sanitizeVeoText("photorealistic children")).toMatch(/stylized animated children/i);
  });
});

describe("user facing api errors", () => {
  it("explains a misplaced ElevenLabs key", () => {
    expect(userFacingError(new Error("API key not valid. Please pass a valid API key."), "fail")).toMatch(
      /ElevenLabs/,
    );
  });
});
