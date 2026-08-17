export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
    public userMessage?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function providerErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const raw = error.message;
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
      return parsed.error?.message || parsed.message || raw;
    } catch {
      return raw;
    }
  }
  return String(error ?? "Unknown error");
}

export function userFacingError(error: unknown, fallback: string) {
  if (error instanceof AppError) {
    return error.userMessage ?? error.message;
  }
  const message = providerErrorMessage(error);
  if (message.includes("unsafe")) {
    return "This story isn't suitable for our kids' video generator.";
  }
  const lower = message.toLowerCase();
  if (lower.includes("looks like an elevenlabs key")) {
    return "GOOGLE_AI_API_KEY looks like an ElevenLabs key. Put that value in ELEVENLABS_API_KEY and set GOOGLE_AI_API_KEY to your Gemini key.";
  }
  if (lower.includes("elevenlabs")) {
    return message.toLowerCase().includes("quota")
      ? "ElevenLabs quota is used up on this key. Check usage at elevenlabs.io."
      : "ElevenLabs rejected this API key. Put it in ELEVENLABS_API_KEY (starts with sk_), not GOOGLE_AI_API_KEY, then rebuild.";
  }
  if (
    lower.includes("api key") &&
    (lower.includes("invalid") || lower.includes("not valid") || lower.includes("unauthorized") || lower.includes("permission denied"))
  ) {
    return "Google rejected this API key. If you pasted an ElevenLabs key, it belongs in ELEVENLABS_API_KEY. Gemini still needs GOOGLE_AI_API_KEY from Google AI Studio.";
  }
  if (lower.includes("not found") || lower.includes("no longer available") || lower.includes("has been retired")) {
    return "Google video generation isn't available with this model yet.";
  }
  if (isQuotaOrBillingError(message)) {
    return "Google's video quota for this API key is used up. Wait for it to reset, or add billing in Google AI Studio. Your movie plan is saved.";
  }
  if (lower.includes("permission") || lower.includes("insufficient")) {
    return "Google video generation isn't enabled on this API key yet.";
  }
  if (lower.includes("token") || lower.includes("too long") || lower.includes("1024")) {
    return "The scene description was too detailed for the video model. Try Continue to film with a shorter prompt.";
  }
  if (lower.includes("safety") || lower.includes("rai") || lower.includes("blocked") || lower.includes("filtered")) {
    return "Google blocked this scene. We'll keep your other finished scenes.";
  }
  if (lower.includes("person") && lower.includes("not supported")) {
    return "A video setting isn't supported by Google's current model. Try Continue to film again.";
  }
  return fallback;
}

export function isQuotaOrBillingError(error: unknown) {
  const lower = providerErrorMessage(error).toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate-limit") ||
    lower.includes("rate limit")
  );
}

export function isNonRetryableProviderError(error: unknown) {
  const lower = providerErrorMessage(error).toLowerCase();
  return (
    isQuotaOrBillingError(error) ||
    lower.includes("permission") ||
    lower.includes("not found") ||
    lower.includes("has been retired") ||
    lower.includes("no longer available") ||
    lower.includes("api key") ||
    lower.includes("elevenlabs") ||
    lower.includes("looks like an elevenlabs") ||
    (lower.includes("person") && lower.includes("not supported"))
  );
}

export function sceneRetryMessage(sceneTitle: string) {
  return `${sceneTitle} needs another try...`;
}
