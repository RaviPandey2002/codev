import { getPeerColor } from '@/lib/colors';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export interface CollaborativeEditorHandle {
  getCode: () => string;
  setCode: (newCode: string) => void;
  formatCode: () => void;
  getDoc: () => Y.Doc | null;
}

interface CollaborativeEditorProps {
  roomId: string;
  language?: string;
  readOnly?: boolean;
  onPeerCountChange?: (count: number) => void;
  onSyncChange?: (synced: boolean) => void;
  onDocReady?: (doc: Y.Doc, handle: CollaborativeEditorHandle) => void;
  onRunShortcut?: () => void;
  onCursorChange?: (pos: { lineNumber: number; column: number }) => void;
}

const CURSOR_STYLES = `
  .yRemoteSelection {
    background-color: rgba(250, 204, 21, 0.2);
    position: absolute;
  }
  .yRemoteSelectionHead {
    position: absolute;
    border-left: 2px solid;
    border-color: inherit;
    height: 100%;
    box-sizing: border-box;
  }
  .yRemoteSelectionHead::after {
    position: absolute;
    top: -1.4em;
    left: -2px;
    font-size: 10px;
    font-family: monospace;
    font-weight: 600;
    padding: 1px 4px;
    border-radius: 3px;
    color: white;
    background-color: inherit;
    white-space: nowrap;
    content: attr(data-name);
    pointer-events: none;
    z-index: 10;
  }
`;

export function CollaborativeEditor({
  roomId,
  language = 'typescript',
  readOnly = false,
  onPeerCountChange,
  onSyncChange,
  onDocReady,
  onRunShortcut,
  onCursorChange,
}: CollaborativeEditorProps) {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const [isConnecting, setIsConnecting] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Keep latest callback refs so Monaco/Yjs listeners never invoke stale closures
  const onRunRef = useRef(onRunShortcut);
  onRunRef.current = onRunShortcut;
  const onCursorRef = useRef(onCursorChange);
  onCursorRef.current = onCursorChange;
  const onSyncRef = useRef(onSyncChange);
  onSyncRef.current = onSyncChange;
  const onPeerCountRef = useRef(onPeerCountChange);
  onPeerCountRef.current = onPeerCountChange;
  const onDocReadyRef = useRef(onDocReady);
  onDocReadyRef.current = onDocReady;

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposablesRef = useRef<any[]>([]);

  const cleanupResources = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    disposablesRef.current.forEach((d) => {
      try {
        if (typeof d?.dispose === 'function') d.dispose();
      } catch {}
    });
    disposablesRef.current = [];

    try {
      bindingRef.current?.destroy();
    } catch {
      // Ignore if already disposed by Monaco model
    }
    bindingRef.current = null;

    try {
      providerRef.current?.destroy();
    } catch {
      // Ignore
    }
    providerRef.current = null;

    try {
      ydocRef.current?.destroy();
    } catch {
      // Ignore
    }
    ydocRef.current = null;
  };

  const handleBeforeMount = (monaco: any) => {
    monaco.editor.defineTheme('codev-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#131825',
        'editorGutter.background': '#131825',
        'editor.lineHighlightBackground': '#182135',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#cbd5e1',
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    cleanupResources();
    editorRef.current = editor;

    const cursorDisp = editor.onDidChangeCursorPosition((e) => {
      onCursorRef.current?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
    if (cursorDisp) disposablesRef.current.push(cursorDisp);

    // 1. Initialize a new Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Register Ctrl/Cmd + Enter shortcut to run code directly from the editor
    const cmdDisp = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });
    if (cmdDisp) disposablesRef.current.push(cmdDisp);

    // 2. Derive the WebSocket URL
    let defaultWsUrl = '';
    if (import.meta.env.VITE_WS_URL) {
      defaultWsUrl = import.meta.env.VITE_WS_URL;
    } else if (import.meta.env.VITE_API_URL) {
      try {
        const apiUrl = new URL(import.meta.env.VITE_API_URL, window.location.origin);
        const wsProto = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        defaultWsUrl = `${wsProto}//${apiUrl.host}/ws/rooms`;
      } catch {
        // fallback
      }
    }
    if (!defaultWsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port;
      const isLocalDev = host === 'localhost' || host === '127.0.0.1' || port === '5173';
      defaultWsUrl = isLocalDev
        ? `${protocol}//${host}:3007/ws/rooms`
        : `${protocol}//${window.location.host}/ws/rooms`;
    }
    const wsBaseUrl = defaultWsUrl;

    // 3. Connect to the WebSocket room
    const provider = new WebsocketProvider(wsBaseUrl, roomId, ydoc);
    providerRef.current = provider;

    // 4. Bind Monaco's text model directly to Yjs shared text
    const ytext = ydoc.getText('monaco');
    const model = editor.getModel();
    if (model) {
      // Force LF line endings to prevent line-offset drift between Monaco and Yjs CRDT
      model.setEOL(monaco.editor.EndOfLineSequence.LF);

      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        provider.awareness as any
      );
      bindingRef.current = binding;
    }

    const controller: CollaborativeEditorHandle = {
      getCode: () => {
        const currentDoc = ydocRef.current;
        if (currentDoc) {
          const text = currentDoc.getText('monaco').toString();
          if (text.length > 0) return text;
        }
        return editorRef.current?.getModel()?.getValue() || '';
      },
      setCode: (newCode: string) => {
        const normalized = newCode.replace(/\r\n/g, '\n');
        const currentDoc = ydocRef.current;
        const currentEditor = editorRef.current;

        if (currentDoc) {
          const sharedText = currentDoc.getText('monaco');
          if (sharedText.toString() !== normalized) {
            // Reset cursor to top (1,1) so stale relative positions from the previous
            // language buffer don't get restored into the middle of keywords in the new buffer
            if (currentEditor) {
              try {
                currentEditor.setSelection({
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: 1,
                  endColumn: 1,
                });
              } catch {
                // Ignore if editor is unmounted
              }
            }

            currentDoc.transact(() => {
              sharedText.delete(0, sharedText.length);
              sharedText.insert(0, normalized);
            });
          }
          return;
        }

        const currentModel = currentEditor?.getModel();
        if (currentModel && currentModel.getValue() !== normalized) {
          currentModel.setValue(normalized);
        }
      },
      formatCode: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      },
      getDoc: () => ydocRef.current,
    };

    onDocReadyRef.current?.(ydoc, controller);

    // 5. Broadcast our username & cursor color to other peers
    const username = user?.username || 'Anonymous';
    const color = getPeerColor(user?.id || username);
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: color,
    });

    // 6. Non-blocking connection sync handling with safety timeout
    if (provider.synced) {
      setIsConnecting(false);
      onSyncRef.current?.(true);
    } else {
      setIsConnecting(true);
    }

    const handleSync = (isSynced: boolean) => {
      setIsConnecting(!isSynced);
      onSyncRef.current?.(isSynced);
      if (isSynced && syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };

    const handleStatus = ({ status }: { status: string }) => {
      if (status === 'connected' && provider.synced) {
        setIsConnecting(false);
        onSyncRef.current?.(true);
      }
    };

    provider.on('sync', handleSync);
    provider.on('status', handleStatus);

    // Safety timeout: never leave the user locked or displaying a sync spinner indefinitely
    syncTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
      if (provider.synced) {
        onSyncRef.current?.(true);
      }
    }, 1500);

    // 7. Track peer count changes (only notify parent when count actually changes)
    let lastCount = -1;
    const updatePeerCount = () => {
      // Filter out headless relays or uninitialized awareness states without user info
      const activePeers = Array.from(provider.awareness.getStates().values()).filter(
        (state: any) => Boolean(state?.user?.name)
      );
      const count = Math.max(1, activePeers.length);
      if (count !== lastCount) {
        lastCount = count;
        onPeerCountRef.current?.(count);
      }
    };

    provider.awareness.on('change', updatePeerCount);
    updatePeerCount();
  };

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [roomId]);

  return (
    <div className="relative w-full h-full flex-1 min-h-0 overflow-hidden">
      <style>{CURSOR_STYLES}</style>

      {/* Floating unobtrusive syncing pill (non-blocking) */}
      {isConnecting && (
        <div className="absolute top-2 right-4 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 border border-border/70 text-[11px] font-mono text-muted-foreground shadow-xs backdrop-blur-xs transition-opacity duration-200">
          <Loader2 size={12} className="animate-spin text-primary shrink-0" />
          <span>Syncing workspace...</span>
        </div>
      )}

      <Editor
        height="100%"
        width="100%"
        beforeMount={handleBeforeMount}
        theme={theme === 'dark' ? 'codev-dark' : 'light'}
        loading={
          <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground gap-2 text-xs font-mono">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>Initializing editor...</span>
          </div>
        }
        language={language}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace",
          fontLigatures: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          padding: { top: 12, bottom: 12 },
          dragAndDrop: false,
        }}
      />
    </div>
  );
}
