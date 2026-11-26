import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, Folder, Loader2, Plus, Users } from 'lucide-react';
import {
  getCanonicalProblemKey,
  type ProblemData,
  type WishlistDTO,
} from '@codev/shared';
import {
  addWishlistItemApi,
  createWishlistApi,
  removeWishlistItemByKeyApi,
} from '@/api/wishlists';
import { getApiErrorMessage } from '@/lib/api';

interface SaveToWishlistButtonProps {
  problem: ProblemData;
  wishlists: WishlistDTO[];
  roomId?: string;
  onWishlistsUpdated: () => Promise<void> | void;
  compact?: boolean;
}

export function SaveToWishlistButton({
  problem,
  wishlists,
  roomId,
  onWishlistsUpdated,
  compact = false,
}: SaveToWishlistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canonicalKey = useMemo(
    () =>
      getCanonicalProblemKey({
        platform: problem.platform,
        url: problem.url,
        contestId: problem.contestId,
        index: problem.index,
        title: problem.title,
      }),
    [problem]
  );

  const editableWishlists = useMemo(
    () => wishlists.filter((w) => w.isOwner || w.visibility === 'ROOM'),
    [wishlists]
  );

  const savedInCount = useMemo(
    () => wishlists.filter((w) => w.problemKeys.includes(canonicalKey)).length,
    [wishlists, canonicalKey]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const handleToggleFolder = async (wishlist: WishlistDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    if (busyId) return;
    const isSaved = wishlist.problemKeys.includes(canonicalKey);

    try {
      setBusyId(wishlist.id);
      setErrorMsg(null);
      if (isSaved) {
        await removeWishlistItemByKeyApi(wishlist.id, canonicalKey);
      } else {
        await addWishlistItemApi(wishlist.id, { problem });
      }
      await onWishlistsUpdated();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Failed to update wishlist'));
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newFolderName.trim();
    if (!trimmed || isCreating) return;

    try {
      setIsCreating(true);
      setErrorMsg(null);
      const created = await createWishlistApi({
        name: trimmed,
        visibility: 'PRIVATE',
        roomId,
      });
      await addWishlistItemApi(created.id, { problem });
      setNewFolderName('');
      await onWishlistsUpdated();
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, 'Could not create folder'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="relative shrink-0"
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className={`inline-flex items-center gap-1 rounded transition-colors cursor-pointer ${
          compact ? 'p-0.5' : 'px-1.5 py-0.5 border'
        } ${
          savedInCount > 0
            ? compact
              ? 'text-amber-500 hover:text-amber-400'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-500 dark:text-amber-400 hover:bg-amber-500/25'
            : compact
              ? 'text-muted-foreground hover:text-foreground'
              : 'bg-muted/50 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
        title={
          savedInCount > 0
            ? `Saved in ${savedInCount} wishlist${savedInCount > 1 ? 's' : ''}`
            : 'Save to wishlist folder'
        }
      >
        <Bookmark
          size={compact ? 12 : 12}
          className={savedInCount > 0 ? 'fill-current' : ''}
        />
        {!compact && (
          <span className="text-[10px] font-semibold">
            {savedInCount > 0 ? `Saved (${savedInCount})` : 'Save'}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 z-50 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-2.5 shadow-xl space-y-2 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Bookmark size={11} className="text-amber-500" />
              Save to Wishlist
            </span>
            {savedInCount > 0 && (
              <span className="text-[10px] font-mono text-amber-500 font-semibold">
                In {savedInCount}
              </span>
            )}
          </div>

          <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
            {editableWishlists.length === 0 ? (
              <p className="text-[10px] text-muted-foreground py-2 text-center">
                No wishlist folders yet. Create one below!
              </p>
            ) : (
              editableWishlists.map((w) => {
                const isSaved = w.problemKeys.includes(canonicalKey);
                const isBusy = busyId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={(e) => handleToggleFolder(w, e)}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-primary/10 text-foreground font-medium'
                        : 'hover:bg-muted/70 text-foreground/90'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Folder
                        size={11}
                        className={isSaved ? 'text-primary shrink-0' : 'text-muted-foreground shrink-0'}
                      />
                      <span className="truncate">{w.name}</span>
                      {w.visibility === 'ROOM' && (
                        <span title="Shared with room" className="inline-flex shrink-0">
                          <Users size={10} className="text-sky-400" />
                        </span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isBusy ? (
                        <Loader2 size={11} className="animate-spin text-muted-foreground" />
                      ) : isSaved ? (
                        <Check size={12} className="text-primary font-bold" />
                      ) : (
                        <Plus size={11} className="text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {errorMsg && (
            <p className="text-[10px] text-destructive font-mono px-1">{errorMsg}</p>
          )}

          <form onSubmit={handleCreateAndSave} className="pt-1.5 border-t border-border/50 flex gap-1">
            <input
              type="text"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={isCreating}
              className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-background border border-border/70 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim() || isCreating}
              className="px-2 py-1 text-[11px] font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
              title="Create folder & save problem"
            >
              {isCreating ? <Loader2 size={11} className="animate-spin" /> : 'Add'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
