import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  Cpu,
  ExternalLink,
  FileText,
  Layers,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { importProblemApi } from '@/api/problems';
import { type ColumnId, DEFAULT_PROBLEM_NOTES } from '@/components/room/room.constants';
import { CURATED_WISHLISTS, type CuratedWishlist } from '@/components/room/wishlists.constants';
import { getApiErrorMessage } from '@/lib/api';
import type { ArenaPlatform, ProblemData, QueueProblemItem, QueueProblemStatus } from '@codev/shared';

// ─── Utility ────────────────────────────────────────────────────────────────

export function cleanProblemHtml(html: string): string {
  if (!html) return '';
  return html
    // Remove empty spacer paragraphs like <p>&nbsp;</p>, <p><br></p>, etc.
    .replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, '')
    // Replace non-breaking spaces with standard space
    .replace(/&nbsp;/g, ' ')
    // Collapse multiple consecutive br tags into at most one
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br />')
    // Normalize font face tags
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .trim();
}

export function parseCodeforcesExample(text: string): { input: string; output: string } | null {
  const inputIdx = text.search(/\binput\b/i);
  const outputIdx = text.search(/\boutput\b/i);
  if (inputIdx !== -1 && outputIdx !== -1 && outputIdx > inputIdx) {
    let rawInput = text.substring(inputIdx + 5, outputIdx).trim();
    let rawOutput = text.substring(outputIdx + 6).trim();
    // Strip "Copy" button artifacts copied from Codeforces webpage headers
    rawInput = rawInput.replace(/^Copy\s*/i, '').trim();
    rawOutput = rawOutput.replace(/^Copy\s*/i, '').trim();
    return { input: rawInput, output: rawOutput };
  }
  return null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

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
  arenaPlatform?: ArenaPlatform | null;
  problemData?: ProblemData | null;
  onProblemDataChange?: (data: ProblemData | null) => void;
  onLoadSampleCase?: (input: string, output: string) => void;
  onLoadAllCases?: (cases: Array<{ input: string; output?: string }>) => void;
  queue?: QueueProblemItem[];
  activeProblemIndex?: number;
  onSelectProblem?: (index: number) => void;
  onAddProblem?: (problem: ProblemData, autoSelect?: boolean) => void;
  onRemoveProblem?: (id: string) => void;
  onUpdateStatus?: (id: string, status: QueueProblemStatus) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  arenaPlatform,
  problemData,
  onProblemDataChange,
  onLoadSampleCase,
  onLoadAllCases,
  queue = [],
  activeProblemIndex = 0,
  onSelectProblem,
  onAddProblem,
  onRemoveProblem,
  onUpdateStatus,
}: ContextColumnProps) {
  const isLeftEdge = colIndex === 0;
  const showFolded = isContextFolded && maximizedColumn !== 'context';
  const isCpMode = Boolean(arenaPlatform);

  // Active view tab: 'PROBLEM' | 'SESSION' | 'NOTES'
  const [activeTab, setActiveTab] = useState<'PROBLEM' | 'SESSION' | 'NOTES'>(isCpMode ? 'PROBLEM' : 'NOTES');

  // Session timer state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [sessionUrlInput, setSessionUrlInput] = useState('');
  const [isSessionImporting, setIsSessionImporting] = useState(false);
  const [sessionImportError, setSessionImportError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSessionSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatSessionTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSessionImportAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sessionUrlInput.trim();
    if (!trimmed) return;

    try {
      setIsSessionImporting(true);
      setSessionImportError(null);
      const isLeetCode = trimmed.includes('leetcode.com');
      const data = await importProblemApi({
        urlOrId: trimmed,
        platform: isLeetCode ? 'LEETCODE' : (arenaPlatform || 'CODEFORCES'),
      });
      onAddProblem?.(data);
      setSessionUrlInput('');
    } catch (err) {
      setSessionImportError(getApiErrorMessage(err, 'Failed to import problem'));
    } finally {
      setIsSessionImporting(false);
    }
  };

  const handlePullWishlist = (wishlist: CuratedWishlist) => {
    const queueBefore = queue.length;
    wishlist.problems.forEach((p, idx) => {
      onAddProblem?.(
        {
          title: p.title,
          platform: p.platform,
          url: p.urlOrId,
          difficulty: p.difficulty,
          sampleCases: p.sampleCases,
          codeSnippets: p.codeSnippets,
          description: `Imported from curated wishlist: ${wishlist.title}`,
        },
        idx === 0 && queueBefore === 0
      );
    });
  };

  // Problem URL import state
  const [urlInput, setUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Paste Sample Modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');
  const [pasteOutputText, setPasteOutputText] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    try {
      setIsImporting(true);
      setImportError(null);
      const data = await importProblemApi({
        urlOrId: trimmed,
        platform: arenaPlatform || undefined,
      });
      onProblemDataChange?.(data);
      setUrlInput('');
      // If multiple sample cases were found, automatically populate all into arena tabs!
      if (data.sampleCases && data.sampleCases.length > 0 && onLoadAllCases) {
        onLoadAllCases(data.sampleCases);
      } else if (data.sampleInput && onLoadSampleCase) {
        onLoadSampleCase(data.sampleInput, data.sampleOutput || '');
      }
    } catch (err) {
      setImportError(getApiErrorMessage(err, 'Failed to import problem'));
    } finally {
      setIsImporting(false);
    }
  };

  const handleSmartPasteApply = () => {
    // If user pasted both into input box, check if it can be split
    const combined = parseCodeforcesExample(pasteInputText);
    const finalIn = combined ? combined.input : pasteInputText;
    const finalOut = combined ? combined.output : pasteOutputText;

    if (onLoadSampleCase) {
      onLoadSampleCase(finalIn, finalOut);
    }
    setIsPasteModalOpen(false);
    setPasteInputText('');
    setPasteOutputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = problemNotes.substring(0, start) + '  ' + problemNotes.substring(end);
      onProblemNotesChange(newValue);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  // Folded vertical rail view
  if (showFolded) {
    return (
      <div
        style={{ order: flexOrder, flex: '0 0 auto' }}
        className="w-9 shrink-0 h-full rounded-xl border border-border/70 bg-card flex flex-col items-center py-2 select-none shadow-xs"
      >
        <button
          type="button"
          onClick={() => onToggleContextFold(false)}
          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer mb-1"
          title="Expand Panel"
        >
          {isLeftEdge ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="w-5 h-[1px] bg-border/60 my-1" />

        <button
          type="button"
          onClick={() => {
            setActiveTab('PROBLEM');
            onToggleContextFold(false);
          }}
          className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          title="Problem Statement"
        >
          <BookOpen size={13} className="text-sky-500 shrink-0" />
          <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
            Problem
          </span>
        </button>

        <div className="w-4 h-[1px] bg-border/50" />

        {isCpMode && (
          <button
            type="button"
            onClick={() => {
              setActiveTab('SESSION');
              onToggleContextFold(false);
            }}
            className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
            title="Practice Session"
          >
            <ListOrdered size={13} className="text-amber-500 shrink-0" />
            <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
              Session
            </span>
          </button>
        )}

        <div className="w-4 h-[1px] bg-border/50" />

        <button
          type="button"
          onClick={() => {
            setActiveTab('NOTES');
            onToggleContextFold(false);
          }}
          className="py-2.5 px-1 rounded-md flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
          title="Shared Notes"
        >
          <FileText size={13} className="text-emerald-500 shrink-0" />
          <span className="[writing-mode:vertical-rl] tracking-wide text-[11px] whitespace-nowrap">
            Notes
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        order: flexOrder,
        flex: showFolded ? '0 0 auto' : '1 1 var(--col-context-w, 28%)',
      }}
      className={`${isHidden ? 'hidden' : 'flex'} min-h-0 min-w-0 h-full rounded-xl border border-border/70 bg-card flex-col overflow-hidden shadow-xs relative`}
    >
      {/* ── Panel Header with Tab Navigation ────────────────────────────── */}
      <div className="h-9 border-b border-border/60 bg-muted/35 px-2.5 flex items-center justify-between gap-1 shrink-0 select-none">
        <div className="flex items-center gap-1">
          {isCpMode && (
            <button
              type="button"
              onClick={() => setActiveTab('PROBLEM')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'PROBLEM'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen size={12} className="text-sky-500" />
              <span>Problem</span>
            </button>
          )}

          {isCpMode && (
            <button
              type="button"
              onClick={() => setActiveTab('SESSION')}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'SESSION'
                  ? 'bg-background text-foreground font-semibold shadow-xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListOrdered size={12} className="text-amber-500" />
              <span>Session</span>
              {queue && queue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-300 text-[10px] font-bold">
                  {queue.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('NOTES')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'NOTES'
                ? 'bg-background text-foreground font-semibold shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText size={12} className="text-emerald-500" />
            <span>Notes</span>
          </button>
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
              title="Fold panel into vertical rail"
            >
              {isLeftEdge ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* ── TAB CONTENT: PROBLEM STATEMENT ─────────────────────────────── */}
      {activeTab === 'PROBLEM' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar bg-background/60 p-3 space-y-3">
          {/* URL Import Bar */}
          <form onSubmit={handleImport} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder={
                  arenaPlatform === 'LEETCODE'
                    ? 'LeetCode URL or slug (e.g. two-sum)...'
                    : 'Codeforces URL or ID (e.g. 2290/H, 1990A)...'
                }
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isImporting}
                className="flex-1 h-7 text-xs rounded-lg bg-card border border-border/70 px-2.5 font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!urlInput.trim() || isImporting}
                className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-1 hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0 transition-opacity shadow-xs"
              >
                {isImporting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>Import</span>
              </button>
            </div>

            {importError && (
              <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 font-mono">
                {importError}
              </p>
            )}
          </form>

          {/* Action Row: Smart Paste Sample & Clear */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-500 hover:text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              <Layers size={11} />
              <span>Paste Sample Case</span>
            </button>

            {problemData && (
              <button
                type="button"
                onClick={() => onProblemDataChange?.(null)}
                className="text-[11px] font-mono text-muted-foreground hover:text-destructive cursor-pointer"
              >
                Clear Problem
              </button>
            )}
          </div>

          {/* ── Problem Display ─────────────────────────────────────────── */}
          {problemData ? (
            <div className="space-y-3 pt-1 animate-in fade-in-0 duration-150">
              {/* Problem Title & Platform */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-foreground leading-snug">
                    {problemData.title}
                  </h3>
                  {problemData.url && (
                    <a
                      href={problemData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-0.5"
                      title="Open on official platform"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                  <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
                    {problemData.platform}
                  </span>
                  {problemData.difficulty && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-semibold">
                      {problemData.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Resource Limits (Time & Memory) */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-card/60 border border-border/60 flex items-center gap-2">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Time Limit</div>
                    <div className="font-semibold text-foreground">
                      {problemData.timeLimit || '2.0 seconds'}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-card/60 border border-border/60 flex items-center gap-2">
                  <Cpu size={14} className="text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground">Memory Limit</div>
                    <div className="font-semibold text-foreground">
                      {problemData.memoryLimit || '256 MB'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {problemData.tags && problemData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <Tag size={11} className="text-muted-foreground mr-0.5" />
                  {problemData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Problem Description */}
              {problemData.description && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-semibold text-foreground">Statement</h4>
                  <div
                    className="text-xs text-foreground/90 leading-relaxed font-sans break-words bg-card/40 border border-border/60 p-3 rounded-xl
                      [&_p]:mb-2 [&_p]:leading-relaxed
                      [&_code]:bg-muted/80 [&_code]:text-sky-400 [&_code]:font-mono [&_code]:text-[11px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:border [&_code]:border-border/50
                      [&_pre]:bg-muted/30 [&_pre]:border [&_pre]:border-border/60 [&_pre]:rounded-lg [&_pre]:p-2.5 [&_pre]:my-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:custom-scrollbar
                      [&_strong]:text-foreground [&_strong]:font-semibold
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1
                      [&_li]:text-foreground/90
                      [&_sup]:text-[9px] [&_sup]:font-mono [&_sup]:text-primary
                      [&_sub]:text-[9px] [&_sub]:font-mono"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(cleanProblemHtml(problemData.description)),
                    }}
                  />
                </div>
              )}

              {/* Sample Cases with "Load into Arena" Buttons */}
              {problemData.sampleCases && problemData.sampleCases.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <span>Sample Testcases</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted text-muted-foreground rounded-full font-bold">
                        {problemData.sampleCases.length}
                      </span>
                    </h4>
                    {onLoadAllCases && (
                      <button
                        type="button"
                        onClick={() => onLoadAllCases(problemData.sampleCases || [])}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Play size={10} />
                        <span>Load All Cases</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {problemData.sampleCases.map((tc, idx) => (
                      <div key={idx} className="rounded-lg border border-border/60 overflow-hidden text-xs font-mono">
                        <div className="bg-muted/40 px-2 py-1 flex items-center justify-between border-b border-border/40">
                          <span className="font-semibold text-foreground text-[10px]">
                            Case {idx + 1}
                          </span>
                          {onLoadSampleCase && (
                            <button
                              type="button"
                              onClick={() => onLoadSampleCase(tc.input, tc.output || '')}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <Play size={9} />
                              <span>Load Case {idx + 1}</span>
                            </button>
                          )}
                        </div>
                        <div className="p-2 bg-background/80 space-y-1.5">
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase font-bold">Input</div>
                            <pre className="whitespace-pre-wrap break-words text-foreground mt-0.5">
                              {tc.input}
                            </pre>
                          </div>
                          {tc.output && (
                            <div>
                              <div className="text-[9px] text-muted-foreground uppercase font-bold">Output</div>
                              <pre className="whitespace-pre-wrap break-words text-emerald-400 mt-0.5">
                                {tc.output}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : problemData.sampleInput ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-foreground">Sample Testcase</h4>
                    {onLoadSampleCase && (
                      <button
                        type="button"
                        onClick={() =>
                          onLoadSampleCase(
                            problemData.sampleInput || '',
                            problemData.sampleOutput || ''
                          )
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Play size={10} />
                        <span>Load into Arena</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="rounded-lg border border-border/60 overflow-hidden text-xs font-mono">
                      <div className="bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
                        Input
                      </div>
                      <pre className="p-2 bg-background/80 whitespace-pre-wrap break-words text-foreground">
                        {problemData.sampleInput}
                      </pre>
                    </div>

                    {problemData.sampleOutput && (
                      <div className="rounded-lg border border-border/60 overflow-hidden text-xs font-mono">
                        <div className="bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground border-b border-border/40">
                          Expected Output
                        </div>
                        <pre className="p-2 bg-background/80 whitespace-pre-wrap break-words text-foreground">
                          {problemData.sampleOutput}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* Empty State for Problem Tab */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-2.5 text-muted-foreground">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Code2 size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">No Problem Loaded</p>
                <p className="text-[11px] leading-relaxed max-w-[200px]">
                  Paste a Codeforces problem ID (e.g.{' '}
                  <span className="font-mono text-primary">2290/H</span>) or LeetCode URL above, or
                  click{' '}
                  <button
                    type="button"
                    onClick={() => setIsPasteModalOpen(true)}
                    className="text-sky-500 underline cursor-pointer"
                  >
                    Paste Sample Case
                  </button>
                  .
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: PRACTICE SESSION & WISHLISTS ───────────────────── */}
      {activeTab === 'SESSION' && (
        <div className="flex-1 min-h-0 flex flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar bg-background/40">
          {/* 1. Session Stopwatch Timer */}
          <div className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground tracking-wider">
                {formatSessionTime(sessionSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title={isTimerRunning ? 'Pause Session' : 'Start Session'}
              >
                {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTimerRunning(false);
                  setSessionSeconds(0);
                }}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* 2. Active Session Playlist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <ListOrdered size={13} className="text-primary" />
                <span>Active Playlist</span>
                <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] font-bold text-foreground">
                  {queue.length}
                </span>
              </span>
              <span className="text-[11px]">
                {queue.filter((q) => q.status === 'SOLVED').length} of {queue.length} solved
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border/70 rounded-lg p-4 text-muted-foreground space-y-1">
                <p className="text-xs font-medium text-foreground">No problems in session</p>
                <p className="text-[11px] text-muted-foreground">
                  Add from URL below or pull from a curated wishlist.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((item, index) => {
                  const isActive = index === activeProblemIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectProblem?.(index);
                      }}
                      className={`group p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                          : 'bg-card/60 border-border/60 hover:bg-accent/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className={`text-xs font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {item.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Status toggle button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStatus = item.status === 'SOLVED' ? 'TODO' : 'SOLVED';
                              onUpdateStatus?.(item.id, nextStatus);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                              item.status === 'SOLVED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {item.status === 'SOLVED' ? (
                              <CheckCircle2 size={11} />
                            ) : (
                              <Circle size={11} />
                            )}
                            <span>{item.status === 'SOLVED' ? 'Solved' : 'To-Do'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveProblem?.(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-opacity"
                            title="Remove from session"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 pl-6 text-[10px] text-muted-foreground">
                        <span className="uppercase font-semibold tracking-wider text-muted-foreground">
                          {item.platform}
                        </span>
                        {item.difficulty && (
                          <span className="px-1 rounded bg-muted/60">{item.difficulty}</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProblem?.(index);
                            setActiveTab('PROBLEM');
                          }}
                          className="ml-auto text-primary hover:underline"
                        >
                          View Statement →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Add to Session Form */}
          <form onSubmit={handleSessionImportAdd} className="space-y-1.5 pt-1 border-t border-border/40">
            <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
              <span>Add Problem by URL or ID</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="LeetCode URL or CF ID (e.g. 2290H)..."
                value={sessionUrlInput}
                onChange={(e) => setSessionUrlInput(e.target.value)}
                disabled={isSessionImporting}
                className="flex-1 px-2.5 py-1 text-xs bg-background border border-border/70 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isSessionImporting || !sessionUrlInput.trim()}
                className="px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
              >
                {isSessionImporting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={12} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
            {sessionImportError && (
              <p className="text-[10px] text-destructive">{sessionImportError}</p>
            )}
          </form>

          {/* 4. Curated Wishlists / Problem Collections */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-400" />
                <span>Curated Wishlists</span>
              </span>
              <span className="text-[10px] text-muted-foreground">1-Click Pull</span>
            </div>

            <div className="space-y-1.5">
              {CURATED_WISHLISTS.map((w) => (
                <div
                  key={w.title}
                  className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center justify-between gap-2 hover:bg-accent/30 transition-colors"
                >
                  <div className="min-w-0">
                    <h5 className="text-xs font-medium text-foreground truncate">{w.title}</h5>
                    <p className="text-[10px] text-muted-foreground">{w.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePullWishlist(w)}
                    className="px-2 py-1 text-[11px] font-semibold rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 cursor-pointer"
                  >
                    Pull
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: SCRATCHPAD NOTES ───────────────────────────────── */}
      {activeTab === 'NOTES' && (
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
            onKeyDown={handleKeyDown}
            disabled={isEffectiveReadOnly}
            placeholder="Paste problem description, examples, or shared algorithm notes here..."
            className="flex-1 w-full resize-none bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-relaxed custom-scrollbar"
          />
        </div>
      )}

      {/* ── SMART PASTE SAMPLE MODAL ────────────────────────────────────── */}
      {isPasteModalOpen && (
        <div className="absolute inset-0 z-40 bg-background/90 backdrop-blur-xs flex flex-col p-3 space-y-2.5 animate-in fade-in-0 duration-150">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers size={13} className="text-sky-500" />
              <span>Paste Sample Testcases</span>
            </span>
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(false)}
              className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Copy the entire Example box from Codeforces or paste input and expected output below:
          </p>

          <div className="flex-1 min-h-0 space-y-2 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col">
              <label className="text-[10px] font-mono font-semibold text-muted-foreground mb-1">
                Input (or Combined Example box)
              </label>
              <textarea
                value={pasteInputText}
                onChange={(e) => setPasteInputText(e.target.value)}
                placeholder="Paste input (e.g. 5 \n 3 \n 1 2)..."
                className="flex-1 p-2 rounded-lg bg-card border border-border/70 font-mono text-xs text-foreground resize-none focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="text-[10px] font-mono font-semibold text-muted-foreground mb-1">
                Expected Output (optional if combined above)
              </label>
              <textarea
                value={pasteOutputText}
                onChange={(e) => setPasteOutputText(e.target.value)}
                placeholder="Paste expected output..."
                className="flex-1 p-2 rounded-lg bg-card border border-border/70 font-mono text-xs text-foreground resize-none focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(false)}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSmartPasteApply}
              disabled={!pasteInputText.trim() && !pasteOutputText.trim()}
              className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Apply to Arena
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
