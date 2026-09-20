import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  Code2,
  Copy,
  Check,
  ArrowLeft,
  Activity,
  Loader2,
  AlertCircle,
  FileCode,
  Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getRoomDetailsApi } from '@/api/rooms';
import { getApiErrorMessage } from '@/lib/api';
import type { RoomDTO, RoomFileDTO, RoomRole } from '@codev/shared';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [files, setFiles] = useState<RoomFileDTO[]>([]);
  const [userRole, setUserRole] = useState<RoomRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;
    async function loadRoom() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getRoomDetailsApi(roomId!);
        if (mounted) {
          setRoom(data.room);
          setFiles(data.files);
          setUserRole(data.userRole);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Failed to load workspace.'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadRoom();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  const copyRoomLink = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4">
        <Loader2 size={32} className="animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold">Connecting to Workspace...</p>
          <p className="text-xs text-muted-foreground font-mono">Room code: {roomId}</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 sm:p-6">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-destructive/30 bg-card/60 backdrop-blur-md text-center space-y-4 shadow-xl">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Unable to join workspace</h2>
            <p className="text-xs text-muted-foreground">{error || 'This room does not exist or you do not have access.'}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/dashboard">
              <ArrowLeft size={14} className="mr-1.5" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const activeFile = files[0];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Workspace Navigation Bar */}
      <header className="h-14 border-b border-border/60 bg-card/40 backdrop-blur-xs px-2.5 sm:px-4 flex items-center justify-between z-10 gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0">
            <Link to="/dashboard" title="Back to Dashboard">
              <ArrowLeft size={16} />
            </Link>
          </Button>

          <div className="h-4 w-[1px] bg-border/60 shrink-0" />

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Code2 size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-foreground leading-none truncate max-w-[80px] xs:max-w-[130px] sm:max-w-xs">{room.name}</h1>
              <span className="text-[10px] text-muted-foreground font-mono uppercase">{room.sourceType}</span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60 text-xs font-mono shrink-0">
            <span>{room.id}</span>
            <button
              type="button"
              onClick={copyRoomLink}
              className="hover:text-foreground cursor-pointer text-muted-foreground transition-colors ml-1"
              title="Copy share link"
            >
              {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Copy Link on mobile */}
          <button
            type="button"
            onClick={copyRoomLink}
            className="sm:hidden p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground"
            title="Copy share link"
          >
            {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>

          {/* Peer Presence Pill */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>1 <span className="hidden sm:inline">Peer Active</span></span>
          </div>

          {/* User Role Badge */}
          <span
            className={`hidden xs:inline-block text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded border uppercase font-semibold ${
              userRole === 'OWNER'
                ? 'bg-primary/10 text-primary border-primary/20'
                : 'bg-muted text-muted-foreground border-border/60'
            }`}
          >
            {userRole}
          </span>

          <ThemeToggle />
        </div>
      </header>

      {/* Workspace Canvas / Editor Container */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 bg-muted/20">
        <div className="flex-1 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs flex flex-col overflow-hidden shadow-sm">
          {/* Editor Tab Bar */}
          <div className="h-10 border-b border-border/60 bg-muted/30 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-card rounded-t-lg border-t border-x border-border/60 text-xs font-mono text-foreground font-medium truncate">
                <FileCode size={13} className="text-primary shrink-0" />
                <span className="truncate">{activeFile?.path || 'main.ts'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-muted-foreground shrink-0">
              <Sparkles size={12} className="text-primary shrink-0" />
              <span className="hidden xs:inline">Real-Time Sync Ready</span>
              <span className="xs:hidden">Live</span>
            </div>
          </div>

          {/* File Content Preview / Collaborative Canvas Placeholder */}
          <div className="flex-1 p-3 sm:p-6 font-mono text-xs overflow-auto bg-background/50">
            <div className="max-w-3xl space-y-3 sm:space-y-4">
              <div className="p-3.5 sm:p-4 rounded-xl border border-primary/20 bg-primary/5 text-foreground space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <Activity size={14} />
                  <span>Workspace Connected: {room.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Database room record initialized. Initial file <code className="text-primary font-semibold">{activeFile?.path}</code> seeded.
                  In the next step, Monaco Editor with live Yjs WebSocket delta synchronization will be mounted here.
                </p>
              </div>

              {/* Seed Code Render */}
              <div className="rounded-lg border border-border/60 bg-card/80 p-3 sm:p-4 shadow-inner">
                <div className="text-[11px] text-muted-foreground mb-2 flex items-center justify-between border-b border-border/40 pb-2">
                  <span>Initial Boilerplate ({activeFile?.path})</span>
                  <span>{activeFile?.content.length || 0} bytes</span>
                </div>
                <pre className="text-foreground leading-relaxed overflow-x-auto whitespace-pre text-[11px] sm:text-xs">
                  {activeFile?.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
