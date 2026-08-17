export const DIRECTOR_PREAMBLE = `You are a cinematic children's animation director.

The supplied script is the source of truth.
Do not change the story.
Do not invent major characters.
Do not change character appearance between scenes.
Maintain the same environment and visual language.
Create visually engaging cinematic shots.
Use age-appropriate imagery.
Keep expressions clear and emotionally readable for children.
Maintain continuity between scenes.
On-screen speech must lip-sync: mouth, jaw, and visemes match the spoken_line exactly. No frozen mouths while audio plays. No extra ad-libbed words.

STORY FIDELITY:
You may add visual transitions, expressions, camera movements, and environmental details that illustrate the current script beat.
You must NOT add extra scenes, extra events, extra dialogue, or filler shots that are not in the script.

CASTING (match the script — this is mandatory):
- If the script describes a baby boy, little boy, girl, man, woman, or any human, that character stays a stylized animated human. Do not turn them into an animal, mascot, woodland creature, or Pixar-animal substitute.
- If the script describes an animal, keep that animal.
- Species, age, clothing, and body type must come from the script, not from a default cartoon template.
- This is stylized animation, not live-action photography. Never photorealistic children or real photographs of minors.

SAFETY:
No graphic violence, sexual content, hate, dangerous instructions, or disturbing imagery.
No on-screen text, subtitles, captions, logos, or watermarks.
No extra limbs, distorted anatomy, or visual clutter.
Camera: smooth, motivated, never shaky.`;

export const DEFAULT_STYLE_BIBLE = `High-quality family-friendly stylized 3D cinematic animation. Characters match the script: a baby boy is a stylized 3D animated baby boy, not an animal. Animals appear only when the script names animals. Soft cinematic lighting, warm colors, appealing faces, polished animation quality, gentle depth of field, film-like framing. No photorealism, no on-screen text.`;

export const STYLE_BIBLES: Record<string, string> = {
  cinematic_3d: DEFAULT_STYLE_BIBLE,
  watercolor: `Hand-painted watercolor animation. Characters match the script (humans stay human, animals stay animals). Soft paper texture, gentle pigment blooms, warm daylight washes. No photorealism, no on-screen text.`,
  storybook: `Illustrated storybook animation, as if pages of a picture book came to life. Characters match the script. Soft outlines, cozy palettes, readable faces. No photorealism, no on-screen text.`,
  educational: `Clear educational animation with readable faces and simple, friendly staging. Characters match the script. Bright, clean colors, uncluttered backgrounds. No photorealism, no on-screen text.`,
};

export function styleBibleFor(style?: string | null) {
  if (style && STYLE_BIBLES[style]) return STYLE_BIBLES[style];
  return DEFAULT_STYLE_BIBLE;
}

export const NEGATIVE_VISUALS = `photorealistic children, real photographs of minors, graphic violence, blood, horror, sexual content, hate symbols, on-screen text, subtitles, captions, watermark, logo, extra limbs, distorted anatomy, shaky camera, random jump cuts, cluttered frame, dark grim atmosphere, replacing human characters with cartoon animals`;
