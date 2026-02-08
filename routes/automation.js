const express = require('express');
const jwt = require('jsonwebtoken');
const AutomationRule = require('../models/AutomationRule');
const aiAutomationService = require('../services/aiAutomationService');
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

// Get all automation rules
router.get('/rules', auth, async (req, res) => {
  try {
    const { type, isActive, sort = '-priority' } = req.query;
    
    const query = { user: req.userId };
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rules = await AutomationRule.find(query)
      .sort(sort)
      .lean();

    res.json({ rules });
  } catch (error) {
    logger.error('Get automation rules error:', error);
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
});

// Get rule by ID
router.get('/rules/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ rule });
  } catch (error) {
    logger.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// Create automation rule
router.post('/rules', auth, async (req, res) => {
  try {
    const ruleData = {
      ...req.body,
      user: req.userId
    };

    const rule = new AutomationRule(ruleData);
    await rule.save();

    logger.info(`New automation rule created: ${rule.name}`);

    res.status(201).json({ rule, message: 'Automation rule created successfully' });
  } catch (error) {
    logger.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
});

// Update automation rule
router.put('/rules/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ rule, message: 'Automation rule updated successfully' });
  } catch (error) {
    logger.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
});

// Toggle rule active status
router.patch('/rules/:id/toggle', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({ rule, message: `Rule ${rule.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    logger.error('Toggle rule error:', error);
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// Delete automation rule
router.delete('/rules/:id', auth, async (req, res) => {
  try {
    const rule = await AutomationRule.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!rule) {
      return res.status(404).json({ error: 'Automation rule not found' });
    }

    res.json({ message: 'Automation rule deleted successfully' });
  } catch (error) {
    logger.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
});

// Process message with AI
router.post('/process-message', auth, async (req, res) => {
  try {
    const { message, customer, conversation } = req.body;

    const result = await aiAutomationService.processIncomingMessage(
      message,
      customer,
      conversation,
      { _id: req.userId }
    );

    res.json({ result });
  } catch (error) {
    logger.error('Process message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get predefined templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'greeting',
        name: 'Auto Greeting',
        description: 'Automatically greet customers when they message',
        type: 'keyword',
        trigger: {
          keywords: ['hello', 'hi', 'hey', 'namaste'],
          matchType: 'contains',
          caseSensitive: false
        },
        actions: [
          {
            type: 'send_message',
            params: {
              message: 'Hello! 👋 Welcome to our business. How can I assist you today?'
            }
          }
        ]
      },
      {
        id: 'order_status',
        name: 'Order Status Check',
        description: 'Handle order status inquiries',
        type: 'keyword',
        trigger: {
          keywords: ['order status', 'track order', 'where is my order'],
          matchType: 'contains',
          caseSensitive: false
        },
        actions: [
          {
            type: 'send_message',
            params: {
              message: "I'll help you track your order. Please provide your order number."
            }
          }
        ]
      },
      {
        id: 'price_inquiry',
        name: 'Product Price Inquiry',
        description: 'Respond to price inquiries',
        type: 'keyword',
        trigger: {
          keywords: ['price', 'cost', 'rate', 'how much'],
          matchType: 'contains',
          caseSensitive: false
        },
        actions: [
          {
            type: 'send_message',
            params: {
              message: 'For product pricing and catalog, please visit our website or I can share our latest price list.'
            }
          }
        ]
      },
      {
        id: 'order_confirmed',
        name: 'Order Confirmed',
        description: 'Send confirmation when order is confirmed',
        type: 'order_status',
        trigger: {
          orderStatuses: ['confirmed']
        },
        actions: [
          {
            type: 'send_template',
            params: {
              templateName: 'order_confirmation',
              language: 'en'
            }
          }
        ]
      },
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        description: 'Send reminder for overdue payments',
        type: 'payment_due',
        trigger: {
          paymentOverdueDays: 7
        },
        actions: [
          {
            type: 'send_message',
            params: {
              message: 'This is a friendly reminder that your payment is overdue. Please arrange payment at your earliest convenience.'
            }
          }
        ]
      }
    ];

    res.json({ templates });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get AI suggestions for conversation
router.post('/suggestions', auth, async (req, res) => {
  try {
    const { conversation, customer } = req.body;

    const suggestions = aiAutomationService.generateSmartSuggestions(
      conversation,
      customer
    );

    res.json({ suggestions });
  } catch (error) {
    logger.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get automation statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await AutomationRule.aggregate([
      { $match: { user: req.userId } },
      {
        $group: {
          _id: null,
          totalRules: { $sum: 1 },
          activeRules: { $sum: { $cond: ['$isActive', 1, 0] } },
          totalTriggered: { $sum: '$statistics.triggeredCount' },
          totalSuccess: { $sum: '$statistics.successCount' }
        }
      }
    ]);

    res.json({ stats: stats[0] || {} });
  } catch (error) {
    logger.error('Get automation stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
