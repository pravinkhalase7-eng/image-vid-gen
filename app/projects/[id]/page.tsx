"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgressTimeline } from "@/components/generation/progress-timeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStatus } from "@/lib/hooks/use-status";

export default function ProjectHubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pollKey, setPollKey] = useState(0);
  const data = useStatus(id, 2000, pollKey);

  useEffect(() => {
    if (!data?.status) return;
    if (data.status === "READY_TO_GENERATE" || data.status === "GENERATING" || data.status === "ASSEMBLING" || data.status === "COMPLETED" || data.status === "FAILED")
      router.replace(`/projects/${id}/plan`);
  }, [data?.status, id, router]);

  return (
    <Card className="mx-auto max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-gold">Studio</p>
      <h1 className="mt-2 font-display text-3xl">Preparing your movie</h1>
      <div className="mt-6">
        <ProgressTimeline steps={data?.steps ?? []} message={data?.message} />
      </div>
      {data?.status === "FAILED" && (
        <div className="mt-6">
          <p className="text-sm text-coral">{data.error}</p>
          <Button
            className="mt-4"
            onClick={async () => {
              await fetch(`/api/projects/${id}/retry`, { method: "POST" });
              setPollKey((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </Card>
  );
}
