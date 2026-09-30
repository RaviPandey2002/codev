import {
  AlignLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Code2,
  Eye,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useRef } from 'react';
import type * as Y from 'yjs';
import {
  CollaborativeEditor,
  type CollaborativeEditorHandle,
} from '@/components/editor/CollaborativeEditor';
import { type ColumnId, LANGUAGE_META } from '@/components/room/room.constants';
import type { ExecutionLanguage, RoomRole } from '@codev/shared';

interface EditorColumnProps {
  flexOrder: number;
  isHidden: boolean;
  roomId: string;
  language: ExecutionLanguage;
  userRole: RoomRole | null;
  isSelfViewOnly: boolean;
  onToggleSelfViewOnly: () => void;
  isEffectiveReadOnly: boolean;
  maximizedColumn: ColumnId | null;
  onToggleMaximize: () => void;
  hasCustomTemplateForLang: boolean;
  savedTemplateFlash: boolean;
  onLanguageChange: (lang: ExecutionLanguage) => void;
  onFormatCode: () => void;
  onSaveCustomTemplate: () => void;
  onResetToTemplate: () => void;
  onClearCustomTemplate: () => void;
  isSynced: boolean;
  onPeerCountChange: (count: number) => void;
  onSyncChange: (synced: boolean) => void;
  onDocReady: (doc: Y.Doc, handle: CollaborativeEditorHandle) => void;
  onRunCode: () => void;
}

export function EditorColumn({
  flexOrder,
  isHidden,
  roomId,
  language,
  userRole,
  isSelfViewOnly,
  onToggleSelfViewOnly,
  isEffectiveReadOnly,
  maximizedColumn,
  onToggleMaximize,
  hasCustomTemplateForLang,
  savedTemplateFlash,
  onLanguageChange,
  onFormatCode,
  onSaveCustomTemplate,
  onResetToTemplate,
  onClearCustomTemplate,
  isSynced,
  onPeerCountChange,
  onSyncChange,
  onDocReady,
  onRunCode,
}: EditorColumnProps) {
  const langMeta = LANGUAGE_META[language] || LANGUAGE_META.cpp;

  // Direct DOM ref for cursor position so typing/moving cursor never re-renders
  const cursorLabelRef = useRef<HTMLSpanElement | null>(null);
  const handleCursorChange = useCallback((pos: { lineNumber: number; column: number }) => {
    if (cursorLabelRef.current) {
      cursorLabelRef.current.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }
  }, []);

  return (
    <div
      style={{
        order: flexOrder,
        flex: '1 1 var(--col-editor-w, 44%)',
      }}
      className={`${
        isHidden ? 'hidden' : 'flex'
      } min-h-0 min-w-0 h-full rounded-xl border border-border/70 bg-card flex-col overflow-hidden shadow-xs`}
    >
      {/* Tier 1: 36px LeetCode Card Tabbar (`</> Code` + Maximize) */}
      <div className="h-9 border-b border-border/60 bg-muted/35 px-2.5 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <Code2 size={14} className="text-emerald-500 shrink-0" />
          <span className="text-xs font-semibold text-foreground">Code</span>
          <span className="text-[11px] font-mono text-muted-foreground ml-1">
            ({langMeta.fileName})
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMaximize}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          title={maximizedColumn === 'editor' ? 'Restore Split View' : 'Maximize Code Editor'}
        >
          {maximizedColumn === 'editor' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* Tier 2: 32px Editor Sub-Toolbar */}
      <div className="min-h-8 border-b border-border/50 bg-card px-2.5 py-1 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as ExecutionLanguage)}
            disabled={isEffectiveReadOnly}
            className="h-6 rounded-md border border-transparent hover:border-border/70 bg-transparent hover:bg-muted/50 px-1.5 text-xs font-mono font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer transition-colors"
            title="Switch language (auto-loads your template or saved room code)"
          >
            <option value="cpp" className="bg-card text-foreground">C++20 (g++)</option>
            <option value="c" className="bg-card text-foreground">C17 (gcc)</option>
            <option value="python" className="bg-card text-foreground">Python 3</option>
            <option value="typescript" className="bg-card text-foreground">TypeScript</option>
            <option value="javascript" className="bg-card text-foreground">JavaScript</option>
          </select>

          <div className="h-3 w-[1px] bg-border/60" />

          {userRole !== 'VIEWER' && (
            <button
              type="button"
              onClick={onToggleSelfViewOnly}
              className={`h-6 px-2 rounded text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                isSelfViewOnly
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={
                isSelfViewOnly
                  ? 'Locked in View-Only mode (click to resume editing)'
                  : 'Switch to View-Only mode to prevent accidental typing'
              }
            >
              {isSelfViewOnly ? <Eye size={11} /> : <Pencil size={11} />}
              <span>{isSelfViewOnly ? 'Viewing' : 'Editing'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onFormatCode}
            disabled={isEffectiveReadOnly}
            className="h-6 px-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1 text-[11px] font-mono cursor-pointer disabled:opacity-50"
            title="Format Document"
          >
            <AlignLeft size={12} />
          </button>

          <button
            type="button"
            onClick={onSaveCustomTemplate}
            className={`h-6 px-2 rounded flex items-center gap-1 text-[11px] font-mono cursor-pointer transition-colors ${
              savedTemplateFlash
                ? 'text-emerald-500 bg-emerald-500/10'
                : hasCustomTemplateForLang
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            title={
              hasCustomTemplateForLang
                ? `Update your saved ${langMeta.label} template`
                : `Save current code as your personal ${langMeta.label} template`
            }
          >
            {savedTemplateFlash ? (
              <>
                <Check size={12} />
                <span>Saved!</span>
              </>
            ) : hasCustomTemplateForLang ? (
              <>
                <BookmarkCheck size={12} />
                <span className="hidden xl:inline">Save Template</span>
              </>
            ) : (
              <>
                <Bookmark size={12} />
                <span className="hidden xl:inline">Save Template</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onResetToTemplate}
            disabled={isEffectiveReadOnly}
            className="h-6 px-2 rounded text-[11px] font-mono flex items-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer disabled:opacity-50"
            title={
              hasCustomTemplateForLang
                ? `Reset editor to your saved ${langMeta.label} template`
                : `Reset editor to default ${langMeta.label} template`
            }
          >
            <RotateCcw size={12} />
            <span className="hidden lg:inline">
              {hasCustomTemplateForLang ? 'My Template' : 'Template'}
            </span>
          </button>

          {hasCustomTemplateForLang && (
            <button
              type="button"
              onClick={onClearCustomTemplate}
              disabled={isEffectiveReadOnly}
              className="h-6 px-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center cursor-pointer"
              title="Delete custom template and restore built-in default"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Collaborative Monaco Canvas */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-background">
        <CollaborativeEditor
          roomId={roomId}
          language={language}
          readOnly={isEffectiveReadOnly}
          onPeerCountChange={onPeerCountChange}
          onSyncChange={onSyncChange}
          onDocReady={onDocReady}
          onRunShortcut={onRunCode}
          onCursorChange={handleCursorChange}
        />
      </div>

      {/* Bottom Status Footer */}
      <div className="h-6 border-t border-border/60 bg-muted/25 px-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <Sparkles size={10} className={isSynced ? 'text-emerald-500' : 'text-amber-500'} />
            <span>{isSynced ? 'Saved' : 'Syncing...'}</span>
          </span>
          {hasCustomTemplateForLang && (
            <span className="hidden sm:inline text-primary/80">• Custom Template</span>
          )}
        </div>
        <span ref={cursorLabelRef}>Ln 1, Col 1</span>
      </div>
    </div>
  );
}
