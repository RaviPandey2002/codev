import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  FileCode,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Play,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import type { ColumnId } from '@/components/room/room.constants';
import type { ArenaPlatform, ExecutionResult, TestCaseItem } from '@codev/shared';

// ─── Utility ────────────────────────────────────────────────────────────────

/** Normalize output for diff: trim trailing whitespace per line + trailing newlines. */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trimEnd();
}

/** Strips parameter labels (e.g. "nums = ", "target = "), quotes, and brackets/commas into clean stream tokens */
export function flattenLeetCodeInput(raw: string): string {
  let cleaned = raw.replace(/[a-zA-Z_]\w*\s*=\s*/g, '');
  cleaned = cleaned.replace(/["']/g, ''); // strip string quotes
  cleaned = cleaned.replace(/[\[\],]/g, ' ').replace(/[ \t]+/g, ' ').trim();
  return cleaned;
}

export type Verdict = 'ACCEPTED' | 'WRONG_ANSWER' | null;

export function computeVerdict(actual: string, expected: string): Verdict {
  if (!expected.trim()) return null; // no expected → no judgment
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) return 'ACCEPTED';

  // Boolean equivalence: true <=> 1, false <=> 0
  const lowerActual = normActual.toLowerCase();
  const lowerExpected = normExpected.toLowerCase();
  if (
    (lowerActual === 'true' && lowerExpected === '1') ||
    (lowerActual === '1' && lowerExpected === 'true') ||
    (lowerActual === 'false' && lowerExpected === '0') ||
    (lowerActual === '0' && lowerExpected === 'false')
  ) {
    return 'ACCEPTED';
  }

  // Floating-point equivalence: e.g. 1024 vs 1024.00000
  const numActual = Number(normActual);
  const numExpected = Number(normExpected);
  if (!isNaN(numActual) && !isNaN(numExpected) && normActual.length > 0 && normExpected.length > 0) {
    if (Math.abs(numActual - numExpected) < 1e-5) {
      return 'ACCEPTED';
    }
  }

  // Flexible array comparison: match [0, 1] with 0 1 or [0,1]
  const strip = (s: string) =>
    s
      .replace(/[\[\],]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  if (strip(normActual) === strip(normExpected)) {
    return 'ACCEPTED';
  }

  return 'WRONG_ANSWER';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

/** A dark-themed scrollable text block identical to the Codeforces example box. */
function CodeBlock({
  content,
  placeholder,
  editable = false,
  onChange,
  disabled = false,
}: {
  content: string;
  placeholder?: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  if (editable) {
    return (
      <textarea
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed custom-scrollbar"
      />
    );
  }
  return (
    <pre className="flex-1 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words overflow-y-auto custom-scrollbar">
      {content || <span className="text-muted-foreground/50 italic">{placeholder}</span>}
    </pre>
  );
}

// ─── Verdict badge ───────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;
  const isAC = verdict === 'ACCEPTED';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
        isAC
          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
          : 'bg-destructive/15 text-destructive border border-destructive/25'
      }`}
    >
      {isAC ? <CircleCheck size={10} /> : <CircleX size={10} />}
      {isAC ? 'Accepted' : 'Wrong Answer'}
    </span>
  );
}

// ─── Main Props ──────────────────────────────────────────────────────────────

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
  expectedOutput?: string;
  onExpectedOutputChange?: (val: string) => void;
  isEffectiveReadOnly: boolean;
  /** CP Arena platform specialization. When null/undefined, renders Standard mode. */
  arenaPlatform?: ArenaPlatform | null;
  /** Multi-case management */
  testCases?: TestCaseItem[];
  activeCaseIndex?: number;
  caseResults?: Record<number, ExecutionResult>;
  onSelectCase?: (idx: number) => void;
  onAddCase?: () => void;
  onRemoveCase?: (idx: number) => void;
  onRunAllCases?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  expectedOutput: propExpectedOutput,
  onExpectedOutputChange,
  isEffectiveReadOnly,
  arenaPlatform,
  testCases,
  activeCaseIndex,
  caseResults,
  onSelectCase,
  onAddCase,
  onRemoveCase,
  onRunAllCases,
}: IoColumnProps) {
  const isRightEdge = colIndex === totalColumns - 1;
  const showFolded = isIoFolded && maximizedColumn !== 'io';
  const isCodeforcesMode = Boolean(arenaPlatform);

  // Expected output — supports collaborative Yjs sync when provided, falls back to local state
  const [localExpectedOutput, setLocalExpectedOutput] = useState('');
  const expectedOutput = propExpectedOutput !== undefined ? propExpectedOutput : localExpectedOutput;
  const handleSetExpectedOutput = onExpectedOutputChange || setLocalExpectedOutput;

  // 3-way vertical split for CP arena mode (input, expected, actual)
  const cfSplitRef = useRef({ input: 34, expected: 33, actual: 33 });
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  const handleStartCfResize = (
    e: React.PointerEvent,
    splitter: 'input-expected' | 'expected-actual'
  ) => {
    e.preventDefault();
    const container = ioContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (rect.height <= 0) return;

    const startY = e.clientY;
    const startInput = cfSplitRef.current.input;
    const startExpected = cfSplitRef.current.expected;
    const startActual = cfSplitRef.current.actual;

    let rafId = 0;
    const onMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaPct = ((ev.clientY - startY) / rect.height) * 100;
        if (splitter === 'input-expected') {
          const combined = startInput + startExpected;
          const nextInput = Math.min(combined - 12, Math.max(12, startInput + deltaPct));
          const nextExpected = combined - nextInput;
          cfSplitRef.current.input = nextInput;
          cfSplitRef.current.expected = nextExpected;
          container.style.setProperty('--cf-input-h', `${nextInput.toFixed(2)}%`);
          container.style.setProperty('--cf-expected-h', `${nextExpected.toFixed(2)}%`);
        } else {
          const combined = startExpected + startActual;
          const nextExpected = Math.min(combined - 12, Math.max(12, startExpected + deltaPct));
          const nextActual = combined - nextExpected;
          cfSplitRef.current.expected = nextExpected;
          cfSplitRef.current.actual = nextActual;
          container.style.setProperty('--cf-expected-h', `${nextExpected.toFixed(2)}%`);
          container.style.setProperty('--cf-actual-h', `${nextActual.toFixed(2)}%`);
        }
      });
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dragCleanupRef.current = null;
    };

    dragCleanupRef.current = onUp;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleResetCfSplit = () => {
    cfSplitRef.current = { input: 34, expected: 33, actual: 33 };
    const container = ioContainerRef.current;
    if (container) {
      container.style.setProperty('--cf-input-h', '34%');
      container.style.setProperty('--cf-expected-h', '33%');
      container.style.setProperty('--cf-actual-h', '33%');
    }
  };

  // Determine active result specifically for currently viewed test case
  const activeCaseResult = useMemo(() => {
    if (caseResults && activeCaseIndex !== undefined && caseResults[activeCaseIndex]) {
      return caseResults[activeCaseIndex];
    }
    if (executionResult) {
      const resCaseIdx = (executionResult as any).caseIndex;
      if (resCaseIdx === undefined || resCaseIdx === activeCaseIndex) {
        return executionResult;
      }
    }
    return null;
  }, [caseResults, activeCaseIndex, executionResult]);

  const actualOutput = useMemo(() => {
    if (!activeCaseResult) return '';
    return [activeCaseResult.stdout, activeCaseResult.stderr].filter(Boolean).join('\n');
  }, [activeCaseResult]);

  const verdict = useMemo<Verdict>(() => {
    if (!isCodeforcesMode || !activeCaseResult) return null;
    if (activeCaseResult.status !== 'SUCCESS') return null;
    return computeVerdict(activeCaseResult.stdout, expectedOutput);
  }, [isCodeforcesMode, activeCaseResult, expectedOutput]);

  // ── Folded rail ──────────────────────────────────────────────────────────
  if (showFolded) {
    return (
      <div
        ref={ioContainerRef}
        style={{ order: flexOrder, flex: '0 0 auto' }}
        className="w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex flex-col items-center py-2 select-none shadow-xs"
      >
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
              {isCodeforcesMode ? 'Test Cases' : 'Test Result'}
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
              {isCodeforcesMode ? 'Input (stdin)' : 'Testcase (stdin)'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ── Shared maximize/fold controls for panel headers ──────────────────────
  const panelControls = (
    <div className="flex items-center gap-1 shrink-0">
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
  );

  // ════════════════════════════════════════════════════════════════════════════
  //  CODEFORCES / STANDARD_IO MODE
  //  3-block vertical stack: [Input] | [Expected Output] | [Actual Output]
  //  Matches the Codeforces example box dark style from the reference image.
  // ════════════════════════════════════════════════════════════════════════════
  if (isCodeforcesMode) {
    return (
      <div
        ref={ioContainerRef}
        style={{ order: flexOrder, flex: '1 1 var(--col-io-w, 32%)' }}
        className={`${isHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 h-full flex-col gap-1.5 overflow-hidden`}
      >
        {/* ── Testcase Tabs Bar (Multi-case management) ── */}
        {testCases && testCases.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 px-0.5 shrink-0 select-none">
            {testCases.map((tc, idx) => {
              const isActive = idx === (activeCaseIndex ?? 0);
              const tcResult = caseResults?.[idx];
              const tcVerdict =
                tcResult && tcResult.status === 'SUCCESS' ? computeVerdict(tcResult.stdout, tc.output) : null;
              return (
                <div
                  key={tc.id || idx}
                  onClick={() => onSelectCase?.(idx)}
                  className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-card border-primary/50 text-foreground font-semibold shadow-xs'
                      : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  {tcVerdict === 'ACCEPTED' && (
                    <Check size={11} className="text-emerald-500 shrink-0" />
                  )}
                  {tcVerdict === 'WRONG_ANSWER' && (
                    <X size={11} className="text-destructive shrink-0" />
                  )}
                  {tcResult && tcResult.status !== 'SUCCESS' && !tcVerdict && (
                    <CircleX size={11} className="text-amber-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[90px]">{tc.name || `Case ${idx + 1}`}</span>
                  {testCases.length > 1 && !isEffectiveReadOnly && onRemoveCase && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCase(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 -mr-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all cursor-pointer"
                      title="Delete testcase"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}

            {!isEffectiveReadOnly && onAddCase && (
              <button
                type="button"
                onClick={onAddCase}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-dashed border-border/70 transition-colors cursor-pointer shrink-0"
                title="Add new testcase"
              >
                <Plus size={11} />
                <span>Case</span>
              </button>
            )}

            {testCases.length > 1 && onRunAllCases && (
              <button
                type="button"
                onClick={onRunAllCases}
                disabled={isRunning}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0 ml-auto"
                title="Run all testcases"
              >
                {isRunning ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Play size={10} className="fill-current" />
                )}
                <span>Run All</span>
              </button>
            )}
          </div>
        )}

        {/* ── INPUT block ───────────────────────────────────────────── */}
        <div
          style={{ flex: '1 1 var(--cf-input-h, 34%)' }}
          className="min-h-0 rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
        >
          <div className="h-9 px-2.5 border-b border-border/60 bg-muted/35 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <FileCode size={13} className="text-sky-500 shrink-0" />
              <span className="font-semibold text-foreground font-sans">input</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/[\[\]=]/.test(stdin) && !isEffectiveReadOnly && (
                <button
                  type="button"
                  onClick={() => onStdinChange(flattenLeetCodeInput(stdin))}
                  className="text-[10px] font-mono text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                  title="Strip parameter labels and brackets into clean space-separated stream input"
                >
                  Clean Format
                </button>
              )}
              {stdin && !isEffectiveReadOnly && (
                <button
                  type="button"
                  onClick={() => onStdinChange('')}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
                >
                  Clear
                </button>
              )}
              <CopyButton text={stdin} />
              {panelControls}
            </div>
          </div>
          <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col overflow-hidden">
            <CodeBlock
              content={stdin}
              editable
              onChange={onStdinChange}
              disabled={isEffectiveReadOnly}
              placeholder="Paste testcase input here…"
            />
          </div>
        </div>

        {/* ── Drag splitter (input ↕ expected) ─────────────────────── */}
        <div
          onPointerDown={(e) => handleStartCfResize(e, 'input-expected')}
          onDoubleClick={handleResetCfSplit}
          title="Drag to resize Input and Expected Output (double-click to reset)"
          className="group h-2 flex items-center justify-center shrink-0 cursor-row-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
        >
          <div className="h-0.5 w-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
        </div>

        {/* ── EXPECTED OUTPUT block ─────────────────────────────────── */}
        <div
          style={{ flex: '1 1 var(--cf-expected-h, 33%)' }}
          className="min-h-0 rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
        >
          <div className="h-9 px-2.5 border-b border-border/60 bg-muted/35 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <Check size={13} className="text-violet-400 shrink-0" />
              <span className="font-semibold text-foreground font-sans">output</span>
              <span className="text-muted-foreground text-[10px]">(expected)</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {expectedOutput && (
                <button
                  type="button"
                  onClick={() => handleSetExpectedOutput('')}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
                >
                  Clear
                </button>
              )}
              <CopyButton text={expectedOutput} />
            </div>
          </div>
          <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col overflow-hidden">
            <CodeBlock
              content={expectedOutput}
              editable
              onChange={handleSetExpectedOutput}
              disabled={isEffectiveReadOnly}
              placeholder="Paste expected output here to compare…"
            />
          </div>
        </div>

        {/* ── Drag splitter (expected ↕ actual) ─────────────────────── */}
        <div
          onPointerDown={(e) => handleStartCfResize(e, 'expected-actual')}
          onDoubleClick={handleResetCfSplit}
          title="Drag to resize Expected and Actual Output (double-click to reset)"
          className="group h-2 flex items-center justify-center shrink-0 cursor-row-resize select-none hover:bg-primary/20 active:bg-primary/40 transition-colors"
        >
          <div className="h-0.5 w-8 rounded-full bg-border/80 group-hover:bg-primary transition-colors" />
        </div>

        {/* ── ACTUAL OUTPUT block ───────────────────────────────────── */}
        <div
          style={{ flex: '1 1 var(--cf-actual-h, 33%)' }}
          className="min-h-0 rounded-xl border border-border/70 bg-card flex flex-col overflow-hidden shadow-xs"
        >
          <div className="h-9 px-2.5 border-b border-border/60 bg-muted/35 flex items-center justify-between gap-2 shrink-0 select-none">
            <div className="flex items-center gap-1.5 text-xs font-mono min-w-0">
              <Terminal size={13} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground font-sans">output</span>
              <span className="text-muted-foreground text-[10px]">(actual)</span>

              {isRunning && (
                <span className="flex items-center gap-1 text-[11px] text-amber-500 truncate ml-1">
                  <Loader2 size={11} className="animate-spin shrink-0" />
                  <span className="truncate">Running…</span>
                </span>
              )}

              {!isRunning && activeCaseResult && (
                <div className="flex items-center gap-1.5 text-[11px] ml-1 flex-wrap">
                  <VerdictBadge verdict={verdict} />
                  {activeCaseResult.status !== 'SUCCESS' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/25 flex items-center gap-1">
                      <XCircle size={10} />
                      {activeCaseResult.status}
                    </span>
                  )}
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <Clock size={10} />
                    {activeCaseResult.executionTimeMs} ms
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {activeCaseResult && actualOutput && <CopyButton text={actualOutput} />}
              {activeCaseResult && (
                <button
                  type="button"
                  onClick={onClearOutput}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col overflow-y-auto custom-scrollbar">
            {!activeCaseResult && !isRunning && (
              <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs select-none text-center">
                Run your code to see output here
                <br />
                <span className="text-[10px] font-mono opacity-60">(Ctrl+Enter)</span>
              </div>
            )}
            {isRunning && !activeCaseResult && (
              <div className="h-full flex items-center justify-center text-muted-foreground gap-2 text-xs">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Compiling and running ({runningBy || 'you'})…</span>
              </div>
            )}
            {activeCaseResult && (
              <div className="space-y-1">
                {activeCaseResult.stdout && (
                  <pre className="font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {activeCaseResult.stdout}
                  </pre>
                )}
                {activeCaseResult.stderr && (
                  <pre className="font-mono text-xs text-destructive leading-relaxed whitespace-pre-wrap break-words">
                    {activeCaseResult.stderr}
                  </pre>
                )}
                {!activeCaseResult.stdout && !activeCaseResult.stderr && (
                  <span className="text-muted-foreground italic text-xs">
                    Program finished with no output (exit {activeCaseResult.exitCode ?? 0}).
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  STANDARD MODE — original 2-block layout: Output (top) + Input (bottom)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div
      ref={ioContainerRef}
      style={{ order: flexOrder, flex: '1 1 var(--col-io-w, 30%)' }}
      className={`${isHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 h-full flex-col overflow-hidden`}
    >
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
            {executionResult && (executionResult.stdout || executionResult.stderr) && (
              <CopyButton
                text={[executionResult.stdout, executionResult.stderr].filter(Boolean).join('\n')}
              />
            )}
            {executionResult && (
              <button
                type="button"
                onClick={onClearOutput}
                className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
              >
                Clear
              </button>
            )}
            {panelControls}
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
          <div className="flex items-center gap-1.5 shrink-0">
            {/[\[\]=]/.test(stdin) && !isEffectiveReadOnly && (
              <button
                type="button"
                onClick={() => onStdinChange(flattenLeetCodeInput(stdin))}
                className="text-[10px] font-mono text-amber-500 hover:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="Strip parameter labels and brackets into clean space-separated stream input"
              >
                Clean Format
              </button>
            )}
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
    </div>
  );
}
