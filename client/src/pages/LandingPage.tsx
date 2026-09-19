import { Link, Navigate } from 'react-router';
import {
  Code2,
  ArrowRight,
  Cpu,
  Zap,
  ShieldCheck,
  Terminal,
  Users,
  Layers,
  GitMerge,
  Server,
  Database,
  Lock,
  Check,
  X,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GithubIcon } from '@/components/icons';
import { useAuthStore } from '@/stores/auth.store';

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* Background Grids & Ambient Lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Code2 size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">
            Code<span className="text-primary font-mono">V</span>
          </span>
          <span className="ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
            v0.1
          </span>
        </Link>

        <nav className="flex items-center gap-2.5">
          <ThemeToggle />
          <a
            href="https://github.com/RaviPandey2002/codev"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <GithubIcon size={18} />
          </a>

          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Go to Workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 z-10 max-w-5xl mx-auto space-y-20">
        
        {/* Section 1: Hero */}
        <div className="space-y-4 max-w-3xl pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 border border-border/80 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>CRDT-powered real-time sync engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Real-time collaborative code editing.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Deterministic conflict resolution, sub-millisecond multi-cursor presence, and persistent shared rooms. Built from scratch with Yjs and WebSockets.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 text-sm font-medium shadow-sm">
              <Link to={user ? '/dashboard' : '/register'}>
                <span>{user ? 'Open Workspace' : 'Start Coding'}</span>
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 text-sm font-medium">
              <a
                href="https://github.com/RaviPandey2002/codev"
                target="_blank"
                rel="noreferrer"
              >
                <GithubIcon size={16} />
                <span>View Source</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Section 2: Mock IDE Preview */}
        <div className="w-full max-w-4xl rounded-xl border border-border/80 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/20 overflow-hidden text-left font-mono">
          <div className="bg-muted/40 border-b border-border/60 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-amber-500/60" />
              <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-xs text-muted-foreground font-sans flex items-center gap-1.5">
                <Terminal size={12} />
                main.ts &middot; room: apollo-dev
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-sans">
              <Users size={12} />
              <span>2 peers connected</span>
            </div>
          </div>

          <div className="p-6 text-xs sm:text-sm leading-relaxed overflow-x-auto select-none bg-background/50">
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4">1</span>
              <span className="text-muted-foreground">// Shared CRDT state synchronization</span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4">2</span>
              <span>
                <span className="text-primary font-semibold">import</span> {'{ Doc }'}{' '}
                <span className="text-primary font-semibold">from</span>{' '}
                <span className="text-emerald-400">&apos;yjs&apos;</span>;
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4">3</span>
              <span>
                <span className="text-primary font-semibold">const</span> ydoc ={' '}
                <span className="text-primary font-semibold">new</span> Doc();
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground/40 select-none pr-4">4</span>
              <span>
                <span className="text-primary font-semibold">export function</span>{' '}
                <span className="text-amber-400">applyPeerUpdate</span>(update: Uint8Array) {'{'}
              </span>
              <span className="inline-flex items-center ml-1 relative">
                <span className="h-4 w-0.5 bg-emerald-500 animate-pulse" />
                <span className="absolute -top-5 left-0 px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-emerald-500 text-black shadow-xs whitespace-nowrap">
                  Alice (typing)
                </span>
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4">5</span>
              <span className="pl-4">Y.applyUpdate(ydoc, update);</span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground/40 select-none pr-4">6</span>
              <span className="pl-4">
                broadcastToRoom(room.id, update);
              </span>
              <span className="inline-flex items-center ml-1 relative">
                <span className="h-4 w-0.5 bg-cyan-400" />
                <span className="absolute -top-5 left-0 px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-cyan-400 text-black shadow-xs whitespace-nowrap">
                  Bob
                </span>
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4">7</span>
              <span>{'}'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: 4 Core Engine Pillars */}
        <div className="w-full space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Under the Hood: The CodeV Engine
            </h2>
            <p className="text-sm text-muted-foreground">
              Built from first principles for deterministic convergence without central document locking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Cpu size={16} />
              </div>
              <h3 className="font-semibold text-sm">Binary CRDT Protocol</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yjs state updates are serialized into compact Uint8Array binary deltas, drastically cutting network overhead compared to JSON payloads.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Zap size={16} />
              </div>
              <h3 className="font-semibold text-sm">Sub-10ms Awareness</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cursor positions, text selections, and user presences broadcast over low-latency binary WebSockets with zero persistent database writes.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Server size={16} />
              </div>
              <h3 className="font-semibold text-sm">Redis Pub/Sub Fanout</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Horizontal multi-node scaling enables connected developers on different backend nodes to collaborate seamlessly across rooms.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck size={16} />
              </div>
              <h3 className="font-semibold text-sm">Rotating JWT Sessions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                HttpOnly cookies with single-use refresh token rotation hashed via SHA-256 in PostgreSQL for zero-leak authentication security.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Architecture Comparison (Side-by-Side Paradigms) */}
        <div className="w-full space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Why CRDTs over Legacy Operational Transformation (OT)?
            </h2>
            <p className="text-sm text-muted-foreground">
              Google Docs and legacy collaborative platforms rely on central coordination. CodeV uses mathematically convergent data structures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Legacy OT */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 space-y-5">
              <div className="space-y-1 border-b border-destructive/15 pb-4">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20">
                  <X size={12} />
                  <span>The Legacy Approach</span>
                </div>
                <h3 className="font-bold text-base text-foreground pt-1">
                  Centralized Operational Transformation (OT)
                </h3>
                <p className="text-xs text-muted-foreground">
                  How Google Docs, Etherpad, and legacy suites coordinate edits.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <X size={13} className="text-destructive shrink-0" />
                    <span>Single Point of Failure (Merge Lock)</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Requires a centralized server coordinator to linearize and order every character insertion. If connection drops, input is blocked.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <X size={13} className="text-destructive shrink-0" />
                    <span>Complex Transform Matrices</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Transforming operations against historical edit logs grows quadratically, creating desynchronization bugs over high latency.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <X size={13} className="text-destructive shrink-0" />
                    <span>Brittle Reconnections &amp; Rebase Locks</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Any network hiccup triggers full-document rebases or lock errors, causing cursor jumps and lost keystrokes.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <X size={13} className="text-destructive shrink-0" />
                    <span>200–500ms Roundtrip Latency</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    UI state must wait for centralized server acknowledgment before finalizing the document tree.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: CodeV CRDTs */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-5 shadow-sm shadow-primary/5">
              <div className="space-y-1 border-b border-primary/20 pb-4">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  <Check size={12} />
                  <span>The CodeV Standard</span>
                </div>
                <h3 className="font-bold text-base text-foreground pt-1">
                  Conflict-Free Replicated Data Types (Yjs)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deterministic peer convergence powered by commutative math.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span>Zero Central Server Locking</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Clients apply edits locally with zero latency. The backend acts as a high-speed stateless binary relay without holding locks.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span>Mathematical Convergence (YATA)</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Operations are commutative, associative, and idempotent. Edits can arrive in any network order and still resolve identically.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span>Native Offline &amp; Drop Resilience</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Continue editing completely offline. Upon reconnection, missing binary deltas exchange and merge automatically with zero conflicts.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span>Sub-10ms Streaming Deltas</span>
                  </div>
                  <p className="text-muted-foreground pl-5 leading-relaxed">
                    Compact Uint8Array binary updates broadcast over Fastify WebSockets for instant, lag-free collaborative typing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Open-Source Tech Stack Badges */}
        <div className="w-full space-y-4 text-left pt-2">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight">
              Production-Grade Open Source Stack
            </h2>
            <p className="text-xs text-muted-foreground">
              Built from scratch with battle-tested systems engineering libraries.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Server size={14} className="text-primary" />
              <span>Fastify v5</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Database size={14} className="text-primary" />
              <span>PostgreSQL 16</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span>Redis 7 Pub/Sub</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <GitMerge size={14} className="text-primary" />
              <span>Yjs CRDT Engine</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              <span>Drizzle ORM</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Code2 size={14} className="text-primary" />
              <span>React 19 &amp; Vite</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              <span>Bcrypt &amp; JWT</span>
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span>Tailwind CSS v4</span>
            </div>
          </div>
        </div>

        {/* Section 6: Final CTA */}
        <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-8 sm:p-10 space-y-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to collaborate in real-time?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Spin up a shared workspace in seconds. Invite teammates, broadcast cursor coordinates, and edit code with zero friction.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="gap-2 shadow-sm">
              <Link to={user ? '/dashboard' : '/register'}>
                <span>{user ? 'Open Dashboard' : 'Get Started Now'}</span>
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-muted-foreground/60 border-t border-border/40 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
        <div>CodeV &middot; Real-Time Collaborative Code Editor</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/RaviPandey2002/codev"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub Repository
          </a>
          <span>&middot;</span>
          <span>Open Source (MIT)</span>
        </div>
      </footer>
    </div>
  );
}