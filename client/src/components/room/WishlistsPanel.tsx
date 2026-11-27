import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Edit2,
  ExternalLink,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import {
  getCanonicalProblemKey,
  getProblemExternalUrl,
  type ProblemData,
  type QueueProblemItem,
  type WishlistDTO,
  type WishlistVisibility,
  type WishlistWithItemsDTO,
} from '@codev/shared';
import {
  addWishlistItemApi,
  addWishlistItemsBulkApi,
  createWishlistApi,
  deleteWishlistApi,
  getWishlistDetailApi,
  removeWishlistItemApi,
  updateWishlistApi,
} from '@/api/wishlists';
import {
  CURATED_WISHLISTS,
  type CuratedWishlist,
} from '@/components/room/wishlists.constants';
import { getApiErrorMessage } from '@/lib/api';

interface WishlistsPanelProps {
  wishlists: WishlistDTO[];
  isLoadingWishlists: boolean;
  wishlistsError: string | null;
  onRefreshWishlists: () => Promise<void>;
  selectedWishlistId: string | null;
  onSelectWishlistId: (id: string | null) => void;
  isEffectiveReadOnly?: boolean;
  roomId?: string;
  queue: QueueProblemItem[];
  onAddProblemToSession?: (problem: ProblemData, autoSelect?: boolean) => void;
  onSwitchToSessionTab: () => void;
}

function getDifficultyBadgeClass(difficulty?: string): string {
  if (!difficulty) return 'bg-muted/70 text-muted-foreground';
  const norm = difficulty.toLowerCase();
  if (norm === 'easy') return 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400';
  if (norm === 'medium') return 'bg-amber-500/15 text-amber-500 dark:text-amber-400';
  if (norm === 'hard') return 'bg-rose-500/15 text-rose-500 dark:text-rose-400';
  return 'bg-muted/70 text-muted-foreground';
}

export function WishlistsPanel({
  wishlists,
  isLoadingWishlists,
  wishlistsError,
  onRefreshWishlists,
  selectedWishlistId,
  onSelectWishlistId,
  isEffectiveReadOnly = false,
  roomId,
  queue,
  onAddProblemToSession,
  onSwitchToSessionTab,
}: WishlistsPanelProps) {
  // Active drilled-down folder
  const [selectedDetail, setSelectedDetail] = useState<WishlistWithItemsDTO | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Create folder UI
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState<WishlistVisibility>('PRIVATE');
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Drill-down add problem / edit folder / search
  const [addUrlInput, setAddUrlInput] = useState('');
  const [isAddingProblem, setIsAddingProblem] = useState(false);
  const [addProblemError, setAddProblemError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // Pull & Clone feedback
  const [pulledFeedbackId, setPulledFeedbackId] = useState<string | null>(null);
  const [cloningCuratedId, setCloningCuratedId] = useState<string | null>(null);
  const [clonedCuratedId, setClonedCuratedId] = useState<string | null>(null);

  const queueKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of queue) {
      keys.add(
        getCanonicalProblemKey({
          platform: item.platform,
          url: item.urlOrId.startsWith('http') ? item.urlOrId : undefined,
          urlOrId: item.urlOrId,
          title: item.title,
        })
      );
    }
    return keys;
  }, [queue]);

  const loadFolderDetail = useCallback(async (wishlistId: string) => {
    try {
      setIsLoadingDetail(true);
      setDetailError(null);
      const detail = await getWishlistDetailApi(wishlistId);
      setSelectedDetail(detail);
      setEditName(detail.name);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Failed to load folder items'));
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedWishlistId) {
      loadFolderDetail(selectedWishlistId);
    } else {
      setSelectedDetail(null);
      setItemSearch('');
      setIsEditingMeta(false);
      setAddProblemError(null);
    }
  }, [selectedWishlistId, wishlists, loadFolderDetail]);

  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || isCreating) return;

    try {
      setIsCreating(true);
      setActionError(null);
      const created = await createWishlistApi({
        name: trimmed,
        description: newDescription.trim() || undefined,
        visibility: roomId && newVisibility === 'ROOM' ? 'ROOM' : 'PRIVATE',
        roomId,
      });
      setNewName('');
      setNewDescription('');
      setNewVisibility('PRIVATE');
      setShowCreateForm(false);
      await onRefreshWishlists();
      onSelectWishlistId(created.id);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to create wishlist'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWishlist = async (
    wishlist: WishlistDTO,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete wishlist folder "${wishlist.name}"? Problems inside will be removed from this folder.`
    );
    if (!confirmed) return;

    try {
      setActionError(null);
      await deleteWishlistApi(wishlist.id);
      if (selectedWishlistId === wishlist.id) {
        onSelectWishlistId(null);
      }
      await onRefreshWishlists();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to delete wishlist'));
    }
  };

  const pushProblemsToSession = (problems: ProblemData[], feedbackKey: string) => {
    if (isEffectiveReadOnly || !onAddProblemToSession || problems.length === 0) return;
    const queueBefore = queue.length;
    problems.forEach((prob, idx) => {
      onAddProblemToSession(prob, idx === 0 && queueBefore === 0);
    });
    setPulledFeedbackId(feedbackKey);
    setTimeout(() => setPulledFeedbackId(null), 1800);
  };

  const handlePullCustomWishlist = async (
    wishlistId: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    try {
      setActionError(null);
      const detail =
        selectedDetail?.id === wishlistId
          ? selectedDetail
          : await getWishlistDetailApi(wishlistId);

      if (detail.items.length === 0) {
        setActionError(`"${detail.name}" has no problems yet.`);
        return;
      }

      pushProblemsToSession(
        detail.items.map((item) => item.problem),
        wishlistId
      );
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to pull wishlist into session'));
    }
  };

  const handlePullCuratedWishlist = (curated: CuratedWishlist) => {
    const problems: ProblemData[] = curated.problems.map((p) => ({
      title: p.title,
      platform: p.platform,
      url: p.urlOrId,
      difficulty: p.difficulty,
      sampleCases: p.sampleCases,
      codeSnippets: p.codeSnippets,
      description: `Imported from curated wishlist: ${curated.title}`,
    }));
    pushProblemsToSession(problems, `curated:${curated.id}`);
  };

  const handleCloneCuratedWishlist = async (curated: CuratedWishlist) => {
    if (cloningCuratedId) return;
    try {
      setCloningCuratedId(curated.id);
      setActionError(null);
      const created = await createWishlistApi({
        name: curated.title,
        description: curated.description,
        visibility: 'PRIVATE',
        roomId,
      });

      await addWishlistItemsBulkApi(created.id, {
        items: curated.problems.map((p) => ({
          problem: {
            title: p.title,
            platform: p.platform,
            url: p.urlOrId,
            difficulty: p.difficulty,
            sampleCases: p.sampleCases,
            codeSnippets: p.codeSnippets,
            description: `Cloned from curated wishlist: ${curated.title}`,
          },
        })),
      });

      await onRefreshWishlists();
      setClonedCuratedId(curated.id);
      setTimeout(() => setClonedCuratedId(null), 2000);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to clone collection'));
    } finally {
      setCloningCuratedId(null);
    }
  };

  const handleAddProblemToFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWishlistId || !addUrlInput.trim() || isAddingProblem) return;

    const trimmed = addUrlInput.trim();
    try {
      setIsAddingProblem(true);
      setAddProblemError(null);
      await addWishlistItemApi(selectedWishlistId, {
        urlOrId: trimmed,
      });
      setAddUrlInput('');
      await Promise.all([loadFolderDetail(selectedWishlistId), onRefreshWishlists()]);
    } catch (err) {
      setAddProblemError(getApiErrorMessage(err, 'Failed to add problem to folder'));
    } finally {
      setIsAddingProblem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedWishlistId) return;
    try {
      await removeWishlistItemApi(selectedWishlistId, itemId);
      await Promise.all([loadFolderDetail(selectedWishlistId), onRefreshWishlists()]);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Failed to remove problem'));
    }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || !editName.trim() || isSavingMeta) return;
    try {
      setIsSavingMeta(true);
      await updateWishlistApi(selectedDetail.id, { name: editName.trim() });
      setIsEditingMeta(false);
      await Promise.all([loadFolderDetail(selectedDetail.id), onRefreshWishlists()]);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Failed to rename folder'));
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!selectedDetail || !selectedDetail.isOwner || !roomId) return;
    const nextVis: WishlistVisibility =
      selectedDetail.visibility === 'ROOM' ? 'PRIVATE' : 'ROOM';
    try {
      await updateWishlistApi(selectedDetail.id, {
        visibility: nextVis,
        roomId,
      });
      await Promise.all([loadFolderDetail(selectedDetail.id), onRefreshWishlists()]);
    } catch (err) {
      setDetailError(getApiErrorMessage(err, 'Failed to update folder visibility'));
    }
  };

  const filteredItems = useMemo(() => {
    if (!selectedDetail) return [];
    const q = itemSearch.trim().toLowerCase();
    if (!q) return selectedDetail.items;
    return selectedDetail.items.filter(
      (item) =>
        item.problem.title.toLowerCase().includes(q) ||
        item.problem.platform.toLowerCase().includes(q) ||
        (item.problem.difficulty || '').toLowerCase().includes(q)
    );
  }, [selectedDetail, itemSearch]);

  // ── VIEW B: Selected Folder Drill-Down ───────────────────────────────────
  if (selectedWishlistId) {
    const canEdit = Boolean(
      selectedDetail && (selectedDetail.isOwner || selectedDetail.visibility === 'ROOM')
    );

    return (
      <div className="flex-1 min-h-0 flex flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar bg-background/40">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
          <button
            type="button"
            onClick={() => onSelectWishlistId(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft size={13} />
            <span>All Folders</span>
          </button>

          {selectedDetail && selectedDetail.items.length > 0 && (
            <button
              type="button"
              disabled={isEffectiveReadOnly}
              onClick={() => handlePullCustomWishlist(selectedDetail.id)}
              className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold inline-flex items-center gap-1 hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0 transition-opacity shadow-xs"
              title={isEffectiveReadOnly ? 'View-only mode' : 'Add all problems in folder to active Session'}
            >
              {pulledFeedbackId === selectedDetail.id ? (
                <>
                  <Check size={11} />
                  <span>Added to Session!</span>
                </>
              ) : (
                <>
                  <Plus size={11} />
                  <span>Add All ({selectedDetail.items.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        {isLoadingDetail && !selectedDetail ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-xs">
            <Loader2 size={14} className="animate-spin" />
            <span>Loading folder...</span>
          </div>
        ) : selectedDetail ? (
          <>
            {/* Folder Header & Controls */}
            <div className="space-y-1.5">
              {isEditingMeta ? (
                <form onSubmit={handleSaveMeta} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSavingMeta}
                    className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!editName.trim() || isSavingMeta}
                    className="px-2 py-1 text-[11px] font-semibold bg-primary text-primary-foreground rounded-md cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingMeta(false);
                      setEditName(selectedDetail.name);
                    }}
                    className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen size={15} className="text-amber-500 shrink-0" />
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {selectedDetail.name}
                    </h4>
                    {selectedDetail.isOwner && (
                      <button
                        type="button"
                        onClick={() => setIsEditingMeta(true)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                        title="Rename folder"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}
                  </div>

                  {selectedDetail.isOwner && roomId ? (
                    <button
                      type="button"
                      onClick={handleToggleVisibility}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 ${
                        selectedDetail.visibility === 'ROOM'
                          ? 'bg-sky-500/15 border-sky-500/30 text-sky-500 dark:text-sky-400'
                          : 'bg-muted/60 border-border/60 text-muted-foreground hover:text-foreground'
                      }`}
                      title="Toggle sharing with peers in this room"
                    >
                      {selectedDetail.visibility === 'ROOM' ? (
                        <>
                          <Users size={10} />
                          <span>Room Shared</span>
                        </>
                      ) : (
                        <>
                          <Lock size={10} />
                          <span>Private</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30 inline-flex items-center gap-1 shrink-0">
                      <Users size={10} />
                      <span>By {selectedDetail.ownerUsername || 'Peer'}</span>
                    </span>
                  )}
                </div>
              )}

              {selectedDetail.description && (
                <p className="text-[11px] text-muted-foreground">{selectedDetail.description}</p>
              )}
            </div>

            {detailError && (
              <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 font-mono">
                {detailError}
              </p>
            )}

            {/* Add Problem directly to this Folder */}
            {canEdit && (
              <form onSubmit={handleAddProblemToFolder} className="space-y-1">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add LeetCode URL or CF ID (e.g. 2290H)..."
                    value={addUrlInput}
                    onChange={(e) => setAddUrlInput(e.target.value)}
                    disabled={isAddingProblem}
                    className="flex-1 px-2.5 py-1 text-xs bg-background border border-border/70 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={!addUrlInput.trim() || isAddingProblem}
                    className="px-2.5 py-1 text-xs font-semibold bg-muted hover:bg-primary hover:text-primary-foreground text-foreground rounded-md disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  >
                    {isAddingProblem ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={12} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
                {addProblemError && (
                  <p className="text-[10px] text-destructive font-mono">{addProblemError}</p>
                )}
              </form>
            )}

            {/* Filter input when folder has multiple problems */}
            {selectedDetail.items.length > 3 && (
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Filter problems in folder..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-card/60 border border-border/60 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Problems List */}
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border/70 rounded-lg p-4 text-muted-foreground space-y-1">
                <p className="text-xs font-medium text-foreground">
                  {selectedDetail.items.length === 0
                    ? 'Folder is empty'
                    : 'No matching problems'}
                </p>
                <p className="text-[11px]">
                  {selectedDetail.items.length === 0
                    ? 'Paste a problem URL above or click the Bookmark icon on any problem.'
                    : 'Try adjusting your search query.'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredItems.map((item) => {
                  const inSession = queueKeys.has(item.canonicalKey);
                  const extUrl = getProblemExternalUrl(item.problem);
                  return (
                    <div
                      key={item.id}
                      className="group p-2.5 rounded-lg border border-border/60 bg-card/50 hover:bg-accent/30 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold text-foreground truncate">
                            {item.problem.title}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                            <span className="uppercase font-semibold text-muted-foreground">
                              {item.problem.platform}
                            </span>
                            {item.problem.difficulty && (
                              <span
                                className={`px-1.5 py-0.2 rounded font-semibold ${getDifficultyBadgeClass(
                                  item.problem.difficulty
                                )}`}
                              >
                                {item.problem.difficulty}
                              </span>
                            )}
                            {item.problem.sampleCases && item.problem.sampleCases.length > 0 && (
                              <span className="text-muted-foreground">
                                {item.problem.sampleCases.length} cases
                              </span>
                            )}
                            {extUrl && (
                              <a
                                href={extUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-sky-500 hover:text-sky-400 transition-colors"
                                title="Open problem on official platform"
                              >
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {inSession ? (
                            <button
                              type="button"
                              onClick={onSwitchToSessionTab}
                              className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Already in active session"
                            >
                              <Check size={10} />
                              <span>In Session</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isEffectiveReadOnly}
                              onClick={() => {
                                onAddProblemToSession?.(item.problem, queue.length === 0);
                              }}
                              className="px-2 py-1 rounded bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 text-[10px] font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer transition-colors"
                              title={isEffectiveReadOnly ? 'View-only mode' : 'Add problem to active practice session'}
                            >
                              <Plus size={10} />
                              <span>Session</span>
                            </button>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                              title="Remove from folder"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  // ── VIEW A: Folder Directory + Curated Starter Collections ────────────────
  return (
    <div className="flex-1 min-h-0 flex flex-col p-3 space-y-3 overflow-y-auto custom-scrollbar bg-background/40">
      {/* 1. Custom Wishlist Folders Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Bookmark size={12} className="text-amber-500" />
            <span>My Wishlists</span>
            <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] font-bold text-foreground">
              {wishlists.length}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="px-2 py-1 rounded-md bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <FolderPlus size={12} />
            <span>New Folder</span>
          </button>
        </div>

        {/* Inline New Folder Creation Form */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateWishlist}
            className="p-2.5 rounded-lg border border-primary/40 bg-card/80 space-y-2 animate-in fade-in-0 duration-150"
          >
            <input
              type="text"
              placeholder="Folder name (e.g. DP Must-Do, Blind 75)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={isCreating}
              className="w-full px-2.5 py-1.5 text-xs bg-background border border-border/70 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <input
              type="text"
              placeholder="Optional description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              disabled={isCreating}
              className="w-full px-2.5 py-1 text-[11px] bg-background border border-border/70 rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {roomId ? (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newVisibility === 'ROOM'}
                    onChange={(e) =>
                      setNewVisibility(e.target.checked ? 'ROOM' : 'PRIVATE')
                    }
                    className="rounded border-border"
                  />
                  <span>Share with peers in this room</span>
                </label>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim() || isCreating}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  {isCreating && <Loader2 size={11} className="animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {(wishlistsError || actionError) && (
          <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 rounded p-1.5 font-mono">
            {actionError || wishlistsError}
          </p>
        )}

        {isLoadingWishlists && wishlists.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2 text-xs">
            <Loader2 size={13} className="animate-spin" />
            <span>Loading folders...</span>
          </div>
        ) : wishlists.length === 0 ? (
          <div className="py-5 text-center border border-dashed border-border/70 rounded-lg p-4 text-muted-foreground space-y-1.5">
            <p className="text-xs font-medium text-foreground">No saved folders yet</p>
            <p className="text-[11px]">
              Create a custom wishlist folder or clone a starter collection below to save problems across sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {wishlists.map((w) => (
              <div
                key={w.id}
                onClick={() => onSelectWishlistId(w.id)}
                className="group p-2.5 rounded-lg border border-border/60 bg-card/50 hover:bg-accent/30 hover:border-border transition-all cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Folder size={13} className="text-amber-500 shrink-0" />
                    <h5 className="text-xs font-semibold text-foreground truncate">
                      {w.name}
                    </h5>
                    <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] font-mono text-muted-foreground shrink-0">
                      {w.itemCount}
                    </span>
                    {w.visibility === 'ROOM' && (
                      <span
                        className="px-1 py-0.2 rounded bg-sky-500/15 text-sky-500 dark:text-sky-400 text-[9px] font-medium inline-flex items-center gap-0.5 shrink-0"
                        title="Shared with room collaborators"
                      >
                        <Users size={9} />
                        <span>Room</span>
                      </span>
                    )}
                  </div>
                  {w.description && (
                    <p className="text-[10px] text-muted-foreground truncate pl-4.5">
                      {w.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {w.itemCount > 0 && (
                    <button
                      type="button"
                      disabled={isEffectiveReadOnly}
                      onClick={(e) => handlePullCustomWishlist(w.id, e)}
                      className="px-2 py-1 text-[10px] font-semibold rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-colors cursor-pointer"
                      title={isEffectiveReadOnly ? 'View-only mode' : 'Add all problems in this folder to active Session'}
                    >
                      {pulledFeedbackId === w.id ? 'Added!' : '+ Session'}
                    </button>
                  )}
                  {w.isOwner && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteWishlist(w, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                      title="Delete folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Built-in Curated Starter Collections */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            <span>Starter Collections</span>
          </span>
          <span className="text-[10px] text-muted-foreground">Clone or Pull</span>
        </div>

        <div className="space-y-1.5">
          {CURATED_WISHLISTS.map((w) => (
            <div
              key={w.id}
              className="p-2.5 rounded-lg border border-border/60 bg-card/40 flex items-center justify-between gap-2 hover:bg-accent/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-medium text-foreground truncate">{w.title}</h5>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    ({w.problems.length})
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{w.description}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={Boolean(cloningCuratedId)}
                  onClick={() => handleCloneCuratedWishlist(w)}
                  className="px-2 py-1 text-[10px] font-medium rounded border border-border/60 bg-background/60 hover:bg-muted text-foreground inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Save a customizable copy to My Wishlists"
                >
                  {cloningCuratedId === w.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : clonedCuratedId === w.id ? (
                    <Check size={10} className="text-emerald-400" />
                  ) : (
                    <Copy size={10} />
                  )}
                  <span>{clonedCuratedId === w.id ? 'Cloned' : 'Clone'}</span>
                </button>

                <button
                  type="button"
                  disabled={isEffectiveReadOnly}
                  onClick={() => handlePullCuratedWishlist(w)}
                  className="px-2 py-1 text-[10px] font-semibold rounded bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition-colors cursor-pointer"
                  title={isEffectiveReadOnly ? 'View-only mode' : 'Add problems directly to active Session'}
                >
                  {pulledFeedbackId === `curated:${w.id}` ? 'Added!' : 'Pull'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
