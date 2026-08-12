import { Badge } from "@/components/ui/badge";

const EMOJI: Record<string, string> = {
  elephant: "🐘",
  rabbit: "🐰",
  fox: "🦊",
  bear: "🐻",
  bird: "🐦",
  star: "⭐",
};

export function CharacterCard({
  character,
}: {
  character: {
    name: string;
    species: string;
    appearance: string;
    clothing: string;
    personality: string;
  };
}) {
  const emoji =
    Object.entries(EMOJI).find(([k]) => character.species.toLowerCase().includes(k))?.[1] ?? "✨";
  return (
    <article className="rounded-3xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-2xl">{emoji}</span>
        <div>
          <h3 className="font-display text-xl">{character.name}</h3>
          <p className="text-xs text-muted capitalize">{character.species}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink/80">{character.appearance}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone="muted">{character.clothing}</Badge>
        <Badge>{character.personality.split(",")[0]}</Badge>
      </div>
    </article>
  );
}
