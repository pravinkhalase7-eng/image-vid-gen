# Prompt architecture

All prompts live in `lib/ai/prompts/`. Routes never inline director instructions.

## Shared director preamble

Every generation prompt starts from `director.ts`:

- You are a cinematic children's animation director
- The supplied script is the source of truth
- Do not change the story, outcome, moral, or important dialogue
- Do not invent major characters
- Do not change appearance, clothing, or species between scenes
- Age-appropriate imagery only
- Stylized 3D animals/fantasy — never photorealistic children
- No on-screen text, watermarks, extra limbs, or shaky camera

## Files

| File | Used for |
|---|---|
| `safety.ts` | Kids safety classifier |
| `story-analysis.ts` | Characters, locations, events, arc |
| `character-generation.ts` | Character bible |
| `world-generation.ts` | World + palette + lighting |
| `scene-planning.ts` | 5–12 cinematic scenes |
| `video-generation.ts` | Per-scene Veo prompt sections |
| `tts.ts` | Faithful narration performance notes |

## VideoPromptBuilder

Inputs: style bible, character bible, world bible, previous/current/next scene, camera, emotion, lighting, duration.

Output: a single prompt with labeled sections (GLOBAL STYLE, CHARACTER CONSISTENCY, WORLD, SCENE, CAMERA, LIGHTING, MOTION, EMOTION, STORY FIDELITY, CONTINUITY).
