/** Detect when an ElevenLabs key was pasted into the Google slot (or the reverse). */

export function looksLikeElevenLabsKey(key: string) {
  const k = key.trim();
  return /^sk_/.test(k);
}

export function looksLikeGoogleAiKey(key: string) {
  return /^AIza/.test(key.trim());
}

export function misplacedGoogleKeyMessage(googleKey: string) {
  if (!googleKey.trim()) return "GOOGLE_AI_API_KEY is not configured";
  if (looksLikeElevenLabsKey(googleKey)) {
    return "GOOGLE_AI_API_KEY looks like an ElevenLabs key (starts with sk_). Put that value in ELEVENLABS_API_KEY and set GOOGLE_AI_API_KEY to your Gemini key from Google AI Studio (usually starts with AIza).";
  }
  return null;
}

export function misplacedElevenLabsKeyMessage(elevenKey: string) {
  if (!elevenKey.trim()) return "ELEVENLABS_API_KEY is not configured";
  if (looksLikeGoogleAiKey(elevenKey)) {
    return "ELEVENLABS_API_KEY looks like a Google Gemini key. Put the ElevenLabs key (starts with sk_) in ELEVENLABS_API_KEY and keep the Gemini key in GOOGLE_AI_API_KEY.";
  }
  return null;
}
