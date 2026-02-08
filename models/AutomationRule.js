const mongoose = require('mongoose');

const automationRuleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  type: {
    type: String,
    enum: ['keyword', 'intent', 'order_status', 'payment_due', 'customer_tag', 'message_pattern', 'scheduled', 'ai_assistant'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  },
  trigger: {
    // For keyword triggers
    keywords: [String],
    matchType: {
      type: String,
      enum: ['exact', 'contains', 'starts_with', 'ends_with', 'regex'],
      default: 'contains'
    },
    caseSensitive: {
      type: Boolean,
      default: false
    },
    
    // For intent triggers
    intents: [String],
    
    // For order status triggers
    orderStatuses: [String],
    
    // For payment due triggers
    paymentOverdueDays: {
      type: Number,
      default: 0
    },
    
    // For scheduled triggers
    schedule: {
      cronExpression: String,
      timezone: {
        type: String,
        default: 'Asia/Kolkata'
      }
    },
    
    // For AI assistant
    aiSettings: {
      model: String,
      prompt: String,
      maxTokens: Number,
      temperature: Number
    }
  },
  conditions: [{
    type: {
      type: String,
      enum: ['customer_tag', 'time_range', 'message_count', 'order_value', 'payment_status', 'day_of_week']
    },
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in']
    },
    value: mongoose.Schema.Types.Mixed,
    field: String
  }],
  actions: [{
    type: {
      type: String,
      enum: ['send_message', 'send_template', 'update_order', 'add_tag', 'remove_tag', 'assign_agent', 'create_task', 'send_invoice', 'update_customer', 'webhook', 'delay'],
      required: true
    },
    params: mongoose.Schema.Types.Mixed,
    delay: {
      type: Number,
      default: 0 // delay in seconds
    }
  }],
  constraints: {
    timeWindow: {
      enabled: Boolean,
      startTime: String, // HH:mm format
      endTime: String
    },
    dailyLimit: {
      enabled: Boolean,
      maxMessages: Number,
      currentCount: Number,
      resetAt: Date
    },
    blackoutDates: [Date]
  },
  statistics: {
    triggeredCount: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    lastTriggeredAt: Date
  },
  logging: {
    enabled: {
      type: Boolean,
      default: true
    },
    retentionDays: {
      type: Number,
      default: 30
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
automationRuleSchema.index({ user: 1, isActive: 1 });
automationRuleSchema.index({ user: 1, type: 1 });
automationRuleSchema.index({ priority: -1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
