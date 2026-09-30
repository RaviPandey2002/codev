import {
  ChevronLeft,
  ChevronRight,
  FileCode,
  Loader2,
  Maximize2,
  Minimize2,
  Terminal,
} from 'lucide-react';
import type { ColumnId } from '@/components/room/room.constants';
import type { ExecutionResult } from '@codev/shared';

interface IoColumnProps {
  colIndex: number;
  totalColumns: number;
  flexOrder: number;
  isHidden: boolean;
  isIoFolded: boolean;
  maximizedColumn: ColumnId | null;
  ioContainerRef: React.RefObject<HTMLDivElement | null>;
  onToggleIoFold: (force?: boolean) => void;
  onToggleMaximize: () => void;
  onStartIoResize: (e: React.PointerEvent) => void;
  onResetIoSplit: () => void;
  isRunning: boolean;
  runningBy: string | null;
  executionResult: ExecutionResult | null;
  onClearOutput: () => void;
  stdin: string;
  onStdinChange: (val: string) => void;
  isEffectiveReadOnly: boolean;
}

export function IoColumn({
  colIndex,
  totalColumns,
  flexOrder,
  isHidden,
  isIoFolded,
  maximizedColumn,
  ioContainerRef,
  onToggleIoFold,
  onToggleMaximize,
  onStartIoResize,
  onResetIoSplit,
  isRunning,
  runningBy,
  executionResult,
  onClearOutput,
  stdin,
  onStdinChange,
  isEffectiveReadOnly,
}: IoColumnProps) {
  const isRightEdge = colIndex === totalColumns - 1;
  const showFolded = isIoFolded && maximizedColumn !== 'io';

  return (
    <div
      ref={ioContainerRef}
      style={{
        order: flexOrder,
        flex: showFolded ? '0 0 auto' : '1 1 var(--col-io-w, 30%)',
      }}
      className={`${isHidden ? 'hidden' : 'flex'} ${
        showFolded
          ? 'w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex-col items-center py-2 select-none shadow-xs'
          : 'min-h-0 min-w-0 h-full flex-col overflow-hidden'
      }`}
    >
      {showFolded ? (
        <>
          <button
            type="button"
            onClick={() => onToggleIoFold(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer mb-1"
            title="Expand Output / Input Panel"
          >
            {isRightEdge ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <div className="w-5 h-[1px] bg-border/60 my-1" />

          <div className="flex-1 flex flex-col items-center gap-2 py-1">
            <button
              type="button"
              onClick={() => onToggleIoFold(false)}
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
              onClick={() => onToggleIoFold(false)}
              className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            >
              <FileCode size={13} className="text-sky-500 shrink-0" />
              <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
                Testcase (stdin)
              </span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* TOP CARD: OUTPUT */}
          <div
            style={{ flex: '1 1 var(--io-top-h, 58%)' }}
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
                    onClick={onClearOutput}
                    className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onToggleMaximize}
                  className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                  title={maximizedColumn === 'io' ? 'Restore panel size' : 'Maximize I/O panel'}
                >
                  {maximizedColumn === 'io' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                {maximizedColumn !== 'io' && (
                  <button
                    type="button"
                    onClick={() => onToggleIoFold(true)}
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
            onPointerDown={onStartIoResize}
            onDoubleClick={onResetIoSplit}
            title="Drag to resize Output and Input (double-click to reset)"
            className="group h-2 flex items-center justify-center shrink-0 cursor-row-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
          >
            <div className="h-0.5 w-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
          </div>

          {/* BOTTOM CARD: INPUT (STDIN) */}
          <div
            style={{ flex: '1 1 var(--io-bot-h, 42%)' }}
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
                  onClick={() => onStdinChange('')}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col">
              <textarea
                value={stdin}
                onChange={(e) => onStdinChange(e.target.value)}
                disabled={isEffectiveReadOnly}
                placeholder="Enter custom testcase input (stdin) here..."
                className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
