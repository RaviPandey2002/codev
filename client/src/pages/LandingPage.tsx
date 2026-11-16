import { useState } from 'react';
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
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  PenTool,
  Share2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GithubIcon } from '@/components/icons';
import { useAuthStore } from '@/stores/auth.store';

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary animate-in fade-in-0 duration-200">
      {/* Background Grids & Ambient Lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
            <Code2 size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">
            Code<span className="text-primary font-mono">V</span>
          </span>
          <span className="ml-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
            v0.1
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />
          <a
            href="https://github.com/RaviPandey2002/codev"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <GithubIcon size={18} />
          </a>

          {user ? (
            <Button asChild size="sm" className="text-xs">
              <Link to="/dashboard">Go to Workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden xs:inline-flex text-xs">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="text-xs">
                <Link to="/login">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-8 sm:py-12 z-10 max-w-5xl mx-auto space-y-12 sm:space-y-16">
        
        {/* Section 1: Hero */}
        <div className="space-y-4 max-w-3xl pt-2 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 border border-border/80 text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Instant Real-Time Collaborative Cloud Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Code together in real-time, <br className="hidden sm:inline" />
            without boundaries.
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Multi-cursor pair programming, sub-millisecond execution for C++ and Python, interactive canvas sketching, and shared rooms. Zero configuration required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-xs sm:max-w-none mx-auto">
            <Button asChild size="lg" className="gap-2 text-sm font-medium shadow-sm w-full sm:w-auto">
              <Link to={user ? '/dashboard' : '/login'}>
                <span>{user ? 'Open Workspace' : 'Start Coding'}</span>
                <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 text-sm font-medium w-full sm:w-auto">
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
          <div className="bg-muted/40 border-b border-border/60 px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/60" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="ml-1 sm:ml-3 text-xs text-muted-foreground font-sans flex items-center gap-1.5 truncate">
                <Terminal size={12} className="shrink-0" />
                <span className="truncate">algorithm.cpp &middot; room-alpha-9</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-sans shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <Users size={12} />
              <span>2 peers collaborating</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-6 text-xs sm:text-sm leading-relaxed overflow-x-auto select-none bg-background/50">
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">1</span>
              <span className="text-muted-foreground">// Real-time collaborative competitive programming</span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">2</span>
              <span>
                <span className="text-primary font-semibold">#include</span>{' '}
                <span className="text-emerald-400">&lt;bits/stdc++.h&gt;</span>
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">3</span>
              <span>
                <span className="text-primary font-semibold">using namespace</span> std;
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">4</span>
              <span>
                <span className="text-primary font-semibold">vector</span>&lt;<span className="text-amber-400">int</span>&gt;{' '}
                <span className="text-cyan-400 font-semibold">twoSum</span>(vector&lt;<span className="text-amber-400">int</span>&gt;&amp; nums, <span className="text-amber-400">int</span> target) {'{'}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">5</span>
              <span className="pl-4">unordered_map&lt;<span className="text-amber-400">int</span>, <span className="text-amber-400">int</span>&gt; seen;</span>
              <span className="inline-flex items-center ml-2 relative">
                <span className="h-4 w-0.5 bg-emerald-500 animate-pulse" />
                <span className="absolute -top-5 left-0 px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-emerald-500 text-black shadow-xs whitespace-nowrap">
                  Alice (typing)
                </span>
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">6</span>
              <span className="pl-4">
                <span className="text-primary font-semibold">for</span> (<span className="text-amber-400">int</span> i = 0; i &lt; nums.size(); ++i) {'{'}
              </span>
              <span className="inline-flex items-center ml-2 relative">
                <span className="h-4 w-0.5 bg-cyan-400" />
                <span className="absolute -top-5 left-0 px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-cyan-400 text-black shadow-xs whitespace-nowrap">
                  Bob
                </span>
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">7</span>
              <span className="pl-8">
                <span className="text-primary font-semibold">if</span> (seen.count(target - nums[i])) <span className="text-primary font-semibold">return</span> {'{seen[target - nums[i]], i};'}
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">8</span>
              <span className="pl-8">seen[nums[i]] = i;</span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">9</span>
              <span className="pl-4">{'}'}</span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">10</span>
              <span className="pl-4">
                <span className="text-primary font-semibold">return</span> {'{};'}
              </span>
            </div>
            <div className="flex">
              <span className="text-muted-foreground/40 select-none pr-4 w-6 text-right">11</span>
              <span>{'}'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: User-Centric Product Features */}
        <div className="w-full space-y-6 text-left">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Everything you need for seamless pair coding
            </h2>
            <p className="text-sm text-muted-foreground">
              Designed for speed, clarity, and frictionless collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users size={16} />
              </div>
              <h3 className="font-semibold text-sm">Real-Time Multi-Cursor</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                See teammate cursors, selections, and live edits as they type. Zero lag, zero merge conflicts, and flawless sync.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Play size={16} />
              </div>
              <h3 className="font-semibold text-sm">Instant Code Runner</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Execute C++20 and Python with custom stdin and instant terminal output. Sub-millisecond execution with resource safety.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <PenTool size={16} />
              </div>
              <h3 className="font-semibold text-sm">Interactive Whiteboard</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sketch architecture diagrams, draw algorithm trees, or take notes alongside your code on a synchronized infinite canvas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-xl border border-border/70 bg-card/60 space-y-2.5 hover:border-primary/40 transition-colors">
              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Share2 size={16} />
              </div>
              <h3 className="font-semibold text-sm">Instant Room Sharing</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Spin up a workspace and share a link or 6-character room code. Teammates jump right into the active session in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Collapsible Deep Engineering & Architecture Specs */}
        <div className="w-full pt-2">
          <button
            type="button"
            onClick={() => setIsSpecsOpen(!isSpecsOpen)}
            className="w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/50 hover:bg-card/80 hover:border-primary/40 transition-all text-left cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                <Cpu size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    For Engineers &amp; Technical Recruiters
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                    System Architecture &amp; Specs
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deep dive into CRDT vs OT mathematical convergence, binary WebSockets, Redis fanout, and bare-metal security limits.
                </p>
              </div>
            </div>

            <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground shrink-0 transition-colors">
              {isSpecsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isSpecsOpen ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-10 text-left">
                {/* Architecture Comparison: CRDT vs Legacy OT */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">
                    Why CRDTs over Legacy Operational Transformation (OT)?
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Google Docs and legacy collaborative platforms rely on central coordination. CodeV uses mathematically convergent data structures.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Column 1: Legacy OT */}
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-4">
                    <div className="space-y-1 border-b border-destructive/15 pb-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20">
                        <X size={12} />
                        <span>The Legacy Approach</span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground pt-1">
                        Centralized Operational Transformation (OT)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        How Google Docs, Etherpad, and legacy suites coordinate edits.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
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
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 shadow-xs shadow-primary/5">
                    <div className="space-y-1 border-b border-primary/20 pb-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                        <Check size={12} />
                        <span>The CodeV Standard</span>
                      </div>
                      <h4 className="font-bold text-sm text-foreground pt-1">
                        Conflict-Free Replicated Data Types (Yjs)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Deterministic peer convergence powered by commutative math.
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
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

              {/* Core Engine Pillars */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">
                    Under the Hood: Engine Specifications
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Low-level architectural decisions and system invariants.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Cpu size={16} />
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">Binary CRDT Protocol</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Yjs state updates serialize into compact Uint8Array binary deltas, reducing network payload size by up to 90% vs JSON.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Zap size={16} />
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">Sub-10ms Awareness</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Multi-cursor coordinates and selections broadcast over ephemeral WebSocket packets without touch database overhead.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Server size={16} />
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">Redis Pub/Sub Fanout</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Stateless Fastify nodes synchronize room presence and state updates seamlessly across a clustered Redis pub/sub backbone.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <ShieldCheck size={16} />
                    </div>
                    <h4 className="font-semibold text-xs text-foreground">Bare-Metal Sandbox</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Process group SIGKILL, Linux prlimit address space (256MB) and file size (5MB) enforcement prevent fork bombs and runaway binaries.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stack Badges */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Core Technologies &amp; Libraries
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Server size={14} className="text-primary shrink-0" />
                    <span>Fastify v5</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Database size={14} className="text-primary shrink-0" />
                    <span>PostgreSQL 16</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Zap size={14} className="text-primary shrink-0" />
                    <span>Redis 7 Pub/Sub</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <GitMerge size={14} className="text-primary shrink-0" />
                    <span>Yjs CRDT Engine</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Layers size={14} className="text-primary shrink-0" />
                    <span>Drizzle ORM</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Code2 size={14} className="text-primary shrink-0" />
                    <span>React 19 &amp; Vite</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Lock size={14} className="text-primary shrink-0" />
                    <span>Bcrypt &amp; JWT</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center gap-2">
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <span>Tailwind CSS v4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Section 5: Final CTA */}
        <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-10 space-y-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to collaborate in real-time?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Spin up a shared workspace in seconds. Invite teammates, broadcast cursor coordinates, and edit code with zero friction.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="gap-2 shadow-sm cursor-pointer">
              <Link to={user ? '/dashboard' : '/login'}>
                <span>{user ? 'Open Dashboard' : 'Start Coding Now'}</span>
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground/60 border-t border-border/40 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
        <div>CodeV &middot; Real-Time Collaborative Code Editor</div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/RaviPandey2002/codev"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors cursor-pointer"
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
