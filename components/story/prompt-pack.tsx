"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type PromptPackData = {
  title: string;
  instructions: string;
  masterLock: string;
  negative: string;
  scenes: { order: number; title: string; duration: number; prompt: string }[];
  all: string;
};

export function PromptPack({ pack }: { pack: PromptPackData }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Gemini / Flow prompts</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{pack.instructions}</p>
        </div>
        <CopyButton text={pack.all} label="Copy all prompts" />
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Consistency lock</p>
            <p className="mt-1 text-sm text-muted">Paste this unchanged into every scene so characters stay the same.</p>
          </div>
          <CopyButton text={pack.masterLock} label="Copy lock" />
        </div>
        <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs leading-relaxed text-ink/90">
          {pack.masterLock}
        </pre>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold">Negative prompt</p>
            <p className="mt-1 text-sm text-muted">Optional avoid list for Flow / Gemini.</p>
          </div>
          <CopyButton text={pack.negative} label="Copy negative" />
        </div>
        <p className="mt-3 text-sm text-muted">{pack.negative}</p>
      </Card>

      <ol className="space-y-4">
        {pack.scenes.map((scene) => (
          <li key={scene.order} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gold">
                  Scene {scene.order} · {scene.duration}s
                </p>
                <h3 className="mt-1 font-display text-xl">{scene.title}</h3>
              </div>
              <CopyButton text={scene.prompt} label="Copy scene prompt" />
            </div>
            <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-black/30 p-4 text-xs leading-relaxed text-ink/90">
              {scene.prompt}
            </pre>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
