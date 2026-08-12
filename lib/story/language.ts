const DEVANAGARI = /[\u0900-\u097F]/;

export function detectLanguage(script: string): "en" | "hi" | "mr" | "auto" {
  if (!DEVANAGARI.test(script)) return "en";
  const marathiHints = /आहे|नाही|तुम्ही|आम्ही|मुलं|गोष्ट/;
  if (marathiHints.test(script)) return "mr";
  return "hi";
}

export function languageLabel(code: string) {
  switch (code) {
    case "hi":
      return "Hindi";
    case "mr":
      return "Marathi";
    case "en":
      return "English";
    default:
      return "Auto";
  }
}

export function resolveLanguage(setting: string, script: string) {
  if (setting && setting !== "auto") return setting;
  return detectLanguage(script);
}
