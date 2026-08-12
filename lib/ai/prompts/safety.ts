export function safetyPrompt(script: string, title: string, topic: string) {
  return `You classify children's stories for a kids animation studio (ages 4–10).

ALLOW:
- Stories about children, animals, friendship, kindness, courage
- Mild fairy-tale peril (getting lost, feeling scared, then being comforted)
- Imaginary creatures, jungle, rivers, stars, talking animals

REJECT only if the script clearly contains or requests:
- graphic violence
- sexual content
- hate
- dangerous real-world instructions
- explicit content
- disturbing horror imagery

Do not reject a story just because it is for kids, mentions children, or includes fear that is resolved kindly.

TITLE: ${title}
TOPIC: ${topic}
SCRIPT:
${script}

Return JSON: { "safe": true or false, "categories": [], "reason": "short reason" }
If the story is a normal children's tale, safe must be true.`;
}
