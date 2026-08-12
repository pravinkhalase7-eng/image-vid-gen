import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/jobs/state-machine";
import { backoffMs, canRetry } from "@/lib/jobs/retry";
import { isNonRetryableProviderError, userFacingError } from "@/lib/errors";

describe("generation state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("DRAFT", "ANALYZING")).toBe(true);
    expect(canTransition("ANALYZING", "PLANNING")).toBe(true);
    expect(canTransition("READY_TO_GENERATE", "GENERATING")).toBe(true);
    expect(canTransition("GENERATING", "ASSEMBLING")).toBe(true);
    expect(canTransition("ASSEMBLING", "COMPLETED")).toBe(true);
  });

  it("blocks skipping ahead", () => {
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
  });

  it("allows fail and retry", () => {
    expect(canTransition("GENERATING", "FAILED")).toBe(true);
    expect(canTransition("FAILED", "GENERATING")).toBe(true);
  });
});

describe("retry backoff", () => {
  it("grows exponentially and caps attempts at 3", () => {
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(canRetry(1)).toBe(true);
    expect(canRetry(3)).toBe(false);
  });
});

describe("provider errors", () => {
  it("does not retry Google quota or billing failures", () => {
    const quota = new Error(
      "You exceeded your current quota, please check your plan and billing details.",
    );
    expect(isNonRetryableProviderError(quota)).toBe(true);
    expect(userFacingError(quota, "fallback")).toContain("quota");
  });
});
