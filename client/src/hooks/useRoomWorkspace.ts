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
import type { ExecutionLanguage, ExecutionResult } from '@codev/shared';

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

  const [problemNotes, setProblemNotes] = useState(DEFAULT_PROBLEM_NOTES);
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
  const notesSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (stdinSyncTimerRef.current) clearTimeout(stdinSyncTimerRef.current);
      if (notesSyncTimerRef.current) clearTimeout(notesSyncTimerRef.current);
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

      const syncedStdin = meta.get('stdin') as string | undefined;
      if (typeof syncedStdin === 'string') {
        setStdin(syncedStdin);
      }

      const syncedNotes = meta.get('problemNotes') as string | undefined;
      if (typeof syncedNotes === 'string') {
        setProblemNotes(syncedNotes);
      }

      const syncedRunning = meta.get('isRunning') as boolean | undefined;
      setIsRunning(Boolean(syncedRunning));

      const syncedRunningBy = meta.get('runningBy') as string | null | undefined;
      setRunningBy(syncedRunningBy || null);

      const syncedResult = meta.get('executionResult') as ExecutionResult | null | undefined;
      if (syncedResult !== undefined) {
        setExecutionResult(syncedResult);
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
      const handle = editorHandleRef.current;
      if (!doc || !handle) return;

      const meta = doc.getMap<any>('workspaceMeta');
      const activeLang = (meta.get('language') as ExecutionLanguage | undefined) || language;
      const currentCode = handle.getCode();
      const preferred = getEffectiveTemplate(activeLang);

      if (!currentCode.trim()) {
        // Document is empty — populate with effective template for active language
        handle.setCode(preferred);
      } else if (isBuiltInBoilerplate(currentCode)) {
        const customSaved = customTemplates[activeLang]?.trim();
        if (customSaved && currentCode.trim() !== customSaved) {
          handle.setCode(customSaved);
        }
      }
    },
    [language, customTemplates, getEffectiveTemplate]
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
    if (stdinSyncTimerRef.current) clearTimeout(stdinSyncTimerRef.current);
    stdinSyncTimerRef.current = setTimeout(() => {
      ydocRef.current?.getMap('workspaceMeta').set('stdin', val);
    }, 200);
  }, []);

  const handleProblemNotesChange = useCallback((val: string) => {
    setProblemNotes(val);
    if (notesSyncTimerRef.current) clearTimeout(notesSyncTimerRef.current);
    notesSyncTimerRef.current = setTimeout(() => {
      ydocRef.current?.getMap('workspaceMeta').set('problemNotes', val);
    }, 250);
  }, []);

  const handleClearOutput = useCallback(() => {
    setExecutionResult(null);
    ydocRef.current?.getMap('workspaceMeta').set('executionResult', null);
  }, []);

  const handleFormatCode = useCallback(() => {
    editorHandleRef.current?.formatCode();
  }, []);

  const handleRunCode = useCallback(async () => {
    const doc = ydocRef.current;
    if (!doc || isRunning) return;

    const code = editorHandleRef.current?.getCode() || doc.getText('monaco').toString();
    if (!code.trim()) return;

    const meta = doc.getMap<any>('workspaceMeta');
    const currentLang = (meta.get('language') as ExecutionLanguage) || language;
    const currentStdin = stdinRef.current;
    meta.set('stdin', currentStdin);

    if (isIoFolded) {
      toggleIoFold(false);
    }

    doc.transact(() => {
      meta.set('isRunning', true);
      meta.set('runningBy', username || 'Peer');
    });

    try {
      const result = await executeCodeApi({
        language: currentLang,
        compilerProfile: 'default',
        code,
        stdin: currentStdin,
      });

      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.set('executionResult', result);
      });
    } catch (err) {
      const fallbackError: ExecutionResult = {
        stdout: '',
        stderr: getApiErrorMessage(err, 'Execution request failed.'),
        exitCode: 1,
        executionTimeMs: 0,
        status: 'RUNTIME_ERROR',
        triggeredBy: username || 'Peer',
        timestamp: new Date().toISOString(),
      };
      doc.transact(() => {
        meta.set('isRunning', false);
        meta.set('runningBy', null);
        meta.set('executionResult', fallbackError);
      });
    }
  }, [isRunning, language, username, isIoFolded, toggleIoFold]);

  return {
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
  };
}
