import React, { useState, useRef } from 'react';
import {
  Menu,
  Lock,
  Unlock,
  Sparkles,
  Phone,
  Video,
  Info,
  Search,
  X,
  MoreVertical,
  FileText,
  Key,
  ShieldCheck,
  Trash2,
  Users,
  Keyboard,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface ChatHeaderProps {
  onToggleMobileSidebar: () => void;
  onToggleInfoDrawer: () => void;
  onOpenAiSummary: () => void;
  onOpenE2EModal: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleMobileSidebar,
  onToggleInfoDrawer,
  onOpenAiSummary,
  onOpenE2EModal,
}) => {
  const {
    activeConversation,
    roomKeys,
    users,
    typingUsers,
    deleteConversation,
    searchFilter,
    setSearchFilter,
    messages,
    simulateTyping,
  } = useChat();

  const { user } = useAuth();
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showCallOptions, setShowCallOptions] = useState(false);
  const [callAlert, setCallAlert] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute number of matching messages in current conversation
  const queryLower = searchFilter.trim().toLowerCase();
  const matchingCount = queryLower
    ? messages.filter((m) => {
        const textMatch = (m.text || '').toLowerCase().includes(queryLower);
        const fileMatch = (m.fileName || '').toLowerCase().includes(queryLower);
        const codeMatch = (m.codeLanguage || '').toLowerCase().includes(queryLower);
        return textMatch || fileMatch || codeMatch;
      }).length
    : 0;

  if (!activeConversation) {
    return (
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs text-slate-400">Select a conversation to begin</span>
      </header>
    );
  }

  const isEncryptedRoom = activeConversation.isEncrypted;
  const hasKey = !!roomKeys[activeConversation.id];

  // Determine online status or member count
  let subtitle = '';
  if (activeConversation.type === 'direct') {
    const otherId = activeConversation.participantIds.find((id) => id !== user?.id);
    const otherUser = users.find((u) => u.id === otherId);
    subtitle = otherUser?.isOnline ? 'Active now • Online' : `Last seen recently`;
  } else {
    subtitle = `${activeConversation.participantIds.length} members`;
  }

  const triggerCallSimulation = (type: 'voice' | 'video') => {
    setShowCallOptions(false);
    setCallAlert(`Initiating secure encrypted ${type} call stream with ${activeConversation.name}...`);
    setTimeout(() => {
      setCallAlert(null);
    }, 3500);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none z-20 relative">
      {/* Left: Mobile Toggle + Avatar + Info */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative shrink-0">
          <img
            src={activeConversation.avatar}
            alt={activeConversation.name}
            className={`w-10 h-10 rounded-full bg-slate-800 border border-slate-700 object-cover transition-all duration-300 ${
              typingUsers.length > 0
                ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 shadow-md shadow-indigo-500/20'
                : ''
            }`}
          />
          {typingUsers.length > 0 ? (
            <span
              title="Actively typing"
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 border border-slate-900 shadow-xs animate-in zoom-in-75"
            >
              <span className="flex gap-0.5 items-center">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" />
              </span>
            </span>
          ) : activeConversation.type === 'direct' ? (
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                subtitle.includes('Online') ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white truncate">{activeConversation.name}</h2>
            {isEncryptedRoom && (
              <button
                onClick={onOpenE2EModal}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                  hasKey
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                }`}
                title={hasKey ? 'Encryption key active' : 'Click to enter room encryption key'}
              >
                {hasKey ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                <span>{hasKey ? 'E2E Active' : 'Locked'}</span>
              </button>
            )}
          </div>

          {/* Subtitle with animated real-time typing wave indicator */}
          {typingUsers.length > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold animate-in fade-in select-none">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              </span>
              <span className="truncate">
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].userName} & ${typingUsers[1].userName} are typing...`
                  : `${typingUsers[0].userName} & ${typingUsers.length - 1} others are typing...`}
              </span>
            </div>
          ) : (
            <p className="text-[11px] truncate text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Center Search Input Field */}
      <div
        className={`transition-all duration-200 ${
          isSearchExpanded || searchFilter
            ? 'flex-1 max-w-xs md:max-w-sm mx-2'
            : 'hidden md:flex md:w-52 lg:w-72 mx-2'
        }`}
      >
        <div className="relative w-full flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages in chat..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onFocus={() => setIsSearchExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchFilter('');
                setIsSearchExpanded(false);
              }
            }}
            className={`w-full bg-slate-800/90 border rounded-xl pl-8.5 pr-20 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition ${
              searchFilter.trim()
                ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                : 'border-slate-700/60 focus:border-indigo-500/80'
            }`}
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {searchFilter.trim() && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                {matchingCount} {matchingCount === 1 ? 'match' : 'matches'}
              </span>
            )}
            {(isSearchExpanded || searchFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setIsSearchExpanded(false);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Mobile Search Toggle Button */}
        <button
          type="button"
          onClick={() => {
            setIsSearchExpanded(!isSearchExpanded);
            if (!isSearchExpanded) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
          className={`md:hidden p-2 rounded-xl transition ${
            searchFilter ? 'text-indigo-400 bg-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Search in chat"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Quick Typing Indicator Simulation Button */}
        <button
          type="button"
          onClick={() => {
            const partner =
              activeConversation.type === 'direct'
                ? activeConversation.name
                : 'Sarah Chen';
            simulateTyping(partner);
          }}
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition text-xs font-medium"
          title="Simulate typing broadcast in active conversation"
        >
          <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px]">Test Typing</span>
        </button>
        {/* AI Action Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAiMenu(!showAiMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition text-xs font-semibold"
            title="Gemini AI Features"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Tools</span>
          </button>

          {showAiMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in">
              <button
                onClick={() => {
                  setShowAiMenu(false);
                  onOpenAiSummary();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="font-semibold">Summarize Discussion</div>
                  <div className="text-[10px] text-slate-400">Executive highlights via Gemini 3.8</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAiMenu(false);
                  const partner =
                    activeConversation.type === 'direct'
                      ? activeConversation.name
                      : 'Sarah Chen';
                  simulateTyping(partner);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
              >
                <Keyboard className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold">Simulate Typing Broadcast</div>
                  <div className="text-[10px] text-slate-400">Test live typing indicator in header</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Audio / Video Call Simulation */}
        <div className="relative">
          <button
            onClick={() => setShowCallOptions(!showCallOptions)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Start Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {showCallOptions && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-slate-950 border border-slate-800 shadow-2xl p-1 z-30 space-y-1">
              <button
                onClick={() => triggerCallSimulation('voice')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 transition"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voice Call</span>
              </button>
              <button
                onClick={() => triggerCallSimulation('video')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left text-slate-200 hover:bg-slate-800 transition"
              >
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <span>Video Meeting</span>
              </button>
            </div>
          )}
        </div>

        {/* Info drawer toggle */}
        <button
          onClick={onToggleInfoDrawer}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Conversation Information & Shared Media"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Call notification toast */}
      {callAlert && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in z-40">
          <Phone className="w-4 h-4 animate-bounce" />
          <span>{callAlert}</span>
        </div>
      )}
    </header>
  );
};
