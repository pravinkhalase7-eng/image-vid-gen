"use client";

import { motion } from "framer-motion";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = {
  id: string;
  label: string;
  status: string;
  detail?: string;
};

export function ProgressTimeline({ steps, message }: { steps: Step[]; message?: string }) {
  return (
    <div>
      {message && <p className="mb-6 text-lg text-gold-2">{message}</p>}
      <ol className="space-y-3">
        {steps.map((step) => (
          <motion.li
            key={step.id}
            layout
            className={cn(
              "flex items-start gap-3 rounded-2xl px-3 py-2",
              step.status === "active" && "bg-white/5",
            )}
          >
            <span className="mt-0.5">
              {step.status === "completed" && <Check className="h-5 w-5 text-emerald-300" />}
              {step.status === "active" && <Loader2 className="h-5 w-5 animate-spin text-gold" />}
              {step.status === "retrying" && <Loader2 className="h-5 w-5 animate-spin text-coral" />}
              {(step.status === "pending" || step.status === "failed") && (
                <Circle className="h-5 w-5 text-white/20" />
              )}
            </span>
            <div>
              <p className={cn("text-sm", step.status === "pending" ? "text-muted" : "text-ink")}>
                {step.label}
              </p>
              {step.detail && (
                <p className={cn("text-xs", step.status === "retrying" ? "text-coral" : "text-muted")}>{step.detail}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
