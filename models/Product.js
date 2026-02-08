const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sku: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  brand: String,
  unit: {
    type: String,
    enum: ['piece', 'kg', 'g', 'liter', 'ml', 'meter', 'box', 'pack', 'dozen'],
    default: 'piece'
  },
  pricing: {
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    wholesalePrice: {
      type: Number,
      min: 0
    },
    mrp: Number,
    currency: {
      type: String,
      default: 'INR'
    }
  },
  inventory: {
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    minimumStock: {
      type: Number,
      default: 10
    },
    maximumStock: Number,
    warehouseLocation: String,
    trackInventory: {
      type: Boolean,
      default: true
    }
  },
  images: [{
    url: String,
    isPrimary: Boolean,
    caption: String
  }],
  specifications: mongoose.Schema.Types.Mixed,
  variants: [{
    name: String,
    sku: String,
    price: Number,
    inventory: Number,
    attributes: mongoose.Schema.Types.Mixed
  }],
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'g', 'lb', 'oz'],
      default: 'kg'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'm', 'inch', 'ft'],
      default: 'cm'
    }
  },
  tax: {
    rate: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      enum: ['gst', 'igst', 'exempt', 'none'],
      default: 'gst'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [String],
  searchKeywords: [String]
}, {
  timestamps: true
});

// Index for better search performance
productSchema.index({ user: 1, sku: 1 });
productSchema.index({ user: 1, name: 'text', description: 'text' });
productSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Product', productSchema);
