import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { db, AI_BOT_ID } from './db.ts';
import { generateChatBotReply } from './ai.ts';
import { WsMessage } from '../types/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'kamand_hackathon_super_secret_jwt_key_2026';

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

export function setupWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of userId -> Set of connected WebSockets
  const userSockets = new Map<string, Set<AuthenticatedSocket>>();

  function broadcastToUser(userId: string, data: WsMessage) {
    const sockets = userSockets.get(userId);
    if (!sockets) return;
    const payload = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  function broadcastToParticipants(participantIds: string[], data: WsMessage, excludeUserId?: string) {
    const payload = JSON.stringify(data);
    for (const pid of participantIds) {
      if (excludeUserId && pid === excludeUserId) continue;
      const sockets = userSockets.get(pid);
      if (sockets) {
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        }
      }
    }
  }

  function broadcastAll(data: WsMessage, excludeUserId?: string) {
    const payload = JSON.stringify(data);
    for (const [userId, sockets] of userSockets.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }
  }

  // Heartbeat interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      const authWs = ws as AuthenticatedSocket;
      if (authWs.isAlive === false) {
        return authWs.terminate();
      }
      authWs.isAlive = false;
      authWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: AuthenticatedSocket) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw: string | Buffer) => {
      try {
        const msgStr = raw.toString();
        const data: WsMessage = JSON.parse(msgStr);

        switch (data.type) {
          case 'auth': {
            const { token, userId } = data.payload || {};
            let validUserId: string | null = null;

            if (token) {
              try {
                const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
                validUserId = decoded.id;
              } catch {
                // If token invalid, verify if userId exists in DB (for demo flexibility)
                if (userId && db.getUserById(userId)) {
                  validUserId = userId;
                }
              }
            } else if (userId && db.getUserById(userId)) {
              validUserId = userId;
            }

            if (!validUserId) {
              ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid authentication credentials' } }));
              return;
            }

            ws.userId = validUserId;
            let currentSockets = userSockets.get(validUserId);
            if (!currentSockets) {
              currentSockets = new Set();
              userSockets.set(validUserId, currentSockets);
            }
            currentSockets.add(ws);

            db.setUserOnlineStatus(validUserId, true);

            // Send confirmation
            ws.send(JSON.stringify({
              type: 'auth:success',
              payload: { userId: validUserId, serverTime: Date.now() }
            }));

            // Broadcast online status
            broadcastAll({
              type: 'user:online',
              payload: { userId: validUserId, lastSeen: Date.now() },
            }, validUserId);
            break;
          }

          case 'typing:start': {
            if (!ws.userId) return;
            const { conversationId } = data.payload || {};
            if (!conversationId) return;

            const conv = db.getConversationById(conversationId);
            if (!conv || !conv.participantIds.includes(ws.userId)) return;

            const sender = db.getUserById(ws.userId);
            broadcastToParticipants(conv.participantIds, {
              type: 'typing:start',
              payload: {
                conversationId,
                userId: ws.userId,
                userName: sender?.displayName || sender?.username || 'Someone',
                userAvatar: sender?.avatar,
              },
            }, ws.userId);
            break;
          }

          case 'typing:stop': {
            if (!ws.userId) return;
            const { conversationId } = data.payload || {};
            if (!conversationId) return;

            const conv = db.getConversationById(conversationId);
            if (!conv) return;

            broadcastToParticipants(conv.participantIds, {
              type: 'typing:stop',
              payload: { conversationId, userId: ws.userId },
            }, ws.userId);
            break;
          }

          case 'typing:simulate': {
            if (!ws.userId) return;
            const { conversationId, simulatedName } = data.payload || {};
            if (!conversationId) return;

            const conv = db.getConversationById(conversationId);
            if (!conv) return;

            // Find other participant in this conversation
            const otherParticipantId =
              conv.participantIds.find((id) => id !== ws.userId && id !== AI_BOT_ID) ||
              conv.participantIds.find((id) => id !== ws.userId) ||
              'simulated_user';

            const otherUser = db.getUserById(otherParticipantId);
            const simName =
              simulatedName ||
              otherUser?.displayName ||
              otherUser?.username ||
              'Sarah Chen';
            const simAvatar =
              otherUser?.avatar ||
              'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah_chen';

            // Broadcast to participants including the requester so they can immediately see the indicator
            broadcastToParticipants(conv.participantIds, {
              type: 'typing:start',
              payload: {
                conversationId,
                userId: otherParticipantId,
                userName: simName,
                userAvatar: simAvatar,
              },
            });

            // Automatically broadcast typing:stop after 3.5 seconds
            setTimeout(() => {
              broadcastToParticipants(conv.participantIds, {
                type: 'typing:stop',
                payload: { conversationId, userId: otherParticipantId },
              });
            }, 3500);
            break;
          }

          case 'message:send': {
            if (!ws.userId) return;
            const {
              conversationId,
              text,
              mediaType,
              mediaUrl,
              fileName,
              fileSize,
              fileMime,
              voiceDuration,
              codeLanguage,
              isEncrypted,
              encryptedPayload,
              replyTo,
              metadata,
            } = data.payload || {};

            if (!conversationId || (!text && !mediaUrl && !encryptedPayload)) {
              return;
            }

            const conv = db.getConversationById(conversationId);
            if (!conv || !conv.participantIds.includes(ws.userId)) return;

            const sender = db.getUserById(ws.userId);
            if (!sender) return;

            // Immediately clear typing state for this sender across participants
            broadcastToParticipants(conv.participantIds, {
              type: 'typing:stop',
              payload: { conversationId, userId: ws.userId },
            }, ws.userId);

            // Save message to persistent database
            const message = db.createMessage({
              conversationId,
              senderId: ws.userId,
              senderName: sender.displayName,
              senderAvatar: sender.avatar,
              text: text || '',
              mediaType: mediaType || 'text',
              mediaUrl,
              fileName,
              fileSize,
              fileMime,
              voiceDuration,
              codeLanguage,
              isEncrypted,
              encryptedPayload,
              replyTo,
              metadata,
            });

            // Mark delivered for online participants
            for (const pid of conv.participantIds) {
              if (userSockets.has(pid) && userSockets.get(pid)!.size > 0) {
                if (!message.deliveredTo.includes(pid)) {
                  message.deliveredTo.push(pid);
                }
              }
            }

            // Broadcast message to all participants (including sender for acknowledgment)
            broadcastToParticipants(conv.participantIds, {
              type: 'message:new',
              payload: message,
            });

            // Trigger AI assistant if mentioned or in direct AI chat
            const isDirectAiChat = conv.participantIds.includes(AI_BOT_ID) && conv.type === 'direct';
            const mentionsAi = (text || '').toLowerCase().includes('@ai') || (text || '').toLowerCase().includes('@assistant');

            if (isDirectAiChat || mentionsAi) {
              // Send typing indicator for AI
              broadcastToParticipants(conv.participantIds, {
                type: 'typing:start',
                payload: {
                  conversationId,
                  userId: AI_BOT_ID,
                  userName: 'Kamand AI Assistant',
                },
              });

              // Asynchronously generate AI reply
              (async () => {
                try {
                  const cleanedPrompt = text ? text.replace(/@ai/gi, '').replace(/@assistant/gi, '').trim() : 'Hello';
                  const recentMsgs = db.getMessages(conversationId, 6);
                  const chatContext = recentMsgs.map((m) => ({
                    role: m.senderId === AI_BOT_ID ? ('model' as const) : ('user' as const),
                    text: m.text,
                  }));

                  const aiReplyText = await generateChatBotReply(cleanedPrompt, chatContext);

                  const aiMessage = db.createMessage({
                    conversationId,
                    senderId: AI_BOT_ID,
                    senderName: 'Kamand AI Assistant',
                    senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kamand_ai&backgroundColor=2563eb',
                    text: aiReplyText,
                    mediaType: 'text',
                    isAi: true,
                  });

                  // Stop typing indicator
                  broadcastToParticipants(conv.participantIds, {
                    type: 'typing:stop',
                    payload: { conversationId, userId: AI_BOT_ID },
                  });

                  // Broadcast AI message
                  broadcastToParticipants(conv.participantIds, {
                    type: 'message:new',
                    payload: aiMessage,
                  });
                } catch (err) {
                  console.error('Error handling AI response:', err);
                  broadcastToParticipants(conv.participantIds, {
                    type: 'typing:stop',
                    payload: { conversationId, userId: AI_BOT_ID },
                  });
                }
              })();
            }
            break;
          }

          case 'message:read': {
            if (!ws.userId) return;
            const { conversationId } = data.payload || {};
            if (!conversationId) return;

            const conv = db.getConversationById(conversationId);
            if (!conv) return;

            const updatedIds = db.markMessagesRead(conversationId, ws.userId);
            if (updatedIds.length > 0) {
              broadcastToParticipants(conv.participantIds, {
                type: 'message:read_receipt',
                payload: {
                  conversationId,
                  userId: ws.userId,
                  messageIds: updatedIds,
                },
              });
            }
            break;
          }

          case 'message:react': {
            if (!ws.userId) return;
            const { messageId, emoji } = data.payload || {};
            if (!messageId || !emoji) return;

            const updatedMsg = db.toggleReaction(messageId, emoji, ws.userId);
            if (updatedMsg) {
              const conv = db.getConversationById(updatedMsg.conversationId);
              if (conv) {
                broadcastToParticipants(conv.participantIds, {
                  type: 'message:reaction_update',
                  payload: {
                    messageId: updatedMsg.id,
                    conversationId: updatedMsg.conversationId,
                    reactions: updatedMsg.reactions,
                  },
                });
              }
            }
            break;
          }

          case 'message:edit': {
            if (!ws.userId) return;
            const { messageId, text } = data.payload || {};
            if (!messageId || !text) return;

            const msg = db.getMessageById(messageId);
            if (!msg || msg.senderId !== ws.userId) return;

            const updatedMsg = db.updateMessage(messageId, { text });
            if (updatedMsg) {
              const conv = db.getConversationById(updatedMsg.conversationId);
              if (conv) {
                broadcastToParticipants(conv.participantIds, {
                  type: 'message:edited',
                  payload: updatedMsg,
                });
              }
            }
            break;
          }

          case 'message:delete': {
            if (!ws.userId) return;
            const { messageId } = data.payload || {};
            if (!messageId) return;

            const msg = db.getMessageById(messageId);
            if (!msg || msg.senderId !== ws.userId) return;

            const deletedMsg = db.deleteMessage(messageId);
            if (deletedMsg) {
              const conv = db.getConversationById(deletedMsg.conversationId);
              if (conv) {
                broadcastToParticipants(conv.participantIds, {
                  type: 'message:deleted',
                  payload: {
                    messageId: deletedMsg.id,
                    conversationId: deletedMsg.conversationId,
                  },
                });
              }
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', payload: { time: Date.now() } }));
            break;
          }
        }
      } catch (err) {
        console.error('Error processing websocket message:', err);
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        const uid = ws.userId;
        const currentSockets = userSockets.get(uid);
        if (currentSockets) {
          currentSockets.delete(ws);
          if (currentSockets.size === 0) {
            userSockets.delete(uid);
            db.setUserOnlineStatus(uid, false);
            broadcastAll({
              type: 'user:offline',
              payload: { userId: uid, lastSeen: Date.now() },
            });
          }
        }
      }
    });
  });

  return {
    broadcastToUser,
    broadcastToParticipants,
    broadcastAll,
  };
}
