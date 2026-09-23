import {
  AlertCircle,
  ArrowLeft,
  Check,
  Code2,
  Copy,
  FileCode,
  Loader2,
  Sparkles,
  GitBranch,
  Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getRoomDetailsApi } from '@/api/rooms';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
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
  const [peerCount, setPeerCount] = useState(1);
  const [isSynced, setIsSynced] = useState(false);

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
      <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4">
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
      <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground p-4 sm:p-6">
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
  const fileExt = activeFile?.path.split('.').pop() || 'ts';

  const getLanguage = (path?: string) => {
    if (!path) return 'typescript';
    if (path.endsWith('.cpp') || path.endsWith('.cc') || path.endsWith('.h')) return 'cpp';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.c')) return 'c';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    return 'typescript';
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Workspace Navigation Bar */}
      <header className="h-13 border-b border-border/60 bg-card/60 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-10 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0">
            <Link to="/dashboard" title="Back to Dashboard">
              <ArrowLeft size={16} />
            </Link>
          </Button>

          <div className="h-4 w-[1px] bg-border/60 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Code2 size={16} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-foreground leading-none truncate max-w-[100px] xs:max-w-[150px] sm:max-w-xs">{room.name}</h1>
              <span className="hidden xs:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground uppercase">{room.sourceType}</span>
            </div>
          </div>

          {/* Room ID copy pill */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/50 border border-border/50 text-xs font-mono shrink-0">
            <span className="text-muted-foreground text-[11px]">{room.id}</span>
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

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Share Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyRoomLink}
            className="h-7 px-2 sm:px-2.5 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground border-border/60"
            title="Copy share link"
          >
            {copiedId ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
            <span className="hidden sm:inline">{copiedId ? 'Copied' : 'Share'}</span>
          </Button>

          {/* Peer Presence Pill */}
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-500">
            <span className={`h-1.5 w-1.5 rounded-full ${isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'} shrink-0`} />
            <span>{peerCount} <span className="hidden sm:inline">{peerCount === 1 ? 'Peer' : 'Peers'}</span></span>
          </div>

          {/* User Role Badge */}
          <span
            className={`hidden xs:inline-flex items-center h-7 text-[10px] font-mono px-2 rounded-lg border uppercase font-semibold ${
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

      {/* Main Workspace Canvas */}
      <main className="flex-1 min-h-0 w-full flex flex-col p-1.5 sm:p-3 bg-muted/15 overflow-hidden">
        <div className="flex-1 min-h-0 w-full rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-sm">
          {/* Editor Tab Bar */}
          <div className="h-9 border-b border-border/60 bg-muted/30 px-2 sm:px-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-t-md border-t border-x border-border/60 text-xs font-mono text-foreground font-medium truncate">
                <FileCode size={13} className="text-primary shrink-0" />
                <span className="truncate">{activeFile?.path || 'main.ts'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground shrink-0">
              <div className="flex items-center gap-1">
                <Sparkles size={12} className={isSynced ? 'text-primary' : 'text-amber-500'} />
                <span className="hidden xs:inline">{isSynced ? 'Real-Time Sync Ready' : 'Connecting...'}</span>
              </div>
            </div>
          </div>

          {/* Collaborative Monaco Canvas Container */}
          <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-background">
            <CollaborativeEditor
              roomId={room.id}
              language={getLanguage(activeFile?.path)}
              readOnly={userRole === 'VIEWER'}
              onPeerCountChange={setPeerCount}
              onSyncChange={setIsSynced}
            />
          </div>

          {/* Bottom IDE Status Bar */}
          <footer className="h-6 border-t border-border/60 bg-muted/30 px-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
                <GitBranch size={11} className="text-primary" />
                <span>main</span>
              </span>
              <span className="hidden sm:inline text-muted-foreground/80">Ready</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">UTF-8</span>
              <span className="hidden xs:inline">Spaces: 2</span>
              <span className="text-primary font-semibold uppercase">{fileExt}</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
