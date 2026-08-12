import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "gold",
}: {
  children: React.ReactNode;
  tone?: "gold" | "muted" | "ok" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        tone === "gold" && "bg-gold/15 text-gold-2",
        tone === "muted" && "bg-white/8 text-muted",
        tone === "ok" && "bg-emerald-400/15 text-emerald-300",
        tone === "warn" && "bg-coral/15 text-coral",
      )}
    >
      {children}
    </span>
  );
}
