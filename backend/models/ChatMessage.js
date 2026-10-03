import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    // Null for system messages (status change notifications, etc.)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderRole: {
      type: String,
      enum: ['user', 'worker', 'admin', 'system'],
      default: 'system',
    },
    senderName: {
      type: String,
      trim: true,
      default: '',
    },
    message: {
      type: String,
      required: [true, 'Please add a message'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'system'],
      default: 'text',
    },
    // Message ids that have been read by the other party
    readBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize the common "fetch history for a ticket" query
chatMessageSchema.index({ ticketId: 1, createdAt: -1 });

// Optimize unread counts per participant
chatMessageSchema.index({ ticketId: 1, senderId: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
