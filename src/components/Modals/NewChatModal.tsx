import React, { useState } from 'react';
import { X, UserPlus, Users, Lock, Search, Check } from 'lucide-react';
import { useChat } from '../../context/ChatContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { User } from '../../types/index.ts';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { users, createConversation } = useChat();
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionKeyHint, setEncryptionKeyHint] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) => {
    if (u.id === currentUser?.id) return false;
    const matchName = u.displayName.toLowerCase().includes(search.toLowerCase());
    const matchUsername = u.username.toLowerCase().includes(search.toLowerCase());
    return matchName || matchUsername;
  });

  const toggleSelectUser = (userId: string) => {
    if (tab === 'direct') {
      setSelectedUserIds([userId]);
    } else {
      setSelectedUserIds((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    setError(null);
    if (tab === 'direct' && selectedUserIds.length === 0) {
      setError('Please select a user to message');
      return;
    }
    if (tab === 'group' && !groupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (tab === 'group' && selectedUserIds.length === 0) {
      setError('Please select at least one member for the group');
      return;
    }

    setIsSubmitting(true);
    try {
      await createConversation({
        type: tab,
        name: tab === 'group' ? groupName.trim() : undefined,
        description: tab === 'group' ? groupDescription.trim() : undefined,
        participantIds: selectedUserIds,
        isEncrypted,
        encryptionKeyHint: isEncrypted ? encryptionKeyHint || 'default_secret' : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              {tab === 'direct' ? <UserPlus className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-white">Start New Conversation</h3>
              <p className="text-xs text-slate-400">Connect 1-on-1 or launch a group channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-2 bg-slate-950/60 border-b border-slate-800 gap-1">
          <button
            onClick={() => {
              setTab('direct');
              setSelectedUserIds([]);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              tab === 'direct' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            1-on-1 Direct Chat
          </button>
          <button
            onClick={() => {
              setTab('group');
              setSelectedUserIds([]);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
              tab === 'group' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Group Discussion
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
              {error}
            </div>
          )}

          {tab === 'group' && (
            <div className="space-y-3 p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Group Channel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hackathon Team Alpha, IIT Mandi Robotics"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short topic or mission statement"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* E2E Security Toggle */}
          <div className="p-3 bg-slate-800/30 border border-slate-700/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">End-to-End Chat Encryption</span>
              </div>
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
              />
            </div>
            {isEncrypted && (
              <div className="pt-2">
                <input
                  type="text"
                  placeholder="Set shared encryption passphrase (e.g. kamand2026)"
                  value={encryptionKeyHint}
                  onChange={(e) => setEncryptionKeyHint(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Messages will be encrypted client-side with 256-bit AES-GCM before transmission.
                </p>
              </div>
            )}
          </div>

          {/* User Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                {tab === 'direct' ? 'Select User to Chat With' : `Select Members (${selectedUserIds.length} chosen)`}
              </label>
            </div>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search registered users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">No users found</div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                          : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={u.avatar}
                            alt={u.displayName}
                            className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                              u.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                            {u.displayName}
                            {u.id.includes('bot') && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                                Bot
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">@{u.username} • {u.statusMessage || 'Available'}</div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || (tab === 'direct' ? selectedUserIds.length === 0 : !groupName || selectedUserIds.length === 0)}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition flex items-center gap-1.5"
          >
            {isSubmitting ? 'Starting...' : tab === 'direct' ? 'Open Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};
