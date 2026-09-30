import { ChevronLeft, ChevronRight, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { type ColumnId, DEFAULT_PROBLEM_NOTES } from '@/components/room/room.constants';

interface ContextColumnProps {
  colIndex: number;
  flexOrder: number;
  isHidden: boolean;
  isContextFolded: boolean;
  maximizedColumn: ColumnId | null;
  onToggleContextFold: (force?: boolean) => void;
  onToggleMaximize: () => void;
  isEffectiveReadOnly: boolean;
  problemNotes: string;
  onProblemNotesChange: (val: string) => void;
}

export function ContextColumn({
  colIndex,
  flexOrder,
  isHidden,
  isContextFolded,
  maximizedColumn,
  onToggleContextFold,
  onToggleMaximize,
  isEffectiveReadOnly,
  problemNotes,
  onProblemNotesChange,
}: ContextColumnProps) {
  const isLeftEdge = colIndex === 0;
  const showFolded = isContextFolded && maximizedColumn !== 'context';

  return (
    <div
      style={{
        order: flexOrder,
        flex: showFolded ? '0 0 auto' : '1 1 var(--col-context-w, 26%)',
      }}
      className={`${isHidden ? 'hidden' : 'flex'} ${
        showFolded
          ? 'w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex-col items-center py-2 select-none shadow-xs'
          : 'min-h-0 min-w-0 h-full rounded-xl border border-border/70 bg-card flex-col overflow-hidden shadow-xs'
      }`}
    >
      {showFolded ? (
        <>
          <button
            type="button"
            onClick={() => onToggleContextFold(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer mb-1"
            title="Expand Notes Panel"
          >
            {isLeftEdge ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="w-5 h-[1px] bg-border/60 my-1" />

          <button
            type="button"
            onClick={() => onToggleContextFold(false)}
            className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            title="Open Description / Notes"
          >
            <FileText size={13} className="text-sky-500 shrink-0" />
            <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
              Description
            </span>
          </button>
        </>
      ) : (
        <>
          <div className="h-9 border-b border-border/60 bg-muted/35 px-2.5 flex items-center justify-between gap-1 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <FileText size={13} className="text-sky-500 shrink-0" />
              <span>Description / Notes</span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onToggleMaximize}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                title={maximizedColumn === 'context' ? 'Restore panel size' : 'Maximize panel'}
              >
                {maximizedColumn === 'context' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              {maximizedColumn !== 'context' && (
                <button
                  type="button"
                  onClick={() => onToggleContextFold(true)}
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
                  onClick={() => onProblemNotesChange(DEFAULT_PROBLEM_NOTES)}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <textarea
              value={problemNotes}
              onChange={(e) => onProblemNotesChange(e.target.value)}
              disabled={isEffectiveReadOnly}
              placeholder="Paste problem description, examples, or shared algorithm notes here..."
              className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed"
            />
          </div>
        </>
      )}
    </div>
  );
}
