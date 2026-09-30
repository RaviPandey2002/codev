import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Code2,
  Copy,
  LayoutGrid,
  Loader2,
  Play,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { ColumnId } from '@/components/room/room.constants';
import { Button } from '@/components/ui/button';
import type { RoomDTO } from '@codev/shared';

interface RoomNavbarProps {
  room: RoomDTO;
  copiedId: boolean;
  onCopyRoomLink: () => void;
  isRunning: boolean;
  onRunCode: () => void;
  isLayoutMenuOpen: boolean;
  setIsLayoutMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  columnOrder: ColumnId[];
  onUpdateColumnOrder: (order: ColumnId[]) => void;
  onToggleContextFold: (force?: boolean) => void;
  onToggleIoFold: (force?: boolean) => void;
  onSetMaximizedColumn: (col: ColumnId | null) => void;
  onSwapColumns: (idxA: number, idxB: number) => void;
  onResetLayout: () => void;
  isSynced: boolean;
  peerCount: number;
}

export function RoomNavbar({
  room,
  copiedId,
  onCopyRoomLink,
  isRunning,
  onRunCode,
  isLayoutMenuOpen,
  setIsLayoutMenuOpen,
  columnOrder,
  onUpdateColumnOrder,
  onToggleContextFold,
  onToggleIoFold,
  onSetMaximizedColumn,
  onSwapColumns,
  onResetLayout,
  isSynced,
  peerCount,
}: RoomNavbarProps) {
  const applyPreset = (
    order: ColumnId[],
    foldContext: boolean,
    foldIo: boolean
  ) => {
    onUpdateColumnOrder(order);
    onToggleContextFold(foldContext);
    onToggleIoFold(foldIo);
    onSetMaximizedColumn(null);
    setIsLayoutMenuOpen(false);
  };

  return (
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
            onClick={onCopyRoomLink}
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
          onClick={onRunCode}
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
                    onClick={onResetLayout}
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
                      onClick={() => applyPreset(['context', 'editor', 'io'], false, false)}
                      className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                    >
                      <div className="font-semibold text-[11px]">3-Column Studio</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Notes | Code | I/O
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset(['context', 'editor', 'io'], true, false)}
                      className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                    >
                      <div className="font-semibold text-[11px]">2-Column Focus</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Code | I/O (Left Folded)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset(['editor', 'context', 'io'], false, false)}
                      className="p-2 rounded-lg border border-border/60 hover:border-primary/50 bg-background/60 text-left space-y-0.5 cursor-pointer"
                    >
                      <div className="font-semibold text-[11px]">Code First</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Code | Notes | I/O
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset(['context', 'io', 'editor'], false, false)}
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
                      <div key={idx} className="flex items-center gap-1">
                        <span className="px-2 py-1 rounded bg-card border border-border/60 font-semibold capitalize">
                          {colId === 'io' ? 'I/O' : colId === 'context' ? 'Notes' : 'Code'}
                        </span>
                        {idx < 2 && (
                          <button
                            type="button"
                            onClick={() => onSwapColumns(idx, idx + 1)}
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
          onClick={onCopyRoomLink}
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
  );
}
