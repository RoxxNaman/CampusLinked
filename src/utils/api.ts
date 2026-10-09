import { AuthResponse, Conversation, Message, User } from '../types/index.ts';

const TOKEN_KEY = 'campuslink_jwt_token';
const USER_KEY = 'campuslink_active_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('firstcommit_jwt_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('firstcommit_jwt_token');
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem('firstcommit_active_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('firstcommit_active_user');
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const user = getStoredUser();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user?.id) {
    headers['x-user-id'] = user.id;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) errorMsg = errorJson.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setStoredToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  async register(payload: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    bio?: string;
  }): Promise<AuthResponse> {
    const data = await apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStoredToken(data.token);
    setStoredUser(data.user);
    return data;
  },

  async getMe(): Promise<User> {
    return apiFetch<User>('/api/auth/me');
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const updated = await apiFetch<User>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setStoredUser(updated);
    return updated;
  },

  // Users
  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('/api/users');
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    return apiFetch<Conversation[]>('/api/conversations');
  },

  async getConversation(id: string): Promise<Conversation> {
    return apiFetch<Conversation>(`/api/conversations/${id}`);
  },

  async createConversation(payload: {
    type: 'direct' | 'group';
    name?: string;
    description?: string;
    participantIds: string[];
    isEncrypted?: boolean;
    encryptionKeyHint?: string;
  }): Promise<Conversation> {
    return apiFetch<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteConversation(id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  // Messages
  async getMessages(conversationId: string, limit = 100): Promise<Message[]> {
    return apiFetch<Message[]>(`/api/conversations/${conversationId}/messages?limit=${limit}`);
  },

  async uploadFile(file: File): Promise<{
    url: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> {
    // Convert to base64 data URI
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const result = await apiFetch<{
            url: string;
            fileName: string;
            mimeType: string;
            fileSize: number;
          }>('/api/messages/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              fileData: base64Data,
              mimeType: file.type,
              fileSize: file.size,
            }),
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  // AI
  async summarizeChat(conversationId: string): Promise<{ summary: string }> {
    return apiFetch<{ summary: string }>('/api/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    });
  },

  async translateText(text: string, targetLanguage: string): Promise<{ translated: string }> {
    return apiFetch<{ translated: string }>('/api/ai/translate', {
      method: 'POST',
      body: JSON.stringify({ text, targetLanguage }),
    });
  },

  async promptAi(prompt: string, conversationId?: string): Promise<{ response: string }> {
    return apiFetch<{ response: string }>('/api/ai/prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt, conversationId }),
    });
  },

  async resetDemo(): Promise<void> {
    await apiFetch('/api/reset-demo', { method: 'POST' });
  },
};
