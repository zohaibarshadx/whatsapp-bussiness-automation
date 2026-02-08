const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  tax: {
    rate: Number,
    amount: Number
  },
  total: {
    type: Number,
    required: true
  },
  notes: String
});

const orderSchema = new mongoose.Schema({
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
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank_transfer', 'card', 'credit', 'cod'],
    default: 'cod'
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    totalDiscount: {
      type: Number,
      default: 0
    },
    totalTax: {
      type: Number,
      default: 0
    },
    shipping: {
      type: Number,
      default: 0
    },
    packaging: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    amountPaid: {
      type: Number,
      default: 0
    },
    amountDue: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  billingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: 'India' }
  },
  whatsapp沟通: {
    messageId: String,
    lastMessage: String,
    lastMessageAt: Date
  },
  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    history: [{
      status: String,
      location: String,
      timestamp: Date,
      notes: String
    }]
  },
  notes: {
    internal: String,
    customer: String
  },
  source: {
    type: String,
    enum: ['whatsapp', 'manual', 'import', 'api'],
    default: 'whatsapp'
  },
  tags: [String],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const count = await this.constructor.countDocuments({ user: this.user });
    this.orderNumber = `ORD/${year}${month}/${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Calculate amount due
  this.pricing.amountDue = this.pricing.total - this.pricing.amountPaid;
  
  next();
});

// Index for better query performance
orderSchema.index({ user: 1, orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, customer: 1 });
orderSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
