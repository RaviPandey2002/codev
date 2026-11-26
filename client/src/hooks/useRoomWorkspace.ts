import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';
import { executeCodeApi } from '@/api/execution';
import type { CollaborativeEditorHandle } from '@/components/editor/CollaborativeEditor';
import { computeVerdict } from '@/components/room/IoColumn';
import {
  CUSTOM_TEMPLATES_STORAGE_KEY,
  DEFAULT_PROBLEM_NOTES,
  LANGUAGE_META,
  LEETCODE_DEFAULT_TEMPLATES,
  isBuiltInBoilerplate,
  loadSavedTemplates,
} from '@/components/room/room.constants';
import { getApiErrorMessage } from '@/lib/api';
import type {
  ArenaPlatform,
  ExecutionLanguage,
  ExecutionResult,
  ProblemData,
  QueueProblemItem,
  QueueProblemStatus,
  TestCaseItem,
} from '@codev/shared';

interface UseRoomWorkspaceParams {
  username?: string;
  isEffectiveReadOnly: boolean;
  isIoFolded: boolean;
  toggleIoFold: (force?: boolean) => void;
  arenaPlatform?: ArenaPlatform | null;
}

export function useRoomWorkspace({
  username,
  isEffectiveReadOnly,
  isIoFolded,
  toggleIoFold,
  arenaPlatform,
}: UseRoomWorkspaceParams) {
  const ydocRef = useRef<Y.Doc | null>(null);
  const editorHandleRef = useRef<CollaborativeEditorHandle | null>(null);

  const [language, setLanguage] = useState<ExecutionLanguage>('cpp');
  const [stdin, setStdin] = useState('');
  const stdinRef = useRef('');
  stdinRef.current = stdin;

  const [expectedOutput, setExpectedOutput] = useState('');
  const expectedOutputRef = useRef('');
  expectedOutputRef.current = expectedOutput;

  // Multi-testcase state for CP / LeetCode modes
  const [testCases, setTestCases] = useState<TestCaseItem[]>([
    { id: '1', name: 'Case 1', input: '', output: '' },
  ]);
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const testCasesRef = useRef(testCases);
  testCasesRef.current = testCases;
  const activeCaseIndexRef = useRef(activeCaseIndex);
  activeCaseIndexRef.current = activeCaseIndex;

  // Per-case execution results map (case index -> ExecutionResult)
  const [caseResults, setCaseResults] = useState<Record<number, ExecutionResult>>({});

  // Problem Queue & Session state
  const [problemQueue, setProblemQueue] = useState<QueueProblemItem[]>([]);
  const problemQueueRef = useRef(problemQueue);
  problemQueueRef.current = problemQueue;
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const activeProblemIndexRef = useRef(activeProblemIndex);
  activeProblemIndexRef.current = activeProblemIndex;

  const [problemNotes, setProblemNotes] = useState(DEFAULT_PROBLEM_NOTES);
  const [problemData, setProblemData] = useState<ProblemData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runningBy, setRunningBy] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  // Custom per-language user templates persisted in localStorage
  const [customTemplates, setCustomTemplates] = useState<
    Partial<Record<ExecutionLanguage, string>>
  >(() => loadSavedTemplates());
  const [savedTemplateFlash, setSavedTemplateFlash] = useState(false);

  const stdinSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expectedOutputSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const doc = ydocRef.current;
      if (doc) {
        const meta = doc.getMap<any>('workspaceMeta');
        if (meta.get('isRunning')) {
          doc.transact(() => {
            meta.set('isRunning', false);
            meta.set('runningBy', null);
            meta.delete('runStartedAt');
          });
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (stdinSyncTimerRef.current) clearTimeout(stdinSyncTimerRef.current);
      if (notesSyncTimerRef.current) clearTimeout(notesSyncTimerRef.current);
      if (runningWatchdogRef.current) clearTimeout(runningWatchdogRef.current);
    };
  }, []);

  const getEffectiveTemplate = useCallback(
    (lang: ExecutionLanguage, overrides?: Partial<Record<ExecutionLanguage, string>>) => {
      const map = overrides ?? customTemplates;
      const custom = map[lang];
      if (typeof custom === 'string' && custom.trim().length > 0) {
        return custom;
      }
      const isLeetCode =
        problemData?.platform === 'LEETCODE' ||
        arenaPlatform === 'LEETCODE' ||
        problemQueueRef.current[activeProblemIndexRef.current]?.platform === 'LEETCODE';
      if (isLeetCode && LEETCODE_DEFAULT_TEMPLATES[lang]) {
        return LEETCODE_DEFAULT_TEMPLATES[lang]!;
      }
      return LANGUAGE_META[lang].template;
    },
    [customTemplates, problemData, arenaPlatform]
  );

  const handleDocReady = useCallback((doc: Y.Doc, handle: CollaborativeEditorHandle) => {
    ydocRef.current = doc;
    editorHandleRef.current = handle;
    const meta = doc.getMap<any>('workspaceMeta');

    const syncFromYjs = () => {
      const syncedLang = meta.get('language') as ExecutionLanguage | undefined;
      if (syncedLang && LANGUAGE_META[syncedLang]) {
        setLanguage(syncedLang);
      }

      const syncedCases = meta.get('testCases') as TestCaseItem[] | undefined;
      if (Array.isArray(syncedCases) && syncedCases.length > 0) {
        setTestCases(syncedCases);
        // Refresh local stdin & expectedOutput from the user's currently viewed testcase
        const curIdx = Math.min(activeCaseIndexRef.current, syncedCases.length - 1);
        if (syncedCases[curIdx]) {
          setStdin(syncedCases[curIdx].input);
          setExpectedOutput(syncedCases[curIdx].output);
          stdinRef.current = syncedCases[curIdx].input;
          expectedOutputRef.current = syncedCases[curIdx].output;
        }
      } else {
        const syncedStdin = meta.get('stdin') as string | undefined;
        if (typeof syncedStdin === 'string') {
          setStdin(syncedStdin);
        }
        const syncedExpected = meta.get('expectedOutput') as string | undefined;
        if (typeof syncedExpected === 'string') {
          setExpectedOutput(syncedExpected);
        }
      }

      const syncedNotes = meta.get('problemNotes') as string | undefined;
      if (typeof syncedNotes === 'string') {
        setProblemNotes(syncedNotes);
      }

      const syncedProblem = meta.get('problemData') as ProblemData | null | undefined;
      if (syncedProblem !== undefined) {
        setProblemData(syncedProblem);
      }

      const syncedQueue = meta.get('problemQueue') as QueueProblemItem[] | undefined;
      if (Array.isArray(syncedQueue)) {
        setProblemQueue(syncedQueue);
        problemQueueRef.current = syncedQueue;
      }

      const syncedProbIdx = meta.get('activeProblemIndex') as number | undefined;
      if (typeof syncedProbIdx === 'number') {
        setActiveProblemIndex(syncedProbIdx);
        activeProblemIndexRef.current = syncedProbIdx;
        if (syncedQueue && syncedQueue[syncedProbIdx]) {
          setProblemData(syncedQueue[syncedProbIdx] as any);
        }
      }

      const syncedRunning = Boolean(meta.get('isRunning'));
      const syncedRunningBy = meta.get('runningBy') as string | null | undefined;
      const runStartedAt = meta.get('runStartedAt') as number | undefined;
      const isExpired = runStartedAt ? Date.now() - runStartedAt > 12_000 : false;

      if (syncedRunning && (isExpired || !runStartedAt)) {
        // Run has timed out or has no timestamp (stale state) -> auto-heal
        doc.transact(() => {
          meta.set('isRunning', false);
          meta.set('runningBy', null);
          meta.delete('runStartedAt');
        });
        setIsRunning(false);
        setRunningBy(null);
      } else if (syncedRunning) {
        setIsRunning(true);
        setRunningBy(syncedRunningBy || null);

        // Schedule watchdog to unlock when lease expires
        if (runningWatchdogRef.current) clearTimeout(runningWatchdogRef.current);
        const remaining = Math.max(100, 12_000 - (Date.now() - (runStartedAt || 0)));
        runningWatchdogRef.current = setTimeout(() => {
          doc.transact(() => {
            meta.set('isRunning', false);
            meta.set('runningBy', null);
            meta.delete('runStartedAt');
          });
          setIsRunning(false);
          setRunningBy(null);
        }, remaining);
      } else {
        if (runningWatchdogRef.current) {
          clearTimeout(runningWatchdogRef.current);
          runningWatchdogRef.current = null;
        }
        setIsRunning(false);
        setRunningBy(null);
      }

      const syncedResult = meta.get('executionResult') as
        | (ExecutionResult & { caseIndex?: number })
        | null
        | undefined;
      if (syncedResult !== undefined) {
        setExecutionResult(syncedResult);
        if (syncedResult) {
          const resIdx =
            typeof syncedResult.caseIndex === 'number'
              ? syncedResult.caseIndex
              : activeCaseIndexRef.current;
          setCaseResults((prev) => ({ ...prev, [resIdx]: syncedResult }));
        } else {
          setCaseResults({});
        }
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
      if (!doc) return;

      const sharedText = doc.getText('monaco');
      // ONLY seed template if the shared Yjs document is completely empty after syncing
      if (sharedText.length === 0) {
        const meta = doc.getMap<any>('workspaceMeta');
        const activeLang = (meta.get('language') as ExecutionLanguage | undefined) || language;
        const preferred = getEffectiveTemplate(activeLang);
        doc.transact(() => {
          sharedText.insert(0, preferred);
        });
      }
    },
    [language, getEffectiveTemplate]
  );

  const handleLanguageChange = useCallback(
    (newLang: ExecutionLanguage) => {
      if (newLang === language || isEffectiveReadOnly) return;

      const doc = ydocRef.current;
      const editorHandle = editorHandleRef.current;
      const currentCode = editorHandle?.getCode() ?? '';

      let nextCode = getEffectiveTemplate(newLang);

      if (doc) {
        const codeByLang = doc.getMap<string>('codeByLanguage');
        const codeByProblem = doc.getMap<string>('codeByProblem');
        const meta = doc.getMap<any>('workspaceMeta');

        const currentProb = problemQueueRef.current[activeProblemIndexRef.current] || problemData;

        if (currentCode.trim().length > 0 && !isBuiltInBoilerplate(currentCode)) {
          codeByLang.set(language, currentCode);
          if (currentProb) {
            codeByProblem.set(`${currentProb.id}:${language}`, currentCode);
          }
        }

        // Check if there is already saved code for target language on THIS problem:
        const savedProblemLangCode = currentProb ? codeByProblem.get(`${currentProb.id}:${newLang}`) : null;
        if (typeof savedProblemLangCode === 'string' && savedProblemLangCode.trim().length > 0) {
          nextCode = savedProblemLangCode;
        } else {
          const newLangSlug = newLang === 'python' ? 'python3' : newLang;
          const snippet = currentProb?.codeSnippets?.find(
            (s) => s.langSlug === newLangSlug || s.langSlug === newLang || s.lang === newLang
          );
          if (snippet?.code) {
            nextCode = snippet.code;
          } else {
            const existingLangCode = codeByLang.get(newLang);
            if (typeof existingLangCode === 'string' && existingLangCode.trim().length > 0) {
              nextCode = existingLangCode;
            }
          }
        }

        const sharedText = doc.getText('monaco');
        doc.transact(() => {
          sharedText.delete(0, sharedText.length);
          sharedText.insert(0, nextCode);
          meta.set('language', newLang);
        });
      }

      setLanguage(newLang);
      editorHandle?.setCode(nextCode);
    },
    [language, isEffectiveReadOnly, getEffectiveTemplate, problemData]
  );

  const handleResetToTemplate = useCallback(() => {
    if (isEffectiveReadOnly) return;
    const currentCode = editorHandleRef.current?.getCode() ?? '';
    if (currentCode.trim().length > 0) {
      const confirmed = window.confirm(
        'Reset editor code to template? Your current changes in this file will be replaced.'
      );
      if (!confirmed) return;
    }

    const currentProb = problemQueueRef.current[activeProblemIndexRef.current] || problemData;
    const langSlug = language === 'python' ? 'python3' : language;
    const snippet = currentProb?.codeSnippets?.find(
      (s) => s.langSlug === langSlug || s.langSlug === language
    );
    const targetTemplate = snippet?.code || getEffectiveTemplate(language);
    editorHandleRef.current?.setCode(targetTemplate);

    const doc = ydocRef.current;
    if (doc) {
      doc.getMap<string>('codeByLanguage').set(language, targetTemplate);
      const sharedText = doc.getText('monaco');
      doc.transact(() => {
        sharedText.delete(0, sharedText.length);
        sharedText.insert(0, targetTemplate);
      });
    }
  }, [isEffectiveReadOnly, getEffectiveTemplate, language, problemData]);

  const handleSaveCustomTemplate = useCallback(() => {
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
  }, [customTemplates, language]);

  const handleClearCustomTemplate = useCallback(() => {
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
  }, [customTemplates, language, isEffectiveReadOnly]);

  const handleStdinChange = useCallback((val: string) => {
    stdinRef.current = val;
    setStdin(val);
    const curIdx = activeCaseIndexRef.current;
    setTestCases((prev) => {
      const next = [...prev];
      if (next[curIdx]) {
        next[curIdx] = { ...next[curIdx], input: val };
      }
      return next;
    });
    if (stdinSyncTimerRef.current) clearTimeout(stdinSyncTimerRef.current);
    stdinSyncTimerRef.current = setTimeout(() => {
      const updatedCases = [...testCasesRef.current];
      if (updatedCases[curIdx]) {
        updatedCases[curIdx] = { ...updatedCases[curIdx], input: val };
      }
      ydocRef.current?.getMap('workspaceMeta').set('testCases', updatedCases);
      ydocRef.current?.getMap('workspaceMeta').set('stdin', val);
    }, 200);
  }, []);

  const handleExpectedOutputChange = useCallback((val: string) => {
    expectedOutputRef.current = val;
    setExpectedOutput(val);
    const curIdx = activeCaseIndexRef.current;
    setTestCases((prev) => {
      const next = [...prev];
      if (next[curIdx]) {
        next[curIdx] = { ...next[curIdx], output: val };
      }
      return next;
    });
    if (expectedOutputSyncTimerRef.current) clearTimeout(expectedOutputSyncTimerRef.current);
    expectedOutputSyncTimerRef.current = setTimeout(() => {
      const updatedCases = [...testCasesRef.current];
      if (updatedCases[curIdx]) {
        updatedCases[curIdx] = { ...updatedCases[curIdx], output: val };
      }
      ydocRef.current?.getMap('workspaceMeta').set('testCases', updatedCases);
      ydocRef.current?.getMap('workspaceMeta').set('expectedOutput', val);
    }, 200);
  }, []);

  const handleSelectCase = useCallback((idx: number) => {
    const cases = testCasesRef.current;
    if (idx < 0 || idx >= cases.length) return;
    setActiveCaseIndex(idx);
    activeCaseIndexRef.current = idx;
    const c = cases[idx];
    setStdin(c.input);
    setExpectedOutput(c.output);
    stdinRef.current = c.input;
    expectedOutputRef.current = c.output;
    // NOTE: Do not sync activeCaseIndex to Yjs: tab switching is local per peer
  }, []);

  const handleAddCase = useCallback(() => {
    const cur = testCasesRef.current;
    const newIdx = cur.length;
    const newCase: TestCaseItem = {
      id: String(Date.now()),
      name: `Case ${newIdx + 1}`,
      input: '',
      output: '',
    };
    const updated = [...cur, newCase];
    setTestCases(updated);
    setActiveCaseIndex(newIdx);
    activeCaseIndexRef.current = newIdx;
    setStdin('');
    setExpectedOutput('');
    stdinRef.current = '';
    expectedOutputRef.current = '';
    ydocRef.current?.getMap('workspaceMeta').set('testCases', updated);
  }, []);

  const handleRemoveCase = useCallback((idx: number) => {
    const cur = testCasesRef.current;
    if (cur.length <= 1) return;
    const updated = cur.filter((_, i) => i !== idx).map((c, i) => ({
      ...c,
      name: `Case ${i + 1}`,
    }));
    setTestCases(updated);
    const nextIdx = Math.max(0, Math.min(activeCaseIndexRef.current, updated.length - 1));
    setActiveCaseIndex(nextIdx);
    activeCaseIndexRef.current = nextIdx;
    const activeCase = updated[nextIdx];
    setStdin(activeCase.input);
    setExpectedOutput(activeCase.output);
    stdinRef.current = activeCase.input;
    expectedOutputRef.current = activeCase.output;
    // Clean up results for removed case
    setCaseResults((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    ydocRef.current?.getMap('workspaceMeta').set('testCases', updated);
  }, []);

  const handleLoadAllCases = useCallback((cases: Array<{ input: string; output?: string }>) => {
    if (!cases || cases.length === 0) return;
    const loaded: TestCaseItem[] = cases.map((c, i) => ({
      id: String(i + 1),
      name: `Case ${i + 1}`,
      input: c.input,
      output: c.output || '',
    }));
    setTestCases(loaded);
    setActiveCaseIndex(0);
    activeCaseIndexRef.current = 0;
    setStdin(loaded[0].input);
    setExpectedOutput(loaded[0].output);
    stdinRef.current = loaded[0].input;
    expectedOutputRef.current = loaded[0].output;
    setCaseResults({});
    ydocRef.current?.getMap('workspaceMeta').set('testCases', loaded);
  }, []);

  const handleProblemNotesChange = useCallback((val: string) => {
    setProblemNotes(val);
    if (notesSyncTimerRef.current) clearTimeout(notesSyncTimerRef.current);
    notesSyncTimerRef.current = setTimeout(() => {
      ydocRef.current?.getMap('workspaceMeta').set('problemNotes', val);
    }, 250);
  }, []);

  const handleProblemDataChange = useCallback((data: ProblemData | null) => {
    setProblemData(data);
    ydocRef.current?.getMap('workspaceMeta').set('problemData', data);
  }, []);

  const handleSelectQueueProblem = useCallback(
    (targetIndex: number) => {
      const queue = problemQueueRef.current;
      if (targetIndex < 0 || targetIndex >= queue.length) return;

      const currentIdx = activeProblemIndexRef.current;
      const currentProb = queue[currentIdx];
      const targetProb = queue[targetIndex];
      const doc = ydocRef.current;

      if (!doc || !targetProb) return;

      const codeByProblem = doc.getMap<string>('codeByProblem');
      const testCasesByProblem = doc.getMap<string>('testCasesByProblem');

      // 1. Save current problem code & testcases
      if (currentProb && currentIdx !== targetIndex) {
        const currentCode = editorHandleRef.current?.getCode() || doc.getText('monaco').toString();
        if (currentCode.trim().length > 0 && !isBuiltInBoilerplate(currentCode)) {
          codeByProblem.set(`${currentProb.id}:${language}`, currentCode);
          codeByProblem.set(currentProb.id, currentCode);
        }
        testCasesByProblem.set(currentProb.id, JSON.stringify(testCasesRef.current));
      }

      // 2. Retrieve or initialize target problem code
      const savedCode = codeByProblem.get(`${targetProb.id}:${language}`) || codeByProblem.get(targetProb.id);
      let nextCode = savedCode;
      if (!nextCode || nextCode.trim().length === 0 || isBuiltInBoilerplate(nextCode)) {
        const langSlug = language === 'python' ? 'python3' : language;
        const snippet = targetProb.codeSnippets?.find(
          (s) => s.langSlug === langSlug || s.langSlug === language
        );
        if (snippet?.code) {
          nextCode = snippet.code;
        } else if (targetProb.platform === 'LEETCODE' && language === 'cpp') {
          nextCode = `class Solution {\npublic:\n    \n};\n`;
        } else {
          nextCode = getEffectiveTemplate(language);
        }
      }

      const sharedText = doc.getText('monaco');
      doc.transact(() => {
        sharedText.delete(0, sharedText.length);
        sharedText.insert(0, nextCode);
      });
      editorHandleRef.current?.setCode(nextCode);

      // 3. Retrieve or initialize target problem testcases
      const savedCasesRaw = testCasesByProblem.get(targetProb.id);
      let nextCases: TestCaseItem[] = [];
      if (savedCasesRaw) {
        try {
          nextCases = JSON.parse(savedCasesRaw);
        } catch { }
      }
      if (nextCases.length === 0 && targetProb.sampleCases && targetProb.sampleCases.length > 0) {
        nextCases = targetProb.sampleCases.map((c, i) => ({
          id: c.id || String(i + 1),
          name: c.name || `Case ${i + 1}`,
          input: c.input,
          output: c.output || '',
        }));
      }
      if (nextCases.length === 0) {
        nextCases = [{ id: '1', name: 'Case 1', input: '', output: '' }];
      }

      setTestCases(nextCases);
      testCasesRef.current = nextCases;
      setActiveCaseIndex(0);
      activeCaseIndexRef.current = 0;
      setStdin(nextCases[0].input);
      setExpectedOutput(nextCases[0].output);
      stdinRef.current = nextCases[0].input;
      expectedOutputRef.current = nextCases[0].output;
      setCaseResults({});

      setActiveProblemIndex(targetIndex);
      activeProblemIndexRef.current = targetIndex;
      setProblemData(targetProb as any);

      doc.transact(() => {
        const meta = doc.getMap<any>('workspaceMeta');
        meta.set('activeProblemIndex', targetIndex);
        meta.set('problemData', targetProb);
        meta.set('testCases', nextCases);
        meta.set('stdin', nextCases[0].input);
        meta.set('expectedOutput', nextCases[0].output);
        meta.delete('executionResult');
      });
    },
    [language, getEffectiveTemplate]
  );

  const handleAddToQueue = useCallback(
    (newProblem: ProblemData, autoSelect: boolean = true) => {
      const existingQueue = problemQueueRef.current;
      const targetUrlOrId = newProblem.url || newProblem.title;

      // Deduplication check: if problem already exists by url or title
      const existingIndex = existingQueue.findIndex(
        (item) =>
          (item.urlOrId && targetUrlOrId && item.urlOrId.toLowerCase() === targetUrlOrId.toLowerCase()) ||
          (item.title && newProblem.title && item.title.toLowerCase() === newProblem.title.toLowerCase())
      );

      if (existingIndex !== -1) {
        const existing = existingQueue[existingIndex];
        // If incoming newProblem has codeSnippets and existing doesn't, merge them!
        if (
          (!existing.codeSnippets || existing.codeSnippets.length === 0) &&
          newProblem.codeSnippets &&
          newProblem.codeSnippets.length > 0
        ) {
          const updatedItem = { ...existing, codeSnippets: newProblem.codeSnippets };
          const updated = [...existingQueue];
          updated[existingIndex] = updatedItem;
          setProblemQueue(updated);
          problemQueueRef.current = updated;
          ydocRef.current?.getMap('workspaceMeta').set('problemQueue', updated);

          // If this is currently the active problem in the editor, check if editor has boilerplate
          if (activeProblemIndexRef.current === existingIndex) {
            setProblemData(updatedItem as any);
            const currentCode =
              editorHandleRef.current?.getCode() || ydocRef.current?.getText('monaco').toString() || '';
            if (isBuiltInBoilerplate(currentCode)) {
              const langSlug = language === 'python' ? 'python3' : language;
              const snippet = updatedItem.codeSnippets.find(
                (s) => s.langSlug === langSlug || s.langSlug === language
              );
              if (snippet?.code) {
                const doc = ydocRef.current;
                if (doc) {
                  const sharedText = doc.getText('monaco');
                  doc.transact(() => {
                    sharedText.delete(0, sharedText.length);
                    sharedText.insert(0, snippet.code);
                  });
                }
                editorHandleRef.current?.setCode(snippet.code);
              }
            }
          }
        }

        if (autoSelect) {
          handleSelectQueueProblem(existingIndex);
        }
        return;
      }

      const id =
        newProblem.url ||
        `${newProblem.platform.toLowerCase()}_${
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        }`;
      const item: QueueProblemItem = {
        id,
        platform: newProblem.platform,
        urlOrId: targetUrlOrId,
        title: newProblem.title,
        difficulty: newProblem.difficulty,
        tags: newProblem.tags,
        description: newProblem.description,
        sampleCases: (newProblem.sampleCases || []).map((c, i) => ({
          id: String(i + 1),
          name: `Case ${i + 1}`,
          input: c.input,
          output: c.output || '',
        })),
        codeSnippets: newProblem.codeSnippets,
        status: 'TODO',
      };

      const updated = [...existingQueue, item];
      setProblemQueue(updated);
      problemQueueRef.current = updated;
      ydocRef.current?.getMap('workspaceMeta').set('problemQueue', updated);

      if (autoSelect) {
        handleSelectQueueProblem(updated.length - 1);
      }
    },
    [handleSelectQueueProblem]
  );

  const handleRemoveFromQueue = useCallback((id: string) => {
    const updated = problemQueueRef.current.filter((p) => p.id !== id);
    setProblemQueue(updated);
    problemQueueRef.current = updated;
    ydocRef.current?.getMap('workspaceMeta').set('problemQueue', updated);

    if (activeProblemIndexRef.current >= updated.length) {
      const newIdx = Math.max(0, updated.length - 1);
      setActiveProblemIndex(newIdx);
      activeProblemIndexRef.current = newIdx;
      ydocRef.current?.getMap('workspaceMeta').set('activeProblemIndex', newIdx);
    }
  }, []);

  const handleUpdateProblemStatus = useCallback((id: string, status: QueueProblemStatus) => {
    const updated = problemQueueRef.current.map((p) =>
      p.id === id ? { ...p, status } : p
    );
    setProblemQueue(updated);
    problemQueueRef.current = updated;
    ydocRef.current?.getMap('workspaceMeta').set('problemQueue', updated);
  }, []);

  const handleClearOutput = useCallback(() => {
    const curIdx = activeCaseIndexRef.current;
    setCaseResults((prev) => {
      const next = { ...prev };
      delete next[curIdx];
      return next;
    });
    setExecutionResult(null);
    ydocRef.current?.getMap('workspaceMeta').set('executionResult', null);
  }, []);

  const handleFormatCode = useCallback(() => {
    editorHandleRef.current?.formatCode();
  }, []);

  const handleRunCode = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc || isRunning) return;

    const rawCode = editorHandleRef.current?.getCode() || doc.getText('monaco').toString();
    if (!rawCode.trim()) return;

    // Normalize \r\n to \n to prevent character index drift on Linux runner
    const code = rawCode.replace(/\r\n/g, '\n');

    const meta = doc.getMap<any>('workspaceMeta');
    const currentLang = (meta.get('language') as ExecutionLanguage) || language;
    const currentStdin = (stdinRef.current || '').replace(/\r\n/g, '\n');
    meta.set('stdin', currentStdin);

    if (isIoFolded) {
      toggleIoFold(false);
    }

    const now = Date.now();
    doc.transact(() => {
      meta.set('isRunning', true);
      meta.set('runningBy', username || 'Peer');
      meta.set('runStartedAt', now);
    });

    // 10-second client-side failsafe watchdog: guarantees isRunning will NEVER remain stuck
    const watchdogTimer = setTimeout(() => {
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.delete('runStartedAt');
      });
      setIsRunning(false);
      setRunningBy(null);
    }, 10_000);

    try {
      const result = await executeCodeApi({
        language: currentLang,
        compilerProfile: 'default',
        code,
        stdin: currentStdin,
      });

      const curCaseIdx = activeCaseIndexRef.current;
      const resultWithCase = {
        ...result,
        caseIndex: curCaseIdx,
      };
      setExecutionResult(resultWithCase);
      setCaseResults((prev) => ({
        ...prev,
        [curCaseIdx]: resultWithCase,
      }));

      // If single case and expected output matches, mark problem as SOLVED in queue
      if (testCasesRef.current.length === 1 && expectedOutputRef.current.trim().length > 0) {
        if (computeVerdict(result.stdout, expectedOutputRef.current) === 'ACCEPTED') {
          const queue = problemQueueRef.current;
          const curProb = queue[activeProblemIndexRef.current];
          if (curProb && curProb.status !== 'SOLVED') {
            handleUpdateProblemStatus(curProb.id, 'SOLVED');
          }
        }
      }

      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.delete('runStartedAt');
        meta.set('executionResult', resultWithCase);
      });
    } catch (err) {
      const curCaseIdx = activeCaseIndexRef.current;
      const fallbackError: ExecutionResult & { caseIndex?: number } = {
        stdout: '',
        stderr: getApiErrorMessage(err, 'Execution request failed.'),
        exitCode: 1,
        executionTimeMs: 0,
        status: 'RUNTIME_ERROR',
        triggeredBy: username || 'Peer',
        timestamp: new Date().toISOString(),
        caseIndex: curCaseIdx,
      };
      setExecutionResult(fallbackError);
      setCaseResults((prev) => ({
        ...prev,
        [curCaseIdx]: fallbackError,
      }));
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.delete('runStartedAt');
        meta.set('executionResult', fallbackError);
      });
    } finally {
      clearTimeout(watchdogTimer);
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.delete('runStartedAt');
      });
      setIsRunning(false);
      setRunningBy(null);
    }
  }, [isRunning, language, username, isIoFolded, toggleIoFold, handleUpdateProblemStatus]);

  const handleRunAllCases = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc || isRunning) return;

    const rawCode = editorHandleRef.current?.getCode() || doc.getText('monaco').toString();
    if (!rawCode.trim()) return;
    const code = rawCode.replace(/\r\n/g, '\n');

    const cases = testCasesRef.current;
    if (!cases || cases.length === 0) return;

    const meta = doc.getMap<any>('workspaceMeta');
    const currentLang = (meta.get('language') as ExecutionLanguage) || language;

    if (isIoFolded) {
      toggleIoFold(false);
    }

    const now = Date.now();
    doc.transact(() => {
      meta.set('isRunning', true);
      meta.set('runningBy', username || 'Peer');
      meta.set('runStartedAt', now);
    });
    setIsRunning(true);
    setRunningBy(username || 'Peer');

    try {
      const results: Record<number, ExecutionResult & { caseIndex?: number }> = {};
      let allPassed = true;

      for (let i = 0; i < cases.length; i++) {
        const tc = cases[i];
        const currentStdin = (tc.input || '').replace(/\r\n/g, '\n');
        const res = await executeCodeApi({
          language: currentLang,
          compilerProfile: 'default',
          code,
          stdin: currentStdin,
        });

        const resWithCase = {
          ...res,
          caseIndex: i,
        };
        results[i] = resWithCase;

        if (res.status === 'COMPILE_ERROR') {
          // If code fails compilation on any case, it will fail on all cases.
          // Fast-fail: populate compile error for all remaining cases and break immediately.
          for (let rem = i + 1; rem < cases.length; rem++) {
            results[rem] = {
              ...res,
              caseIndex: rem,
            };
          }
          allPassed = false;
          break;
        }

        if (tc.output && tc.output.trim().length > 0) {
          const verdict = computeVerdict(res.stdout, tc.output);
          if (verdict !== 'ACCEPTED') {
            allPassed = false;
          }
        } else if (res.status !== 'SUCCESS') {
          allPassed = false;
        }
      }

      setCaseResults(results);
      const curIdx = activeCaseIndexRef.current;

      // Auto-focus on first failing case to immediately display mismatch diff
      let focusIdx = curIdx;
      for (let i = 0; i < cases.length; i++) {
        const r = results[i];
        const tc = cases[i];
        if (!r || r.status !== 'SUCCESS') {
          focusIdx = i;
          break;
        }
        if (tc.output && tc.output.trim().length > 0) {
          const v = computeVerdict(r.stdout, tc.output);
          if (v !== 'ACCEPTED') {
            focusIdx = i;
            break;
          }
        }
      }

      handleSelectCase(focusIdx);
      if (results[focusIdx]) {
        setExecutionResult(results[focusIdx]);
        doc.transact(() => {
          meta.set('executionResult', results[focusIdx]);
        });
      }

      // If all testcases passed, auto-mark problem as SOLVED in the playlist!
      if (allPassed && cases.length > 0) {
        const queue = problemQueueRef.current;
        const curProb = queue[activeProblemIndexRef.current];
        if (curProb && curProb.status !== 'SOLVED') {
          handleUpdateProblemStatus(curProb.id, 'SOLVED');
        }
      }
    } catch (err) {
      const curCaseIdx = activeCaseIndexRef.current;
      const fallbackError: ExecutionResult & { caseIndex?: number } = {
        stdout: '',
        stderr: getApiErrorMessage(err, 'Run all testcases failed.'),
        exitCode: 1,
        executionTimeMs: 0,
        status: 'RUNTIME_ERROR',
        triggeredBy: username || 'Peer',
        timestamp: new Date().toISOString(),
        caseIndex: curCaseIdx,
      };
      setExecutionResult(fallbackError);
    } finally {
      setIsRunning(false);
      setRunningBy(null);
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.delete('runStartedAt');
      });
    }
  }, [isRunning, language, username, isIoFolded, toggleIoFold, handleUpdateProblemStatus]);

  return {
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
  };
}
