"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GeneratePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/projects/${id}/plan`);
  }, [id, router]);

  return <p className="text-muted">Opening your prompt pack...</p>;
}
