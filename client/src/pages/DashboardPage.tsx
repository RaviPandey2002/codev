import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Code2,
  Plus,
  ArrowRight,
  LogOut,
  FolderGit2,
  Users,
  Clock,
  Terminal,
  Sparkles,
  Hash,
  Search,
  LayoutGrid,
  List,
  Activity,
  Server,
  Database,
  Sliders,
  Copy,
  Check,
  Code
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';

interface WorkspaceItem {
  id: string;
  name: string;
  role: 'OWNER' | 'COLLABORATOR';
  template: string;
  peersCount: number;
  updatedAt: string;
}

const INITIAL_WORKSPACES: WorkspaceItem[] = [
  {
    id: 'apollo-7x9k',
    name: 'apollo-core',
    role: 'OWNER',
    template: 'TypeScript',
    peersCount: 2,
    updatedAt: '2m ago'
  },
  {
    id: 'mercury-3m1p',
    name: 'mercury-api-gateway',
    role: 'COLLABORATOR',
    template: 'Fastify / Node',
    peersCount: 4,
    updatedAt: '1h ago'
  },
  {
    id: 'gemini-8w4q',
    name: 'algorithms-practice',
    role: 'OWNER',
    template: 'Python',
    peersCount: 1,
    updatedAt: 'Yesterday'
  }
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [joinCode, setJoinCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'OWNED' | 'SHARED'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Editor Preferences State
  const [keybinding, setKeybinding] = useState<'VSCODE' | 'VIM'>('VSCODE');
  const [tabSize, setTabSize] = useState<'2' | '4'>('2');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (trimmed) {
      navigate(`/rooms/${trimmed}`);
    }
  };

  const copyRoomId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter workspaces
  const filteredWorkspaces = INITIAL_WORKSPACES.filter((ws) => {
    const matchesSearch =
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterTab === 'OWNED') return matchesSearch && ws.role === 'OWNER';
    if (filterTab === 'SHARED') return matchesSearch && ws.role === 'COLLABORATOR';
    return matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-10 border-b border-border/40">
        <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
            <Code2 size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">
            Code<span className="text-primary font-mono">V</span>
          </span>
          <span className="ml-2 text-xs font-mono text-muted-foreground hidden sm:inline-block">
            / dashboard
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Telemetry Indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fastify WS: 14ms</span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono">
            <div className="h-4.5 w-4.5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
              {user?.username?.[0] || 'U'}
            </div>
            <span className="text-foreground font-medium">{user?.username}</span>
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive gap-1.5 text-xs"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 z-10 space-y-8">
        
        {/* Row 1: System Telemetry Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>WebSockets</span>
              <Activity size={14} className="text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono text-foreground">14ms</div>
            <div className="text-[11px] text-muted-foreground">Real-time sync latency</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>CRDT State</span>
              <Server size={14} className="text-primary" />
            </div>
            <div className="text-lg font-bold font-mono text-foreground">Yjs v13</div>
            <div className="text-[11px] text-muted-foreground">Uint8Array binary delta</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Persistence</span>
              <Database size={14} className="text-primary" />
            </div>
            <div className="text-lg font-bold font-mono text-foreground">Postgres 16</div>
            <div className="text-[11px] text-muted-foreground">Drizzle ORM snapshots</div>
          </div>

          <div className="p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Active Workspaces</span>
              <FolderGit2 size={14} className="text-primary" />
            </div>
            <div className="text-lg font-bold font-mono text-foreground">{INITIAL_WORKSPACES.length}</div>
            <div className="text-[11px] text-muted-foreground">Across all active rooms</div>
          </div>
        </div>

        {/* Row 2: Instant Workspace Launchers / Templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span>Instant Workspace Templates</span>
            </h2>
            <span className="text-xs text-muted-foreground font-mono">One-click spin up</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => navigate(`/rooms/ts-${Math.random().toString(36).substring(2, 7)}`)}
              className="p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  TypeScript Scratchpad
                </span>
                <Code size={14} className="text-primary shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pre-configured TypeScript runtime for algorithms and quick logic validation.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/rooms/react-${Math.random().toString(36).substring(2, 7)}`)}
              className="p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  React Sandbox
                </span>
                <Code2 size={14} className="text-primary shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                JSX prototyping canvas with live peer awareness for component design.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/rooms/algo-${Math.random().toString(36).substring(2, 7)}`)}
              className="p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Interview Pair Canvas
                </span>
                <Users size={14} className="text-primary shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Clean canvas optimized for live coding evaluations and technical interviews.
              </p>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/rooms/blank-${Math.random().toString(36).substring(2, 7)}`)}
              className="p-4 rounded-xl border border-dashed border-border/80 bg-card/20 hover:border-primary/60 hover:bg-card/40 transition-all text-left space-y-1.5 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Blank Room
                </span>
                <Plus size={14} className="text-primary shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Empty document canvas with peer sync and instant room code generation.
              </p>
            </button>
          </div>
        </div>

        {/* Row 3: Workspaces Management (Search, Filters, View Mode) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Your Workspaces
              </h2>
              <p className="text-xs text-muted-foreground">
                Rooms you own or have joined via peer invite codes.
              </p>
            </div>

            {/* Join Room Code Input Form */}
            <form onSubmit={handleJoin} className="flex items-center gap-2">
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  type="text"
                  placeholder="Enter room code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono rounded-lg bg-background/60 w-44"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!joinCode.trim()}
              >
                Join
              </Button>
            </form>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-card/40 border border-border/60">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterTab === 'ALL'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({INITIAL_WORKSPACES.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('OWNED')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterTab === 'OWNED'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Created by me ({INITIAL_WORKSPACES.filter((w) => w.role === 'OWNER').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('SHARED')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterTab === 'SHARED'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Shared with me ({INITIAL_WORKSPACES.filter((w) => w.role === 'COLLABORATOR').length})
              </button>
            </div>

            {/* Search + View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                <input
                  type="text"
                  placeholder="Filter rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 py-1 text-xs rounded-lg bg-background/50 border border-input focus:border-ring outline-none w-36 sm:w-44 font-mono"
                />
              </div>

              <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-background/40">
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    viewMode === 'GRID' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    viewMode === 'TABLE' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Table view"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Workspaces Display: Grid or Table */}
          {filteredWorkspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">No workspaces match your filter</p>
              <p className="text-xs text-muted-foreground">Try clearing the search query or switch tabs.</p>
            </div>
          ) : viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-5 space-y-4 hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FolderGit2 size={16} className="text-primary" />
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {ws.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span>{ws.id}</span>
                        <button
                          type="button"
                          onClick={() => copyRoomId(ws.id)}
                          className="hover:text-foreground cursor-pointer transition-colors"
                          title="Copy room code"
                        >
                          {copiedId === ws.id ? (
                            <Check size={12} className="text-emerald-500" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        ws.role === 'OWNER'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-muted text-muted-foreground border-border/60'
                      }`}
                    >
                      {ws.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} />
                      <span>{ws.peersCount} online</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>{ws.updatedAt}</span>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="w-full justify-between text-xs font-mono">
                    <Link to={`/rooms/${ws.id}`}>
                      <span>Enter Workspace</span>
                      <ArrowRight size={13} />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="rounded-xl border border-border/70 bg-card/40 overflow-hidden font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">Workspace Name</th>
                    <th className="py-2.5 px-4 font-semibold">Room Code</th>
                    <th className="py-2.5 px-4 font-semibold">Role</th>
                    <th className="py-2.5 px-4 font-semibold">Peers</th>
                    <th className="py-2.5 px-4 font-semibold">Last Active</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredWorkspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4 font-sans font-medium text-foreground flex items-center gap-2">
                        <FolderGit2 size={14} className="text-primary shrink-0" />
                        <span>{ws.name}</span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{ws.id}</span>
                          <button
                            type="button"
                            onClick={() => copyRoomId(ws.id)}
                            className="hover:text-foreground cursor-pointer"
                          >
                            {copiedId === ws.id ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            ws.role === 'OWNER'
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-muted text-muted-foreground border-border/60'
                          }`}
                        >
                          {ws.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{ws.peersCount} online</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{ws.updatedAt}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Button asChild size="xs" variant="outline" className="text-xs">
                          <Link to={`/rooms/${ws.id}`}>
                            <span>Open</span>
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row 4: Developer Quick Settings Panel */}
        <div className="rounded-xl border border-border/60 bg-card/30 p-5 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-primary" />
              <h3 className="font-semibold text-sm text-foreground">
                Editor Session Defaults
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">Applied to your active editor rooms</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Keybinding scheme */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">Keybinding Scheme</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setKeybinding('VSCODE')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    keybinding === 'VSCODE'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Standard (VS Code)
                </button>
                <button
                  type="button"
                  onClick={() => setKeybinding('VIM')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    keybinding === 'VIM'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Vim Mode
                </button>
              </div>
            </div>

            {/* Tab size */}
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-medium">Tab Indentation</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTabSize('2')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    tabSize === '2'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  2 Spaces
                </button>
                <button
                  type="button"
                  onClick={() => setTabSize('4')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                    tabSize === '4'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  4 Spaces
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Engine Diagnostics Footnote */}
        <div className="p-4 rounded-xl border border-border/40 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-primary" />
            <span>Fastify Cluster: <span className="text-emerald-500">Node Active (Port 3007)</span></span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Redis Pub/Sub: codev:rooms</span>
            <span>CRDT Awareness: Synchronized</span>
          </div>
        </div>
      </main>
    </div>
  );
}
