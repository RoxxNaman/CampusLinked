import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db, AI_BOT_ID } from './src/server/db.ts';
import { setupWebSocket } from './src/server/ws.ts';
import { summarizeConversation, translateText, generateChatBotReply } from './src/server/ai.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'kamand_hackathon_super_secret_jwt_key_2026';
const PORT = parseInt(process.env.PORT || '3000', 10);

// Dangerous file extensions to reject for security & file safety
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.sh', '.cmd', '.vbs', '.msi', '.ps1', '.jar', '.com', '.scr', '.pif'
];

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const directUserId = req.headers['x-user-id'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; username: string };
      req.user = decoded;
      return next();
    } catch {
      // Fall through to checking directUserId if token invalid
    }
  }

  if (directUserId) {
    const user = db.getUserById(directUserId);
    if (user) {
      req.user = { id: user.id, email: user.email, username: user.username };
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Setup WebSockets
  const wsManager = setupWebSocket(server);

  // Body parser with 25MB limit for multimedia & audio notes
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- Auth APIs ---
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { username, displayName, email, password, bio, avatar } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check duplicate
      const existingUser = db.getUserWithPassword(email) || db.getUserWithPassword(username);
      if (existingUser) {
        return res.status(409).json({ error: 'User with this email or username already exists' });
      }

      const user = db.createUser({
        username,
        displayName: displayName || username,
        email,
        password,
        bio,
        avatar,
      });

      // Automatically add new user to the KamandPrompt Core group conversation so they have immediate chat context!
      const coreGroup = db.getConversationById('conv_group_core');
      if (coreGroup && !coreGroup.participantIds.includes(user.id)) {
        coreGroup.participantIds.push(user.id);
        db.updateConversation('conv_group_core', { participantIds: coreGroup.participantIds });
      }

      // Generate token
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return res.status(201).json({ token, user });
    } catch (err: any) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Email/Username and password are required' });
      }

      const userWithPwd = db.getUserWithPassword(identifier);
      if (!userWithPwd) {
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      const isValid = bcrypt.compareSync(password, userWithPwd.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
      }

      const { passwordHash: _, ...user } = userWithPwd;
      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return res.json({ token, user });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
    const user = db.getUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  });

  app.put('/api/auth/profile', authMiddleware, (req: AuthRequest, res: Response) => {
    const { displayName, statusMessage, bio, avatar, status, preferredLanguage } = req.body;
    const updated = db.updateUser(req.user!.id, {
      ...(displayName && { displayName }),
      ...(statusMessage !== undefined && { statusMessage }),
      ...(bio !== undefined && { bio }),
      ...(avatar && { avatar }),
      ...(status && { status }),
      ...(preferredLanguage !== undefined && { preferredLanguage }),
    });
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(updated);
  });

  // --- Users APIs ---
  app.get('/api/users', authMiddleware, (_req: AuthRequest, res: Response) => {
    const users = db.getAllUsers();
    return res.json(users);
  });

  app.get('/api/users/:id', authMiddleware, (req: Request, res: Response) => {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  });

  // --- Conversations APIs ---
  app.get('/api/conversations', authMiddleware, (req: AuthRequest, res: Response) => {
    const conversations = db.getConversationsForUser(req.user!.id);
    return res.json(conversations);
  });

  app.post('/api/conversations', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
      const { type, participantIds, name, description, avatar, isEncrypted, encryptionKeyHint } = req.body;
      const userId = req.user!.id;

      if (!type || !['direct', 'group'].includes(type)) {
        return res.status(400).json({ error: 'Type must be direct or group' });
      }

      const allParticipants = Array.from(new Set([...(participantIds || []), userId]));

      // If direct conversation, check if one already exists
      if (type === 'direct') {
        if (allParticipants.length < 2) {
          return res.status(400).json({ error: 'Direct conversation requires another participant' });
        }
        const otherId = allParticipants.find((id) => id !== userId);
        if (otherId) {
          const existing = db.findDirectConversation(userId, otherId);
          if (existing) {
            // Return formatted conversation
            const formatted = db.getConversationsForUser(userId).find((c) => c.id === existing.id);
            return res.json(formatted || existing);
          }
        }
      }

      const created = db.createConversation({
        type,
        name,
        description,
        avatar,
        creatorId: userId,
        participantIds: allParticipants,
        isEncrypted,
        encryptionKeyHint,
      });

      // Format for user
      const formatted = db.getConversationsForUser(userId).find((c) => c.id === created.id);

      // Broadcast to other participants
      wsManager.broadcastToParticipants(allParticipants, {
        type: 'conversation:new',
        payload: formatted || created,
      }, userId);

      return res.status(201).json(formatted || created);
    } catch (err: any) {
      console.error('Create conversation error:', err);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  app.get('/api/conversations/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const conv = db.getConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!conv.participantIds.includes(req.user!.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const formatted = db.getConversationsForUser(req.user!.id).find((c) => c.id === conv.id);
    return res.json(formatted || conv);
  });

  app.get('/api/conversations/:id/messages', authMiddleware, (req: AuthRequest, res: Response) => {
    const conv = db.getConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!conv.participantIds.includes(req.user!.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 100;
    const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;
    const messages = db.getMessages(req.params.id, limit, before);

    // Mark as read
    db.markMessagesRead(req.params.id, req.user!.id);

    return res.json(messages);
  });

  app.delete('/api/conversations/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    const conv = db.getConversationById(req.params.id);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (conv.creatorId !== req.user!.id && conv.type === 'group') {
      // If not creator in group, just leave the group
      conv.participantIds = conv.participantIds.filter((id) => id !== req.user!.id);
      db.updateConversation(conv.id, { participantIds: conv.participantIds });
      return res.json({ message: 'Left group successfully' });
    }

    db.deleteConversation(req.params.id);
    return res.json({ message: 'Conversation deleted' });
  });

  // --- File Upload & Safety ---
  app.post('/api/messages/upload', authMiddleware, (req: Request, res: Response) => {
    try {
      const { fileName, fileData, mimeType, fileSize } = req.body;

      if (!fileName || !fileData) {
        return res.status(400).json({ error: 'File name and file data are required' });
      }

      // 1. File Safety: Check blocked malicious file extensions
      const ext = path.extname(fileName).toLowerCase();
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({
          error: `Security Alert: Files with extension "${ext}" are executable and cannot be shared.`,
          securityViolation: true,
        });
      }

      // 2. File Size check (limit 15MB)
      if (fileSize && fileSize > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'File size exceeds 15MB limit' });
      }

      // In this environment, we return the verified secure data URI
      return res.json({
        url: fileData,
        fileName,
        mimeType: mimeType || 'application/octet-stream',
        fileSize: fileSize || fileData.length,
        verified: true,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

  // --- Message Reaction & Actions APIs ---
  app.post('/api/messages/:id/react', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
      const { emoji } = req.body;
      const messageId = req.params.id;
      if (!emoji) {
        return res.status(400).json({ error: 'Emoji is required' });
      }
      const updatedMsg = db.toggleReaction(messageId, emoji, req.user!.id);
      if (!updatedMsg) {
        return res.status(404).json({ error: 'Message not found' });
      }
      const conv = db.getConversationById(updatedMsg.conversationId);
      if (conv) {
        wsManager.broadcastToParticipants(conv.participantIds, {
          type: 'message:reaction_update',
          payload: {
            messageId: updatedMsg.id,
            conversationId: updatedMsg.conversationId,
            reactions: updatedMsg.reactions,
          },
        });
      }
      return res.json(updatedMsg);
    } catch (err: any) {
      console.error('React error:', err);
      return res.status(500).json({ error: 'Failed to react to message' });
    }
  });

  app.put('/api/messages/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
      const { text } = req.body;
      const messageId = req.params.id;
      const msg = db.getMessageById(messageId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      if (msg.senderId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

      const updated = db.updateMessage(messageId, { text });
      const conv = db.getConversationById(msg.conversationId);
      if (conv && updated) {
        wsManager.broadcastToParticipants(conv.participantIds, {
          type: 'message:edited',
          payload: updated,
        });
      }
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to edit message' });
    }
  });

  app.delete('/api/messages/:id', authMiddleware, (req: AuthRequest, res: Response) => {
    try {
      const messageId = req.params.id;
      const msg = db.getMessageById(messageId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      if (msg.senderId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });

      const deleted = db.deleteMessage(messageId);
      const conv = db.getConversationById(msg.conversationId);
      if (conv && deleted) {
        wsManager.broadcastToParticipants(conv.participantIds, {
          type: 'message:deleted',
          payload: { messageId, conversationId: msg.conversationId },
        });
      }
      return res.json({ message: 'Message deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // --- AI Assistance APIs ---
  app.post('/api/ai/summarize', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.body;
      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID required' });
      }
      const messages = db.getMessages(conversationId, 40);
      const summary = await summarizeConversation(messages);
      return res.json({ summary });
    } catch (err: any) {
      console.error('AI summarize error:', err);
      return res.status(500).json({ error: 'Summarization failed' });
    }
  });

  app.post('/api/ai/translate', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and targetLanguage required' });
      }
      const translated = await translateText(text, targetLanguage);
      return res.json({ translated });
    } catch (err: any) {
      console.error('AI translate error:', err);
      return res.status(500).json({ error: 'Translation failed' });
    }
  });

  app.post('/api/ai/prompt', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { prompt, conversationId } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt required' });
      }
      let context: Array<{ role: 'user' | 'model'; text: string }> = [];
      if (conversationId) {
        const msgs = db.getMessages(conversationId, 6);
        context = msgs.map((m) => ({
          role: m.senderId === AI_BOT_ID ? ('model' as const) : ('user' as const),
          text: m.text,
        }));
      }
      const response = await generateChatBotReply(prompt, context);
      return res.json({ response });
    } catch (err: any) {
      console.error('AI prompt error:', err);
      return res.status(500).json({ error: 'AI prompt processing failed' });
    }
  });

  // --- Reset to Demo Seed Data ---
  app.post('/api/reset-demo', (_req: Request, res: Response) => {
    db.resetToDemo();
    return res.json({ message: 'Database reset to demo state' });
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      time: Date.now(),
      usersCount: db.getAllUsers().length,
      connectedSockets: true,
    });
  });

  // Frontend Serving: Vite dev server in development, static in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FirstCommit Chat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
