import { providerErrorMessage } from "@/lib/errors";

/** Soften Veo-blocked photorealism. Do not rewrite humans into animals. */
const CHILD_LANGUAGE: [RegExp, string][] = [
  [/\bphotorealistic children\b/gi, "stylized animated children"],
  [/\bphotorealistic (?:child|kid|baby|infant|toddler)s?\b/gi, "stylized animated child"],
  [/\breal photographs of minors\b/gi, "stylized animated children"],
  [/\breal minors\b/gi, "stylized animated children"],
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
  "Family-friendly stylized 3D animation. Characters match the script: humans stay human, animals stay animals. Warm cinematic lighting. No photorealism, no on-screen text, no watermarks.";

export const VEO_NEGATIVE =
  "photorealistic children, real photographs of minors, graphic violence, blood, horror, sexual content, hate symbols, on-screen text, subtitles, captions, watermark, logo, extra limbs, distorted anatomy, shaky camera, random jump cuts, cluttered frame, dark grim atmosphere, replacing humans with cartoon animals";

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
