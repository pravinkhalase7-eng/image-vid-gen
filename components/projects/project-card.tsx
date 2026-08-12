import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

const TONE: Record<string, "gold" | "ok" | "warn" | "muted"> = {
  COMPLETED: "ok",
  GENERATING: "gold",
  ASSEMBLING: "gold",
  FAILED: "warn",
  READY_TO_GENERATE: "gold",
};

export function ProjectCard({
  project,
}: {
  project: {
    id: string;
    title: string;
    status: string;
    duration: number;
    createdAt: string;
    thumbnailUrl?: string | null;
  };
}) {
  const href =
    project.status === "COMPLETED"
      ? `/projects/${project.id}/video`
      : project.status === "READY_TO_GENERATE"
        ? `/projects/${project.id}/plan`
        : ["GENERATING", "ASSEMBLING"].includes(project.status)
          ? `/projects/${project.id}/generate`
          : `/projects/${project.id}`;
  return (
    <Link href={href} className="glass block overflow-hidden rounded-[24px] hover:gold-ring">
      <div
        className="aspect-video bg-cover bg-center"
        style={{
          backgroundImage: project.thumbnailUrl ? `url(${project.thumbnailUrl})` : undefined,
          backgroundColor: "#152038",
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl">{project.title}</h3>
          <Badge tone={TONE[project.status] ?? "muted"}>{label(project.status)}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted">
          {formatDuration(project.duration)} · {relative(project.createdAt)}
        </p>
        <div className="mt-4 flex gap-3 text-sm text-gold">
          {project.status === "COMPLETED" && <span>Watch</span>}
          {project.status === "READY_TO_GENERATE" && <span>Review plan</span>}
          {["GENERATING", "ASSEMBLING"].includes(project.status) && <span>See progress</span>}
        </div>
      </div>
    </Link>
  );
}

function label(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function relative(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 86_400_000) return "Today";
  return d.toLocaleDateString();
}
