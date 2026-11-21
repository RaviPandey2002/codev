import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  FileCode,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  SplitSquareVertical,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import type { ColumnId } from '@/components/room/room.constants';
import type { ArenaPlatform, ExecutionResult, TestCaseItem } from '@codev/shared';

// ─── Utility & Normalization ────────────────────────────────────────────────

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

// ─── Sub-Components ─────────────────────────────────────────────────────────

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
      className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted/60 cursor-pointer transition-colors"
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

// ─── Props Interface ────────────────────────────────────────────────────────

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
  arenaPlatform?: ArenaPlatform | null;
  testCases?: TestCaseItem[];
  activeCaseIndex?: number;
  caseResults?: Record<number, ExecutionResult>;
  onSelectCase?: (idx: number) => void;
  onAddCase?: () => void;
  onRemoveCase?: (idx: number) => void;
  onRunAllCases?: () => void;
  onRunCode?: () => void;
}

// ─── Main IoColumn Component ────────────────────────────────────────────────

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
  activeCaseIndex = 0,
  caseResults,
  onSelectCase,
  onAddCase,
  onRemoveCase,
  onRunAllCases,
  onRunCode,
}: IoColumnProps) {
  const isRightEdge = colIndex === totalColumns - 1;
  const showFolded = isIoFolded && maximizedColumn !== 'io';
  const isLeetCode = arenaPlatform === 'LEETCODE';
  const isCodeforces = arenaPlatform === 'CODEFORCES' || arenaPlatform === 'STANDARD_IO';
  const hasArenaCases = Boolean(testCases && testCases.length > 0) || Boolean(arenaPlatform);
  const handleTriggerRun = onRunAllCases || onRunCode;

  const defaultLayout = isLeetCode
    ? 'tabbed'
    : isCodeforces
      ? 'split'
      : (testCases && testCases.length > 0 ? 'tabbed' : 'scratchpad');

  const [layoutView, setLayoutView] = useState<'tabbed' | 'split' | 'scratchpad'>(defaultLayout);

  useEffect(() => {
    setLayoutView(defaultLayout);
  }, [defaultLayout]);

  // Tab state: 'testcase' (for input editing) vs 'result' (for execution verdicts & diffs)
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [showStdoutDrawer, setShowStdoutDrawer] = useState(false);

  // Expected output state fallback
  const [localExpectedOutput, setLocalExpectedOutput] = useState('');
  const expectedOutput = propExpectedOutput !== undefined ? propExpectedOutput : localExpectedOutput;
  const handleSetExpectedOutput = onExpectedOutputChange || setLocalExpectedOutput;

  // 3-way vertical split for Codeforces 3-block mode (input, expected, actual)
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

  // Auto-switch to 'result' tab when execution starts or finishes
  useEffect(() => {
    if (isRunning && layoutView === 'tabbed') {
      setActiveTab('result');
    }
  }, [isRunning, layoutView]);

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

  // Active testcase item
  const activeTestCase = useMemo(() => {
    if (!testCases || testCases.length === 0) return null;
    return testCases[activeCaseIndex] || testCases[0];
  }, [testCases, activeCaseIndex]);

  const activeExpected = activeTestCase?.output || expectedOutput || '';

  // Verdict for active case
  const activeVerdict = useMemo<Verdict>(() => {
    if (!activeCaseResult || activeCaseResult.status !== 'SUCCESS') return null;
    return computeVerdict(activeCaseResult.stdout, activeExpected);
  }, [activeCaseResult, activeExpected]);

  const activeActualOutput = useMemo(() => {
    if (!activeCaseResult) return '';
    return [activeCaseResult.stdout, activeCaseResult.stderr].filter(Boolean).join('\n');
  }, [activeCaseResult]);

  // Overall batch statistics
  const batchStats = useMemo(() => {
    if (!testCases || testCases.length === 0) return null;
    let passed = 0;
    let failed = 0;
    let compileError = false;
    let runtimeError = false;

    testCases.forEach((tc, idx) => {
      const res = caseResults?.[idx];
      if (!res) return;
      if (res.status === 'COMPILE_ERROR') {
        compileError = true;
      } else if (res.status !== 'SUCCESS') {
        runtimeError = true;
      } else if (tc.output) {
        const v = computeVerdict(res.stdout, tc.output);
        if (v === 'ACCEPTED') passed++;
        else failed++;
      } else {
        passed++;
      }
    });

    return {
      passed,
      failed,
      total: testCases.length,
      compileError,
      runtimeError,
      allPassed: passed === testCases.length && !compileError && !runtimeError,
    };
  }, [testCases, caseResults]);

  // Folded vertical strip
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
            onClick={() => {
              if (layoutView === 'tabbed') setActiveTab('result');
              onToggleIoFold(false);
            }}
            className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          >
            <CircleCheck size={13} className="text-emerald-500 shrink-0" />
            <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
              {layoutView === 'split' ? 'Test Cases' : 'Test Result'}
            </span>
          </button>

          <div className="w-4 h-[1px] bg-border/50" />

          <button
            type="button"
            onClick={() => {
              if (layoutView === 'tabbed') setActiveTab('testcase');
              onToggleIoFold(false);
            }}
            className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          >
            <Terminal size={13} className="text-sky-500 shrink-0" />
            <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
              {layoutView === 'split' ? 'Input (stdin)' : 'Testcase'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  const layoutToggleBtn = hasArenaCases && (
    <button
      type="button"
      onClick={() => setLayoutView((v) => (v === 'tabbed' ? 'split' : 'tabbed'))}
      className="h-6 px-1.5 rounded flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors"
      title={
        layoutView === 'tabbed'
          ? 'Switch to 3-block split layout (Codeforces mode)'
          : 'Switch to tabbed layout (LeetCode mode)'
      }
    >
      {layoutView === 'tabbed' ? (
        <>
          <SplitSquareVertical size={12} className="text-violet-400" />
          <span className="hidden sm:inline">Split</span>
        </>
      ) : (
        <>
          <Layers size={12} className="text-sky-400" />
          <span className="hidden sm:inline">Tabs</span>
        </>
      )}
    </button>
  );

  // Shared panel controls
  const panelControls = (
    <div className="flex items-center gap-1 shrink-0">
      {layoutToggleBtn}
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
  //  1. LEETCODE ARENA / MULTI-CASE TABBED MODE
  //  Solves spatial constraints by splitting Input vs Result into two full-height tabs
  // ════════════════════════════════════════════════════════════════════════════
  if (layoutView === 'tabbed') {
    return (
      <div
        ref={ioContainerRef}
        style={{ order: flexOrder, flex: '1 1 var(--col-io-w, 32%)' }}
        className={`${isHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 h-full flex-col rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs`}
      >
        {/* ── Top Header Bar with Dual Mode Tabs ── */}
        <div className="h-10 px-3 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2 shrink-0 select-none">
          <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={() => setActiveTab('testcase')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'testcase'
                  ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Terminal size={12} className="text-sky-400 shrink-0" />
              <span>Testcase</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('result')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'result'
                  ? 'bg-card text-foreground font-semibold shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <CircleCheck
                size={12}
                className={
                  batchStats?.allPassed
                    ? 'text-emerald-500 shrink-0'
                    : batchStats?.failed || batchStats?.compileError
                      ? 'text-rose-500 shrink-0'
                      : 'text-muted-foreground shrink-0'
                }
              />
              <span>Test Result</span>
              {batchStats && (
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    batchStats.allPassed
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : batchStats.failed || batchStats.compileError
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {batchStats.passed}/{batchStats.total}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {handleTriggerRun && (
              <button
                type="button"
                onClick={handleTriggerRun}
                disabled={isRunning}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-98 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Run all test cases (Ctrl+Enter)"
              >
                {isRunning ? (
                  <Loader2 size={11} className="animate-spin text-emerald-400" />
                ) : (
                  <Play size={11} className="fill-current text-emerald-400" />
                )}
                <span>Run All</span>
              </button>
            )}

            {panelControls}
          </div>
        </div>

        {/* ── TAB 1: TESTCASE INPUT VIEW ── */}
        {activeTab === 'testcase' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background/50">
            {/* Case selector chips */}
            {testCases && testCases.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/50 bg-muted/20 overflow-x-auto custom-scrollbar shrink-0 select-none">
                {testCases.map((tc, idx) => {
                  const isActive = idx === activeCaseIndex;
                  return (
                    <div
                      key={tc.id || idx}
                      onClick={() => onSelectCase?.(idx)}
                      className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-card border-primary/50 text-foreground font-semibold shadow-xs'
                          : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                      }`}
                    >
                      <span className="truncate max-w-[100px]">{tc.name || `Case ${idx + 1}`}</span>
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-dashed border-border/70 transition-colors cursor-pointer shrink-0"
                    title="Add custom testcase"
                  >
                    <Plus size={11} />
                    <span>Case</span>
                  </button>
                )}
              </div>
            )}

            {/* Input & Expected Output cards — compact natural flow matching LeetCode workspace */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5 space-y-3.5">
              {/* Input Card */}
              <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-muted-foreground select-none">
                  <div className="flex items-center gap-1.5 font-mono">
                    <FileCode size={13} className="text-sky-400 shrink-0" />
                    <span className="font-semibold text-foreground font-sans">Input</span>
                    <span className="text-[10px] text-muted-foreground">(stdin tokens)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/[\[\]=]/.test(stdin) && !isEffectiveReadOnly && (
                      <button
                        type="button"
                        onClick={() => onStdinChange(flattenLeetCodeInput(stdin))}
                        className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded cursor-pointer hover:bg-amber-500/20 transition-colors"
                        title="Strip LeetCode parameter labels and brackets into clean space-separated tokens"
                      >
                        Clean Format
                      </button>
                    )}
                    {stdin && !isEffectiveReadOnly && (
                      <button
                        type="button"
                        onClick={() => onStdinChange('')}
                        className="text-[11px] font-mono text-muted-foreground hover:text-foreground px-1.5 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                    <CopyButton text={stdin} />
                  </div>
                </div>

                <textarea
                  value={stdin}
                  onChange={(e) => onStdinChange(e.target.value)}
                  disabled={isEffectiveReadOnly}
                  placeholder="Enter testcase input tokens here (e.g. [2,7,11,15] 9)..."
                  rows={Math.min(8, Math.max(3, stdin.split('\n').length))}
                  className="w-full min-h-[96px] max-h-[220px] p-2.5 rounded-md border border-border/50 bg-background/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 resize-y focus:outline-none focus:border-primary/60 custom-scrollbar leading-relaxed"
                />
              </div>

              {/* Expected Output Card (positioned immediately below Input) */}
              <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex flex-col gap-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-muted-foreground select-none">
                  <span className="font-semibold font-sans text-foreground flex items-center gap-1.5">
                    <Check size={13} className="text-emerald-400" />
                    Expected Output
                    <span className="text-[10px] text-muted-foreground font-normal font-mono">(optional target)</span>
                  </span>
                  <CopyButton text={expectedOutput} />
                </div>
                <input
                  type="text"
                  value={expectedOutput}
                  onChange={(e) => handleSetExpectedOutput(e.target.value)}
                  disabled={isEffectiveReadOnly}
                  placeholder="Expected return value (e.g. [0,1] or 42)..."
                  className="w-full px-3 py-2 rounded-md border border-border/50 bg-background/80 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TEST RESULT INSPECTOR & VERDICT DIFF VIEW ── */}
        {activeTab === 'result' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background/50">
            {/* 1. Verdict Banner */}
            <div className="px-3.5 py-3 border-b border-border/50 bg-muted/25 flex items-center justify-between gap-3 shrink-0 select-none">
              <div className="flex items-center gap-2 min-w-0">
                {isRunning ? (
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                    <span>Compiling & Running ({runningBy || 'you'})...</span>
                  </div>
                ) : activeCaseResult?.status === 'COMPILE_ERROR' ? (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <AlertCircle size={16} className="text-rose-400 shrink-0" />
                    <span>Compile Error</span>
                  </div>
                ) : activeCaseResult?.status === 'TIME_LIMIT_EXCEEDED' ? (
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <Clock size={16} className="text-amber-400 shrink-0" />
                    <span>Time Limit Exceeded</span>
                  </div>
                ) : activeVerdict === 'ACCEPTED' ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                    <CircleCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>Accepted</span>
                  </div>
                ) : activeVerdict === 'WRONG_ANSWER' ? (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <CircleX size={16} className="text-rose-400 shrink-0" />
                    <span>Wrong Answer</span>
                  </div>
                ) : activeCaseResult ? (
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Terminal size={15} className="text-sky-400 shrink-0" />
                    <span>{activeCaseResult.status}</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-xs">Run code to see test results</div>
                )}
              </div>

              {!isRunning && activeCaseResult && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border/40">
                    <Clock size={11} className="text-primary" />
                    {activeCaseResult.executionTimeMs} ms
                  </span>
                </div>
              )}
            </div>

            {/* 2. Interactive Case Selector Chips (with pass/fail badges) */}
            {testCases && testCases.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/50 bg-muted/15 overflow-x-auto custom-scrollbar shrink-0 select-none">
                {testCases.map((tc, idx) => {
                  const isActive = idx === activeCaseIndex;
                  const res = caseResults?.[idx];
                  const tcVerdict =
                    res && res.status === 'SUCCESS' && tc.output
                      ? computeVerdict(res.stdout, tc.output)
                      : null;

                  return (
                    <button
                      key={tc.id || idx}
                      type="button"
                      onClick={() => onSelectCase?.(idx)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-card border-primary/50 text-foreground font-semibold shadow-xs'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      }`}
                    >
                      {tcVerdict === 'ACCEPTED' && (
                        <Check size={11} className="text-emerald-500 shrink-0" />
                      )}
                      {tcVerdict === 'WRONG_ANSWER' && (
                        <X size={11} className="text-rose-500 shrink-0" />
                      )}
                      {res && res.status !== 'SUCCESS' && (
                        <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                      )}
                      <span>{tc.name || `Case ${idx + 1}`}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Detailed Results Inspector & Diff Body */}
            <div className="flex-1 min-h-0 p-3 overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {/* Compile Error View */}
              {activeCaseResult?.status === 'COMPILE_ERROR' && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-medium text-rose-400 select-none">
                    <span className="flex items-center gap-1">
                      <AlertCircle size={13} />
                      Compiler Error Output
                    </span>
                    <CopyButton text={activeCaseResult.stderr} />
                  </div>
                  <pre className="font-mono text-xs text-rose-300 leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                    {activeCaseResult.stderr}
                  </pre>
                </div>
              )}

              {/* Standard Output / Diff Inspector */}
              {activeCaseResult && activeCaseResult.status !== 'COMPILE_ERROR' && (
                <>
                  {/* Active Case Input Card */}
                  <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col gap-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-muted-foreground select-none">
                      <span className="font-sans font-medium text-foreground flex items-center gap-1">
                        <FileCode size={12} className="text-sky-400" />
                        Input
                      </span>
                      <CopyButton text={stdin} />
                    </div>
                    <pre className="font-mono text-xs text-foreground bg-background/80 p-2 rounded border border-border/40 whitespace-pre-wrap break-words">
                      {stdin || <span className="text-muted-foreground italic">(empty)</span>}
                    </pre>
                  </div>

                  {/* Expected vs Actual Diff Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {/* Actual Output Card */}
                    <div
                      className={`rounded-lg border p-2.5 flex flex-col gap-1.5 shadow-2xs ${
                        activeVerdict === 'ACCEPTED'
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : activeVerdict === 'WRONG_ANSWER'
                            ? 'border-rose-500/30 bg-rose-500/5'
                            : 'border-border/60 bg-card/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs select-none">
                        <span
                          className={`font-sans font-medium flex items-center gap-1 ${
                            activeVerdict === 'ACCEPTED'
                              ? 'text-emerald-400'
                              : activeVerdict === 'WRONG_ANSWER'
                                ? 'text-rose-400'
                                : 'text-foreground'
                          }`}
                        >
                          <Terminal size={12} />
                          Output (Your Code)
                        </span>
                        <CopyButton text={activeCaseResult.stdout} />
                      </div>
                      <pre
                        className={`font-mono text-xs p-2 rounded border whitespace-pre-wrap break-words ${
                          activeVerdict === 'ACCEPTED'
                            ? 'bg-background/90 text-emerald-400 border-emerald-500/20 font-semibold'
                            : activeVerdict === 'WRONG_ANSWER'
                              ? 'bg-background/90 text-rose-400 border-rose-500/20 font-semibold'
                              : 'bg-background/80 text-foreground border-border/40'
                        }`}
                      >
                        {activeCaseResult.stdout || (
                          <span className="text-muted-foreground italic">(no output returned)</span>
                        )}
                      </pre>
                    </div>

                    {/* Expected Output Card */}
                    <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-xs select-none">
                        <span className="font-sans font-medium text-emerald-400 flex items-center gap-1">
                          <Check size={12} />
                          Expected Output
                        </span>
                        <CopyButton text={activeExpected} />
                      </div>
                      <pre className="font-mono text-xs text-emerald-400/90 bg-background/80 p-2 rounded border border-border/40 whitespace-pre-wrap break-words">
                        {activeExpected || (
                          <span className="text-muted-foreground italic">(none specified)</span>
                        )}
                      </pre>
                    </div>
                  </div>

                  {/* Wrong Answer Token Diff Card */}
                  {activeVerdict === 'WRONG_ANSWER' && activeExpected && (
                    <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 select-none">
                        <AlertTriangle size={12} />
                        Mismatch Analysis
                      </span>
                      <div className="text-xs font-mono space-y-1 text-muted-foreground">
                        <div>
                          <span className="text-emerald-400 font-semibold">Expected: </span>
                          <span className="bg-emerald-500/10 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/20">
                            {normalizeOutput(activeExpected)}
                          </span>
                        </div>
                        <div>
                          <span className="text-rose-400 font-semibold">Got: </span>
                          <span className="bg-rose-500/10 text-rose-300 px-1 py-0.5 rounded border border-rose-500/20">
                            {normalizeOutput(activeCaseResult.stdout)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Stdout / Debug Output Drawer */}
                  {activeCaseResult.stderr && (
                    <div className="rounded-lg border border-border/60 bg-card/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowStdoutDrawer((v) => !v)}
                        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer select-none transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Terminal size={12} className="text-amber-400" />
                          Debug Log / Stderr Output
                        </span>
                        {showStdoutDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {showStdoutDrawer && (
                        <div className="p-3 border-t border-border/40 bg-background/80">
                          <pre className="font-mono text-xs text-amber-300/90 whitespace-pre-wrap break-words">
                            {activeCaseResult.stderr}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Empty placeholder */}
              {!activeCaseResult && !isRunning && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground select-none gap-2">
                  <Terminal size={24} className="text-muted-foreground/40" />
                  <p className="text-xs">You have not run any code yet.</p>
                  <p className="text-[11px] text-muted-foreground/60 font-mono">
                    Click "Run" or press Ctrl+Enter to test your solution.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  2. CODEFORCES / STANDARD_IO 3-BLOCK SPLIT MODE
  //  3-block vertical stack: [Input] | [Expected Output] | [Actual Output]
  //  Matches the Codeforces example box dark style with resizable splitters.
  // ════════════════════════════════════════════════════════════════════════════
  if (layoutView === 'split') {
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

            {handleTriggerRun && (
              <button
                type="button"
                onClick={handleTriggerRun}
                disabled={isRunning}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0 ml-auto"
                title="Run test cases (Ctrl+Enter)"
              >
                {isRunning ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Play size={10} className="fill-current" />
                )}
                <span>Run{testCases.length > 1 ? ' All' : ''}</span>
              </button>
            )}

            <div className={handleTriggerRun ? 'shrink-0' : 'ml-auto shrink-0'}>
              {panelControls}
            </div>
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
              {(!testCases || testCases.length === 0) && panelControls}
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
              {activeExpected && !isEffectiveReadOnly && (
                <button
                  type="button"
                  onClick={() => handleSetExpectedOutput('')}
                  className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer px-1.5"
                >
                  Clear
                </button>
              )}
              <CopyButton text={activeExpected} />
            </div>
          </div>
          <div className="flex-1 min-h-0 p-2.5 bg-background/70 flex flex-col overflow-hidden">
            <CodeBlock
              content={activeExpected}
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
                  <VerdictBadge verdict={activeVerdict} />
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
              {activeCaseResult && activeActualOutput && <CopyButton text={activeActualOutput} />}
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
  //  3. CLASSIC SCRATCHPAD MODE (Output top 58%, Stdin bottom 42%)
  //  For clean, blank scratchpad rooms without testcases
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

        <div className="flex-1 min-h-0 p-3 bg-background/70 overflow-y-auto font-mono text-xs custom-scrollbar">
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
            className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed custom-scrollbar"
          />
        </div>
      </div>
    </div>
  );
}
