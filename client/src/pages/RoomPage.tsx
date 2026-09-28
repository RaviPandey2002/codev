import {
  AlertCircle,
  AlignLeft,
  ArrowLeft,
  ArrowLeftRight,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  FileCode,
  FileText,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import * as Y from 'yjs';

import { executeCodeApi } from '@/api/execution';
import { getRoomDetailsApi } from '@/api/rooms';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  CollaborativeEditor,
  type CollaborativeEditorHandle,
} from '@/components/editor/CollaborativeEditor';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type {
  ExecutionLanguage,
  ExecutionResult,
  RoomDTO,
  RoomRole,
} from '@codev/shared';

const CUSTOM_TEMPLATES_STORAGE_KEY = 'codev:user-templates:v1';
const COLUMN_ORDER_STORAGE_KEY = 'codev:room-col-order:v1';
const LEFT_FOLDED_STORAGE_KEY = 'codev:room-left-folded:v1';
const RIGHT_FOLDED_STORAGE_KEY = 'codev:room-right-folded:v1';

type ColumnId = 'context' | 'editor' | 'io';

const LANGUAGE_META: Record<
  ExecutionLanguage,
  { label: string; ext: string; fileName: string; template: string }
> = {
  cpp: {
    label: 'C++20 (g++)',
    ext: 'cpp',
    fileName: 'main.cpp',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cout << "Hello from CodeV C++!" << "\\n";
    return 0;
}
`,
  },
  c: {
    label: 'C17 (gcc)',
    ext: 'c',
    fileName: 'main.c',
    template: `#include <stdio.h>

int main(void) {
    printf("Hello from CodeV C!\\n");
    return 0;
}
`,
  },
  python: {
    label: 'Python 3',
    ext: 'py',
    fileName: 'main.py',
    template: `import sys

def main() -> None:
    print("Hello from CodeV Python!")

if __name__ == "__main__":
    main()
`,
  },
  typescript: {
    label: 'TypeScript',
    ext: 'ts',
    fileName: 'main.ts',
    template: `function solve(): void {
  console.log("Hello from CodeV TypeScript!");
}

solve();
`,
  },
  javascript: {
    label: 'JavaScript',
    ext: 'js',
    fileName: 'main.js',
    template: `function main() {
  console.log("Hello from CodeV JavaScript!");
}

main();
`,
  },
};

const DEFAULT_PROBLEM_NOTES = `# Problem / Shared Notes

Paste a problem statement, constraints, or algorithm dry-run notes here.

Example:
Input:
5
1 2 3 4 5

Output:
15
`;

function inferInitialLanguage(path?: string): ExecutionLanguage {
  if (!path) return 'cpp';
  if (path.endsWith('.cpp') || path.endsWith('.cc')) return 'cpp';
  if (path.endsWith('.c')) return 'c';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.js')) return 'javascript';
  return 'typescript';
}

function loadSavedTemplates(): Partial<Record<ExecutionLanguage, string>> {
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function loadColumnOrder(): ColumnId[] {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return ['context', 'editor', 'io'];
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === 3 &&
      parsed.includes('context') &&
      parsed.includes('editor') &&
      parsed.includes('io')
    ) {
      return parsed as ColumnId[];
    }
  } catch {
    // Ignore
  }
  return ['context', 'editor', 'io'];
}

function isBuiltInBoilerplate(code: string): boolean {
  const trimmed = code.trim();
  if (!trimmed) return true;
  if (trimmed.includes('Welcome to CodeV')) return true;
  if (trimmed.includes('CodeV Competitive Programming Arena')) return true;
  if (trimmed.includes('CodeV Online C Compiler')) return true;
  if (trimmed.includes('CodeV Python Workspace')) return true;
  if (trimmed.includes('CodeV JavaScript Workspace')) return true;
  return Object.values(LANGUAGE_META).some((m) => m.template.trim() === trimmed);
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [userRole, setUserRole] = useState<RoomRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [isSynced, setIsSynced] = useState(false);

  // Direct DOM ref for cursor position so typing/moving cursor never re-renders RoomPage
  const cursorLabelRef = useRef<HTMLSpanElement | null>(null);
  const handleCursorChange = useCallback((pos: { lineNumber: number; column: number }) => {
    if (cursorLabelRef.current) {
      cursorLabelRef.current.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }
  }, []);

  // Personal safety lock: lets any editor switch to read-only viewing mode
  const [isSelfViewOnly, setIsSelfViewOnly] = useState(false);

  // Custom per-language user templates persisted in localStorage
  const [customTemplates, setCustomTemplates] = useState<
    Partial<Record<ExecutionLanguage, string>>
  >(() => loadSavedTemplates());
  const [savedTemplateFlash, setSavedTemplateFlash] = useState(false);

  // Collaborative Execution & Notes State (Synced via Yjs)
  const ydocRef = useRef<Y.Doc | null>(null);
  const editorHandleRef = useRef<CollaborativeEditorHandle | null>(null);
  const [language, setLanguage] = useState<ExecutionLanguage>('cpp');
  const [stdin, setStdin] = useState('');
  const stdinRef = useRef('');
  stdinRef.current = stdin;

  const [problemNotes, setProblemNotes] = useState(DEFAULT_PROBLEM_NOTES);
  const [isRunning, setIsRunning] = useState(false);
  const [runningBy, setRunningBy] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // 3-Column Foldable & Reorderable Layout State (Local per machine)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => loadColumnOrder());
  const [isContextFolded, setIsContextFolded] = useState<boolean>(() => {
    return localStorage.getItem(LEFT_FOLDED_STORAGE_KEY) === 'true';
  });
  const [isIoFolded, setIsIoFolded] = useState<boolean>(() => {
    return localStorage.getItem(RIGHT_FOLDED_STORAGE_KEY) === 'true';
  });
  const [maximizedColumn, setMaximizedColumn] = useState<ColumnId | null>(null);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Column widths & I/O vertical split stored in refs and applied via CSS variables for 0-re-render dragging
  const colWidthsRef = useRef<Record<ColumnId, number>>({
    context: 26,
    editor: 44,
    io: 30,
  });
  const ioSplitRef = useRef<number>(58);

  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);
  const ioContainerRef = useRef<HTMLDivElement | null>(null);
  const dragShieldRef = useRef<HTMLDivElement | null>(null);

  // Sync normalized CSS width variables onto workspaceContainerRef
  const applyLayoutCssVars = useCallback(() => {
    const el = workspaceContainerRef.current;
    if (!el) return;

    const isFolded = (c: ColumnId) =>
      (c === 'context' && isContextFolded) || (c === 'io' && isIoFolded);

    const unfolded = columnOrder.filter((c) => !isFolded(c));
    const totalRaw = unfolded.reduce((sum, c) => sum + colWidthsRef.current[c], 0) || 100;

    (['context', 'editor', 'io'] as ColumnId[]).forEach((c) => {
      if (maximizedColumn === c) {
        el.style.setProperty(`--col-${c}-w`, '100%');
      } else {
        const pct = (colWidthsRef.current[c] / totalRaw) * 100;
        el.style.setProperty(`--col-${c}-w`, `${pct.toFixed(2)}%`);
      }
    });

    el.style.setProperty('--io-top-h', `${ioSplitRef.current.toFixed(2)}%`);
    el.style.setProperty('--io-bot-h', `${(100 - ioSplitRef.current).toFixed(2)}%`);
  }, [columnOrder, isContextFolded, isIoFolded, maximizedColumn]);

  useEffect(() => {
    applyLayoutCssVars();
  }, [applyLayoutCssVars]);

  // Zero-re-render pointer drag starter for column widths
  const startColumnResize = (
    e: React.PointerEvent,
    leftCol: ColumnId,
    rightCol: ColumnId
  ) => {
    e.preventDefault();
    const container = workspaceContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const isFolded = (c: ColumnId) =>
      (c === 'context' && isContextFolded) || (c === 'io' && isIoFolded);
    const unfolded = columnOrder.filter((c) => !isFolded(c));
    const totalRaw = unfolded.reduce((sum, c) => sum + colWidthsRef.current[c], 0) || 100;

    // Normalize before starting drag so 1% mouse delta === 1% visual width
    unfolded.forEach((c) => {
      colWidthsRef.current[c] = (colWidthsRef.current[c] / totalRaw) * 100;
    });

    const startLeft = colWidthsRef.current[leftCol];
    const startRight = colWidthsRef.current[rightCol];
    const combined = startLeft + startRight;

    if (dragShieldRef.current) {
      dragShieldRef.current.style.display = 'block';
      dragShieldRef.current.style.cursor = 'col-resize';
    }

    let rafId = 0;
    const onMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaPct = ((ev.clientX - startX) / rect.width) * 100;
        const nextLeft = Math.min(combined - 16, Math.max(16, startLeft + deltaPct));
        const nextRight = combined - nextLeft;
        colWidthsRef.current[leftCol] = nextLeft;
        colWidthsRef.current[rightCol] = nextRight;
        container.style.setProperty(`--col-${leftCol}-w`, `${nextLeft.toFixed(2)}%`);
        container.style.setProperty(`--col-${rightCol}-w`, `${nextRight.toFixed(2)}%`);
      });
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (dragShieldRef.current) {
        dragShieldRef.current.style.display = 'none';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Zero-re-render pointer drag starter for Output / Input vertical split
  const startIoResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const ioEl = ioContainerRef.current;
    const wsEl = workspaceContainerRef.current;
    if (!ioEl || !wsEl) return;

    const rect = ioEl.getBoundingClientRect();
    if (dragShieldRef.current) {
      dragShieldRef.current.style.display = 'block';
      dragShieldRef.current.style.cursor = 'row-resize';
    }

    let rafId = 0;
    const onMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const pct = Math.min(84, Math.max(18, ((ev.clientY - rect.top) / rect.height) * 100));
        ioSplitRef.current = pct;
        wsEl.style.setProperty('--io-top-h', `${pct.toFixed(2)}%`);
        wsEl.style.setProperty('--io-bot-h', `${(100 - pct).toFixed(2)}%`);
      });
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (dragShieldRef.current) {
        dragShieldRef.current.style.display = 'none';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const getEffectiveTemplate = useCallback(
    (lang: ExecutionLanguage, overrides?: Partial<Record<ExecutionLanguage, string>>) => {
      const map = overrides ?? customTemplates;
      const custom = map[lang];
      if (typeof custom === 'string' && custom.trim().length > 0) {
        return custom;
      }
      return LANGUAGE_META[lang].template;
    },
    [customTemplates]
  );

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

  const handleDocReady = useCallback((doc: Y.Doc, handle: CollaborativeEditorHandle) => {
    ydocRef.current = doc;
    editorHandleRef.current = handle;
    const meta = doc.getMap<any>('workspaceMeta');

    const syncFromYjs = () => {
      const syncedLang = meta.get('language') as ExecutionLanguage | undefined;
      if (syncedLang && LANGUAGE_META[syncedLang]) {
        setLanguage(syncedLang);
      }

      const syncedStdin = meta.get('stdin') as string | undefined;
      if (typeof syncedStdin === 'string') {
        setStdin(syncedStdin);
      }

      const syncedNotes = meta.get('problemNotes') as string | undefined;
      if (typeof syncedNotes === 'string') {
        setProblemNotes(syncedNotes);
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
  }, []);

  const handleSyncChange = useCallback(
    (synced: boolean) => {
      setIsSynced(synced);
      if (!synced) return;

      const doc = ydocRef.current;
      const handle = editorHandleRef.current;
      if (!doc || !handle) return;

      const meta = doc.getMap<any>('workspaceMeta');
      const activeLang = (meta.get('language') as ExecutionLanguage | undefined) || language;
      const currentCode = handle.getCode();

      if (isBuiltInBoilerplate(currentCode)) {
        const preferred = getEffectiveTemplate(activeLang);
        const customSaved = customTemplates[activeLang]?.trim();
        if (customSaved && currentCode.trim() !== customSaved) {
          handle.setCode(preferred);
        }
      }
    },
    [language, customTemplates, getEffectiveTemplate]
  );

  const isEffectiveReadOnly = userRole === 'VIEWER' || isSelfViewOnly;

  const handleLanguageChange = (newLang: ExecutionLanguage) => {
    if (newLang === language || isEffectiveReadOnly) return;

    const doc = ydocRef.current;
    const editorHandle = editorHandleRef.current;
    const currentCode = editorHandle?.getCode() ?? '';

    let nextCode = getEffectiveTemplate(newLang);

    if (doc) {
      const codeByLang = doc.getMap<string>('codeByLanguage');
      const meta = doc.getMap<any>('workspaceMeta');

      if (currentCode.trim().length > 0 && !isBuiltInBoilerplate(currentCode)) {
        codeByLang.set(language, currentCode);
      }

      const existingLangCode = codeByLang.get(newLang);
      if (typeof existingLangCode === 'string' && existingLangCode.trim().length > 0) {
        nextCode = existingLangCode;
      }

      doc.transact(() => {
        meta.set('language', newLang);
      });
    }

    setLanguage(newLang);
    editorHandle?.setCode(nextCode);
  };

  const handleResetToTemplate = () => {
    if (isEffectiveReadOnly) return;
    const targetTemplate = getEffectiveTemplate(language);
    editorHandleRef.current?.setCode(targetTemplate);

    const doc = ydocRef.current;
    if (doc) {
      doc.getMap<string>('codeByLanguage').set(language, targetTemplate);
    }
  };

  const handleSaveCustomTemplate = () => {
    const currentCode = editorHandleRef.current?.getCode() ?? '';
    if (!currentCode.trim()) return;

    const updated: Partial<Record<ExecutionLanguage, string>> = {
      ...customTemplates,
      [language]: currentCode,
    };
    setCustomTemplates(updated);
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
      setSavedTemplateFlash(true);
      setTimeout(() => setSavedTemplateFlash(false), 1800);
    } catch {
      // Ignore
    }
  };

  const handleClearCustomTemplate = () => {
    const updated = { ...customTemplates };
    delete updated[language];
    setCustomTemplates(updated);
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    if (!isEffectiveReadOnly) {
      const defaultCode = LANGUAGE_META[language].template;
      editorHandleRef.current?.setCode(defaultCode);
      ydocRef.current?.getMap<string>('codeByLanguage').set(language, defaultCode);
    }
  };

  const stdinSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStdinChange = (val: string) => {
    stdinRef.current = val;
    setStdin(val);
    if (stdinSyncTimerRef.current) clearTimeout(stdinSyncTimerRef.current);
    stdinSyncTimerRef.current = setTimeout(() => {
      ydocRef.current?.getMap('workspaceMeta').set('stdin', val);
    }, 200);
  };

  const handleProblemNotesChange = (val: string) => {
    setProblemNotes(val);
    if (notesSyncTimerRef.current) clearTimeout(notesSyncTimerRef.current);
    notesSyncTimerRef.current = setTimeout(() => {
      ydocRef.current?.getMap('workspaceMeta').set('problemNotes', val);
    }, 250);
  };

  const handleClearOutput = () => {
    setExecutionResult(null);
    ydocRef.current?.getMap('workspaceMeta').set('executionResult', null);
  };

  const toggleContextFold = (forceState?: boolean) => {
    const next = forceState !== undefined ? forceState : !isContextFolded;
    setIsContextFolded(next);
    localStorage.setItem(LEFT_FOLDED_STORAGE_KEY, String(next));
    if (!next && maximizedColumn === 'editor') {
      setMaximizedColumn(null);
    }
  };

  const toggleIoFold = (forceState?: boolean) => {
    const next = forceState !== undefined ? forceState : !isIoFolded;
    setIsIoFolded(next);
    localStorage.setItem(RIGHT_FOLDED_STORAGE_KEY, String(next));
    if (!next && maximizedColumn === 'editor') {
      setMaximizedColumn(null);
    }
  };

  const updateColumnOrder = (nextOrder: ColumnId[]) => {
    setColumnOrder(nextOrder);
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(nextOrder));
  };

  const handleSwapColumns = (sourceCol: ColumnId, targetCol: ColumnId) => {
    if (sourceCol === targetCol) return;
    const next = [...columnOrder];
    const srcIdx = next.indexOf(sourceCol);
    const tgtIdx = next.indexOf(targetCol);
    if (srcIdx === -1 || tgtIdx === -1) return;
    next[srcIdx] = targetCol;
    next[tgtIdx] = sourceCol;
    updateColumnOrder(next);
  };

  const handleResetLayout = () => {
    colWidthsRef.current = { context: 26, editor: 44, io: 30 };
    ioSplitRef.current = 58;
    updateColumnOrder(['context', 'editor', 'io']);
    toggleContextFold(false);
    toggleIoFold(false);
    setMaximizedColumn(null);
    applyLayoutCssVars();
    setIsLayoutMenuOpen(false);
  };

  const handleRunCode = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc || isRunning) return;

    const code = editorHandleRef.current?.getCode() || doc.getText('monaco').toString();
    if (!code.trim()) return;

    const meta = doc.getMap<any>('workspaceMeta');
    const currentLang = (meta.get('language') as ExecutionLanguage) || language;
    const currentStdin = stdinRef.current;
    meta.set('stdin', currentStdin);

    if (isIoFolded) {
      toggleIoFold(false);
    }

    doc.transact(() => {
      meta.set('isRunning', true);
      meta.set('runningBy', user?.username || 'Peer');
    });

    try {
      const result = await executeCodeApi({
        language: currentLang,
        compilerProfile: 'default',
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
  }, [isRunning, language, user?.username, isIoFolded]);

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

  const langMeta = LANGUAGE_META[language] || LANGUAGE_META.cpp;
  const hasCustomTemplateForLang = Boolean(customTemplates[language]?.trim());

  const isColFolded = (colId: ColumnId) => {
    if (colId === 'context') return isContextFolded;
    if (colId === 'io') return isIoFolded;
    return false;
  };

  // Render Context Column (Column 1 by default — Description / Notes)
  const renderContextColumn = (colIndex: number) => {
    const isLeftEdge = colIndex === 0;

    if (isContextFolded && maximizedColumn !== 'context') {
      return (
        <div
          key="context-folded"
          className="w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex flex-col items-center py-2 select-none shadow-xs"
        >
          <button
            type="button"
            onClick={() => toggleContextFold(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer mb-1"
            title="Expand Notes Panel"
          >
            {isLeftEdge ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="w-5 h-[1px] bg-border/60 my-1" />

          <button
            type="button"
            onClick={() => toggleContextFold(false)}
            className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            title="Open Description / Notes"
          >
            <FileText size={13} className="text-sky-500 shrink-0" />
            <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
              Description
            </span>
          </button>
        </div>
      );
    }

    return (
      <div
        key="context-expanded"
        style={{ width: 'var(--col-context-w, 26%)' }}
        className="min-h-0 min-w-0 h-full rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
      >
        <div className="h-9 border-b border-border/60 bg-muted/35 px-2.5 flex items-center justify-between gap-1 shrink-0 select-none">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileText size={13} className="text-sky-500 shrink-0" />
            <span>Description / Notes</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMaximizedColumn((m) => (m === 'context' ? null : 'context'))}
              className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
              title={maximizedColumn === 'context' ? 'Restore panel size' : 'Maximize panel'}
            >
              {maximizedColumn === 'context' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            {maximizedColumn !== 'context' && (
              <button
                type="button"
                onClick={() => toggleContextFold(true)}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                title="Fold panel into vertical tab bar"
              >
                {isLeftEdge ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-3 bg-background/60">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-[11px] font-mono text-muted-foreground">
              Shared Problem Scratchpad
            </span>
            {!isEffectiveReadOnly && (
              <button
                type="button"
                onClick={() => handleProblemNotesChange(DEFAULT_PROBLEM_NOTES)}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <textarea
            value={problemNotes}
            onChange={(e) => handleProblemNotesChange(e.target.value)}
            disabled={isEffectiveReadOnly}
            placeholder="Paste problem description, examples, or shared algorithm notes here..."
            className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
          />
        </div>
      </div>
    );
  };

  // Render Center Code Editor Column
  const renderEditorColumn = () => {
    return (
      <div
        key="editor-column"
        style={{ width: 'var(--col-editor-w, 44%)' }}
        className="min-h-0 min-w-0 h-full rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
      >
        {/* Tier 1: 36px LeetCode Card Tabbar (`</> Code` + Maximize) */}
        <div className="h-9 border-b border-border/60 bg-muted/35 px-2.5 flex items-center justify-between gap-2 shrink-0 select-none">
          <div className="flex items-center gap-1.5 min-w-0">
            <Code2 size={14} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-foreground">Code</span>
            <span className="text-[11px] font-mono text-muted-foreground ml-1">
              ({langMeta.fileName})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMaximizedColumn((m) => (m === 'editor' ? null : 'editor'))}
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title={maximizedColumn === 'editor' ? 'Restore Split View' : 'Maximize Code Editor'}
          >
            {maximizedColumn === 'editor' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>

        {/* Tier 2: 32px Editor Sub-Toolbar */}
        <div className="min-h-8 border-b border-border/50 bg-card px-2.5 py-1 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as ExecutionLanguage)}
              disabled={isEffectiveReadOnly}
              className="h-6 rounded-md border border-transparent hover:border-border/70 bg-transparent hover:bg-muted/50 px-1.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer transition-colors"
              title="Switch language (auto-loads your template or saved room code)"
            >
              <option value="cpp" className="bg-card text-foreground">C++20 (g++)</option>
              <option value="c" className="bg-card text-foreground">C17 (gcc)</option>
              <option value="python" className="bg-card text-foreground">Python 3</option>
              <option value="typescript" className="bg-card text-foreground">TypeScript</option>
              <option value="javascript" className="bg-card text-foreground">JavaScript</option>
            </select>

            <div className="h-3 w-[1px] bg-border/60" />

            {userRole !== 'VIEWER' && (
              <button
                type="button"
                onClick={() => setIsSelfViewOnly((v) => !v)}
                className={`h-6 px-2 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  isSelfViewOnly
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title={
                  isSelfViewOnly
                    ? 'Locked in View-Only mode (click to resume editing)'
                    : 'Switch to View-Only mode to prevent accidental typing'
                }
              >
                {isSelfViewOnly ? <Eye size={11} /> : <Pencil size={11} />}
                <span>{isSelfViewOnly ? 'Viewing' : 'Editing'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editorHandleRef.current?.formatCode()}
              disabled={isEffectiveReadOnly}
              className="h-6 px-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 text-[11px] font-mono cursor-pointer disabled:opacity-50"
              title="Format Document"
            >
              <AlignLeft size={12} />
            </button>

            <button
              type="button"
              onClick={handleSaveCustomTemplate}
              className={`h-6 px-2 rounded flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors ${
                savedTemplateFlash
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : hasCustomTemplateForLang
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={
                hasCustomTemplateForLang
                  ? `Update your saved ${langMeta.label} template`
                  : `Save current code as your personal ${langMeta.label} template`
              }
            >
              {savedTemplateFlash ? (
                <>
                  <Check size={12} />
                  <span>Saved!</span>
                </>
              ) : hasCustomTemplateForLang ? (
                <>
                  <BookmarkCheck size={12} />
                  <span className="hidden xl:inline">Save Template</span>
                </>
              ) : (
                <>
                  <Bookmark size={12} />
                  <span className="hidden xl:inline">Save Template</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToTemplate}
              disabled={isEffectiveReadOnly}
              className="h-6 px-2 rounded text-[11px] font-mono flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer disabled:opacity-50"
              title={
                hasCustomTemplateForLang
                  ? `Reset editor to your saved ${langMeta.label} template`
                  : `Reset editor to default ${langMeta.label} template`
              }
            >
              <RotateCcw size={12} />
              <span className="hidden lg:inline">
                {hasCustomTemplateForLang ? 'My Template' : 'Template'}
              </span>
            </button>

            {hasCustomTemplateForLang && (
              <button
                type="button"
                onClick={handleClearCustomTemplate}
                disabled={isEffectiveReadOnly}
                className="h-6 px-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center cursor-pointer"
                title="Delete custom template and restore built-in default"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Collaborative Monaco Canvas */}
        <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-background">
          <CollaborativeEditor
            roomId={room.id}
            language={language}
            readOnly={isEffectiveReadOnly}
            onPeerCountChange={setPeerCount}
            onSyncChange={handleSyncChange}
            onDocReady={handleDocReady}
            onRunShortcut={handleRunCode}
            onCursorChange={handleCursorChange}
          />
        </div>

        {/* Bottom Status Footer */}
        <div className="h-6 border-t border-border/60 bg-muted/25 px-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <Sparkles size={10} className={isSynced ? 'text-emerald-500' : 'text-amber-500'} />
              <span>{isSynced ? 'Saved' : 'Syncing...'}</span>
            </span>
            {hasCustomTemplateForLang && (
              <span className="hidden sm:inline text-primary/80">• Custom Template</span>
            )}
          </div>
          <span ref={cursorLabelRef}>Ln 1, Col 1</span>
        </div>
      </div>
    );
  };

  // Render I/O Column (Column 3 by default)
  const renderIoColumn = (colIndex: number) => {
    const isRightEdge = colIndex === columnOrder.length - 1;

    if (isIoFolded && maximizedColumn !== 'io') {
      return (
        <div
          key="io-folded"
          className="w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex flex-col items-center py-2 select-none shadow-xs"
        >
          <button
            type="button"
            onClick={() => toggleIoFold(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer mb-1"
            title="Expand Output / Input Panel"
          >
            {isRightEdge ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <div className="w-5 h-[1px] bg-border/60 my-1" />

          <div className="flex-1 flex flex-col items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => toggleIoFold(false)}
              className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            >
              <Terminal size={13} className="text-emerald-500 shrink-0" />
              <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
                Test Result
              </span>
            </button>

            <div className="w-4 h-[1px] bg-border/50" />

            <button
              type="button"
              onClick={() => toggleIoFold(false)}
              className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            >
              <FileCode size={13} className="text-sky-500 shrink-0" />
              <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
                Testcase (stdin)
              </span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key="io-expanded"
        ref={ioContainerRef}
        style={{ width: 'var(--col-io-w, 30%)' }}
        className="min-h-0 min-w-0 h-full flex flex-col overflow-hidden"
      >
        {/* TOP CARD: OUTPUT */}
        <div
          style={{ height: 'var(--io-top-h, 58%)' }}
          className="min-h-0 min-w-0 rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
        >
          <div className="h-9 px-2.5 border-b border-border/60 bg-muted/35 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs font-mono min-w-0">
              <Terminal size={13} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground font-sans">Output</span>

              {isRunning && (
                <span className="flex items-center gap-1 text-[11px] text-amber-500 truncate ml-1">
                  <Loader2 size={11} className="animate-spin shrink-0" />
                  <span className="truncate">Running...</span>
                </span>
              )}

              {!isRunning && executionResult && (
                <div className="flex items-center gap-1.5 text-[11px] truncate ml-1">
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                      executionResult.status === 'SUCCESS'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {executionResult.status}
                  </span>
                  <span className="text-muted-foreground">{executionResult.executionTimeMs} ms</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {executionResult && (
                <button
                  type="button"
                  onClick={handleClearOutput}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setMaximizedColumn((m) => (m === 'io' ? null : 'io'))}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                title={maximizedColumn === 'io' ? 'Restore panel size' : 'Maximize I/O panel'}
              >
                {maximizedColumn === 'io' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              {maximizedColumn !== 'io' && (
                <button
                  type="button"
                  onClick={() => toggleIoFold(true)}
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  title="Fold I/O panel into vertical rail"
                >
                  {isRightEdge ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 p-3 bg-background/70 overflow-y-auto font-mono text-xs">
            {!executionResult && !isRunning && (
              <div className="h-full flex items-center justify-center text-muted-foreground/60 text-xs select-none text-center">
                You must run your code first (Press Run or Ctrl+Enter)
              </div>
            )}

            {isRunning && !executionResult && (
              <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-xs">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Compiling and executing ({runningBy || 'Peer'})...</span>
              </div>
            )}

            {executionResult && (
              <div className="space-y-2 whitespace-pre-wrap break-words">
                {executionResult.stdout && (
                  <pre className="text-foreground leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {executionResult.stdout}
                  </pre>
                )}
                {executionResult.stderr && (
                  <pre className="text-destructive leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {executionResult.stderr}
                  </pre>
                )}
                {!executionResult.stdout && !executionResult.stderr && (
                  <span className="text-muted-foreground italic">
                    Program finished with no output (exit code {executionResult.exitCode ?? 0}).
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* HORIZONTAL DRAG SPLITTER (OUTPUT <-> INPUT) */}
        <div
          onPointerDown={startIoResize}
          onDoubleClick={() => {
            ioSplitRef.current = 58;
            applyLayoutCssVars();
          }}
          title="Drag to resize Output and Input (double-click to reset)"
          className="group h-2 flex items-center justify-center shrink-0 cursor-row-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
        >
          <div className="h-0.5 w-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
        </div>

        {/* BOTTOM CARD: INPUT (STDIN) */}
        <div
          style={{ height: 'var(--io-bot-h, 42%)' }}
          className="min-h-0 min-w-0 rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
        >
          <div className="h-9 px-3 border-b border-border/60 bg-muted/35 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs">
              <FileCode size={13} className="text-sky-500 shrink-0" />
              <span className="font-semibold text-foreground">Input</span>
              <span className="text-muted-foreground font-mono text-[11px]">(stdin)</span>
            </div>
            {stdin && !isEffectiveReadOnly && (
              <button
                type="button"
                onClick={() => handleStdinChange('')}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col">
            <textarea
              value={stdin}
              onChange={(e) => handleStdinChange(e.target.value)}
              disabled={isEffectiveReadOnly}
              placeholder="Enter custom testcase input (stdin) here..."
              className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderColumnById = (colId: ColumnId, idx: number) => {
    if (colId === 'context') return renderContextColumn(idx);
    if (colId === 'editor') return renderEditorColumn();
    return renderIoColumn(idx);
  };

  const visibleColumns = maximizedColumn ? [maximizedColumn] : columnOrder;

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Unmanaged DOM drag shield: shown only during active pointer drag with 0 React re-renders */}
      <div
        ref={dragShieldRef}
        style={{ display: 'none' }}
        className="fixed inset-0 z-50 select-none"
      />

      {/* ================= TOP NAVBAR (48px LeetCode IDE Bar) ================= */}
      <header className="h-12 border-b border-border/60 bg-card/70 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-30 shrink-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Link to="/dashboard" title="Back to Dashboard">
              <ArrowLeft size={15} />
            </Link>
          </Button>

          <div className="h-4 w-[1px] bg-border/60 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Code2 size={14} />
            </div>
            <h1 className="text-xs font-bold text-foreground leading-none truncate max-w-[110px] sm:max-w-[200px]">
              {room.name}
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50 text-xs font-mono shrink-0">
            <span className="text-muted-foreground text-[11px]">{room.id}</span>
            <button
              type="button"
              onClick={copyRoomLink}
              className="hover:text-foreground cursor-pointer text-muted-foreground transition-colors ml-1"
              title="Copy share link"
            >
              {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </div>
        </div>

        {/* Center: Primary Run Button */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
            className="h-7 px-3.5 text-xs font-mono font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs cursor-pointer"
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

        {/* Right: Layout Switcher + Share + Peer Pill + Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLayoutMenuOpen((o) => !o)}
              className="h-7 px-2 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground border-border/60 cursor-pointer"
              title="Customize 3-Column Layout & Order"
            >
              <LayoutGrid size={13} />
              <span className="hidden md:inline">Layout</span>
            </Button>

            {isLayoutMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLayoutMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-border/80 bg-card p-3 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground">Workspace Layout</span>
                    <button
                      type="button"
                      onClick={handleResetLayout}
                      className="text-[11px] font-mono text-primary hover:underline cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Quick Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateColumnOrder(['context', 'editor', 'io']);
                          toggleContextFold(false);
                          toggleIoFold(false);
                          setMaximizedColumn(null);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                      >
                        <div className="font-semibold text-[11px]">3-Column Studio</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Notes | Code | I/O
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateColumnOrder(['context', 'editor', 'io']);
                          toggleContextFold(true);
                          toggleIoFold(false);
                          setMaximizedColumn(null);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                      >
                        <div className="font-semibold text-[11px]">2-Column Focus</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Code | I/O (Left Folded)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateColumnOrder(['editor', 'context', 'io']);
                          toggleContextFold(false);
                          toggleIoFold(false);
                          setMaximizedColumn(null);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                      >
                        <div className="font-semibold text-[11px]">Code First</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Code | Notes | I/O
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          updateColumnOrder(['context', 'io', 'editor']);
                          toggleContextFold(false);
                          toggleIoFold(false);
                          setMaximizedColumn(null);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                      >
                        <div className="font-semibold text-[11px]">Code Right</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Notes | I/O | Code
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-border/50">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
                      Column Order
                    </span>
                    <div className="flex items-center justify-between gap-1 bg-muted/40 p-1.5 rounded-lg border border-border/60 font-mono text-[11px]">
                      {columnOrder.map((colId, idx) => (
                        <div key={colId} className="flex items-center gap-1">
                          <span className="px-2 py-1 rounded bg-card border border-border/60 font-semibold capitalize">
                            {colId === 'io' ? 'I/O' : colId === 'context' ? 'Notes' : 'Code'}
                          </span>
                          {idx < 2 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSwapColumns(columnOrder[idx], columnOrder[idx + 1])
                              }
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Swap adjacent columns"
                            >
                              <ArrowLeftRight size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyRoomLink}
            className="h-7 px-2 sm:px-2.5 text-xs font-mono gap-1 text-muted-foreground hover:text-foreground border-border/60 cursor-pointer"
            title="Copy share link"
          >
            {copiedId ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
            <span className="hidden sm:inline">{copiedId ? 'Copied' : 'Share'}</span>
          </Button>

          <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              } shrink-0`}
            />
            <span>
              {peerCount} <span className="hidden md:inline">{peerCount === 1 ? 'Peer' : 'Peers'}</span>
            </span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* ================= MAIN 3-COLUMN DOCKABLE WORKSPACE ================= */}
      <main className="flex-1 min-h-0 w-full p-1.5 sm:p-2 bg-muted/20 overflow-hidden flex flex-col">
        <div
          ref={workspaceContainerRef}
          className="flex-1 min-h-0 w-full flex flex-row items-stretch overflow-hidden"
        >
          {visibleColumns.map((colId, idx) => {
            const nextColId = visibleColumns[idx + 1];
            const showDragGutter =
              nextColId && !isColFolded(colId) && !isColFolded(nextColId) && !maximizedColumn;

            return (
              <div key={colId} className="contents">
                {renderColumnById(colId, idx)}

                {nextColId &&
                  (showDragGutter ? (
                    <div
                      onPointerDown={(e) => startColumnResize(e, colId, nextColId)}
                      onDoubleClick={() => {
                        colWidthsRef.current = { context: 26, editor: 44, io: 30 };
                        applyLayoutCssVars();
                      }}
                      title="Drag to resize columns (double-click to reset)"
                      className="group w-2 shrink-0 flex items-center justify-center cursor-col-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
                    >
                      <div className="w-0.5 h-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
                    </div>
                  ) : (
                    <div className="w-1.5 shrink-0" />
                  ))}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
