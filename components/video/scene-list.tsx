"use client";

export function SceneList({
  scenes,
}: {
  scenes: { id: string; title: string; duration: number; startOffset?: number | null; thumbnailUrl?: string | null; status: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {scenes.map((scene, i) => (
        <button
          key={scene.id}
          type="button"
          onClick={() => {
            const seek = (window as unknown as { __storySeek?: (n: number) => void }).__storySeek;
            seek?.(scene.startOffset ?? 0);
          }}
          className="overflow-hidden rounded-2xl border border-white/8 bg-white/4 text-left hover:border-gold/40"
        >
          <div
            className="aspect-video bg-cover bg-center"
            style={{
              backgroundImage: scene.thumbnailUrl ? `url(${scene.thumbnailUrl})` : undefined,
              backgroundColor: "#152038",
            }}
          />
          <div className="p-3">
            <p className="text-sm font-medium">
              {i + 1}. {scene.title}
            </p>
            <p className="text-xs text-muted">{scene.duration}s</p>
          </div>
        </button>
      ))}
    </div>
  );
}
