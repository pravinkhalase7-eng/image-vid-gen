import type { JobType, JobStatus, ProjectStatus } from "@prisma/client";

const PROJECT_FLOW: ProjectStatus[] = [
  "DRAFT",
  "ANALYZING",
  "PLANNING",
  "READY_TO_GENERATE",
  "GENERATING",
  "ASSEMBLING",
  "COMPLETED",
];

export function canTransition(from: ProjectStatus, to: ProjectStatus) {
  if (to === "FAILED" || to === "CANCELLED") return true;
  if (from === "FAILED" && (to === "ANALYZING" || to === "GENERATING" || to === "ASSEMBLING")) return true;
  if (from === "CANCELLED" && (to === "ANALYZING" || to === "READY_TO_GENERATE")) return true;
  const a = PROJECT_FLOW.indexOf(from);
  const b = PROJECT_FLOW.indexOf(to);
  if (a === -1 || b === -1) return false;
  return b === a || b === a + 1 || (from === "READY_TO_GENERATE" && to === "GENERATING");
}

export type EnqueueInput = {
  projectId: string;
  type: JobType;
  sceneId?: string;
  message?: string;
};

export type ClaimedJob = {
  id: string;
  projectId: string;
  type: JobType;
  status: JobStatus;
  stage: string | null;
  sceneId: string | null;
};
