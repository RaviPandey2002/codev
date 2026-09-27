import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  FileCode,
  GitBranch,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import * as Y from 'yjs';

import { executeCodeApi } from '@/api/execution';
import { getRoomDetailsApi } from '@/api/rooms';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type {
  CompilerProfile,
  ExecutionLanguage,
  ExecutionResult,
  RoomDTO,
  RoomFileDTO,
  RoomRole,
} from '@codev/shared';

const LANGUAGE_META: Record<
  ExecutionLanguage,
  { label: string; ext: string; fileName: string; template: string }
> = {
  cpp: {
    label: 'C++ (g++)',
    ext: 'cpp',
    fileName: 'main.cpp',
    template: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    cout << "Hello from CodeV C++!" << "\\n";\n    return 0;\n}\n`,
  },
  c: {
    label: 'C (gcc)',
    ext: 'c',
    fileName: 'main.c',
    template: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello from CodeV C!\\n");\n    return 0;\n}\n`,
  },
  python: {
    label: 'Python 3',
    ext: 'py',
    fileName: 'main.py',
    template: `import sys\n\ndef main() -> None:\n    print("Hello from CodeV Python!")\n\nif __name__ == "__main__":\n    main()\n`,
  },
  typescript: {
    label: 'TypeScript',
    ext: 'ts',
    fileName: 'main.ts',
    template: `function solve(): void {\n  console.log("Hello from CodeV TypeScript!");\n}\n\nsolve();\n`,
  },
  javascript: {
    label: 'JavaScript',
    ext: 'js',
    fileName: 'main.js',
    template: `function main() {\n  console.log("Hello from CodeV JavaScript!");\n}\n\nmain();\n`,
  },
};

function inferInitialLanguage(path?: string): ExecutionLanguage {
  if (!path) return 'typescript';
  if (path.endsWith('.cpp') || path.endsWith('.cc')) return 'cpp';
  if (path.endsWith('.c')) return 'c';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.js')) return 'javascript';
  return 'typescript';
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [files, setFiles] = useState<RoomFileDTO[]>([]);
  const [userRole, setUserRole] = useState<RoomRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [isSynced, setIsSynced] = useState(false);

  // Personal safety lock: lets any editor switch to read-only viewing mode
  const [isSelfViewOnly, setIsSelfViewOnly] = useState(false);

  // Collaborative Execution & Language State (Synced across all peers via Yjs)
  const ydocRef = useRef<Y.Doc | null>(null);
  const [language, setLanguage] = useState<ExecutionLanguage>('typescript');
  const [compilerProfile, setCompilerProfile] = useState<CompilerProfile>('default');
  const [stdin, setStdin] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningBy, setRunningBy] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

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
          setLanguage(inferInitialLanguage(data.files[0]?.path));
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

  const handleDocReady = useCallback(
    (doc: Y.Doc) => {
      ydocRef.current = doc;
      const meta = doc.getMap<any>('workspaceMeta');

      const syncFromYjs = () => {
        const syncedLang = meta.get('language') as ExecutionLanguage | undefined;
        if (syncedLang && LANGUAGE_META[syncedLang]) {
          setLanguage(syncedLang);
        }

        const syncedProfile = meta.get('compilerProfile') as CompilerProfile | undefined;
        if (syncedProfile) {
          setCompilerProfile(syncedProfile);
        }

        const syncedStdin = meta.get('stdin') as string | undefined;
        if (typeof syncedStdin === 'string') {
          setStdin(syncedStdin);
        }

        const syncedRunning = meta.get('isRunning') as boolean | undefined;
        setIsRunning(Boolean(syncedRunning));

        const syncedRunningBy = meta.get('runningBy') as string | null | undefined;
        setRunningBy(syncedRunningBy || null);

        const syncedResult = meta.get('executionResult') as ExecutionResult | null | undefined;
        if (syncedResult !== undefined) {
          setExecutionResult(syncedResult);
        }
      };

      meta.observe(syncFromYjs);
      syncFromYjs();
    },
    []
  );

  const handleLanguageChange = (newLang: ExecutionLanguage) => {
    setLanguage(newLang);
    const doc = ydocRef.current;
    if (doc) {
      doc.getMap('workspaceMeta').set('language', newLang);
    }
  };

  const handleProfileChange = (newProfile: CompilerProfile) => {
    setCompilerProfile(newProfile);
    const doc = ydocRef.current;
    if (doc) {
      doc.getMap('workspaceMeta').set('compilerProfile', newProfile);
    }
  };

  const handleStdinChange = (val: string) => {
    setStdin(val);
    const doc = ydocRef.current;
    if (doc) {
      doc.getMap('workspaceMeta').set('stdin', val);
    }
  };

  const isEffectiveReadOnly = userRole === 'VIEWER' || isSelfViewOnly;

  const handleLoadTemplate = () => {
    const doc = ydocRef.current;
    if (!doc || isEffectiveReadOnly) return;
    const ytext = doc.getText('monaco');
    doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, LANGUAGE_META[language].template);
    });
  };

  const handleRunCode = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc || isRunning) return;

    const code = doc.getText('monaco').toString();
    if (!code.trim()) return;

    const meta = doc.getMap<any>('workspaceMeta');
    const currentLang = (meta.get('language') as ExecutionLanguage) || language;
    const currentProfile = (meta.get('compilerProfile') as CompilerProfile) || compilerProfile;
    const currentStdin = (meta.get('stdin') as string) ?? stdin;

    setIsConsoleOpen(true);

    // Broadcast to all peers that execution has started
    doc.transact(() => {
      meta.set('isRunning', true);
      meta.set('runningBy', user?.username || 'Peer');
    });

    try {
      const result = await executeCodeApi({
        language: currentLang,
        compilerProfile: currentProfile,
        code,
        stdin: currentStdin,
      });

      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.set('executionResult', result);
      });
    } catch (err) {
      const fallbackError: ExecutionResult = {
        stdout: '',
        stderr: getApiErrorMessage(err, 'Execution request failed.'),
        exitCode: 1,
        executionTimeMs: 0,
        status: 'RUNTIME_ERROR',
        triggeredBy: user?.username || 'Peer',
        timestamp: new Date().toISOString(),
      };
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.set('executionResult', fallbackError);
      });
    }
  }, [isRunning, language, compilerProfile, stdin, user?.username]);

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
            <p className="text-xs text-muted-foreground">
              {error || 'This room does not exist or you do not have access.'}
            </p>
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

  const langMeta = LANGUAGE_META[language] || LANGUAGE_META.typescript;
  const isCompiledLang = language === 'cpp' || language === 'c';

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Workspace Navigation Bar */}
      <header className="h-13 border-b border-border/60 bg-card/60 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-10 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
          >
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
              <h1 className="text-xs font-bold text-foreground leading-none truncate max-w-[100px] xs:max-w-[150px] sm:max-w-xs">
                {room.name}
              </h1>
              <span className="hidden xs:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground uppercase">
                {room.sourceType}
              </span>
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              } shrink-0`}
            />
            <span>
              {peerCount} <span className="hidden sm:inline">{peerCount === 1 ? 'Peer' : 'Peers'}</span>
            </span>
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
      <main className="flex-1 min-h-0 w-full flex flex-col p-1.5 sm:p-2.5 bg-muted/15 overflow-hidden">
        <div className="flex-1 min-h-0 w-full rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-sm">
          {/* Editor Action & Tab Bar */}
          <div className="min-h-10 border-b border-border/60 bg-muted/30 px-2 sm:px-3 py-1 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Left: Active File Tab + Sync Status */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-md border border-border/60 text-xs font-mono text-foreground font-medium truncate">
                <FileCode size={13} className="text-primary shrink-0" />
                <span className="truncate">{files[0]?.path ? `main.${langMeta.ext}` : langMeta.fileName}</span>
              </div>

              <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                <Sparkles size={12} className={isSynced ? 'text-primary' : 'text-amber-500'} />
                <span>{isSynced ? 'Live Sync' : 'Connecting...'}</span>
              </div>
            </div>

            {/* Right: Language Selector, Compiler Profile, View-Only Toggle, Template Reset & Run Button */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {/* Language Dropdown */}
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as ExecutionLanguage)}
                disabled={isEffectiveReadOnly}
                className="h-7 rounded-md border border-border/70 bg-background px-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
                title="Select language (synced with room)"
              >
                <option value="cpp">C++20 (g++)</option>
                <option value="c">C17 (gcc)</option>
                <option value="python">Python 3</option>
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
              </select>

              {/* Compiler Profile Dropdown (for C / C++) */}
              {isCompiledLang && (
                <select
                  value={compilerProfile}
                  onChange={(e) => handleProfileChange(e.target.value as CompilerProfile)}
                  disabled={isEffectiveReadOnly}
                  className="h-7 rounded-md border border-border/70 bg-background px-2 text-xs font-mono text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
                  title="Compiler optimization & sanitizer flags"
                >
                  <option value="default">-O2 (Standard)</option>
                  <option value="debug">Debug + ASan/UBSan</option>
                  <option value="o3">-O3 (Max Speed)</option>
                  {language === 'cpp' && <option value="cpp17">C++17 (-O2)</option>}
                </select>
              )}

              {/* Load Starter Template Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleLoadTemplate}
                disabled={isEffectiveReadOnly}
                className="h-7 px-2 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground"
                title="Load starter boilerplate for current language"
              >
                <RotateCcw size={12} />
                <span className="hidden md:inline">Template</span>
              </Button>

              {/* Self Edit / View-Only Safety Toggle */}
              {userRole !== 'VIEWER' && (
                <button
                  type="button"
                  onClick={() => setIsSelfViewOnly((v) => !v)}
                  className={`h-7 px-2.5 rounded-md border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSelfViewOnly
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                      : 'bg-background text-muted-foreground hover:text-foreground border-border/70'
                  }`}
                  title={
                    isSelfViewOnly
                      ? 'Locked in View-Only mode (click to resume editing)'
                      : 'Switch to View-Only mode to prevent accidental typing'
                  }
                >
                  {isSelfViewOnly ? <Eye size={12} /> : <Pencil size={12} />}
                  <span className="hidden sm:inline">{isSelfViewOnly ? 'Viewing' : 'Editing'}</span>
                </button>
              )}

              {/* Run Code Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning}
                className="h-7 px-3 text-xs font-mono gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                title="Run Code (Ctrl/Cmd + Enter)"
              >
                {isRunning ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play size={12} className="fill-current" />
                    <span>Run</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Collaborative Monaco Canvas Container */}
          <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-background">
            <CollaborativeEditor
              roomId={room.id}
              language={language}
              readOnly={isEffectiveReadOnly}
              onPeerCountChange={setPeerCount}
              onSyncChange={setIsSynced}
              onDocReady={handleDocReady}
              onRunShortcut={handleRunCode}
            />
          </div>

          {/* Collapsible Shared Stdin / Stdout Execution Console */}
          <div
            className={`border-t border-border/70 bg-card/95 flex flex-col shrink-0 transition-all ${
              isConsoleOpen ? 'h-48 sm:h-56' : 'h-8'
            }`}
          >
            {/* Console Header Bar */}
            <div className="h-8 px-3 border-b border-border/50 bg-muted/40 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen((o) => !o)}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Terminal size={13} className="text-primary" />
                  <span>Execution Console</span>
                  {isConsoleOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                </button>

                {isRunning && (
                  <span className="flex items-center gap-1.5 text-[11px] text-amber-500">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Running ({runningBy || 'Peer'})...</span>
                  </span>
                )}

                {!isRunning && executionResult && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold ${
                        executionResult.status === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-destructive/15 text-destructive'
                      }`}
                    >
                      {executionResult.status}
                    </span>
                    <span className="text-muted-foreground">
                      {executionResult.executionTimeMs} ms
                    </span>
                    {executionResult.triggeredBy && (
                      <span className="hidden sm:inline text-muted-foreground/80">
                        • by {executionResult.triggeredBy}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsConsoleOpen((o) => !o)}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isConsoleOpen ? 'Minimize' : 'Expand'}
              </button>
            </div>

            {/* Console Split Body: Left = Shared Stdin, Right = Shared Output */}
            {isConsoleOpen && (
              <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60 overflow-hidden">
                {/* Shared Custom Input (stdin) */}
                <div className="flex flex-col min-h-0 p-2 bg-background/50">
                  <div className="flex items-center justify-between mb-1 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Custom Input (Shared Stdin)
                    </span>
                  </div>
                  <textarea
                    value={stdin}
                    onChange={(e) => handleStdinChange(e.target.value)}
                    disabled={isEffectiveReadOnly}
                    placeholder="Enter custom input (stdin) here..."
                    className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>

                {/* Shared Output (stdout / stderr) */}
                <div className="sm:col-span-2 flex flex-col min-h-0 p-2 bg-background/80 overflow-y-auto font-mono text-xs">
                  <div className="flex items-center justify-between mb-1 shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      Standard Output / Errors (Live Synced)
                    </span>
                    {executionResult && (
                      <span className="text-[10px] text-muted-foreground">
                        Exit Code: {executionResult.exitCode ?? 'N/A'}
                      </span>
                    )}
                  </div>

                  {!executionResult && !isRunning && (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground/60 text-xs">
                      Press &quot;Run&quot; or Ctrl+Enter to execute code for everyone in the room.
                    </div>
                  )}

                  {executionResult && (
                    <div className="space-y-2 whitespace-pre-wrap break-words">
                      {executionResult.stdout && (
                        <pre className="text-foreground leading-relaxed">{executionResult.stdout}</pre>
                      )}
                      {executionResult.stderr && (
                        <pre className="text-destructive leading-relaxed">{executionResult.stderr}</pre>
                      )}
                      {!executionResult.stdout && !executionResult.stderr && (
                        <span className="text-muted-foreground italic">
                          Program finished with no output.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom IDE Status Bar */}
          <footer className="h-6 border-t border-border/60 bg-muted/30 px-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
                <GitBranch size={11} className="text-primary" />
                <span>main</span>
              </span>
              <span className="hidden sm:inline text-muted-foreground/80">
                {isEffectiveReadOnly ? 'Read-Only Mode' : 'Ready'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">UTF-8</span>
              <span className="hidden xs:inline">Spaces: 2</span>
              <span className="text-primary font-semibold uppercase">{langMeta.ext}</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
