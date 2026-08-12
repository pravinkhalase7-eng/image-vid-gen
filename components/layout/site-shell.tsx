import Link from "next/link";
import { Clapperboard } from "lucide-react";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#070b16]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Clapperboard className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">StoryMotion AI</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm text-muted">
            <Link href="/projects" className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-ink">
              Library
            </Link>
            <Link href="/settings" className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-ink">
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-12">{children}</main>
    </>
  );
}
