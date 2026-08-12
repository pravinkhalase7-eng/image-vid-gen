"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Maximize, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string | null;
  title: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setProgress(el.duration ? el.currentTime / el.duration : 0);
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, []);

  function seekTo(seconds: number) {
    if (ref.current) ref.current.currentTime = seconds;
  }

  return (
    <div className="overflow-hidden rounded-[28px] gold-ring">
      <video
        ref={ref}
        className="aspect-video w-full bg-black object-contain"
        poster={poster ?? undefined}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        controls={false}
      />
      <div className="flex items-center gap-3 bg-[#0c1220] px-4 py-3">
        <button
          type="button"
          className="text-gold"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            if (el.paused) el.play();
            else el.pause();
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => {
            const el = ref.current;
            if (!el?.duration) return;
            el.currentTime = Number(e.target.value) * el.duration;
          }}
          className="h-1 flex-1 accent-[#e8b86d]"
        />
        <Volume2 className="h-4 w-4 text-muted" />
        <button
          type="button"
          onClick={() => ref.current?.requestFullscreen()}
          aria-label="Fullscreen"
        >
          <Maximize className="h-4 w-4 text-muted" />
        </button>
        <a href={src} download={`${title}.mp4`}>
          <Button size="sm" variant="outline">
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </a>
      </div>
      <SeekApi seekTo={seekTo} />
    </div>
  );
}

function SeekApi({ seekTo }: { seekTo: (n: number) => void }) {
  useEffect(() => {
    (window as unknown as { __storySeek?: (n: number) => void }).__storySeek = seekTo;
  }, [seekTo]);
  return null;
}
