import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  CheckCheck,
  Lock,
  Smile,
  Reply,
  Copy,
  Trash2,
  Edit2,
  Play,
  Pause,
  Download,
  FileCode,
  FileText,
  Sparkles,
  Bot,
  ExternalLink,
  Languages,
  Plus,
  Search,
  X,
  Clock,
} from 'lucide-react';
import { useChat } from '../context/ChatContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { Message } from '../types/index.ts';
import { decryptText, isEncryptedFormat } from '../utils/crypto.ts';
import { api } from '../utils/api.ts';

interface MessageListProps {
  onOpenImage: (url: string, name?: string) => void;
  onOpenE2EModal: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🚀', '💡'];
const EXTENDED_EMOJIS = [
  '👏', '🎉', '👀', '💯', '⚡', '🤔', '🙌', '🤝', '😍', '🥳', '✅', '✨', '💪', '🎯', '🙏', '🤯',
  '☕', '💻', '⭐', '😎', '🫡', '🤐', '👋', '💀', '🎈', '🏆', '💎'
];

function HighlightMatches({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim() || !text) {
    return <>{text}</>;
  }

  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded-xs shadow-xs"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export const MessageList: React.FC<MessageListProps> = ({ onOpenImage, onOpenE2EModal }) => {
  const {
    messages,
    activeConversation,
    activeConversationId,
    roomKeys,
    sendReaction,
    editMessage,
    deleteMessage,
    setReplyToMessage,
    users,
    searchFilter,
    setSearchFilter,
    typingUsers,
  } = useChat();

  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Reaction popover
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPickerForId, setShowEmojiPickerForId] = useState<string | null>(null);

  // Translation state
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  // Decrypted cache
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  const roomKey = activeConversationId ? roomKeys[activeConversationId] : '';

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Decrypt encrypted messages when key or messages change
  useEffect(() => {
    async function decryptAll() {
      const updates: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.isEncrypted || isEncryptedFormat(msg.text)) {
          const res = await decryptText(msg.text, roomKey || '');
          updates[msg.id] = res.text;
        }
      }
      setDecryptedCache(updates);
    }
    decryptAll();
  }, [messages, roomKey]);

  // Audio playback handler
  const togglePlayAudio = (msgId: string, url?: string) => {
    if (!url) return;
    if (playingAudioId === msgId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(console.error);
      setPlayingAudioId(msgId);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleTranslate = async (msg: Message) => {
    if (translatedMap[msg.id]) {
      // Toggle off
      setTranslatedMap((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }

    setTranslatingId(msg.id);
    try {
      const targetText = decryptedCache[msg.id] || msg.text;
      const res = await api.translateText(targetText, 'English');
      setTranslatedMap((prev) => ({ ...prev, [msg.id]: res.translated }));
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(decryptedCache[msg.id] || msg.text);
    setShowEmojiPickerForId(null);
  };

  const saveEdit = (msgId: string) => {
    if (editText.trim()) {
      editMessage(msgId, editText.trim());
    }
    setEditingMessageId(null);
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    sendReaction(messageId, emoji);
    setShowEmojiPickerForId(null);

    // Festive confetti particle burst for celebratory emojis
    if (['🚀', '🔥', '🎉', '💯', '✨', '🏆', '🥳'].includes(emoji)) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.75 },
          ticks: 120,
        });
      } catch {
        // Safe fallback
      }
    }
  };

  const getReactionUsersText = (userIds: string[]) => {
    const names = userIds.map((uid) => {
      if (uid === user?.id) return 'You';
      const found = users.find((u) => u.id === uid);
      return found ? found.displayName : 'Someone';
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others`;
  };

  const formatMessageTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by date
  const renderDateSeparator = (currentTs: number, prevTs?: number) => {
    if (!prevTs) {
      return (
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50 shadow-sm">
            {new Date(currentTs).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      );
    }

    const currentDate = new Date(currentTs).toDateString();
    const prevDate = new Date(prevTs).toDateString();

    if (currentDate !== prevDate) {
      return (
        <div className="flex justify-center my-4">
          <span className="text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50 shadow-sm">
            {new Date(currentTs).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      );
    }
    return null;
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
          <Bot className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-300">Welcome to CampusLink</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select a conversation from the left to start messaging in real-time.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-text"
    >
      {/* Active Search Results Bar */}
      {searchFilter.trim() && (
        <div className="sticky top-0 z-30 mb-2 p-2.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 text-xs flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2 text-slate-300 min-w-0">
            <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Filtering by: <strong className="text-white">"{searchFilter}"</strong>
            </span>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
              {(() => {
                const q = searchFilter.trim().toLowerCase();
                const count = messages.filter((m) => {
                  const plainText = (decryptedCache[m.id] || m.text || '').toLowerCase();
                  const sender = (m.senderName || '').toLowerCase();
                  const file = (m.fileName || '').toLowerCase();
                  const code = (m.codeLanguage || '').toLowerCase();
                  return plainText.includes(q) || sender.includes(q) || file.includes(q) || code.includes(q);
                }).length;
                return `${count} ${count === 1 ? 'match' : 'matches'}`;
              })()}
            </span>
          </div>
          <button
            onClick={() => setSearchFilter('')}
            className="shrink-0 text-xs text-indigo-400 hover:text-white font-semibold flex items-center gap-1 hover:underline ml-2"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* Encryption notice banner if room is encrypted */}
      {activeConversation.isEncrypted && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-center max-w-md mx-auto my-2 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-End Encrypted Room</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Messages in this chat are protected with AES-GCM 256-bit encryption.
            {!roomKey && (
              <button
                onClick={onOpenE2EModal}
                className="ml-1 text-emerald-400 underline font-semibold hover:text-emerald-300"
              >
                Enter Key
              </button>
            )}
          </p>
        </div>
      )}

      {(() => {
        const q = searchFilter.trim().toLowerCase();
        const displayedMessages = q
          ? messages.filter((m) => {
              const plainText = (decryptedCache[m.id] || m.text || '').toLowerCase();
              const sender = (m.senderName || '').toLowerCase();
              const file = (m.fileName || '').toLowerCase();
              const code = (m.codeLanguage || '').toLowerCase();
              return plainText.includes(q) || sender.includes(q) || file.includes(q) || code.includes(q);
            })
          : messages;

        if (q && displayedMessages.length === 0) {
          return (
            <div className="text-center py-16 text-slate-500 text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
              <p className="font-semibold text-slate-300">No messages matching "{searchFilter}"</p>
              <p className="text-[11px] text-slate-400">Try checking spelling or using a different keyword.</p>
              <button
                onClick={() => setSearchFilter('')}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/50 transition"
              >
                Clear Search Filter
              </button>
            </div>
          );
        }

        if (displayedMessages.length === 0) {
          return (
            <div className="text-center py-16 text-slate-500 text-xs">
              <p>No messages in this conversation yet.</p>
              <p className="text-[11px] mt-1 text-slate-400">Be the first to say hello!</p>
            </div>
          );
        }

        return displayedMessages.map((msg, index) => {
          const isMe = msg.senderId === user?.id;
          const isDeleted = msg.isDeleted;
          const displayText = isDeleted
            ? 'This message was deleted'
            : decryptedCache[msg.id] || msg.text;

          const isDecryptedError =
            displayText.includes('Encrypted Message - Enter Secret Key') ||
            displayText.includes('Invalid Key');

          const isOtherParticipantRead =
            activeConversation.participantIds.some(
              (pid) => pid !== user?.id && msg.readBy.includes(pid)
            );

          const isOtherParticipantDelivered =
            activeConversation.participantIds.some(
              (pid) => pid !== user?.id && msg.deliveredTo.includes(pid)
            );

          const prevMsg = index > 0 ? messages[index - 1] : undefined;

          return (
            <React.Fragment key={msg.id}>
              {renderDateSeparator(msg.timestamp, prevMsg?.timestamp)}

              <div
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => {
                  setHoveredMessageId(null);
                  setShowEmojiPickerForId(null);
                }}
                className={`flex gap-3 group relative ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar for received messages */}
                {!isMe && (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 object-cover shrink-0 mt-1"
                  />
                )}

                {/* Message Container */}
                <div className={`max-w-[85%] sm:max-w-[70%] md:max-w-[62%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name in Group */}
                  {!isMe && activeConversation.type === 'group' && (
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {msg.senderName}
                      </span>
                      {msg.isAi && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" /> AI
                        </span>
                      )}
                    </div>
                  )}

                  {/* Replying banner preview */}
                  {msg.replyTo && (
                    <div
                      className={`text-[11px] p-2 rounded-t-xl border-b border-white/10 flex items-center gap-1.5 max-w-full truncate ${
                        isMe ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Reply className="w-3 h-3 shrink-0 text-slate-300" />
                      <span className="font-semibold">{msg.replyTo.senderName}:</span>
                      <span className="truncate">
                        <HighlightMatches text={msg.replyTo.text} query={searchFilter} />
                      </span>
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={`rounded-2xl p-3 relative shadow-md transition ${
                      isDeleted
                        ? 'bg-slate-800/40 text-slate-500 italic border border-slate-800'
                        : isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : msg.isAi
                        ? 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 text-slate-100 rounded-bl-xs'
                        : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                    }`}
                  >
                    {/* Encrypted indicator pill */}
                    {msg.isEncrypted && (
                      <div className="flex items-center gap-1 mb-1 text-[10px] text-emerald-400 font-medium">
                        <Lock className="w-3 h-3" />
                        <span>Encrypted (AES-GCM)</span>
                      </div>
                    )}

                    {/* Scheduled message indicator pill */}
                    {(msg.metadata?.sendTime || msg.metadata?.scheduledFor || msg.metadata?.isScheduled) && (
                      <div className="flex items-center gap-1 mb-1.5 text-[10px] text-amber-300 font-medium bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg w-fit">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>
                          {msg.metadata?.sendTime
                            ? `Scheduled: ${new Date(msg.metadata.sendTime).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Scheduled Message'}
                        </span>
                      </div>
                    )}

                    {/* Media Type Rendering */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden cursor-pointer">
                        <img
                          src={msg.mediaUrl}
                          alt={msg.fileName || 'Shared image'}
                          onClick={() => onOpenImage(msg.mediaUrl!, msg.fileName)}
                          className="max-h-64 rounded-xl object-cover hover:scale-[1.01] transition"
                        />
                      </div>
                    )}

                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <div className="flex items-center gap-3 p-2 bg-black/20 rounded-xl mb-1 min-w-[200px]">
                        <button
                          onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-indigo-300 rounded-full ${
                                playingAudioId === msg.id ? 'animate-pulse w-3/4' : 'w-0'
                              }`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-300 mt-1">
                            <span>Voice Memo</span>
                            <span>{msg.voiceDuration ? `00:${msg.voiceDuration < 10 ? '0' : ''}${msg.voiceDuration}` : '00:08'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.mediaType === 'file' && (
                      <div className="flex items-center gap-3 p-2.5 bg-black/20 rounded-xl mb-1">
                        <FileText className="w-6 h-6 text-indigo-300 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">
                            <HighlightMatches text={msg.fileName || 'Attachment'} query={searchFilter} />
                          </div>
                          <div className="text-[10px] text-slate-300">
                            {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : 'Verified file'}
                          </div>
                        </div>
                        {msg.mediaUrl && (
                          <a
                            href={msg.mediaUrl}
                            download={msg.fileName || 'download'}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                            title="Download attachment"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}

                    {msg.mediaType === 'code' && (
                      <div className="my-1 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                          <span className="text-indigo-400 font-semibold">{msg.codeLanguage || 'code'}</span>
                          <button
                            onClick={() => handleCopy(msg.mediaUrl || msg.text)}
                            className="flex items-center gap-1 hover:text-white transition"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="p-3 overflow-x-auto text-emerald-400 leading-relaxed text-[11px]">
                          <code>{msg.mediaUrl || msg.text}</code>
                        </pre>
                      </div>
                    )}

                    {/* Text Body / Editing form */}
                    {editingMessageId === msg.id ? (
                      <div className="space-y-2 min-w-[220px]">
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(msg.id);
                            if (e.key === 'Escape') setEditingMessageId(null);
                          }}
                          className="w-full bg-slate-900 text-white border border-indigo-400 rounded-lg p-2 text-xs focus:outline-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(msg.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-indigo-500 text-white font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {isDecryptedError ? (
                          <div className="text-xs text-amber-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>{displayText}</span>
                            <button
                              onClick={onOpenE2EModal}
                              className="text-xs underline font-semibold ml-1 hover:text-white"
                            >
                              Unlock
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            <HighlightMatches text={displayText} query={searchFilter} />
                          </p>
                        )}

                        {/* Translation display if active */}
                        {translatedMap[msg.id] && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-xs italic bg-black/10 p-2 rounded-lg">
                            <div className="text-[10px] font-semibold text-indigo-300 not-italic flex items-center gap-1 mb-0.5">
                              <Languages className="w-3 h-3" /> Translated by Gemini:
                            </div>
                            {translatedMap[msg.id]}
                          </div>
                        )}
                      </>
                    )}

                    {/* Metadata footer (Time, Edited, Delivery Status) */}
                    <div
                      className={`flex items-center gap-1.5 justify-end mt-1 text-[10px] select-none ${
                        isMe ? 'text-indigo-200/80' : 'text-slate-400'
                      }`}
                    >
                      {msg.isEdited && <span className="italic">(edited)</span>}
                      {(msg.metadata?.sendTime || msg.metadata?.scheduledFor || msg.metadata?.isScheduled) && (
                        <span
                          title={
                            msg.metadata?.sendTime
                              ? `Scheduled for: ${new Date(msg.metadata.sendTime).toLocaleString()}`
                              : 'Scheduled message'
                          }
                          className="inline-flex items-center text-amber-400"
                        >
                          <Clock className="w-3 h-3 text-amber-400" />
                        </span>
                      )}
                      <span>{formatMessageTime(msg.timestamp)}</span>

                      {/* Delivery Ticks for current user */}
                      {isMe && !isDeleted && (
                        <span>
                          {isOtherParticipantRead ? (
                            <span title="Read by recipient" className="inline-flex">
                              <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                            </span>
                          ) : isOtherParticipantDelivered ? (
                            <span title="Delivered to device" className="inline-flex">
                              <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                            </span>
                          ) : (
                            <span title="Sent to server" className="inline-flex">
                              <Check className="w-3.5 h-3.5 text-slate-300" />
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Reactions display bar */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
                      {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                        const hasReacted = userIds.includes(user?.id || '');
                        const usersTooltip = getReactionUsersText(userIds);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReactionClick(msg.id, emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition shadow-xs group/btn ${
                              hasReacted
                                ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200 font-semibold ring-1 ring-indigo-500/40'
                                : 'bg-slate-800/90 border-slate-700/70 text-slate-300 hover:bg-slate-750 hover:border-slate-600'
                            }`}
                            title={`${usersTooltip} reacted with ${emoji}`}
                          >
                            <span className="leading-none text-xs group-hover/btn:scale-125 transition-transform">
                              {emoji}
                            </span>
                            <span className="font-semibold text-[11px]">{userIds.length}</span>
                          </button>
                        );
                      })}

                      {/* Mini inline plus button to add an emoji */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowEmojiPickerForId(showEmojiPickerForId === msg.id ? null : msg.id)
                        }
                        className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800/70 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        title="Add reaction"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Floating Hover Action Menu with Instant Emoji Reactions */}
                {!isDeleted && (
                  <div
                    className={`absolute -top-3.5 z-20 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-2 py-0.5 shadow-xl transition-all duration-150 ${
                      isMe ? 'right-1' : 'left-9'
                    } ${
                      hoveredMessageId === msg.id || showEmojiPickerForId === msg.id
                        ? 'opacity-100 scale-100 pointer-events-auto'
                        : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                    }`}
                  >
                    {/* Quick Reactions Tray */}
                    <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-700/60">
                      {QUICK_EMOJIS.map((emoji) => {
                        const hasReacted = msg.reactions?.[emoji]?.includes(user?.id || '');
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReactionClick(msg.id, emoji)}
                            className={`p-1 rounded-full text-sm leading-none transition-transform hover:scale-130 active:scale-95 ${
                              hasReacted
                                ? 'bg-indigo-600/40 ring-1 ring-indigo-400 scale-105'
                                : 'hover:bg-slate-800'
                            }`}
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}

                      {/* Extended Emoji Picker Trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setShowEmojiPickerForId(showEmojiPickerForId === msg.id ? null : msg.id)
                          }
                          className={`p-1 rounded-full transition ${
                            showEmojiPickerForId === msg.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title="More emoji reactions"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {showEmojiPickerForId === msg.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute top-full mt-2 p-2.5 bg-slate-950/95 backdrop-blur-lg border border-slate-800 rounded-2xl shadow-2xl z-30 animate-in fade-in zoom-in-95 w-60 ${
                              isMe ? 'right-0' : 'left-0'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-bold text-slate-400 px-1 pb-1.5 mb-1.5 border-b border-slate-800/80 flex items-center justify-between">
                              <span>Add Reaction</span>
                              <Smile className="w-3 h-3 text-indigo-400" />
                            </div>
                            <div className="grid grid-cols-7 gap-1 max-h-44 overflow-y-auto pr-0.5">
                              {[...QUICK_EMOJIS, ...EXTENDED_EMOJIS].map((emoji) => {
                                const hasReacted = msg.reactions?.[emoji]?.includes(user?.id || '');
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReactionClick(msg.id, emoji)}
                                    className={`p-1 text-base rounded-lg transition hover:scale-125 flex items-center justify-center ${
                                      hasReacted
                                        ? 'bg-indigo-600/40 ring-1 ring-indigo-400'
                                        : 'hover:bg-slate-800'
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Message Actions */}
                    <div className="flex items-center gap-0.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => setReplyToMessage(msg)}
                        className="p-1 rounded-full hover:text-white hover:bg-slate-800 transition"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTranslate(msg)}
                        className={`p-1 rounded-full transition ${
                          translatedMap[msg.id]
                            ? 'text-indigo-400 bg-indigo-600/20'
                            : 'hover:text-indigo-400 hover:bg-slate-800'
                        }`}
                        title="Translate with Gemini AI"
                      >
                        <Languages className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(displayText)}
                        className="p-1 rounded-full hover:text-white hover:bg-slate-800 transition"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {isMe && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            className="p-1 rounded-full hover:text-indigo-400 hover:bg-slate-800 transition"
                            title="Edit message"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMessage(msg.id)}
                            className="p-1 rounded-full hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        });
      })()}

      {/* Live typing indicator bubble at bottom of message feed */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 py-1 px-1 animate-in fade-in slide-in-from-bottom-2 select-none">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 shadow-sm text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
            </span>
            <span className="text-[11px] text-slate-400">
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing...`
                : `${typingUsers.map((u) => u.userName).join(', ')} are typing...`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
