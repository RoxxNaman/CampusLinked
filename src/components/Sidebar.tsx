import React, { useState } from 'react';
import {
  MessageSquare,
  Users,
  User as UserIcon,
  Plus,
  Search,
  Settings,
  Volume2,
  VolumeX,
  Lock,
  LogOut,
  Sparkles,
  ChevronDown,
  Terminal,
  Code2,
  Image as ImageIcon,
  Mic,
  FileText,
  Radio,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Conversation } from '../types/index.ts';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenProfileModal: () => void;
  onOpenAuthModal: () => void;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewChat,
  onOpenProfileModal,
  onOpenAuthModal,
  onCloseMobileDrawer,
}) => {
  const {
    conversations,
    activeConversationId,
    selectConversation,
    isConnected,
    soundEnabled,
    setSoundEnabled,
    users,
  } = useChat();

  const { user, logout, demoAccounts, quickSwitchUser } = useAuth();
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const filteredConversations = conversations.filter((c) => {
    // Tab filter
    if (filterTab === 'direct' && c.type !== 'direct') return false;
    if (filterTab === 'group' && c.type !== 'group') return false;
    if (filterTab === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchLastMsg = c.lastMessage?.text?.toLowerCase().includes(q);
      return matchName || matchLastMsg;
    }
    return true;
  });

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getMediaPreview = (c: Conversation) => {
    const lm = c.lastMessage;
    if (!lm) return 'No messages yet';

    if (lm.mediaType === 'image') return '📷 Photo';
    if (lm.mediaType === 'audio') return '🎙️ Voice message';
    if (lm.mediaType === 'file') return '📄 Attachment';
    if (lm.mediaType === 'code') return '💻 Code snippet';

    if (lm.text.startsWith('e2e:v1:')) return '🔒 Encrypted message';

    return lm.text;
  };

  return (
    <aside className="w-80 md:w-84 lg:w-92 h-full bg-slate-900 border-r border-slate-800 flex flex-col select-none shrink-0">
      {/* Top Brand Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <span className="font-mono font-bold text-sm tracking-tighter">&lt;/&gt;</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">CampusLink</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                IIT Mandi
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{isConnected ? 'WebSocket Live' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={onOpenNewChat}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow shadow-indigo-600/30"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Session Bar & 1-Click Switcher */}
      <div className="p-3 bg-slate-900 border-b border-slate-800">
        {user ? (
          <div className="relative">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
              >
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full bg-slate-700 object-cover border border-slate-600"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white flex items-center gap-1 truncate">
                    {user.displayName}
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    @{user.username} • {user.statusMessage || 'Available'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                <button
                  onClick={onOpenProfileModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                  title="Profile settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Switch Dropdown */}
            {showSwitchMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 p-2 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1 flex items-center justify-between">
                  <span>Fast Switch (Testing)</span>
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                </div>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    onClick={() => {
                      quickSwitchUser(acc.username);
                      setShowSwitchMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition ${
                      user.username === acc.username
                        ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-bold flex items-center justify-center text-slate-200">
                      {acc.displayName[0]}
                    </div>
                    <div className="truncate flex-1">
                      <div className="truncate">{acc.displayName}</div>
                      <div className="text-[9px] text-slate-500">{acc.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow shadow-indigo-600/20"
          >
            <UserIcon className="w-4 h-4" />
            Sign In / Register Account
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations & chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex px-3 py-2 gap-1 border-b border-slate-800/60">
        {[
          { id: 'all', label: 'All' },
          { id: 'direct', label: 'Direct' },
          { id: 'group', label: 'Groups' },
          { id: 'unread', label: 'Unread' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition ${
              filterTab === tab.id
                ? 'bg-slate-800 text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-400">No conversations found</p>
            <p className="text-[11px] mt-1">Start a new 1-on-1 or group chat to begin</p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/50 transition"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const hasUnread = (conv.unreadCount || 0) > 0;

            // Check online status if direct conversation
            let otherIsOnline = false;
            if (conv.type === 'direct') {
              const otherId = conv.participantIds.find((id) => id !== user?.id);
              if (otherId) {
                const u = users.find((usr) => usr.id === otherId);
                otherIsOnline = !!u?.isOnline;
              }
            }

            return (
              <div
                key={conv.id}
                onClick={() => {
                  selectConversation(conv.id);
                  onCloseMobileDrawer?.();
                }}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition relative group ${
                  isActive
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-white shadow-sm'
                    : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 object-cover"
                  />
                  {conv.type === 'direct' ? (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                        otherIsOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-indigo-600 border border-slate-900 flex items-center justify-center text-[9px] text-white font-bold">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-semibold truncate flex items-center gap-1.5 ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {conv.name}
                      {conv.isEncrypted && (
                        <span title="End-to-End Encrypted Room" className="inline-flex">
                          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {formatTime(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate flex-1 pr-2">
                      {conv.lastMessage?.senderId === user?.id && <span className="text-indigo-400">You: </span>}
                      {getMediaPreview(conv)}
                    </span>

                    {hasUnread && (
                      <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white font-bold text-[10px] animate-pulse">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono">CampusLink v2.4</span>
        <span className="text-slate-500 font-mono text-[10px]">Real-Time Chat</span>
      </div>
    </aside>
  );
};
