import express from 'express';
import Ticket from '../models/Ticket.js';
import ChatMessage from '../models/ChatMessage.js';
import { protect } from '../middleware/auth.js';
import { getIO, isUserOnline } from '../socket/socketServer.js';

const router = express.Router();

// Only participants of a ticket can read/see its conversation
const canAccessTicket = (user, ticket) => {
  if (!user || !ticket) return false;
  if (user.role === 'admin' || user.role === 'organization_admin') return true;
  if (ticket.userId && String(ticket.userId._id || ticket.userId) === user.id) return true;
  if (ticket.workerId && String(ticket.workerId._id || ticket.workerId) === user.id) return true;
  return false;
};

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

// @desc    List all conversations for the current user (with last message + unread)
// @route   GET /api/chat/conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'user') query = { userId: req.user.id };
    else if (req.user.role === 'worker') query = { workerId: req.user.id };
    else query = {};

    const tickets = await Ticket.find(query)
      .sort({ updatedAt: -1 })
      .limit(80)
      .populate('userId', 'name phone email')
      .populate('workerId', 'name phone email');

    const ticketIds = tickets.map((t) => t._id);

    const lastMessagesMap = {};
    if (ticketIds.length > 0) {
      const lastMessages = await ChatMessage.aggregate([
        { $match: { ticketId: { $in: ticketIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$ticketId', lastMessage: { $first: '$$ROOT' } } },
      ]);
      for (const row of lastMessages) {
        lastMessagesMap[String(row._id)] = row.lastMessage;
      }
    }

    const unreadMap = {};
    if (ticketIds.length > 0) {
      const unread = await ChatMessage.aggregate([
        {
          $match: {
            ticketId: { $in: ticketIds },
            senderId: { $nin: [req.user._id, null] },
            readBy: { $nin: [req.user._id] },
          },
        },
        { $group: { _id: '$ticketId', count: { $sum: 1 } } },
      ]);
      for (const row of unread) unreadMap[String(row._id)] = row.count;
    }

    const conversations = tickets
      .map((ticket) => {
        const last = lastMessagesMap[String(ticket._id)] || null;
        const otherParty =
          req.user.role === 'worker'
            ? ticket.userId
            : req.user.role === 'user'
              ? ticket.workerId
              : ticket.userId;

        return {
          ticket: {
            _id: ticket._id,
            title: ticket.title,
            category: ticket.category,
            status: ticket.status,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
          },
          otherParty: otherParty
            ? { _id: otherParty._id, name: otherParty.name, phone: otherParty.phone, online: isUserOnline(otherParty._id) }
            : null,
          lastMessage: last ? serializeMessage(last) : null,
          unreadCount: unreadMap[String(ticket._id)] || 0,
        };
      })
      .sort((a, b) => {
        const at = a.lastMessage?.createdAt || a.ticket.createdAt;
        const bt = b.lastMessage?.createdAt || b.ticket.createdAt;
        return new Date(bt) - new Date(at);
      });

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get total unread message count for the current user
// @route   GET /api/chat/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    let ticketIds = [];
    if (req.user.role === 'user' || req.user.role === 'worker') {
      const field = req.user.role === 'user' ? 'userId' : 'workerId';
      const tickets = await Ticket.find({ [field]: req.user.id }).select('_id');
      ticketIds = tickets.map((t) => t._id);
    } else {
      const tickets = await Ticket.find({}).select('_id');
      ticketIds = tickets.map((t) => t._id);
    }

    const unread = ticketIds.length
      ? await ChatMessage.countDocuments({
          ticketId: { $in: ticketIds },
          senderId: { $nin: [req.user._id, null] },
          readBy: { $nin: [req.user._id] },
        })
      : 0;

    res.status(200).json({ success: true, unread });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get message history for a ticket
// @route   GET /api/chat/:ticketId/messages
// @access  Private (participants only)
router.get('/:ticketId/messages', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this conversation' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const filter = { ticketId: ticket._id };
    if (req.query.before) {
      filter._id = { $lt: req.query.before };
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const page = hasMore ? messages.slice(0, limit) : messages;

    res.status(200).json({
      success: true,
      messages: page.reverse().map(serializeMessage),
      hasMore,
      online: {
        customer: isUserOnline(ticket.userId._id || ticket.userId),
        worker: ticket.workerId ? isUserOnline(ticket.workerId._id || ticket.workerId) : false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Send a message (REST fallback when socket is unavailable)
// @route   POST /api/chat/:ticketId/messages
// @access  Private (participants only)
router.post('/:ticketId/messages', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ success: false, message: 'Not authorized to send messages here' });
    }
    if (['Completed', 'Cancelled'].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: `This conversation is read-only because the job is ${ticket.status.toLowerCase()}.`,
        locked: true,
      });
    }

    const text = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!text) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    if (text.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters' });
    }

    const msg = await ChatMessage.create({
      ticketId: ticket._id,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: text,
      type: 'text',
      readBy: [],
    });

    const io = getIO();
    if (io) io.to(`ticket:${ticket._id}`).emit('chat:message', serializeMessage(msg));

    res.status(201).json({ success: true, message: serializeMessage(msg) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mark messages as read
// @route   POST /api/chat/:ticketId/read
// @access  Private (participants only)
router.post('/:ticketId/read', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId);
    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this conversation' });
    }

    const messageIds = Array.isArray(req.body.messageIds) ? req.body.messageIds : [];
    if (messageIds.length === 0) {
      return res.status(200).json({ success: true, updated: 0 });
    }

    const result = await ChatMessage.updateMany(
      {
        ticketId: ticket._id,
        _id: { $in: messageIds },
        senderId: { $ne: req.user._id },
      },
      {
        $addToSet: { readBy: req.user._id },
        $set: { readAt: new Date() },
      }
    );

    const io = getIO();
    if (io) {
      io.to(`ticket:${ticket._id}`).emit('chat:read', {
        ticketId: String(ticket._id),
        readerId: req.user.id,
        messageIds,
      });
    }

    res.status(200).json({ success: true, updated: result.modifiedCount || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
