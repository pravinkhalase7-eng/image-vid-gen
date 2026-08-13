"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { countWords, formatDuration } from "@/lib/utils";
import { estimateNarrationSeconds } from "@/lib/ai/video/duration";
import { planClipDurations } from "@/lib/ai/video/duration";

const SAMPLE = `Scene 1
Once upon a time, in a beautiful jungle, there lived a little elephant named Momo. Momo loved flowers, fruit, and his friends. He looks at the river and says, "The water looks so big."

Scene 2
One sunny morning, Momo watched the other animals splash and laugh. He took a tiny step. Then another. "The water feels cool and kind," he says.

Scene 3
Momo trumpeted with joy. "I'm not unsure anymore!" He was brave, and the jungle cheered with him.`;

export function StoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(0);
  const [voice, setVoice] = useState("child_friendly");
  const [language, setLanguage] = useState("auto");
  const [style, setStyle] = useState("cinematic_3d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const words = countWords(script);
    const seconds = estimateNarrationSeconds(script);
    const plan = script.trim()
      ? planClipDurations({ script, targetSeconds: duration })
      : { sceneCount: 0, total: duration };
    return { words, chars: script.length, seconds, scenes: plan.sceneCount, total: plan.total };
  }, [script, duration]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          topic,
          script,
          aspectRatio,
          resolution,
          duration,
          voice,
          language,
          style,
          enableNarration: true,
          enableMusic: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Could not start");
      router.push(`/projects/${data.project_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <h2 className="font-display text-3xl">Create a Video</h2>
        <p className="mt-2 text-sm text-muted">Paste a story. Label Scene 1, Scene 2, Scene 3 to keep that many clips. Each prompt includes lip-sync for that scene&apos;s line.</p>

        <div className="mt-8 space-y-5">
          <div>
            <Label htmlFor="title">Video Title</Label>
            <Input
              id="title"
              required
              placeholder="The Brave Little Rabbit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              required
              placeholder="Friendship and courage"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="script">Script</Label>
              <button
                type="button"
                className="text-xs text-gold hover:underline"
                onClick={() => {
                  setTitle("The Little Elephant Who Was Afraid of Water");
                  setTopic("An elephant learning to overcome fear");
                  setScript(SAMPLE);
                }}
              >
                Try a sample story
              </button>
            </div>
            <Textarea
              id="script"
              required
              placeholder={"Scene 1\nMomo looks at the river and says, \"I'm a little unsure.\"\n\nScene 2\nHe takes one small step. \"The water feels cool.\"\n\nScene 3\nMomo trumpets. \"I'm not afraid anymore!\""}
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>{stats.chars} characters</span>
              <span>{stats.words} words</span>
              <span>Estimated story length: {formatDuration(stats.seconds)}</span>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>
        )}

        <Button type="submit" size="lg" className="mt-8 w-full" disabled={busy}>
          <Sparkles className="h-4 w-4" />
          {busy ? "Opening your studio..." : "Create Prompt Pack ✨"}
        </Button>
        {stats.scenes > 0 && (
          <p className="mt-3 text-center text-xs text-muted">
            Estimated generation: {stats.scenes} scenes · about {formatDuration(stats.total)}
          </p>
        )}
      </Card>

      <div className="space-y-6">
        <Card>
          <h3 className="font-display text-xl">Movie settings</h3>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <Label>Aspect ratio</Label>
              <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="1:1">1:1</option>
              </Select>
            </div>
            <div>
              <Label>Resolution</Label>
              <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </Select>
            </div>
            <div>
              <Label>Length</Label>
              <Select value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value="0">Match script</option>
                <option value="30">Max 30 sec</option>
                <option value="60">Max 60 sec</option>
                <option value="90">Max 90 sec</option>
              </Select>
            </div>
            <div>
              <Label>Voice</Label>
              <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
                <option value="child_friendly">Child-friendly</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="auto">Auto</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </Select>
            </div>
            <div>
              <Label>Style</Label>
              <Select value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="cinematic_3d">Cinematic 3D Animation</option>
                <option value="watercolor">Watercolor Animation</option>
                <option value="storybook">Storybook</option>
                <option value="educational">Educational Animation</option>
              </Select>
            </div>
          </div>
        </Card>
        <Card className="bg-linear-to-br from-[#18223c] to-[#10182b]">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">How it feels</p>
          <h3 className="mt-2 font-display text-2xl">From bedtime story to little film.</h3>
          <ol className="mt-5 space-y-3 text-sm text-muted">
            <li>1. We read the story and design the characters.</li>
            <li>2. You get a scene plan plus a consistency lock.</li>
            <li>3. Copy each prompt into Gemini or Google Flow to film the clips.</li>
          </ol>
        </Card>
      </div>
    </form>
  );
}
