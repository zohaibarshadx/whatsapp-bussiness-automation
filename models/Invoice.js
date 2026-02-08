const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    default: 'piece'
  },
  unitPrice: {
    type: Number,
    required: true
  },
  discount: {
    percentage: Number,
    amount: { type: Number, default: 0 }
  },
  tax: {
    rate: { type: Number, default: 0 },
    amount: Number
  },
  total: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceType: {
    type: String,
    enum: ['invoice', 'proforma', 'credit_note', 'debit_note', 'receipt'],
    default: 'invoice'
  },
  items: [invoiceItemSchema],
  businessDetails: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' }
    },
    phone: String,
    email: String,
    gstin: String,
    pan: String,
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      branch: String
    },
    logo: String
  },
  customerDetails: {
    name: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' }
    },
    phone: String,
    email: String,
    gstin: String
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
    taxBreakup: [{
      name: String,
      rate: Number,
      amount: Number
    }],
    shipping: {
      type: Number,
      default: 0
    },
    adjustment: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    },
    amountInWords: String,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  paymentDetails: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending'
    },
    method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'card', 'credit', 'cod'],
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    paidDate: Date,
    dueDate: {
      type: Date,
      required: true
    },
    payments: [{
      method: String,
      amount: Number,
      reference: String,
      date: Date,
      notes: String
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  dates: {
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidDate: Date
  },
  notes: {
    terms: String,
    footer: String,
    internal: String
  },
  whatsapp: {
    messageId: String,
    sentAt: Date,
    viewedAt: Date
  },
  pdf: {
    path: String,
    url: String,
    generatedAt: Date
  },
  relatedInvoices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  }],
  source: {
    type: String,
    enum: ['manual', 'order', 'recurring', 'api'],
    default: 'manual'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDate: Date,
    endDate: Date
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const count = await this.constructor.countDocuments({ user: this.user });
    this.invoiceNumber = `INV/${year}${month}${day}/${(count + 1).toString().padStart(4, '0')}`;
  }
  
  next();
});

// Convert amount to words
function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
                'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (num) => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numToWords(num % 100) : '');
    if (num < 100000) return numToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numToWords(num % 1000) : '');
    if (num < 10000000) return numToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numToWords(num % 100000) : '');
    return numToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numToWords(num % 10000000) : '');
  };
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let words = numToWords(rupees) + ' Rupees';
  if (paise > 0) {
    words += ' and ' + numToWords(paise) + ' Paise';
  }
  
  return words;
}

invoiceSchema.pre('save', function(next) {
  if (this.pricing && this.pricing.total) {
    this.pricing.amountInWords = numberToWords(this.pricing.total);
  }
  next();
});

// Index for better query performance
invoiceSchema.index({ user: 1, invoiceNumber: 1 });
invoiceSchema.index({ user: 1, createdAt: -1 });
invoiceSchema.index({ user: 1, customer: 1 });
invoiceSchema.index({ user: 1, 'paymentDetails.status': 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
