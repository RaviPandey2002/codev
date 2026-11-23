import { AlertCircle, ArrowLeft, CheckCircle2, Code2, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getRoomDetailsApi } from '@/api/rooms';
import { getLatestCompanionProblemApi } from '@/api/problems';
import { ContextColumn } from '@/components/room/ContextColumn';
import { EditorColumn } from '@/components/room/EditorColumn';
import { IoColumn } from '@/components/room/IoColumn';
import { RoomNavbar } from '@/components/room/RoomNavbar';
import { ShareModal } from '@/components/room/ShareModal';
import { type ColumnId, inferInitialLanguage } from '@/components/room/room.constants';
import { Button } from '@/components/ui/button';
import { useRoomWorkspace } from '@/hooks/useRoomWorkspace';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import { getApiErrorMessage } from '@/lib/api';
import { decodeProblemData } from '@/lib/problemImporter';
import { useAuthStore } from '@/stores/auth.store';
import type { ArenaPlatform, RoomDTO, RoomRole } from '@codev/shared';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [userRole, setUserRole] = useState<RoomRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState<{ title: string; count: number } | null>(null);

  // Personal safety lock: lets any editor switch to read-only viewing mode
  const [isSelfViewOnly, setIsSelfViewOnly] = useState(false);
  const isEffectiveReadOnly = userRole === 'VIEWER' || isSelfViewOnly;

  // 1. 3-Column Foldable & Reorderable Layout Hook
  const {
    columnOrder,
    isContextFolded,
    isIoFolded,
    maximizedColumn,
    setMaximizedColumn,
    isLayoutMenuOpen,
    setIsLayoutMenuOpen,
    setWorkspaceContainerRef,
    workspaceStyle,
    ioContainerRef,
    dragShieldRef,
    isColFolded,
    startColumnResize,
    startIoResize,
    toggleContextFold,
    toggleIoFold,
    updateColumnOrder,
    handleSwapColumns,
    resetColumnWidths,
    resetIoSplit,
    handleResetLayout,
  } = useWorkspaceLayout();

  // 2. Collaborative Yjs State, Templates & Execution Hook
  const {
    language,
    setLanguage,
    stdin,
    expectedOutput,
    testCases,
    activeCaseIndex,
    caseResults,
    problemNotes,
    problemData,
    problemQueue,
    activeProblemIndex,
    handleSelectQueueProblem,
    handleAddToQueue,
    handleRemoveFromQueue,
    handleUpdateProblemStatus,
    isRunning,
    runningBy,
    executionResult,
    isSynced,
    customTemplates,
    savedTemplateFlash,
    handleDocReady,
    handleSyncChange,
    handleLanguageChange,
    handleResetToTemplate,
    handleSaveCustomTemplate,
    handleClearCustomTemplate,
    handleStdinChange,
    handleExpectedOutputChange,
    handleSelectCase,
    handleAddCase,
    handleRemoveCase,
    handleLoadAllCases,
    handleProblemNotesChange,
    handleProblemDataChange,
    handleClearOutput,
    handleFormatCode,
    handleRunCode,
    handleRunAllCases,
  } = useRoomWorkspace({
    username: user?.username,
    isEffectiveReadOnly,
    isIoFolded,
    toggleIoFold,
    arenaPlatform: room?.sourceType === 'COMPILER' ? (room?.arenaPlatform || 'CODEFORCES') : null,
  });

  const activeProblem = problemQueue[activeProblemIndex] || problemData;
  const effectivePlatform: ArenaPlatform | null =
    (activeProblem?.platform as ArenaPlatform | undefined) ||
    (room?.sourceType === 'COMPILER' ? (room?.arenaPlatform || 'CODEFORCES') : null);

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
  }, [roomId, setLanguage]);

  // Listen for externally imported problems (Bookmarklet, extension, or deep link)
  useEffect(() => {
    // Set tab name so bookmarklet window.open targets this existing workspace tab directly
    window.name = 'codev_workspace';

    const processHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#addProblem=')) {
        const encoded = hash.replace('#addProblem=', '');
        const problem = decodeProblemData(encoded);
        if (problem) {
          handleAddToQueue(problem, true);
          setImportNotification({
            title: problem.title,
            count: problem.sampleCases?.length || 0,
          });
          setTimeout(() => setImportNotification(null), 4500);
        }
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    processHash();
    window.addEventListener('hashchange', processHash);

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CODEV_ADD_PROBLEM' && e.data.problem) {
        handleAddToQueue(e.data.problem, true);
        setImportNotification({
          title: e.data.problem.title,
          count: e.data.problem.sampleCases?.length || 0,
        });
        setTimeout(() => setImportNotification(null), 4500);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('hashchange', processHash);
      window.removeEventListener('message', handleMessage);
    };
  }, [handleAddToQueue]);

  // Listen for Competitive Companion problems from server (:10043)
  useEffect(() => {
    let lastChecked = Date.now();
    const interval = setInterval(async () => {
      try {
        const latest = await getLatestCompanionProblemApi(lastChecked);
        if (latest && latest.problem) {
          lastChecked = latest.timestamp;
          handleAddToQueue(latest.problem, true);
          setImportNotification({
            title: `[Companion] ${latest.problem.title}`,
            count: latest.problem.sampleCases?.length || 0,
          });
          setTimeout(() => setImportNotification(null), 4500);
        }
      } catch {
        // Silently ignore if unauthenticated or network hiccup
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [handleAddToQueue]);

  const copyRoomLink = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1500);
  };

  const handleLoadSampleCase = (sampleIn: string, sampleOut: string) => {
    handleStdinChange(sampleIn);
    handleExpectedOutputChange(sampleOut);
  };

  if (isLoading) {
    return (
      <div className="h-screen h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground space-y-4 p-4 animate-in fade-in-0 duration-200">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Code2 size={22} />
          </div>
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background border-2 border-background flex items-center justify-center">
            <Loader2 size={10} className="animate-spin text-primary" />
          </span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold">Connecting to Workspace…</p>
          <p className="text-xs text-muted-foreground font-mono">#{roomId}</p>
        </div>
        {/* Layout skeleton hint */}
        <div className="absolute inset-x-0 bottom-0 h-[calc(100vh-160px)] flex gap-0.5 p-0.5 opacity-[0.04] pointer-events-none">
          <div className="w-1/4 bg-foreground rounded-tl-xl" />
          <div className="flex-1 bg-foreground" />
          <div className="w-1/4 bg-foreground rounded-tr-xl" />
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

  const hasCustomTemplateForLang = Boolean(customTemplates[language]?.trim());

  const contextIndex = Math.max(0, columnOrder.indexOf('context'));
  const editorIndex = Math.max(0, columnOrder.indexOf('editor'));
  const ioIndex = Math.max(0, columnOrder.indexOf('io'));

  const renderGutterBetween = (slotIdx: 0 | 1) => {
    if (maximizedColumn) return null;
    const leftCol: ColumnId = columnOrder[slotIdx];
    const rightCol: ColumnId = columnOrder[slotIdx + 1];
    if (!leftCol || !rightCol) return null;

    const canDrag = !isColFolded(leftCol) && !isColFolded(rightCol);
    const flexOrder = slotIdx * 2 + 1;

    if (!canDrag) {
      return <div style={{ order: flexOrder }} className="w-1.5 shrink-0" />;
    }

    return (
      <div
        style={{ order: flexOrder }}
        onPointerDown={(e) => startColumnResize(e, leftCol, rightCol)}
        onDoubleClick={resetColumnWidths}
        title="Drag to resize columns (double-click to reset)"
        className="group w-2.5 -mx-0.5 shrink-0 flex items-center justify-center cursor-col-resize select-none relative z-10 hover:bg-primary/20 active:bg-primary/40 transition-colors"
      >
        <div className="w-0.5 h-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
      </div>
    );
  };

  return (
    <div className="h-screen h-[100dvh] max-h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
      {/* Unmanaged DOM drag shield: shown only during active pointer drag with 0 React re-renders */}
      <div
        ref={dragShieldRef}
        style={{ display: 'none' }}
        className="fixed inset-0 z-50 select-none"
      />

      <RoomNavbar
        room={room}
        copiedId={copiedId}
        onCopyRoomLink={copyRoomLink}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        isRunning={isRunning}
        onRunCode={handleRunCode}
        isLayoutMenuOpen={isLayoutMenuOpen}
        setIsLayoutMenuOpen={setIsLayoutMenuOpen}
        columnOrder={columnOrder}
        onUpdateColumnOrder={updateColumnOrder}
        onToggleContextFold={toggleContextFold}
        onToggleIoFold={toggleIoFold}
        onSetMaximizedColumn={setMaximizedColumn}
        onSwapColumns={handleSwapColumns}
        onResetLayout={handleResetLayout}
        isSynced={isSynced}
        peerCount={peerCount}
        queue={problemQueue}
        activeProblemIndex={activeProblemIndex}
        onSelectProblem={handleSelectQueueProblem}
      />

      {room && (
        <ShareModal
          room={room}
          userRole={userRole}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* ================= MAIN 3-COLUMN DOCKABLE WORKSPACE ================= */}
      <main className="flex-1 min-h-0 w-full p-1.5 sm:p-2 bg-muted/20 overflow-hidden flex flex-col">
        <div
          ref={setWorkspaceContainerRef}
          style={workspaceStyle}
          className="flex-1 min-h-0 w-full flex flex-row items-stretch overflow-hidden"
        >
          {/* Fixed DOM order for all 3 columns: visual ordering is driven purely by CSS flex `order` */}
          <ContextColumn
            colIndex={contextIndex}
            flexOrder={contextIndex * 2}
            isHidden={maximizedColumn !== null && maximizedColumn !== 'context'}
            isContextFolded={isContextFolded}
            maximizedColumn={maximizedColumn}
            onToggleContextFold={toggleContextFold}
            onToggleMaximize={() =>
              setMaximizedColumn((m) => (m === 'context' ? null : 'context'))
            }
            isEffectiveReadOnly={isEffectiveReadOnly}
            problemNotes={problemNotes}
            onProblemNotesChange={handleProblemNotesChange}
            arenaPlatform={effectivePlatform}
            problemData={problemData}
            onProblemDataChange={(data) => {
              handleProblemDataChange(data);
              if (data) handleAddToQueue(data);
            }}
            onLoadSampleCase={handleLoadSampleCase}
            onLoadAllCases={handleLoadAllCases}
            queue={problemQueue}
            activeProblemIndex={activeProblemIndex}
            onSelectProblem={handleSelectQueueProblem}
            onAddProblem={handleAddToQueue}
            onRemoveProblem={handleRemoveFromQueue}
            onUpdateStatus={handleUpdateProblemStatus}
            roomId={roomId || room.id}
          />

          <EditorColumn
            flexOrder={editorIndex * 2}
            isHidden={maximizedColumn !== null && maximizedColumn !== 'editor'}
            roomId={room.id}
            language={language}
            userRole={userRole}
            isSelfViewOnly={isSelfViewOnly}
            onToggleSelfViewOnly={() => setIsSelfViewOnly((v) => !v)}
            isEffectiveReadOnly={isEffectiveReadOnly}
            maximizedColumn={maximizedColumn}
            onToggleMaximize={() =>
              setMaximizedColumn((m) => (m === 'editor' ? null : 'editor'))
            }
            hasCustomTemplateForLang={hasCustomTemplateForLang}
            savedTemplateFlash={savedTemplateFlash}
            onLanguageChange={handleLanguageChange}
            onFormatCode={handleFormatCode}
            onSaveCustomTemplate={handleSaveCustomTemplate}
            onResetToTemplate={handleResetToTemplate}
            onClearCustomTemplate={handleClearCustomTemplate}
            isSynced={isSynced}
            onPeerCountChange={setPeerCount}
            onSyncChange={handleSyncChange}
            onDocReady={handleDocReady}
            onRunCode={handleRunCode}
          />

          <IoColumn
            colIndex={ioIndex}
            totalColumns={columnOrder.length}
            flexOrder={ioIndex * 2}
            isHidden={maximizedColumn !== null && maximizedColumn !== 'io'}
            isIoFolded={isIoFolded}
            maximizedColumn={maximizedColumn}
            ioContainerRef={ioContainerRef}
            onToggleIoFold={toggleIoFold}
            onToggleMaximize={() => setMaximizedColumn((m) => (m === 'io' ? null : 'io'))}
            onStartIoResize={startIoResize}
            onResetIoSplit={resetIoSplit}
            isRunning={isRunning}
            runningBy={runningBy}
            executionResult={executionResult}
            onClearOutput={handleClearOutput}
            stdin={stdin}
            onStdinChange={handleStdinChange}
            expectedOutput={expectedOutput}
            onExpectedOutputChange={handleExpectedOutputChange}
            isEffectiveReadOnly={isEffectiveReadOnly}
            arenaPlatform={effectivePlatform}
            testCases={testCases}
            activeCaseIndex={activeCaseIndex}
            caseResults={caseResults}
            onSelectCase={handleSelectCase}
            onAddCase={handleAddCase}
            onRemoveCase={handleRemoveCase}
            onRunAllCases={handleRunAllCases}
            onRunCode={handleRunCode}
          />

          {renderGutterBetween(0)}
          {renderGutterBetween(1)}
        </div>
      </main>

      {/* External Problem Ingestion Toast */}
      {importNotification && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-card/95 text-foreground backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <div className="space-y-0.5 min-w-0 pr-1">
            <p className="text-xs font-semibold text-foreground truncate max-w-[280px]">
              {importNotification.title}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Added to Session Playlist • {importNotification.count} testcases loaded
            </p>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer ml-1"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
