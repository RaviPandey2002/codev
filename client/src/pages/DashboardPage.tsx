import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Code2,
  Plus,
  ArrowRight,
  LogOut,
  FolderGit2,
  Clock,
  Terminal,
  Sparkles,
  Hash,
  Search,
  LayoutGrid,
  List,
  Server,
  Database,
  Copy,
  Check,
  Code,
  Loader2,
  X,
  FileCode
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/auth.store';
import { listRoomsApi, createRoomApi, joinRoomApi } from '@/api/rooms';
import { getApiErrorMessage } from '@/lib/api';
import type { RoomDTO, RoomTemplate, RoomSourceType } from '@codev/shared';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  // Rooms Data State
  const [workspaces, setWorkspaces] = useState<RoomDTO[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters & Views
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'OWNED' | 'SHARED'>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [launchingTemplate, setLaunchingTemplate] = useState<string | null>(null);

  // New Workspace Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomSourceType, setNewRoomSourceType] = useState<RoomSourceType>('SCRATCHPAD');
  const [newRoomTemplate, setNewRoomTemplate] = useState<RoomTemplate>('typescript');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Load user workspaces
  const fetchWorkspaces = async () => {
    try {
      setIsLoadingRooms(true);
      setApiError(null);
      const data = await listRoomsApi();
      setWorkspaces(data);
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Failed to load workspaces'));
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (!trimmed) return;

    try {
      setIsJoining(true);
      setJoinError(null);
      const joined = await joinRoomApi(trimmed);
      navigate(`/rooms/${joined.id}`);
    } catch (err) {
      setJoinError(getApiErrorMessage(err, 'Could not join room. Check code.'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLaunchTemplate = async (
    template: RoomTemplate,
    name: string,
    sourceType: RoomSourceType = 'SCRATCHPAD'
  ) => {
    try {
      setLaunchingTemplate(template);
      const room = await createRoomApi({
        name,
        template,
        sourceType,
      });
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to create workspace'));
    } finally {
      setLaunchingTemplate(null);
    }
  };

  const handleCreateCustomRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoomName.trim();
    if (!trimmed) return;

    try {
      setIsCreating(true);
      setCreateModalError(null);
      const room = await createRoomApi({
        name: trimmed,
        description: newRoomDesc.trim() || undefined,
        sourceType: newRoomSourceType,
        template: newRoomTemplate,
        isPrivate: newRoomPrivate,
      });
      setIsModalOpen(false);
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setCreateModalError(getApiErrorMessage(err, 'Failed to create workspace'));
    } finally {
      setIsCreating(false);
    }
  };

  const copyRoomId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filter workspaces
  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterTab === 'OWNED') return matchesSearch && ws.role === 'OWNER';
    if (filterTab === 'SHARED') return matchesSearch && ws.role !== 'OWNER';
    return matchesSearch;
  });

  const ownedCount = workspaces.filter((w) => w.role === 'OWNER').length;
  const sharedCount = workspaces.filter((w) => w.role !== 'OWNER').length;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 border-b border-border/40">
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
            <Code2 size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">
            Code<span className="text-primary font-mono">V</span>
          </span>
          <span className="ml-1 text-xs font-mono text-muted-foreground hidden sm:inline-block">
            / dashboard
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Telemetry Indicator */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Fastify API: Live</span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono">
            <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
              {user?.username?.[0] || 'U'}
            </div>
            <span className="text-foreground font-medium max-w-[80px] sm:max-w-[120px] truncate">
              {user?.username}
            </span>
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive gap-1 text-xs px-2 sm:px-3"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 z-10 space-y-6 sm:space-y-8">
        {/* Row 1: System Telemetry Deck */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Database</span>
              <Database size={13} className="text-emerald-500" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-foreground truncate">PostgreSQL 16</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Master Schema Contract</div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>CRDT State</span>
              <Server size={13} className="text-primary" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-foreground truncate">Yjs v13</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Uint8Array binary delta</div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Execution</span>
              <Terminal size={13} className="text-primary" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-foreground truncate">gcc / g++ / py</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Sandboxed CP Runner</div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Workspaces</span>
              <FolderGit2 size={13} className="text-primary" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-foreground truncate">
              {isLoadingRooms ? '...' : workspaces.length}
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Across all active rooms</div>
          </div>
        </div>

        {/* Row 2: Instant Workspace Launchers / Templates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-foreground flex items-center gap-1.5 sm:gap-2">
              <Sparkles size={14} className="text-primary" />
              <span>Instant Workspace Templates</span>
            </h2>
            <span className="text-[11px] text-muted-foreground font-mono">One-click spin up</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* TypeScript */}
            <button
              type="button"
              disabled={launchingTemplate !== null}
              onClick={() => handleLaunchTemplate('typescript', 'TypeScript Scratchpad', 'SCRATCHPAD')}
              className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1 group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  TypeScript Scratchpad
                </span>
                {launchingTemplate === 'typescript' ? (
                  <Loader2 size={14} className="text-primary animate-spin" />
                ) : (
                  <Code size={14} className="text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pre-configured TypeScript runtime for rapid algorithms and pair coding.
              </p>
            </button>

            {/* C++ Competitive Arena */}
            <button
              type="button"
              disabled={launchingTemplate !== null}
              onClick={() => handleLaunchTemplate('cpp', 'C++ Competitive Arena', 'COMPILER')}
              className="p-3.5 sm:p-4 rounded-xl border border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all text-left space-y-1 group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>C++ CP Arena</span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-primary/20 text-primary rounded font-bold">
                    Codeforces
                  </span>
                </span>
                {launchingTemplate === 'cpp' ? (
                  <Loader2 size={14} className="text-primary animate-spin" />
                ) : (
                  <Terminal size={14} className="text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                C++20 with &lt;bits/stdc++.h&gt;, fast I/O, custom stdin, and stdout runner.
              </p>
            </button>

            {/* Python Runner */}
            <button
              type="button"
              disabled={launchingTemplate !== null}
              onClick={() => handleLaunchTemplate('python', 'Python Workspace', 'SCRATCHPAD')}
              className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1 group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  Python 3 Workspace
                </span>
                {launchingTemplate === 'python' ? (
                  <Loader2 size={14} className="text-primary animate-spin" />
                ) : (
                  <FileCode size={14} className="text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Clean Python canvas with standard library for DSA problem solving.
              </p>
            </button>

            {/* React Sandbox */}
            <button
              type="button"
              disabled={launchingTemplate !== null}
              onClick={() => handleLaunchTemplate('react', 'React Sandbox', 'TEMPLATE')}
              className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/40 hover:border-primary/50 hover:bg-card/70 transition-all text-left space-y-1 group cursor-pointer disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  React Prototyper
                </span>
                {launchingTemplate === 'react' ? (
                  <Loader2 size={14} className="text-primary animate-spin" />
                ) : (
                  <Code2 size={14} className="text-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                JSX prototyping canvas with live peer awareness for component design.
              </p>
            </button>
          </div>
        </div>

        {/* Row 3: Workspaces Management (Search, Filters, View Mode) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-2.5">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Your Workspaces
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsModalOpen(true)}
                  className="h-7 text-xs gap-1.5 rounded-lg border-primary/30 hover:bg-primary/10 hover:text-primary shrink-0"
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Collaborative rooms you own or have joined via peer invite codes.
              </p>
            </div>

            {/* Join Room Code Input Form */}
            <form onSubmit={handleJoin} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <Input
                  type="text"
                  placeholder="Enter room code..."
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono rounded-lg bg-background/60 w-full"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={!joinCode.trim() || isJoining}
                className="shrink-0 h-8 text-xs"
              >
                {isJoining ? <Loader2 size={13} className="animate-spin" /> : 'Join'}
              </Button>
            </form>
          </div>

          {joinError && (
            <p className="text-xs text-destructive font-mono bg-destructive/10 border border-destructive/20 rounded-lg p-2">
              {joinError}
            </p>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl bg-card/40 border border-border/60">
            {/* Filter Tabs - Horizontal scrolling on mobile */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0 w-full sm:w-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterTab === 'ALL'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({workspaces.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('OWNED')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterTab === 'OWNED'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="sm:hidden">Owned ({ownedCount})</span>
                <span className="hidden sm:inline">Created by me ({ownedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('SHARED')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterTab === 'SHARED'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="sm:hidden">Shared ({sharedCount})</span>
                <span className="hidden sm:inline">Shared with me ({sharedCount})</span>
              </button>
            </div>

            {/* Search + View Mode Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                <input
                  type="text"
                  placeholder="Filter rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2.5 h-8 text-xs rounded-lg bg-background/50 border border-input focus:border-ring outline-none w-full sm:w-44 font-mono"
                />
              </div>

              <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-background/40 shrink-0">
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

          {/* Workspaces Display: Loading, Empty, Grid or Table */}
          {isLoadingRooms ? (
            <div className="rounded-xl border border-border/60 p-12 text-center space-y-3 bg-card/20">
              <Loader2 size={24} className="animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-mono">Loading your workspaces...</p>
            </div>
          ) : apiError ? (
            <div className="rounded-xl border border-destructive/30 p-8 text-center space-y-2 bg-destructive/5">
              <p className="text-xs font-semibold text-destructive">{apiError}</p>
              <Button size="sm" variant="outline" onClick={fetchWorkspaces}>
                Retry
              </Button>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 sm:p-12 text-center space-y-3 bg-card/20">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <FolderGit2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No workspaces found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery
                    ? 'No workspaces match your search filter.'
                    : 'Spin up an instant template above or click New Workspace to start coding.'}
                </p>
              </div>
              {!searchQuery && (
                <Button size="sm" onClick={() => setIsModalOpen(true)} className="text-xs gap-1.5">
                  <Plus size={14} />
                  <span>Create Workspace</span>
                </Button>
              )}
            </div>
          ) : viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-3.5 sm:space-y-4 hover:border-primary/40 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderGit2 size={16} className="text-primary shrink-0" />
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                          {ws.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span className="truncate">{ws.id}</span>
                        <button
                          type="button"
                          onClick={() => copyRoomId(ws.id)}
                          className="hover:text-foreground cursor-pointer transition-colors shrink-0"
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
                    <div className="shrink-0">
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
                  </div>

                  {ws.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {ws.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/80 px-1.5 py-0.5 bg-muted rounded">
                        {ws.sourceType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>{formatRelativeTime(ws.updatedAt)}</span>
                    </div>
                  </div>

                  <Button asChild size="sm" variant="outline" className="w-full justify-between text-xs font-mono">
                    <Link to={`/rooms/${ws.id}`}>
                      <span>Enter Workspace</span>
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            /* Table View with responsive overflow */
            <div className="rounded-xl border border-border/70 overflow-x-auto bg-card/40">
              <table className="w-full text-left text-xs font-mono min-w-[540px]">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Workspace</th>
                    <th className="py-2.5 px-4 font-medium">Room Code</th>
                    <th className="py-2.5 px-4 font-medium">Type</th>
                    <th className="py-2.5 px-4 font-medium">Your Role</th>
                    <th className="py-2.5 px-4 font-medium">Updated</th>
                    <th className="py-2.5 px-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredWorkspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FolderGit2 size={14} className="text-primary shrink-0" />
                          <span className="truncate max-w-[150px] sm:max-w-xs">{ws.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
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
                      <td className="py-3 px-4 text-muted-foreground uppercase text-[10px]">
                        {ws.sourceType}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatRelativeTime(ws.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                          <Link to={`/rooms/${ws.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* New Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Create New Workspace</h3>
              <p className="text-xs text-muted-foreground">
                Set up a multiplayer code editor or competitive programming arena.
              </p>
            </div>

            {createModalError && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2 font-mono">
                {createModalError}
              </p>
            )}

            <form onSubmit={handleCreateCustomRoom} className="space-y-3.5 sm:space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Workspace Name</label>
                <Input
                  type="text"
                  placeholder="e.g. LeetCode Practice, Fastify Service"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <Input
                  type="text"
                  placeholder="What are you building or solving?"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Workspace Mode</label>
                  <select
                    value={newRoomSourceType}
                    onChange={(e) => setNewRoomSourceType(e.target.value as RoomSourceType)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="SCRATCHPAD">Standard Editor</option>
                    <option value="COMPILER">Competitive Arena (CP)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Language / Template</label>
                  <select
                    value={newRoomTemplate}
                    onChange={(e) => setNewRoomTemplate(e.target.value as RoomTemplate)}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                  >
                    <option value="typescript">TypeScript (TS)</option>
                    <option value="cpp">C++20 (&lt;bits/stdc++.h&gt;)</option>
                    <option value="c">C (gcc)</option>
                    <option value="python">Python 3</option>
                    <option value="react">React (JSX)</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privateRoom"
                  checked={newRoomPrivate}
                  onChange={(e) => setNewRoomPrivate(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="privateRoom" className="text-xs text-muted-foreground cursor-pointer">
                  Private workspace (only invited members can view)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newRoomName.trim() || isCreating}
                  className="text-xs gap-1.5"
                >
                  {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                  <span>Create Workspace</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
