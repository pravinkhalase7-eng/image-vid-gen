"use client";

import { useEffect, useState } from "react";

export type StatusPayload = {
  status: string;
  message?: string;
  error?: string | null;
  progress?: number;
  steps?: { id: string; label: string; status: string; detail?: string }[];
  videoUrl?: string | null;
  estimatedScenes?: number | null;
};

const STOP = new Set(["FAILED", "COMPLETED", "CANCELLED", "READY_TO_GENERATE"]);

export function useStatus(id: string, interval = 2000, restartKey = 0) {
  const [data, setData] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/api/projects/${id}/status`);
        const json = (await res.json()) as StatusPayload;
        if (!alive) return;
        setData(json);
        if (STOP.has(json.status)) return;
      } catch {
        /* keep last */
      }
      if (alive) timer = setTimeout(tick, interval);
    }

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, interval, restartKey]);

  return data;
}
