import { useCallback, useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';
import { executeCodeApi } from '@/api/execution';
import type { CollaborativeEditorHandle } from '@/components/editor/CollaborativeEditor';
import {
  CUSTOM_TEMPLATES_STORAGE_KEY,
  DEFAULT_PROBLEM_NOTES,
  LANGUAGE_META,
  isBuiltInBoilerplate,
  loadSavedTemplates,
} from '@/components/room/room.constants';
import { getApiErrorMessage } from '@/lib/api';
import type { ExecutionLanguage, ExecutionResult, ProblemData, TestCaseItem } from '@codev/shared';

interface UseRoomWorkspaceParams {
  username?: string;
  isEffectiveReadOnly: boolean;
  isIoFolded: boolean;
  toggleIoFold: (force?: boolean) => void;
}

export function useRoomWorkspace({
  username,
  isEffectiveReadOnly,
  isIoFolded,
  toggleIoFold,
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
      return LANGUAGE_META[lang].template;
    },
    [customTemplates]
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
    },
    [language, isEffectiveReadOnly, getEffectiveTemplate]
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
    const targetTemplate = getEffectiveTemplate(language);
    editorHandleRef.current?.setCode(targetTemplate);

    const doc = ydocRef.current;
    if (doc) {
      doc.getMap<string>('codeByLanguage').set(language, targetTemplate);
    }
  }, [isEffectiveReadOnly, getEffectiveTemplate, language]);

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
  }, [isRunning, language, username, isIoFolded, toggleIoFold]);

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
  };
}
