import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Lock,
  Globe,
  UserPlus,
  Users,
  Trash2,
  Shield,
  Eye,
  Edit3,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RoomDTO, RoomMemberDTO, RoomRole } from '@codev/shared';
import {
  listRoomMembersApi,
  inviteRoomMemberApi,
  removeRoomMemberApi,
} from '@/api/rooms';

interface ShareModalProps {
  room: RoomDTO;
  userRole: RoomRole | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ room, userRole, isOpen, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Collaborator management
  const [members, setMembers] = useState<RoomMemberDTO[]>([]);
  const [owner, setOwner] = useState<{ userId: string; username: string; email: string } | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<RoomRole>('EDITOR');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const isOwner = userRole === 'OWNER';
  const shareUrl = `${window.location.origin}/rooms/${room.id}`;

  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const data = await listRoomMembersApi(room.id);
        setOwner(data.owner);
        // Exclude owner from the members list to prevent duplication
        setMembers(data.members.filter((m) => m.userId !== data.owner.userId));
      } catch {
        // May fail if viewer or unauth; ignore gracefully
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [isOpen, room.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim() || isInviting) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const newMember = await inviteRoomMemberApi(room.id, {
        identifier: inviteIdentifier.trim(),
        role: inviteRole,
      });

      setMembers((prev) => {
        const filtered = prev.filter((m) => m.userId !== newMember.userId);
        return [newMember, ...filtered];
      });

      setInviteSuccess(`Added @${newMember.username} as ${newMember.role}`);
      setInviteIdentifier('');
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to invite collaborator';
      setInviteError(msg);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!window.confirm(`Remove @${username} from this workspace?`)) return;

    try {
      await removeRoomMemberApi(room.id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 relative animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">Share Workspace</h3>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                room.isPrivate
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}
            >
              {room.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
              {room.isPrivate ? 'Private' : 'Public'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {room.isPrivate
              ? 'Only invited collaborators can access and view this workspace.'
              : 'Anyone with the room link or code can join this workspace.'}
          </p>
        </div>

        {/* Share Link & Room Code Box */}
        <div className="space-y-3 bg-muted/40 border border-border/70 rounded-xl p-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-muted-foreground font-medium uppercase tracking-wider">
              Workspace Invite Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="h-8 text-xs font-mono bg-background select-all"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-8 px-3 text-xs shrink-0 cursor-pointer gap-1.5"
              >
                {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
            <span className="text-muted-foreground font-mono">Room Code:</span>
            <div className="flex items-center gap-2 font-mono font-semibold text-foreground">
              <span>{room.id}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] underline"
              >
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>

        {/* Collaborators Management Section (Available for Owner or Viewers) */}
        <div className="space-y-3.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users size={14} className="text-primary" />
              <span>Workspace Collaborators</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {1 + members.length} total
            </span>
          </div>

          {/* Invite Form (Owner Only) */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter username or email..."
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as RoomRole)}
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isInviting || !inviteIdentifier.trim()}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer shrink-0"
                >
                  {isInviting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                  <span>Invite</span>
                </Button>
              </div>

              {inviteError && (
                <p className="text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-1.5 font-mono">
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-1.5 font-mono">
                  {inviteSuccess}
                </p>
              )}
            </form>
          )}

          {/* Members List */}
          <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/50 max-h-48 overflow-y-auto bg-muted/20">
            {/* Owner Row */}
            {owner && (
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                    {owner.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">@{owner.username}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{owner.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary">
                  <Shield size={10} />
                  Owner
                </span>
              </div>
            )}

            {/* Invited Collaborators Rows */}
            {isLoadingMembers ? (
              <div className="py-4 flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>Loading collaborators...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No external collaborators invited yet.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-muted border border-border/60 text-muted-foreground flex items-center justify-center font-bold text-[10px] shrink-0">
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-foreground truncate">
                      @{member.username}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        member.role === 'EDITOR'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {member.role === 'EDITOR' ? <Edit3 size={10} /> : <Eye size={10} />}
                      {member.role}
                    </span>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.userId, member.username)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 cursor-pointer transition-colors"
                        title={`Remove @${member.username}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
