import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "md" | "lg" | "sm";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-50 disabled:pointer-events-none",
        size === "lg" && "h-14 px-8 text-base",
        size === "md" && "h-11 px-5 text-sm",
        size === "sm" && "h-9 px-4 text-sm",
        variant === "primary" &&
          "bg-linear-to-r from-gold to-gold-2 text-[#2a1d0a] shadow-[0_12px_30px_rgba(232,184,109,0.28)] hover:brightness-105",
        variant === "ghost" && "text-ink/80 hover:bg-white/5",
        variant === "outline" && "border border-white/12 bg-white/4 hover:bg-white/8",
        variant === "danger" && "bg-coral/20 text-coral hover:bg-coral/30",
        className,
      )}
      {...props}
    />
  );
}
