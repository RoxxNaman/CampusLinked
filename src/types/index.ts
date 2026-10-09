export type UserStatus = 'online' | 'busy' | 'away' | 'offline';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  statusMessage?: string;
  status: UserStatus;
  bio?: string;
  preferredLanguage?: string;
  isOnline: boolean;
  lastSeen: number;
  createdAt: number;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  avatar?: string;
  creatorId: string;
  participantIds: string[];
  isEncrypted?: boolean;
  encryptionKeyHint?: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    mediaType?: MediaType;
  };
  unreadCount?: number;
}

export type MediaType = 'text' | 'image' | 'audio' | 'file' | 'code';

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isEncrypted?: boolean;
  encryptedPayload?: string;
  mediaType: MediaType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  voiceDuration?: number;
  codeLanguage?: string;
  reactions: Record<string, string[]>; // emoji -> userIds
  readBy: string[]; // userIds
  deliveredTo: string[]; // userIds
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  isEdited: boolean;
  editedAt?: number;
  isDeleted: boolean;
  isAi?: boolean;
  metadata?: {
    sendTime?: number;
    scheduledFor?: number;
    isScheduled?: boolean;
    [key: string]: any;
  };
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  lastTypedAt?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// WebSocket Event Types
export type WsEventType =
  | 'auth'
  | 'auth:success'
  | 'user:online'
  | 'user:offline'
  | 'typing:start'
  | 'typing:stop'
  | 'typing:simulate'
  | 'message:send'
  | 'message:new'
  | 'message:read'
  | 'message:read_receipt'
  | 'message:react'
  | 'message:reaction_update'
  | 'message:edit'
  | 'message:edited'
  | 'message:delete'
  | 'message:deleted'
  | 'conversation:new'
  | 'conversation:update'
  | 'error'
  | 'ping'
  | 'pong';

export interface WsMessage<T = any> {
  type: WsEventType;
  payload: T;
  timestamp?: number;
}
