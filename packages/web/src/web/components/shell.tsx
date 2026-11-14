import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, AudioWaveform, Plus, Trophy, Library, Search, User, Coins } from "lucide-react";
import { authClient } from "@/lib/auth";
import { pendingCountQuery } from "@/queries/me";
import { MiniPlayer } from "./player-bar";
import { PlatformDonationBanner } from "./donation-bar";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/studio", label: "Studio", icon: AudioWaveform },
  { href: "/upload", label: "Upload", icon: Plus, fab: true },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/library", label: "Library", icon: Library },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-display text-xl font-extrabold tracking-tight", className)}>
      ear<span className="text-grad">bass</span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const { data: session } = authClient.useSession();
  const pending = useQuery(pendingCountQuery(!!session));
  const active = (h: string) => (h === "/" ? loc === "/" : loc.startsWith(h));

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-7 lg:flex">
        <Logo className="text-2xl" />
        <p className="mt-1 text-xs text-muted-foreground">AI & electronic music, heard fast.</p>
        <nav className="mt-10 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                n.fab ? "mt-3 mb-3 bg-grad text-white glow" : active(n.href) ? "bg-white/8 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white",
              )}
            >
              <n.icon className="size-5" />
              {n.fab ? "Upload a track" : n.label}
              {n.href === "/library" && !!pending.data && (
                <span className="ml-auto rounded-full bg-pink px-2 text-[11px] font-bold">{pending.data}</span>
              )}
            </Link>
          ))}
          <Link href="/search" className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium", active("/search") ? "bg-white/8" : "text-muted-foreground hover:text-white")}>
            <Search className="size-5" /> Search
          </Link>
          <Link href="/credits" className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium", active("/credits") ? "bg-white/8" : "text-muted-foreground hover:text-white")}>
            <Coins className="size-5" /> Credits & Pro
          </Link>
        </nav>
        <div className="mt-auto">
          <Link href={session ? "/me" : "/sign-in"} className="flex items-center gap-3 rounded-2xl bg-surface p-3 hover:bg-surface-2">
            <span className="grid size-9 place-items-center rounded-full bg-grad">
              <User className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{session ? session.user.name || "My profile" : "Sign in"}</span>
              <span className="block truncate text-xs text-muted-foreground">{session ? "Artist profile" : "Join as an artist"}</span>
            </span>
          </Link>
        </div>
      </aside>

      <main className="pb-44 lg:pb-28 lg:pl-[240px]">
        <div className="mx-auto max-w-[1180px] px-5 pt-5 sm:px-8 sm:pt-8">
          <PlatformDonationBanner />
          {children}
        </div>
      </main>

      <MiniPlayer />

      {/* Mobile bottom nav */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/5 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex h-[72px] max-w-md items-center justify-around px-2">
          {NAV.map((n) =>
            n.fab ? (
              <Link key={n.href} href={n.href} aria-label="Upload" className="-mt-8 grid size-16 place-items-center rounded-full bg-grad glow ring-4 ring-background">
                <Plus className="size-7" />
              </Link>
            ) : (
              <Link key={n.href} href={n.href} className={cn("relative flex flex-col items-center gap-1 px-2 text-[11px] font-medium", active(n.href) ? "text-pink" : "text-muted-foreground")}>
                <n.icon className="size-[22px]" />
                {n.label}
                {n.href === "/library" && !!pending.data && <span className="absolute -top-1 right-1 size-2 rounded-full bg-pink" />}
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SignInPrompt({ what }: { what: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-surface p-8 text-center">
      <p className="font-display text-lg font-bold">Sign in to {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">Free account. Takes 10 seconds.</p>
      <Link href="/sign-in" className="mt-5 inline-flex rounded-full bg-grad px-6 py-3 text-sm font-semibold glow">
        Sign in / Join
      </Link>
    </div>
  );
}
