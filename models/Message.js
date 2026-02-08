const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact', 'template'],
    default: 'text'
  },
  content: {
    text: String,
    media: {
      url: String,
      mimeType: String,
      fileName: String,
      fileSize: Number,
      caption: String
    },
    location: {
      latitude: Number,
      longitude: Number,
      name: String,
      address: String
    },
    contact: {
      name: String,
      phone: String
    }
  },
  template: {
    name: String,
    language: String,
    components: mongoose.Schema.Types.Mixed,
    templateId: String
  },
  whatsapp: {
    messageId: String,
    messageTimestamp: Number,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed', 'pending'],
      default: 'pending'
    },
    pricing: {
      category: String,
      billable: Boolean
    }
  },
  automation: {
    isAutomated: {
      type: Boolean,
      default: false
    },
    triggeredBy: String,
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutomationRule'
    }
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  metadata: {
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    forwarded: Boolean,
    forwardedManyTimes: Boolean,
    isForwarded: Boolean
  },
  processing: {
    intent: String,
    entities: mongoose.Schema.Types.Mixed,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    language: String,
    confidence: Number
  }
}, {
  timestamps: true
});

// Index for better query performance
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ user: 1, conversation: 1, createdAt: -1 });
messageSchema.index({ 'whatsapp.messageId': 1 });
messageSchema.index({ direction: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
