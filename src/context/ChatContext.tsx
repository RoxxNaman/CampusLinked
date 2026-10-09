import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Conversation, Message, MediaType, User, WsMessage, TypingUser } from '../types/index.ts';
import { useAuth } from './AuthContext.tsx';
import { api } from '../utils/api.ts';
import { encryptText } from '../utils/crypto.ts';

interface SendMessageOptions {
  text?: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  voiceDuration?: number;
  codeLanguage?: string;
  isEncrypted?: boolean;
  metadata?: Record<string, any>;
}

interface ChatContextType {
  isConnected: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  users: User[];
  typingUsers: TypingUser[];
  roomKeys: Record<string, string>;
  replyToMessage: Message | null;
  soundEnabled: boolean;
  searchFilter: string;
  setSearchFilter: (query: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setReplyToMessage: (msg: Message | null) => void;
  setRoomKey: (conversationId: string, key: string) => void;
  selectConversation: (id: string) => void;
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  simulateTyping: (participantName?: string) => void;
  sendReaction: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, newText: string) => void;
  deleteMessage: (messageId: string) => void;
  createConversation: (params: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    participantIds: string[];
    isEncrypted?: boolean;
    encryptionKeyHint?: string;
  }) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Web Audio synthesizer chime for incoming chat message
function playChime(type: 'incoming' | 'sent' = 'incoming') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'incoming') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, Message[]>>({});
  const [users, setUsers] = useState<User[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, TypingUser[]>>({});
  const [roomKeys, setRoomKeys] = useState<Record<string, string>>({
    conv_direct_naman_priya: 'kamand2026', // Pre-fill default demo key
  });
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Load conversations and registered users
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.getConversations();
      setConversations(list);
      // Auto select first conversation if none selected
      if (!activeConversationId && list.length > 0) {
        setActiveConversationId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [user, activeConversationId]);

  const refreshUsers = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConversations();
      refreshUsers();
    } else {
      setConversations([]);
      setUsers([]);
      setActiveConversationId(null);
      setMessagesByConv({});
    }
  }, [user, refreshConversations, refreshUsers]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !user) return;

    // Fetch message history
    api.getMessages(activeConversationId).then((msgs) => {
      setMessagesByConv((prev) => ({
        ...prev,
        [activeConversationId]: msgs,
      }));

      // Send read receipt via WebSocket if connected
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message:read',
            payload: { conversationId: activeConversationId },
          })
        );
      }

      // Clear unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c))
      );
    }).catch((err) => {
      console.error('Failed to fetch messages for conversation:', err);
    });
  }, [activeConversationId, user]);

  // WebSocket Connection
  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    function connectWs() {
      if (!user) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        // Authenticate with server
        ws.send(
          JSON.stringify({
            type: 'auth',
            payload: { token, userId: user.id },
          })
        );
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'auth:success':
              setIsConnected(true);
              break;

            case 'user:online': {
              const { userId } = msg.payload;
              setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, isOnline: true } : u))
              );
              break;
            }

            case 'user:offline': {
              const { userId, lastSeen } = msg.payload;
              setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, isOnline: false, lastSeen } : u))
              );
              break;
            }

            case 'typing:start': {
              const { conversationId, userId, userName, userAvatar } = msg.payload;
              setTypingMap((prev) => {
                const list = prev[conversationId] || [];
                const existingIndex = list.findIndex((t) => t.userId === userId);
                const updatedItem: TypingUser = {
                  userId,
                  userName: userName || 'Someone',
                  userAvatar,
                  lastTypedAt: Date.now(),
                };
                if (existingIndex !== -1) {
                  const updated = [...list];
                  updated[existingIndex] = updatedItem;
                  return { ...prev, [conversationId]: updated };
                }
                return {
                  ...prev,
                  [conversationId]: [...list, updatedItem],
                };
              });
              break;
            }

            case 'typing:stop': {
              const { conversationId, userId } = msg.payload;
              setTypingMap((prev) => {
                const list = prev[conversationId] || [];
                return {
                  ...prev,
                  [conversationId]: list.filter((t) => t.userId !== userId),
                };
              });
              break;
            }

            case 'message:new': {
              const newMsg: Message = msg.payload;
              const convId = newMsg.conversationId;

              // Clear typing indicator for message sender in this conversation
              setTypingMap((prev) => {
                const list = prev[convId];
                if (!list || list.length === 0) return prev;
                return {
                  ...prev,
                  [convId]: list.filter((t) => t.userId !== newMsg.senderId),
                };
              });

              // Play sound
              if (soundEnabled) {
                if (newMsg.senderId === user.id) {
                  playChime('sent');
                } else {
                  playChime('incoming');
                }
              }

              // Append message with idempotency check
              setMessagesByConv((prev) => {
                const existing = prev[convId] || [];
                if (existing.some((m) => m.id === newMsg.id)) return prev;
                return {
                  ...prev,
                  [convId]: [...existing, newMsg],
                };
              });

              // Update conversation snippet and unread count
              setConversations((prev) => {
                return prev.map((c) => {
                  if (c.id === convId) {
                    const isCurrent = convId === activeConversationId;
                    return {
                      ...c,
                      lastMessage: {
                        id: newMsg.id,
                        text: newMsg.text,
                        senderId: newMsg.senderId,
                        senderName: newMsg.senderName,
                        timestamp: newMsg.timestamp,
                        mediaType: newMsg.mediaType,
                      },
                      unreadCount: isCurrent
                        ? 0
                        : (c.unreadCount || 0) + (newMsg.senderId === user.id ? 0 : 1),
                      updatedAt: newMsg.timestamp,
                    };
                  }
                  return c;
                });
              });

              // If current active conversation, immediately send read receipt
              if (convId === activeConversationId && newMsg.senderId !== user.id) {
                ws.send(
                  JSON.stringify({
                    type: 'message:read',
                    payload: { conversationId: convId },
                  })
                );
              }
              break;
            }

            case 'message:read_receipt': {
              const { conversationId, userId } = msg.payload;
              setMessagesByConv((prev) => {
                const list = prev[conversationId];
                if (!list) return prev;
                return {
                  ...prev,
                  [conversationId]: list.map((m) => {
                    if (!m.readBy.includes(userId)) {
                      return { ...m, readBy: [...m.readBy, userId] };
                    }
                    return m;
                  }),
                };
              });
              break;
            }

            case 'message:reaction_update': {
              const { messageId, conversationId, reactions } = msg.payload;
              setMessagesByConv((prev) => {
                const list = prev[conversationId];
                if (!list) return prev;
                return {
                  ...prev,
                  [conversationId]: list.map((m) =>
                    m.id === messageId ? { ...m, reactions } : m
                  ),
                };
              });
              break;
            }

            case 'message:edited': {
              const updatedMsg: Message = msg.payload;
              setMessagesByConv((prev) => {
                const list = prev[updatedMsg.conversationId];
                if (!list) return prev;
                return {
                  ...prev,
                  [updatedMsg.conversationId]: list.map((m) =>
                    m.id === updatedMsg.id ? updatedMsg : m
                  ),
                };
              });
              break;
            }

            case 'message:deleted': {
              const { messageId, conversationId } = msg.payload;
              setMessagesByConv((prev) => {
                const list = prev[conversationId];
                if (!list) return prev;
                return {
                  ...prev,
                  [conversationId]: list.map((m) =>
                    m.id === messageId
                      ? { ...m, isDeleted: true, text: 'This message was deleted' }
                      : m
                  ),
                };
              });
              break;
            }

            case 'conversation:new': {
              const newConv: Conversation = msg.payload;
              setConversations((prev) => {
                if (prev.some((c) => c.id === newConv.id)) return prev;
                return [newConv, ...prev];
              });
              break;
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);
        // Attempt reconnection after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWs();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();

    // Periodically sweep expired typing indicators (older than 4 seconds)
    const typingSweepTimer = setInterval(() => {
      const now = Date.now();
      setTypingMap((prev) => {
        let hasChanges = false;
        const next: Record<string, TypingUser[]> = {};
        for (const [cId, list] of Object.entries(prev)) {
          const valid = list.filter((t) => !t.lastTypedAt || now - t.lastTypedAt < 4000);
          if (valid.length !== list.length) {
            hasChanges = true;
          }
          if (valid.length > 0) {
            next[cId] = valid;
          }
        }
        return hasChanges ? next : prev;
      });
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(typingSweepTimer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, token, activeConversationId, soundEnabled]);

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    setReplyToMessage(null);
  };

  const setRoomKey = (conversationId: string, key: string) => {
    setRoomKeys((prev) => ({ ...prev, [conversationId]: key }));
  };

  const sendTyping = (isTyping: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !activeConversationId) {
      return;
    }

    if (!isTyping) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        wsRef.current.send(
          JSON.stringify({
            type: 'typing:stop',
            payload: { conversationId: activeConversationId },
          })
        );
      }
      return;
    }

    // Start or refresh typing status
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          type: 'typing:start',
          payload: { conversationId: activeConversationId },
        })
      );
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    // Auto-timeout typing indicator after 2.5 seconds of inactivity
    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        isTypingRef.current = false;
        wsRef.current.send(
          JSON.stringify({
            type: 'typing:stop',
            payload: { conversationId: activeConversationId },
          })
        );
      }
    }, 2500);
  };

  const simulateTyping = (participantName?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !activeConversationId) {
      return;
    }
    wsRef.current.send(
      JSON.stringify({
        type: 'typing:simulate',
        payload: {
          conversationId: activeConversationId,
          simulatedName: participantName,
        },
      })
    );
  };

  const sendMessage = async (options: SendMessageOptions) => {
    if (!activeConversationId || !user) return;

    let textToSend = options.text || '';
    let isEncrypted = options.isEncrypted || false;
    let encryptedPayload: string | undefined = undefined;

    // Check if end-to-end encryption is requested
    const key = roomKeys[activeConversationId];
    if (isEncrypted && key && textToSend) {
      encryptedPayload = await encryptText(textToSend, key);
      textToSend = encryptedPayload;
    }

    const payload = {
      conversationId: activeConversationId,
      text: textToSend,
      mediaType: options.mediaType || 'text',
      mediaUrl: options.mediaUrl,
      fileName: options.fileName,
      fileSize: options.fileSize,
      fileMime: options.fileMime,
      voiceDuration: options.voiceDuration,
      codeLanguage: options.codeLanguage,
      isEncrypted,
      encryptedPayload,
      metadata: options.metadata,
      replyTo: replyToMessage
        ? {
            id: replyToMessage.id,
            text: replyToMessage.text,
            senderName: replyToMessage.senderName,
          }
        : undefined,
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message:send',
          payload,
        })
      );
    }

    setReplyToMessage(null);
  };

  const sendReaction = (messageId: string, emoji: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'message:react',
        payload: { messageId, emoji },
      })
    );
  };

  const editMessage = (messageId: string, newText: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'message:edit',
        payload: { messageId, text: newText },
      })
    );
  };

  const deleteMessage = (messageId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'message:delete',
        payload: { messageId },
      })
    );
  };

  const createConversation = async (params: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    participantIds: string[];
    isEncrypted?: boolean;
    encryptionKeyHint?: string;
  }) => {
    const created = await api.createConversation(params);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === created.id);
      if (idx !== -1) return prev;
      return [created, ...prev];
    });
    setActiveConversationId(created.id);
    if (params.encryptionKeyHint) {
      setRoomKey(created.id, params.encryptionKeyHint);
    }
    return created;
  };

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const currentMessages = activeConversationId ? messagesByConv[activeConversationId] || [] : [];
  const currentTyping = activeConversationId ? typingMap[activeConversationId] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        isConnected,
        conversations,
        activeConversation,
        activeConversationId,
        messages: currentMessages,
        users,
        typingUsers: currentTyping,
        roomKeys,
        replyToMessage,
        soundEnabled,
        searchFilter,
        setSearchFilter,
        setSoundEnabled,
        setReplyToMessage,
        setRoomKey,
        selectConversation,
        sendMessage,
        sendTyping,
        simulateTyping,
        sendReaction,
        editMessage,
        deleteMessage,
        createConversation,
        deleteConversation,
        refreshConversations,
        refreshUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
