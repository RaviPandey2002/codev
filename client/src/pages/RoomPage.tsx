import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { getRoomDetailsApi } from '@/api/rooms';
import { ContextColumn } from '@/components/room/ContextColumn';
import { EditorColumn } from '@/components/room/EditorColumn';
import { IoColumn } from '@/components/room/IoColumn';
import { RoomNavbar } from '@/components/room/RoomNavbar';
import { type ColumnId, inferInitialLanguage } from '@/components/room/room.constants';
import { Button } from '@/components/ui/button';
import { useRoomWorkspace } from '@/hooks/useRoomWorkspace';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { RoomDTO, RoomRole } from '@codev/shared';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const user = useAuthStore((s) => s.user);

  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [userRole, setUserRole] = useState<RoomRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [peerCount, setPeerCount] = useState(1);

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
    problemNotes,
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
    handleProblemNotesChange,
    handleClearOutput,
    handleFormatCode,
    handleRunCode,
  } = useRoomWorkspace({
    username: user?.username,
    isEffectiveReadOnly,
    isIoFolded,
    toggleIoFold,
  });

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
        className="group w-2 shrink-0 flex items-center justify-center cursor-col-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
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
      />

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
            isEffectiveReadOnly={isEffectiveReadOnly}
          />

          {renderGutterBetween(0)}
          {renderGutterBetween(1)}
        </div>
      </main>
    </div>
  );
}
