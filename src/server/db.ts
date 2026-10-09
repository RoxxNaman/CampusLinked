import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Conversation, Message, MediaType } from '../types/index.ts';

interface DatabaseSchema {
  users: Array<User & { passwordHash: string }>;
  conversations: Conversation[];
  messages: Message[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const AI_BOT_ID = 'usr_kamand_bot';

const DEFAULT_USERS: Array<User & { passwordHash: string }> = [
  {
    id: AI_BOT_ID,
    username: 'kamand_ai',
    displayName: 'Kamand AI Assistant',
    email: 'ai@kamandprompt.iitmandi.ac.in',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kamand_ai&backgroundColor=2563eb',
    statusMessage: 'Powered by Gemini 3.8 Flash • Ask me anything!',
    status: 'online',
    bio: 'Official intelligent assistant for the KamandPrompt Hackathon platform. Tag @AI or message me directly.',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 7,
    passwordHash: bcrypt.hashSync('ai_secure_password_123', 10),
  },
  {
    id: 'usr_naman',
    username: 'naman',
    displayName: 'Naman Patel',
    email: 'namanpatel041008@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naman&backgroundColor=b6e3f4',
    statusMessage: 'Building CampusLink Chat 🚀',
    status: 'online',
    bio: 'Lead Full-stack Engineer at KamandPrompt IIT Mandi. Building real-time apps with WebSockets & React.',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 5,
    passwordHash: bcrypt.hashSync('password123', 10),
  },
  {
    id: 'usr_priya',
    username: 'priya',
    displayName: 'Priya Sharma',
    email: 'priya@iitmandi.ac.in',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&backgroundColor=ffd5dc',
    statusMessage: 'Benchmarking WebSocket latencies ⚡',
    status: 'online',
    bio: 'Systems Engineer & Backend enthusiast. Testing real-time message sync and data encryption.',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 4,
    passwordHash: bcrypt.hashSync('password123', 10),
  },
  {
    id: 'usr_rahul',
    username: 'rahul',
    displayName: 'Rahul Verma',
    email: 'rahul@iitmandi.ac.in',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul&backgroundColor=d1d4f9',
    statusMessage: 'Evaluating hackathon submissions 💻',
    status: 'away',
    bio: 'Hackathon judge & coordinator at KamandPrompt. Testing UI/UX, responsiveness, and multi-user sync.',
    isOnline: false,
    lastSeen: Date.now() - 3600000 * 2,
    createdAt: Date.now() - 86400000 * 3,
    passwordHash: bcrypt.hashSync('password123', 10),
  },
  {
    id: 'usr_arjun',
    username: 'arjun',
    displayName: 'Arjun Mehta',
    email: 'arjun@iitmandi.ac.in',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun&backgroundColor=c0aede',
    statusMessage: 'Ready for 24-hr Hackathon sprint!',
    status: 'online',
    bio: 'Computer Science student at IIT Mandi. Full-stack developer.',
    isOnline: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 2,
    passwordHash: bcrypt.hashSync('password123', 10),
  },
];

const DEFAULT_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_group_core',
    type: 'group',
    name: 'KamandPrompt 2026 Core',
    description: 'General discussion for CampusLink platform participants and organizers',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=KamandPromptCore',
    creatorId: 'usr_naman',
    participantIds: ['usr_naman', 'usr_priya', 'usr_rahul', 'usr_arjun', AI_BOT_ID],
    isEncrypted: false,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 60000 * 12,
  },
  {
    id: 'conv_direct_naman_priya',
    type: 'direct',
    name: 'Priya Sharma',
    creatorId: 'usr_naman',
    participantIds: ['usr_naman', 'usr_priya'],
    isEncrypted: true,
    encryptionKeyHint: 'kamand2026',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 60000 * 5,
  },
  {
    id: 'conv_direct_naman_ai',
    type: 'direct',
    name: 'Kamand AI Assistant',
    creatorId: 'usr_naman',
    participantIds: ['usr_naman', AI_BOT_ID],
    isEncrypted: false,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 60000 * 30,
  },
];

const DEFAULT_MESSAGES: Message[] = [
  // Group chat messages
  {
    id: 'msg_init_1',
    conversationId: 'conv_group_core',
    senderId: 'usr_rahul',
    senderName: 'Rahul Verma',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul&backgroundColor=d1d4f9',
    text: 'Welcome to CampusLink at IIT Mandi! The platform supports real-time 1-on-1 and group chat, persistent database, WebSocket protocol, and clean authentication.',
    mediaType: 'text',
    reactions: { '🚀': ['usr_naman', 'usr_priya'], '👏': ['usr_arjun'] },
    readBy: ['usr_naman', 'usr_priya', 'usr_arjun'],
    deliveredTo: ['usr_naman', 'usr_priya', 'usr_rahul', 'usr_arjun', AI_BOT_ID],
    isEdited: false,
    isDeleted: false,
    timestamp: Date.now() - 3600000 * 4,
  },
  {
    id: 'msg_init_2',
    conversationId: 'conv_group_core',
    senderId: 'usr_naman',
    senderName: 'Naman Patel',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naman&backgroundColor=b6e3f4',
    text: 'Our server architecture is running with an integrated WebSocket server, atomic persistent database, and Gemini 3.8 Flash LLM integration! Here is the WebSocket connection snippet:',
    mediaType: 'code',
    codeLanguage: 'typescript',
    mediaUrl: `// Real-Time WebSocket Message Dispatch
ws.send(JSON.stringify({
  type: 'message:send',
  payload: {
    conversationId: 'conv_group_core',
    text: 'Hello from CampusLink!',
    mediaType: 'text'
  }
}));`,
    reactions: { '🔥': ['usr_priya', 'usr_arjun'] },
    readBy: ['usr_priya', 'usr_arjun'],
    deliveredTo: ['usr_naman', 'usr_priya', 'usr_rahul', 'usr_arjun', AI_BOT_ID],
    isEdited: false,
    isDeleted: false,
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: 'msg_init_3',
    conversationId: 'conv_group_core',
    senderId: AI_BOT_ID,
    senderName: 'Kamand AI Assistant',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kamand_ai&backgroundColor=2563eb',
    text: 'Hello everyone! I am the KamandPrompt AI assistant. You can mention @AI in any message to ask coding questions, summarize discussions, or review algorithms.',
    mediaType: 'text',
    reactions: { '💡': ['usr_naman', 'usr_priya'] },
    readBy: ['usr_naman', 'usr_priya'],
    deliveredTo: ['usr_naman', 'usr_priya', 'usr_rahul', 'usr_arjun', AI_BOT_ID],
    isEdited: false,
    isDeleted: false,
    isAi: true,
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'msg_init_4',
    conversationId: 'conv_group_core',
    senderId: 'usr_rahul',
    senderName: 'Rahul Verma',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul&backgroundColor=d1d4f9',
    text: 'Reminder: The team code checkpoint is scheduled for this evening. Please push your branch.',
    mediaType: 'text',
    reactions: { '⏰': ['usr_naman'] },
    readBy: ['usr_naman', 'usr_rahul'],
    deliveredTo: ['usr_naman', 'usr_rahul', 'usr_priya', 'usr_arjun', AI_BOT_ID],
    isEdited: false,
    isDeleted: false,
    metadata: {
      sendTime: Date.now() + 3600000,
      scheduledFor: Date.now() + 3600000,
      isScheduled: true,
    },
    timestamp: Date.now() - 60000 * 10,
  },
  // Direct chat messages
  {
    id: 'msg_direct_1',
    conversationId: 'conv_direct_naman_priya',
    senderId: 'usr_priya',
    senderName: 'Priya Sharma',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&backgroundColor=ffd5dc',
    text: 'Hey Naman! Have you tested the end-to-end encrypted messaging mode yet?',
    mediaType: 'text',
    reactions: { '👍': ['usr_naman'] },
    readBy: ['usr_naman'],
    deliveredTo: ['usr_naman', 'usr_priya'],
    isEdited: false,
    isDeleted: false,
    timestamp: Date.now() - 60000 * 20,
  },
  {
    id: 'msg_direct_2',
    conversationId: 'conv_direct_naman_priya',
    senderId: 'usr_naman',
    senderName: 'Naman Patel',
    senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Naman&backgroundColor=b6e3f4',
    text: 'Yes! It derives 256-bit AES-GCM keys via PBKDF2 directly in browser memory. Even the server only sees the ciphertext when lock mode is engaged.',
    mediaType: 'text',
    reactions: { '🔒': ['usr_priya'], '❤️': ['usr_priya'] },
    readBy: ['usr_priya'],
    deliveredTo: ['usr_naman', 'usr_priya'],
    isEdited: false,
    isDeleted: false,
    timestamp: Date.now() - 60000 * 5,
  },
  // AI Direct chat
  {
    id: 'msg_ai_1',
    conversationId: 'conv_direct_naman_ai',
    senderId: AI_BOT_ID,
    senderName: 'Kamand AI Assistant',
    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kamand_ai&backgroundColor=2563eb',
    text: 'Greetings Naman! I am your AI assistant for CampusLink. Ask me to generate code, review architectures, or summarize any conversation!',
    mediaType: 'text',
    reactions: { '👋': ['usr_naman'] },
    readBy: ['usr_naman'],
    deliveredTo: ['usr_naman', AI_BOT_ID],
    isEdited: false,
    isDeleted: false,
    isAi: true,
    timestamp: Date.now() - 60000 * 30,
  },
];

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.conversations && parsed.messages) {
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, resetting to defaults:', err);
      }
    }
    const initial: DatabaseSchema = {
      users: DEFAULT_USERS,
      conversations: DEFAULT_CONVERSATIONS,
      messages: DEFAULT_MESSAGES,
    };
    this.saveImmediate(initial);
    return initial;
  }

  private saveImmediate(dataToSave: DatabaseSchema = this.data) {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error writing to database file:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
      this.saveTimeout = null;
    }, 150);
  }

  // --- Users ---
  getAllUsers(): User[] {
    return this.data.users.map(({ passwordHash, ...user }) => user);
  }

  getUserById(id: string): User | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  getUserWithPassword(emailOrUsername: string): (User & { passwordHash: string }) | null {
    const identifier = emailOrUsername.toLowerCase().trim();
    const user = this.data.users.find(
      (u) => u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
    );
    return user || null;
  }

  createUser(userData: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    avatar?: string;
    bio?: string;
  }): User {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(userData.password, salt);
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const avatar =
      userData.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        userData.username
      )}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const newUser: User & { passwordHash: string } = {
      id,
      username: userData.username.toLowerCase().trim(),
      displayName: userData.displayName.trim(),
      email: userData.email.toLowerCase().trim(),
      avatar,
      status: 'online',
      statusMessage: 'Available',
      bio: userData.bio || 'CampusLink participant',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      passwordHash,
    };

    this.data.users.push(newUser);
    this.scheduleSave();

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates,
    };
    this.scheduleSave();
    const { passwordHash, ...safeUser } = this.data.users[index];
    return safeUser;
  }

  setUserOnlineStatus(id: string, isOnline: boolean): void {
    const user = this.data.users.find((u) => u.id === id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = Date.now();
      if (!isOnline && user.status === 'online') {
        user.status = 'offline';
      } else if (isOnline && user.status === 'offline') {
        user.status = 'online';
      }
      this.scheduleSave();
    }
  }

  // --- Conversations ---
  getConversationsForUser(userId: string): Conversation[] {
    const list = this.data.conversations
      .filter((c) => c.participantIds.includes(userId))
      .map((conv) => {
        // Calculate unread count and latest message
        const messages = this.data.messages.filter((m) => m.conversationId === conv.id && !m.isDeleted);
        const lastMsg = messages[messages.length - 1];
        const unreadCount = messages.filter(
          (m) => m.senderId !== userId && !m.readBy.includes(userId)
        ).length;

        let displayName = conv.name;
        let displayAvatar = conv.avatar;

        // If direct conversation, name and avatar are the OTHER participant
        if (conv.type === 'direct') {
          const otherId = conv.participantIds.find((pid) => pid !== userId) || conv.participantIds[0];
          const otherUser = this.getUserById(otherId);
          if (otherUser) {
            displayName = otherUser.displayName;
            displayAvatar = otherUser.avatar;
          }
        }

        return {
          ...conv,
          name: displayName,
          avatar: displayAvatar,
          unreadCount,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                text: lastMsg.text,
                senderId: lastMsg.senderId,
                senderName: lastMsg.senderName,
                timestamp: lastMsg.timestamp,
                mediaType: lastMsg.mediaType,
              }
            : undefined,
        };
      });

    // Sort by most recently updated
    return list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }

  getConversationById(id: string): Conversation | null {
    return this.data.conversations.find((c) => c.id === id) || null;
  }

  findDirectConversation(userA: string, userB: string): Conversation | null {
    return (
      this.data.conversations.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.includes(userA) &&
          c.participantIds.includes(userB) &&
          c.participantIds.length === 2
      ) || null
    );
  }

  createConversation(data: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    avatar?: string;
    creatorId: string;
    participantIds: string[];
    isEncrypted?: boolean;
    encryptionKeyHint?: string;
  }): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newConv: Conversation = {
      id,
      type: data.type,
      name: data.name || (data.type === 'group' ? 'New Group' : 'Direct Chat'),
      description: data.description,
      avatar:
        data.avatar ||
        (data.type === 'group'
          ? `https://api.dicebear.com/7.x/identicon/svg?seed=${id}`
          : undefined),
      creatorId: data.creatorId,
      participantIds: Array.from(new Set(data.participantIds)),
      isEncrypted: !!data.isEncrypted,
      encryptionKeyHint: data.encryptionKeyHint,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.conversations.push(newConv);
    this.scheduleSave();
    return newConv;
  }

  updateConversation(id: string, updates: Partial<Conversation>): Conversation | null {
    const idx = this.data.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.conversations[idx] = {
      ...this.data.conversations[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    this.scheduleSave();
    return this.data.conversations[idx];
  }

  deleteConversation(id: string): boolean {
    const prevLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.data.messages = this.data.messages.filter((m) => m.conversationId !== id);
    this.scheduleSave();
    return this.data.conversations.length < prevLen;
  }

  // --- Messages ---
  getMessages(conversationId: string, limit: number = 100, beforeTimestamp?: number): Message[] {
    let msgs = this.data.messages.filter((m) => m.conversationId === conversationId);
    if (beforeTimestamp) {
      msgs = msgs.filter((m) => m.timestamp < beforeTimestamp);
    }
    // Return sorted oldest to newest for chat timeline
    return msgs.slice(-limit);
  }

  getMessageById(id: string): Message | null {
    return this.data.messages.find((m) => m.id === id) || null;
  }

  createMessage(msgData: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    mediaType?: MediaType;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMime?: string;
    voiceDuration?: number;
    codeLanguage?: string;
    isEncrypted?: boolean;
    encryptedPayload?: string;
    replyTo?: { id: string; text: string; senderName: string };
    isAi?: boolean;
    metadata?: Record<string, any>;
  }): Message {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMsg: Message = {
      id,
      conversationId: msgData.conversationId,
      senderId: msgData.senderId,
      senderName: msgData.senderName,
      senderAvatar: msgData.senderAvatar,
      text: msgData.text,
      isEncrypted: !!msgData.isEncrypted,
      encryptedPayload: msgData.encryptedPayload,
      mediaType: msgData.mediaType || 'text',
      mediaUrl: msgData.mediaUrl,
      fileName: msgData.fileName,
      fileSize: msgData.fileSize,
      fileMime: msgData.fileMime,
      voiceDuration: msgData.voiceDuration,
      codeLanguage: msgData.codeLanguage,
      reactions: {},
      readBy: [msgData.senderId],
      deliveredTo: [msgData.senderId],
      replyTo: msgData.replyTo,
      isEdited: false,
      isDeleted: false,
      isAi: !!msgData.isAi,
      metadata: msgData.metadata,
      timestamp: Date.now(),
    };

    this.data.messages.push(newMsg);

    // Update conversation updatedAt
    const conv = this.data.conversations.find((c) => c.id === msgData.conversationId);
    if (conv) {
      conv.updatedAt = Date.now();
    }

    this.scheduleSave();
    return newMsg;
  }

  updateMessage(id: string, updates: Partial<Message>): Message | null {
    const idx = this.data.messages.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.data.messages[idx] = {
      ...this.data.messages[idx],
      ...updates,
      isEdited: true,
      editedAt: Date.now(),
    };
    this.scheduleSave();
    return this.data.messages[idx];
  }

  deleteMessage(id: string): Message | null {
    const msg = this.data.messages.find((m) => m.id === id);
    if (!msg) return null;
    msg.isDeleted = true;
    msg.text = 'This message was deleted';
    msg.mediaUrl = undefined;
    msg.encryptedPayload = undefined;
    this.scheduleSave();
    return msg;
  }

  toggleReaction(messageId: string, emoji: string, userId: string): Message | null {
    const msg = this.data.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    if (!msg.reactions) {
      msg.reactions = {};
    }

    const currentUsers = msg.reactions[emoji] || [];
    if (currentUsers.includes(userId)) {
      msg.reactions[emoji] = currentUsers.filter((uid) => uid !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...currentUsers, userId];
    }

    this.scheduleSave();
    return msg;
  }

  markMessagesRead(conversationId: string, userId: string): string[] {
    const updatedIds: string[] = [];
    for (const msg of this.data.messages) {
      if (msg.conversationId === conversationId && !msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
        if (!msg.deliveredTo.includes(userId)) {
          msg.deliveredTo.push(userId);
        }
        updatedIds.push(msg.id);
      }
    }
    if (updatedIds.length > 0) {
      this.scheduleSave();
    }
    return updatedIds;
  }

  markMessagesDelivered(conversationId: string, userId: string): void {
    let changed = false;
    for (const msg of this.data.messages) {
      if (msg.conversationId === conversationId && !msg.deliveredTo.includes(userId)) {
        msg.deliveredTo.push(userId);
        changed = true;
      }
    }
    if (changed) {
      this.scheduleSave();
    }
  }

  resetToDemo(): void {
    this.data = {
      users: DEFAULT_USERS,
      conversations: DEFAULT_CONVERSATIONS,
      messages: DEFAULT_MESSAGES,
    };
    this.saveImmediate();
  }
}

export const db = new Database();
