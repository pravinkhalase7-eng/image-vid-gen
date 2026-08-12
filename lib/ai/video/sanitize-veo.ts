import { providerErrorMessage } from "@/lib/errors";

const CHILD_LANGUAGE: [RegExp, string][] = [
  [/\bphotorealistic children\b/gi, "photorealistic humans"],
  [/\breal minors\b/gi, "photorealistic humans"],
  [/\byounger child equivalent\b/gi, "young"],
  [/\byoung child equivalent\b/gi, "young"],
  [/\bchild equivalent\b/gi, "young"],
  [/\bchildren's\b/gi, "animated"],
  [/\bchild's\b/gi, "the character's"],
  [/\bchildren\b/gi, "audiences"],
  [/\bchild\b/gi, "young animal"],
  [/\bkids'\b/gi, ""],
  [/\bkids\b/gi, ""],
  [/\bkid\b/gi, ""],
  [/\bminors\b/gi, ""],
];

const DISTRESS: [RegExp, string][] = [
  [/\bcry for help\b/gi, "worried call"],
  [/\bhelp! somebody help me!?\b/gi, "a worried call"],
  [/\bplease help me!?\b/gi, "please come over"],
  [/\btrapped\b/gi, "stuck"],
  [/\banxious\b/gi, "alert"],
  [/\bstartled\b/gi, "surprised"],
  [/\bnervously\b/gi, "carefully"],
  [/\bnervous\b/gi, "careful"],
  [/\bafraid\b/gi, "unsure"],
];

export const VEO_STYLE =
  "Stylized 3D animated animal cartoon, Pixar-like, warm cinematic lighting, appealing woodland creatures, no on-screen text, no watermarks, no photorealistic humans.";

export const VEO_NEGATIVE =
  "photorealistic humans, graphic violence, blood, horror, sexual content, hate symbols, on-screen text, subtitles, captions, watermark, logo, extra limbs, distorted anatomy, shaky camera, random jump cuts, cluttered frame, dark grim atmosphere";

export function sanitizeVeoText(value: string, extra: [RegExp, string][] = []) {
  let out = value;
  for (const [re, replacement] of [...CHILD_LANGUAGE, ...extra]) {
    out = out.replace(re, replacement);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function softenDistress(value: string) {
  return sanitizeVeoText(value, DISTRESS);
}

export function isSafetyPolicyError(error: unknown) {
  const lower = providerErrorMessage(error).toLowerCase();
  return (
    lower.includes("safety") ||
    lower.includes("policies") ||
    lower.includes("rai") ||
    lower.includes("blocked") ||
    lower.includes("filtered")
  );
}
