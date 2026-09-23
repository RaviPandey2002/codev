import { getPeerColor } from '@/lib/colors';
import { useAuthStore } from '@/stores/auth.store';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

import { useThemeStore } from '@/stores/theme.store';

interface CollaborativeEditorProps {
  roomId: string;
  language?: string;
  readOnly?: boolean;
  onPeerCountChange?: (count: number) => void;
  onSyncChange?: (synced: boolean) => void;
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
}: CollaborativeEditorProps) {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const [isConnecting, setIsConnecting] = useState(true);

  // Keep references to our CRDT & WebSocket objects so they survive re-renders
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    // 1. Initialize a new Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

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
    }

    // 5. Broadcast our username & cursor color to other peers
    const username = user?.username || 'Anonymous';
    const color = getPeerColor(user?.id || username);
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: color,
    });

    // 6. Listen for connection sync events
    provider.on('sync', (isSynced: boolean) => {
      setIsConnecting(!isSynced);
      onSyncChange?.(isSynced);
    });

    // 7. Track peer count changes in the room
    const updatePeerCount = () => {
      const activePeers = provider.awareness.getStates().size;
      onPeerCountChange?.(activePeers);
    };

    provider.awareness.on('change', updatePeerCount);
    updatePeerCount();
  };

  // Clean up when leaving the room (prevents memory leaks & closes socket)
  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex-1 min-h-0 overflow-hidden">
      <style>{CURSOR_STYLES}</style>

      {/* Loading Overlay while performing the initial CRDT sync */}
      {isConnecting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xs">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Loader2 size={16} className="animate-spin text-primary" />
            <span>Syncing workspace...</span>
          </div>
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
          minimap: { enabled: true, maxColumn: 80 },
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}