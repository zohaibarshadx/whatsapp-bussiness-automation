const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  customerType: {
    type: String,
    enum: ['retail', 'wholesale', 'corporate', 'vip'],
    default: 'retail'
  },
  tags: [String],
  notes: String,
  defaultPaymentTerms: {
    type: String,
    enum: ['cod', 'advance', 'credit7', 'credit15', 'credit30'],
    default: 'cod'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  averageOrderValue: {
    type: Number,
    default: 0
  },
  lastOrderDate: Date,
  preferredChannel: {
    type: String,
    enum: ['whatsapp', 'call', 'email', 'sms'],
    default: 'whatsapp'
  },
  communicationPreferences: {
    marketing: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true }
  },
  customFields: mongoose.Schema.Types.Mixed,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better search performance
customerSchema.index({ user: 1, phone: 1 });
customerSchema.index({ user: 1, name: 'text' });

// Calculate average order value before saving
customerSchema.pre('save', function(next) {
  if (this.totalOrders > 0 && this.totalSpent > 0) {
    this.averageOrderValue = this.totalSpent / this.totalOrders;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
