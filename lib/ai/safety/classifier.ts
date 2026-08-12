import { AppError } from "@/lib/errors";
import { getTextProvider } from "@/lib/ai/providers";
import { MockTextProvider } from "@/lib/ai/providers/mock-text-provider";
import { safetyPrompt } from "@/lib/ai/prompts";
import type { SafetyVerdict } from "@/lib/ai/types";

const OBVIOUS_UNSAFE =
  /\b(gore|murder|suicide|porn|nude|nazi|kill yourself|explicit sex|rape|torture|child porn|csam)\b/i;

const REAL_HARMS = [
  "graphic_violence",
  "sexual",
  "hate",
  "dangerous_instructions",
  "explicit",
  "disturbing",
  "violence",
  "pornography",
];

const FALSE_POSITIVE =
  /\b(child|children|kid|kids|minor|minors|photorealistic|person generation|veo)\b/i;

export function normalizeSafetyVerdict(raw: unknown): SafetyVerdict {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const categories = Array.isArray(obj.categories)
    ? obj.categories.map((c) => String(c).toLowerCase())
    : [];
  const reason = String(obj.reason ?? obj.message ?? "");
  const explicit = readBool(obj.safe) ?? readBool(obj.is_safe) ?? readBool(obj.suitable) ?? readBool(obj.allowed);

  const harmHit =
    categories.some((c) => REAL_HARMS.some((h) => c.includes(h))) ||
    /\b(graphic violence|sexual content|hate|porn|explicit|torture)\b/i.test(reason);

  if (explicit === false && harmHit) {
    return { safe: false, categories, reason: reason || "unsafe" };
  }
  if (explicit === false && FALSE_POSITIVE.test(reason) && !harmHit) {
    return { safe: true, categories: [], reason: "allowed kids story" };
  }
  if (explicit === false && !harmHit) {
    return { safe: true, categories: [], reason: reason || "allowed" };
  }
  return { safe: true, categories, reason: reason || "ok" };
}

function readBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "yes", "safe", "allow", "allowed"].includes(v)) return true;
    if (["false", "no", "unsafe", "reject", "rejected"].includes(v)) return false;
  }
  return undefined;
}

export async function classifyStory(input: { title: string; topic: string; script: string }): Promise<SafetyVerdict> {
  if (OBVIOUS_UNSAFE.test(`${input.title} ${input.topic} ${input.script}`)) {
    throw new AppError(
      "unsafe",
      "unsafe_content",
      422,
      "This story isn't suitable for our kids' video generator.",
    );
  }

  const provider = getTextProvider();
  if (provider instanceof MockTextProvider) {
    return { safe: true, categories: [], reason: "ok" };
  }

  const raw = await provider.generateJson<unknown>({
    prompt: safetyPrompt(input.script, input.title, input.topic),
    schemaName: "safety",
  });
  const verdict = normalizeSafetyVerdict(raw);
  if (!verdict.safe) {
    throw new AppError(
      "unsafe",
      "unsafe_content",
      422,
      "This story isn't suitable for our kids' video generator.",
    );
  }
  return verdict;
}
