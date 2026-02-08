const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  channel: {
    type: String,
    enum: ['whatsapp'],
    default: 'whatsapp'
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'closed', 'archived'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  subject: String,
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  labels: [String],
  statistics: {
    totalMessages: { type: Number, default: 0 },
    incomingMessages: { type: Number, default: 0 },
    outgoingMessages: { type: Number, default: 0 },
    automatedMessages: { type: Number, default: 0 },
    firstResponseTime: Number,
    averageResponseTime: Number,
    resolutionTime: Number
  },
  lastMessage: {
    content: String,
    type: String,
    direction: String,
    timestamp: Date,
    sender: {
      type: String,
      enum: ['customer', 'agent', 'automation']
    }
  },
  tags: [String],
  customFields: mongoose.Schema.Types.Mixed,
  metadata: {
    source: String,
    campaign: String,
    utmSource: String,
    utmMedium: String,
    utmCampaign: String
  }
}, {
  timestamps: true
});

// Index for better query performance
conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ user: 1, customer: 1 });
conversationSchema.index({ user: 1, status: 1 });
conversationSchema.index({ 'statistics.lastMessageAt': -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
