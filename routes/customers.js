const express = require('express');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const logger = require('../config/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, tag, sort = '-createdAt' } = req.query;
    
    const query = { user: req.userId, isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.customerType = type;
    }
    
    if (tag) {
      query.tags = tag;
    }

    const customers = await Customer.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID with full details
router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get conversation stats
    const conversationStats = await Conversation.aggregate([
      { $match: { customer: customer._id, user: customer.user } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent messages
    const recentMessages = await Message.find({
      customer: customer._id,
      user: req.userId
    })
      .sort('-createdAt')
      .limit(10)
      .lean();

    res.json({
      customer,
      conversationStats,
      recentMessages
    });
  } catch (error) {
    logger.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer
router.post('/', auth, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      user: req.userId
    };

    // Check if customer with same phone exists
    const existingCustomer = await Customer.findOne({
      user: req.userId,
      phone: customerData.phone
    });

    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this phone number already exists' });
    }

    const customer = new Customer(customerData);
    await customer.save();

    logger.info(`New customer created: ${customer.name} (${customer.phone})`);

    res.status(201).json({ customer, message: 'Customer created successfully' });
  } catch (error) {
    logger.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer, message: 'Customer updated successfully' });
  } catch (error) {
    logger.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Get customer by phone (for WhatsApp integration)
router.get('/phone/:phone', auth, async (req, res) => {
  try {
    const customer = await Customer.findOne({
      user: req.userId,
      phone: req.params.phone
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    logger.error('Get customer by phone error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Get customer statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Customer.aggregate([
      { $match: { user: req.userId, isActive: true } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          retailCustomers: {
            $sum: { $cond: [{ $eq: ['$customerType', 'retail'] }, 1, 0] }
          },
          wholesaleCustomers: {
            $sum: { $cond: [{ $eq: ['$customerType', 'wholesale'] }, 1, 0] }
          },
          corporateCustomers: {
            $sum: { $cond: [{ $eq: ['$customerType', 'corporate'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$totalSpent' },
          averageOrderValue: { $avg: '$averageOrderValue' }
        }
      }
    ]);

    res.json({ stats: stats[0] || {} });
  } catch (error) {
    logger.error('Get customer stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Bulk import customers
router.post('/import', auth, async (req, res) => {
  try {
    const { customers } = req.body;
    const results = [];
    const errors = [];

    for (const customerData of customers) {
      try {
        // Check for duplicates
        const existing = await Customer.findOne({
          user: req.userId,
          phone: customerData.phone
        });

        if (existing) {
          errors.push({ phone: customerData.phone, error: 'Already exists' });
          continue;
        }

        const customer = new Customer({
          ...customerData,
          user: req.userId
        });
        await customer.save();
        results.push({ phone: customerData.phone, success: true });
      } catch (error) {
        errors.push({ phone: customerData.phone, error: error.message });
      }
    }

    logger.info(`Bulk import completed: ${results.length} added, ${errors.length} failed`);

    res.json({
      message: 'Import completed',
      added: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    logger.error('Bulk import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
