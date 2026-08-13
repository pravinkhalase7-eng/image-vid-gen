/** Exact words a character should speak in a scene (for lip-sync). */
export function extractSpokenLine(text: string) {
  const raw = (text || "").trim();
  if (!raw) return "";

  const quotes = [...raw.matchAll(/[“"']([^“"'”]{2,280})[”"']/g)]
    .map((m) => m[1].trim())
    .filter(Boolean);
  if (quotes.length) return quotes.join(" ");

  const cue = raw.match(/^[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s*[:—-]\s*(.+)$/m);
  if (cue?.[1]?.trim()) return cue[1].trim();

  return raw
    .replace(/^(?:#{1,3}\s*)?(?:\*{0,2})(?:scene|shot|act)\s*(?:no\.?\s*)?[:.\-–—]?\s*\d+[a-z]?\s*(?:[:.\-–—).]|)\s*(?:\*{0,2})/i, "")
    .replace(/^(?:INT|EXT)(?:\s|\.).*$/im, "")
    .trim();
}
