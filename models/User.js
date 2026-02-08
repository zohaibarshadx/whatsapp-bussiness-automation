const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  businessName: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'admin'
  },
  permissions: {
    customers: { read: Boolean, write: Boolean, delete: Boolean },
    orders: { read: Boolean, write: Boolean, delete: Boolean },
    invoices: { read: Boolean, write: Boolean, delete: Boolean },
    products: { read: Boolean, write: Boolean, delete: Boolean },
    reports: { read: Boolean, write: Boolean }
  },
  whatsappConnected: {
    type: Boolean,
    default: false
  },
  whatsappPhoneId: String,
  whatsappAccessToken: String,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
