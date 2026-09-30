import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLUMN_ORDER_STORAGE_KEY,
  type ColumnId,
  LEFT_FOLDED_STORAGE_KEY,
  RIGHT_FOLDED_STORAGE_KEY,
  loadColumnOrder,
} from '@/components/room/room.constants';

export function useWorkspaceLayout() {
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => loadColumnOrder());
  const [isContextFolded, setIsContextFolded] = useState<boolean>(() => {
    return localStorage.getItem(LEFT_FOLDED_STORAGE_KEY) === 'true';
  });
  const [isIoFolded, setIsIoFolded] = useState<boolean>(() => {
    return localStorage.getItem(RIGHT_FOLDED_STORAGE_KEY) === 'true';
  });
  const [maximizedColumn, setMaximizedColumn] = useState<ColumnId | null>(null);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Column widths & I/O vertical split stored in refs and applied via CSS variables for 0-re-render dragging
  const colWidthsRef = useRef<Record<ColumnId, number>>({
    context: 26,
    editor: 44,
    io: 30,
  });
  const ioSplitRef = useRef<number>(58);

  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);
  const ioContainerRef = useRef<HTMLDivElement | null>(null);
  const dragShieldRef = useRef<HTMLDivElement | null>(null);

  const isColFolded = useCallback(
    (colId: ColumnId) => {
      if (colId === 'context') return isContextFolded;
      if (colId === 'io') return isIoFolded;
      return false;
    },
    [isContextFolded, isIoFolded]
  );

  // Sync normalized CSS width variables onto workspaceContainerRef
  const applyLayoutCssVars = useCallback(() => {
    const el = workspaceContainerRef.current;
    if (!el) return;

    const unfolded = columnOrder.filter((c) => !isColFolded(c));
    const totalRaw = unfolded.reduce((sum, c) => sum + colWidthsRef.current[c], 0) || 100;

    (['context', 'editor', 'io'] as ColumnId[]).forEach((c) => {
      if (maximizedColumn === c) {
        el.style.setProperty(`--col-${c}-w`, '100%');
      } else {
        const pct = (colWidthsRef.current[c] / totalRaw) * 100;
        el.style.setProperty(`--col-${c}-w`, `${pct.toFixed(2)}%`);
      }
    });

    el.style.setProperty('--io-top-h', `${ioSplitRef.current.toFixed(2)}%`);
    el.style.setProperty('--io-bot-h', `${(100 - ioSplitRef.current).toFixed(2)}%`);
  }, [columnOrder, isColFolded, maximizedColumn]);

  useEffect(() => {
    applyLayoutCssVars();
  }, [applyLayoutCssVars]);

  // Callback ref so CSS variables are applied immediately when workspace container mounts after loading
  const setWorkspaceContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      workspaceContainerRef.current = node;
      if (node) {
        applyLayoutCssVars();
      }
    },
    [applyLayoutCssVars]
  );

  // Compute initial/render-time CSS custom properties so the very first paint is already normalized
  const unfoldedCols = columnOrder.filter((c) => !isColFolded(c));
  const totalRawWidth =
    unfoldedCols.reduce((sum, c) => sum + colWidthsRef.current[c], 0) || 100;

  const workspaceStyle = {
    '--col-context-w':
      maximizedColumn === 'context'
        ? '100%'
        : `${((colWidthsRef.current.context / totalRawWidth) * 100).toFixed(2)}%`,
    '--col-editor-w':
      maximizedColumn === 'editor'
        ? '100%'
        : `${((colWidthsRef.current.editor / totalRawWidth) * 100).toFixed(2)}%`,
    '--col-io-w':
      maximizedColumn === 'io'
        ? '100%'
        : `${((colWidthsRef.current.io / totalRawWidth) * 100).toFixed(2)}%`,
    '--io-top-h': `${ioSplitRef.current.toFixed(2)}%`,
    '--io-bot-h': `${(100 - ioSplitRef.current).toFixed(2)}%`,
  } as React.CSSProperties;

  // Zero-re-render pointer drag starter for column widths
  const startColumnResize = useCallback(
    (e: React.PointerEvent, leftCol: ColumnId, rightCol: ColumnId) => {
      e.preventDefault();
      const container = workspaceContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;

      const startX = e.clientX;
      const unfolded = columnOrder.filter((c) => !isColFolded(c));
      const totalRaw = unfolded.reduce((sum, c) => sum + colWidthsRef.current[c], 0) || 100;

      // Normalize before starting drag so 1% mouse delta === 1% visual width
      unfolded.forEach((c) => {
        colWidthsRef.current[c] = (colWidthsRef.current[c] / totalRaw) * 100;
      });

      const startLeft = colWidthsRef.current[leftCol];
      const startRight = colWidthsRef.current[rightCol];
      const combined = startLeft + startRight;

      if (dragShieldRef.current) {
        dragShieldRef.current.style.display = 'block';
        dragShieldRef.current.style.cursor = 'col-resize';
      }

      let rafId = 0;
      const onMove = (ev: PointerEvent) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const deltaPct = ((ev.clientX - startX) / rect.width) * 100;
          const nextLeft = Math.min(combined - 16, Math.max(16, startLeft + deltaPct));
          const nextRight = combined - nextLeft;
          colWidthsRef.current[leftCol] = nextLeft;
          colWidthsRef.current[rightCol] = nextRight;
          container.style.setProperty(`--col-${leftCol}-w`, `${nextLeft.toFixed(2)}%`);
          container.style.setProperty(`--col-${rightCol}-w`, `${nextRight.toFixed(2)}%`);
        });
      };

      const onUp = () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (dragShieldRef.current) {
          dragShieldRef.current.style.display = 'none';
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [columnOrder, isColFolded]
  );

  // Zero-re-render pointer drag starter for Output / Input vertical split
  const startIoResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const ioEl = ioContainerRef.current;
    const wsEl = workspaceContainerRef.current;
    if (!ioEl || !wsEl) return;

    const rect = ioEl.getBoundingClientRect();
    if (rect.height <= 0) return;

    if (dragShieldRef.current) {
      dragShieldRef.current.style.display = 'block';
      dragShieldRef.current.style.cursor = 'row-resize';
    }

    let rafId = 0;
    const onMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const pct = Math.min(84, Math.max(18, ((ev.clientY - rect.top) / rect.height) * 100));
        ioSplitRef.current = pct;
        wsEl.style.setProperty('--io-top-h', `${pct.toFixed(2)}%`);
        wsEl.style.setProperty('--io-bot-h', `${(100 - pct).toFixed(2)}%`);
      });
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (dragShieldRef.current) {
        dragShieldRef.current.style.display = 'none';
      }
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  const toggleContextFold = useCallback((forceState?: boolean) => {
    setIsContextFolded((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      try {
        localStorage.setItem(LEFT_FOLDED_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      if (!next) {
        setMaximizedColumn((m) => (m === 'editor' ? null : m));
      }
      return next;
    });
  }, []);

  const toggleIoFold = useCallback((forceState?: boolean) => {
    setIsIoFolded((prev) => {
      const next = typeof forceState === 'boolean' ? forceState : !prev;
      try {
        localStorage.setItem(RIGHT_FOLDED_STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      if (!next) {
        setMaximizedColumn((m) => (m === 'editor' ? null : m));
      }
      return next;
    });
  }, []);

  const updateColumnOrder = useCallback((nextOrder: ColumnId[]) => {
    setColumnOrder(nextOrder);
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(nextOrder));
    } catch {
      // Ignore
    }
  }, []);

  const handleSwapColumns = useCallback((idxA: number, idxB: number) => {
    setColumnOrder((prev) => {
      if (idxA < 0 || idxB < 0 || idxA >= prev.length || idxB >= prev.length || idxA === idxB) {
        return prev;
      }
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      try {
        localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const resetColumnWidths = useCallback(() => {
    colWidthsRef.current = { context: 26, editor: 44, io: 30 };
    applyLayoutCssVars();
  }, [applyLayoutCssVars]);

  const resetIoSplit = useCallback(() => {
    ioSplitRef.current = 58;
    applyLayoutCssVars();
  }, [applyLayoutCssVars]);

  const handleResetLayout = useCallback(() => {
    colWidthsRef.current = { context: 26, editor: 44, io: 30 };
    ioSplitRef.current = 58;
    updateColumnOrder(['context', 'editor', 'io']);
    toggleContextFold(false);
    toggleIoFold(false);
    setMaximizedColumn(null);
    applyLayoutCssVars();
    setIsLayoutMenuOpen(false);
  }, [updateColumnOrder, toggleContextFold, toggleIoFold, applyLayoutCssVars]);

  return {
    columnOrder,
    isContextFolded,
    isIoFolded,
    maximizedColumn,
    setMaximizedColumn,
    isLayoutMenuOpen,
    setIsLayoutMenuOpen,
    workspaceContainerRef,
    setWorkspaceContainerRef,
    workspaceStyle,
    ioContainerRef,
    dragShieldRef,
    isColFolded,
    startColumnResize,
    startIoResize,
    toggleContextFold,
    toggleIoFold,
    updateColumnOrder,
    handleSwapColumns,
    resetColumnWidths,
    resetIoSplit,
    handleResetLayout,
  };
}
