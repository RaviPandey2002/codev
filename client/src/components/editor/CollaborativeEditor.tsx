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
  const onRunRef = useRef(onRunShortcut);
  onRunRef.current = onRunShortcut;
  const onCursorRef = useRef(onCursorChange);
  onCursorRef.current = onCursorChange;
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    bindingRef.current?.destroy();
    providerRef.current?.destroy();
    ydocRef.current?.destroy();
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      onCursorRef.current?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    // 1. Initialize a new Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Register Ctrl/Cmd + Enter shortcut to run code directly from the editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });

    // 2. Derive the WebSocket URL (port 3007)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const defaultWsUrl = `${protocol}//${host}:3007/ws/rooms`;
    const wsBaseUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

    // 3. Connect to the WebSocket room
    const provider = new WebsocketProvider(wsBaseUrl, roomId, ydoc);
    providerRef.current = provider;

    // 4. Bind Monaco's text model directly to Yjs shared text
    const ytext = ydoc.getText('monaco');
    const model = editor.getModel();
    if (model) {
      const binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        provider.awareness as any
      );
      bindingRef.current = binding;

      ytext.observe(() => {
        const latest = ytext.toString();
        if (model.getValue() !== latest) {
          model.setValue(latest);
        }
      });
    }

    const controller: CollaborativeEditorHandle = {
      getCode: () => {
        const currentModel = editorRef.current?.getModel();
        if (currentModel) return currentModel.getValue();
        return ydocRef.current?.getText('monaco').toString() || '';
      },
      setCode: (newCode: string) => {
        const currentModel = editorRef.current?.getModel();
        const currentDoc = ydocRef.current;

        if (currentModel && currentModel.getValue() !== newCode) {
          currentModel.setValue(newCode);
        }

        if (currentDoc) {
          const sharedText = currentDoc.getText('monaco');
          if (sharedText.toString() !== newCode) {
            currentDoc.transact(() => {
              sharedText.delete(0, sharedText.length);
              sharedText.insert(0, newCode);
            });
          }
        }
      },
      formatCode: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      },
      getDoc: () => ydocRef.current,
    };

    onDocReady?.(ydoc, controller);

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
      onSyncChange?.(true);
    } else {
      setIsConnecting(true);
    }

    const handleSync = (isSynced: boolean) => {
      setIsConnecting(!isSynced);
      onSyncChange?.(isSynced);
      if (isSynced && syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };

    const handleStatus = ({ status }: { status: string }) => {
      if (status === 'connected' && provider.synced) {
        setIsConnecting(false);
        onSyncChange?.(true);
      }
    };

    provider.on('sync', handleSync);
    provider.on('status', handleStatus);

    // Safety timeout: never leave the user locked or displaying a sync spinner indefinitely
    syncTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
    }, 1500);

    // 7. Track peer count changes (only notify parent when count actually changes)
    let lastCount = -1;
    const updatePeerCount = () => {
      const count = provider.awareness.getStates().size;
      if (count !== lastCount) {
        lastCount = count;
        onPeerCountChange?.(count);
      }
    };

    provider.awareness.on('change', updatePeerCount);
    updatePeerCount();
  };

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      bindingRef.current?.destroy();
      bindingRef.current = null;
      providerRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current?.destroy();
      ydocRef.current = null;
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
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
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
        }}
      />
    </div>
  );
}
