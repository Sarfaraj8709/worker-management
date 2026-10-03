import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import ChatMessage from '../models/ChatMessage.js';

const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];
const MAX_MESSAGE_LENGTH = 2000;

// The JWT secret must come exclusively from the environment - no
// hardcoded fallback. Verification fails closed when it is missing.
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('Server misconfiguration: JWT_SECRET is missing or too short');
  }
  return secret;
};

// LOCKED_STATUSES: the conversation becomes read-only once the job is finished.
const LOCKED_STATUSES = ['Completed', 'Cancelled'];

let io = null;

// Map: userId (string) -> Set of socket ids connected for that user
const userSockets = new Map();
// Map: socketId (string) -> Set of ticketIds the socket has joined
const socketTickets = new Map();

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf('=');
        return eq === -1 ? [part, ''] : [part.slice(0, eq), part.slice(eq + 1)];
      })
  );

export const getIO = () => io;

const serializeMessage = (msg) => ({
  _id: msg._id,
  ticketId: msg.ticketId,
  senderId: msg.senderId,
  senderRole: msg.senderRole,
  senderName: msg.senderName,
  message: msg.message,
  type: msg.type,
  readBy: msg.readBy || [],
  readAt: msg.readAt || null,
  createdAt: msg.createdAt,
});

const addUserSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
};

const removeUserSocket = (userId, socketId) => {
  if (userId && userSockets.has(userId)) {
    userSockets.get(userId).delete(socketId);
    if (userSockets.get(userId).size === 0) userSockets.delete(userId);
  }
};

const getOnlineParticipantIds = (ticket) => {
  const ids = [ticket.userId.toString()];
  if (ticket.workerId) ids.push(ticket.workerId.toString());
  return ids.filter((id) => userSockets.has(id));
};

const isUserOnline = (userId) => userSockets.has(String(userId));

// A socket is "viewing" the ticket if it joined the room
const isSocketInRoom = (socketId, ticketId) => {
  const set = socketTickets.get(socketId);
  return !!set && set.has(String(ticketId));
};

// Verify the authenticated user is a participant of the ticket
const canAccessTicket = (user, ticket) => {
  if (!user || !ticket) return false;
  if (user.role === 'admin' || user.role === 'organization_admin') return true;
  if (ticket.userId && String(ticket.userId._id || ticket.userId) === user.id) return true;
  if (ticket.workerId && String(ticket.workerId._id || ticket.workerId) === user.id) return true;
  return false;
};

const getTicketParticipants = (ticket) => {
  const ids = [String(ticket.userId._id || ticket.userId)];
  if (ticket.workerId) ids.push(String(ticket.workerId._id || ticket.workerId));
  return ids;
};

const getUnreadCountFor = async (ticketId, userId) =>
  ChatMessage.countDocuments({
    ticketId,
    senderId: { $nin: [userId, null] },
    readBy: { $nin: [userId] },
  });

const broadcastPresence = (ticketId, ticket) => {
  const room = `ticket:${ticketId}`;
  const onlineIds = getOnlineParticipantIds(ticket);
  io.to(room).emit('presence:update', { ticketId, onlineIds });
};

const handleJoinRoom = async (socket, payload) => {
  const { ticketId } = payload || {};
  if (!ticketId) return;

  const ticket = await Ticket.findById(ticketId);
  if (!canAccessTicket(socket.user, ticket)) {
    return socket.emit('chat:error', { ticketId, message: 'Not authorized to join this conversation' });
  }

  const room = `ticket:${ticketId}`;
  socket.join(room);

  const ticketKey = String(ticketId);
  if (!socketTickets.has(socket.id)) socketTickets.set(socket.id, new Set());
  socketTickets.get(socket.id).add(ticketKey);

  // Send current presence snapshot + broadcast online state to the room
  const onlineIds = getOnlineParticipantIds(ticket);
  socket.emit('chat:presence', { ticketId, onlineIds });
  broadcastPresence(ticketId, ticket);
};

const handleLeaveRoom = (socket, payload) => {
  const { ticketId } = payload || {};
  if (!ticketId) return;
  socket.leave(`ticket:${ticketId}`);
  const set = socketTickets.get(socket.id);
  if (set) {
    set.delete(String(ticketId));
    if (set.size === 0) socketTickets.delete(socket.id);
  }
};

const handleSendMessage = async (socket, payload) => {
  const { ticketId, message } = payload || {};
  const text = typeof message === 'string' ? message.trim() : '';

  if (!ticketId || !text) {
    return socket.emit('chat:error', { ticketId, message: 'Message cannot be empty' });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return socket.emit('chat:error', { ticketId, message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters` });
  }

  const ticket = await Ticket.findById(ticketId);
  if (!canAccessTicket(socket.user, ticket)) {
    return socket.emit('chat:error', { ticketId, message: 'Not authorized to send messages here' });
  }
  if (LOCKED_STATUSES.includes(ticket.status)) {
    return socket.emit('chat:error', {
      ticketId,
      message: `This conversation is read-only because the job is ${ticket.status.toLowerCase()}.`,
      locked: true,
    });
  }

  const msg = await ChatMessage.create({
    ticketId,
    senderId: socket.user._id,
    senderRole: socket.user.role,
    senderName: socket.user.name,
    message: text,
    type: 'text',
    readBy: [],
  });

  io.to(`ticket:${ticketId}`).emit('chat:message', serializeMessage(msg));

  // Notify participants who are online but NOT viewing this conversation
  const participants = getTicketParticipants(ticket);
  for (const pid of participants) {
    if (pid === String(socket.user._id)) continue;
    if (!userSockets.has(pid)) continue;
    for (const socketId of userSockets.get(pid)) {
      if (isSocketInRoom(socketId, ticketId)) continue;
      const unreadCount = await getUnreadCountFor(ticketId, pid);
      io.to(socketId).emit('chat:unread', {
        ticketId,
        ticketTitle: ticket.title,
        unreadCount,
      });
    }
  }
};

const handleTyping = async (socket, payload) => {
  const { ticketId, isTyping } = payload || {};
  if (!ticketId) return;
  const ticket = await Ticket.findById(ticketId);
  if (!canAccessTicket(socket.user, ticket)) return;
  socket.to(`ticket:${ticketId}`).emit('chat:typing', {
    ticketId,
    userId: socket.user.id,
    name: socket.user.name,
    isTyping: !!isTyping,
  });
};

const handleMarkRead = async (socket, payload) => {
  const { ticketId, messageIds } = payload || {};
  if (!ticketId || !Array.isArray(messageIds) || messageIds.length === 0) return;

  const ticket = await Ticket.findById(ticketId);
  if (!canAccessTicket(socket.user, ticket)) return;

  await ChatMessage.updateMany(
    {
      ticketId,
      _id: { $in: messageIds },
      senderId: { $ne: socket.user._id },
    },
    {
      $addToSet: { readBy: socket.user._id },
      $set: { readAt: new Date() },
    }
  );

  io.to(`ticket:${ticketId}`).emit('chat:read', {
    ticketId,
    readerId: socket.user.id,
    messageIds,
  });
};

const emitPresenceOnDisconnect = async (socketId) => {
  const set = socketTickets.get(socketId);
  if (!set) return;
  for (const ticketId of set) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (ticket) broadcastPresence(ticketId, ticket);
    } catch (err) {
      // ignore per-ticket cleanup errors
    }
  }
};

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  // JWT auth for the socket handshake (token lives in the httpOnly cookie)
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.token;
      if (!token) return next(new Error('Unauthorized: missing token'));

      const decoded = jwt.verify(token, getJWTSecret());
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('Unauthorized: user not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized: invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    addUserSocket(String(socket.user._id), socket.id);

    socket.on('chat:join', (payload) => handleJoinRoom(socket, payload).catch(() => {}));
    socket.on('chat:leave', (payload) => handleLeaveRoom(socket, payload));
    socket.on('chat:message', (payload) => handleSendMessage(socket, payload).catch(() => {}));
    socket.on('chat:typing', (payload) => handleTyping(socket, payload).catch(() => {}));
    socket.on('chat:read', (payload) => handleMarkRead(socket, payload).catch(() => {}));

    socket.on('disconnect', () => {
      const userId = socket.user ? String(socket.user._id) : null;
      removeUserSocket(userId, socket.id);
      emitPresenceOnDisconnect(socket.id);
      socketTickets.delete(socket.id);
    });
  });

  return io;
};

// Persist + broadcast a system message (used on ticket status transitions)
export const createSystemMessage = async ({ ticketId, message }) => {
  if (!io) return null;
  try {
    const msg = await ChatMessage.create({
      ticketId,
      senderId: null,
      senderRole: 'system',
      senderName: 'System',
      message,
      type: 'system',
    });
    io.to(`ticket:${ticketId}`).emit('chat:message', serializeMessage(msg));
    return msg;
  } catch (err) {
    console.error(`System message error: ${err.message}`);
    return null;
  }
};

export { isUserOnline };
