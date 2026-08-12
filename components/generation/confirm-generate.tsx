"use client";

import { Button } from "@/components/ui/button";

export function ConfirmGenerate({
  scenes,
  onCancel,
  onConfirm,
  busy,
}: {
  scenes: number;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass max-w-md rounded-[28px] p-8">
        <h3 className="font-display text-2xl">Generate this movie?</h3>
        <p className="mt-3 text-sm text-muted">
          We&apos;ll film about {scenes} scenes. This can take a little while. Finished scenes are saved if
          something needs another try.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            Generate Movie
          </Button>
        </div>
      </div>
    </div>
  );
}
