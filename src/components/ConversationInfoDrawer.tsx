import React, { useState } from 'react';
import {
  X,
  Users,
  Lock,
  Image as ImageIcon,
  FileText,
  UserPlus,
  Shield,
  Trash2,
  ExternalLink,
  Download,
  Key,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ConversationInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImage: (url: string, name?: string) => void;
  onOpenE2EModal: () => void;
}

export const ConversationInfoDrawer: React.FC<ConversationInfoDrawerProps> = ({
  isOpen,
  onClose,
  onOpenImage,
  onOpenE2EModal,
}) => {
  const { activeConversation, messages, users, deleteConversation, roomKeys } = useChat();
  const { user } = useAuth();
  const [tab, setTab] = useState<'members' | 'media' | 'security'>('members');

  if (!isOpen || !activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const isCreator = activeConversation.creatorId === user?.id;

  // Filter shared media
  const sharedImages = messages.filter((m) => m.mediaType === 'image' && m.mediaUrl);
  const sharedFiles = messages.filter((m) => (m.mediaType === 'file' || m.mediaType === 'code') && !m.isDeleted);

  // Group members
  const memberUsers = users.filter((u) => activeConversation.participantIds.includes(u.id));

  const handleDeleteOrLeave = async () => {
    if (confirm(isGroup ? 'Are you sure you want to leave this group?' : 'Delete this conversation?')) {
      await deleteConversation(activeConversation.id);
      onClose();
    }
  };

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/95 flex flex-col h-full shrink-0 select-none z-20 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-white">Conversation Details</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Overview */}
      <div className="p-5 flex flex-col items-center text-center border-b border-slate-800 bg-slate-950/40">
        <img
          src={activeConversation.avatar}
          alt={activeConversation.name}
          className="w-16 h-16 rounded-full bg-slate-800 border-2 border-indigo-500/40 object-cover shadow-lg mb-3"
        />
        <h4 className="font-bold text-white text-base">{activeConversation.name}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          {activeConversation.description ||
            (isGroup ? `${activeConversation.participantIds.length} members in channel` : 'Private Direct Message')}
        </p>

        {activeConversation.isEncrypted && (
          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted (AES-GCM)</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-950/20">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            tab === 'members' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Members ({memberUsers.length})
        </button>
        <button
          onClick={() => setTab('media')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            tab === 'media' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Media ({sharedImages.length + sharedFiles.length})
        </button>
        <button
          onClick={() => setTab('security')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
            tab === 'security' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Security
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'members' && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Participants
            </div>
            {memberUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-700/40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={u.avatar}
                      alt={u.displayName}
                      className="w-8 h-8 rounded-full bg-slate-700 object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-slate-900 ${
                        u.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1">
                      {u.displayName}
                      {u.id === activeConversation.creatorId && (
                        <span className="text-[9px] px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-normal">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">@{u.username}</div>
                  </div>
                </div>
                {u.isOnline && (
                  <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'media' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Photos ({sharedImages.length})
              </div>
              {sharedImages.length === 0 ? (
                <div className="text-xs text-slate-500 p-2">No photos shared yet</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {sharedImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.mediaUrl}
                      alt={img.fileName || 'Shared'}
                      onClick={() => onOpenImage(img.mediaUrl!, img.fileName)}
                      className="w-full h-18 object-cover rounded-lg cursor-pointer border border-slate-700 hover:opacity-90 transition"
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Files & Code ({sharedFiles.length})
              </div>
              {sharedFiles.length === 0 ? (
                <div className="text-xs text-slate-500 p-2">No files or code shared</div>
              ) : (
                <div className="space-y-1.5">
                  {sharedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-slate-200 truncate">{f.fileName || 'Code Snippet'}</div>
                        <div className="text-[10px] text-slate-400">{f.mediaType === 'code' ? 'Code block' : 'Attachment'}</div>
                      </div>
                      {f.mediaUrl && (
                        <a
                          href={f.mediaUrl}
                          download={f.fileName || 'file'}
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-2 text-xs">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                Security Verification
              </div>
              <div className="space-y-1 text-[11px] text-slate-400">
                <p>• <strong>Transport:</strong> WebSockets + TLS 1.3</p>
                <p>• <strong>Cipher:</strong> AES-GCM 256-Bit</p>
                <p>• <strong>Key Derivation:</strong> PBKDF2 with 100,000 iterations</p>
                <p>• <strong>Storage:</strong> Atomic disk WAL sync</p>
              </div>
              <button
                onClick={onOpenE2EModal}
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                Manage Room Passphrase
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Danger Action */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <button
          onClick={handleDeleteOrLeave}
          className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isGroup ? (isCreator ? 'Delete Group Channel' : 'Leave Group') : 'Delete Conversation'}</span>
        </button>
      </div>
    </aside>
  );
};
