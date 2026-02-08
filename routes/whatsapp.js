const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Customer = require('../models/Customer');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');
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

// Webhook for WhatsApp messages (no auth needed)
router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      logger.info('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }

    // Handle incoming messages
    const messageData = await whatsappService.handleIncomingMessage(req.body);
    
    if (messageData) {
      // Process message asynchronously
      processIncomingMessageAsync(messageData);
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Process incoming message
async function processIncomingMessageAsync(messageData) {
  try {
    // Find or create user
    const user = await User.findOne({ whatsappConnected: true });
    if (!user) {
      logger.error('No connected WhatsApp user found');
      return;
    }

    // Find or create customer
    let customer = await Customer.findOne({
      user: user._id,
      phone: messageData.phone
    });

    if (!customer) {
      // Create new customer from WhatsApp
      customer = new Customer({
        user: user._id,
        name: messageData.contactName || `Customer ${messageData.phone.slice(-4)}`,
        phone: messageData.phone,
        preferredChannel: 'whatsapp',
        source: 'whatsapp'
      });
      await customer.save();
      logger.info(`New customer created from WhatsApp: ${customer.phone}`);
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      user: user._id,
      customer: customer._id,
      status: { $ne: 'closed' }
    });

    if (!conversation) {
      conversation = new Conversation({
        user: user._id,
        customer: customer._id,
        channel: 'whatsapp',
        status: 'open'
      });
      await conversation.save();
    }

    // Create message
    const message = new Message({
      user: user._id,
      customer: customer._id,
      conversation: conversation._id,
      direction: 'incoming',
      type: messageData.type,
      content: messageData.content,
      whatsapp: {
        messageId: messageData.whatsapp.messageId,
        messageTimestamp: messageData.whatsapp.messageTimestamp,
        status: 'received'
      }
    });
    await message.save();

    // Update conversation
    conversation.lastMessage = {
      content: messageData.content?.text || `[${messageData.type}]`,
      type: messageData.type,
      direction: 'incoming',
      timestamp: new Date(),
      sender: 'customer'
    };
    conversation.statistics.totalMessages += 1;
    conversation.statistics.incomingMessages += 1;
    await conversation.save();

    // Process with AI automation
    const aiResult = await aiAutomationService.processIncomingMessage(
      message,
      customer,
      conversation,
      user
    );

    // Save AI processing results
    message.processing = {
      intent: aiResult.intent,
      sentiment: aiResult.sentiment
    };
    await message.save();

    // Send automated response if applicable
    if (aiResult.automated && aiResult.suggestedResponse) {
      await sendAutomatedResponseAsync(user, customer, conversation, aiResult.suggestedResponse);
    }

    // Emit socket event for real-time updates (if socket.io is available)
    // io.to(user._id.toString()).emit('new_message', { message, customer, conversation });

  } catch (error) {
    logger.error('Error processing incoming message:', error);
  }
}

// Send automated response
async function sendAutomatedResponseAsync(user, customer, conversation, responseText) {
  try {
    const result = await whatsappService.sendTextMessage(customer.phone, responseText);

    const message = new Message({
      user: user._id,
      customer: customer._id,
      conversation: conversation._id,
      direction: 'outgoing',
      type: 'text',
      content: { text: responseText },
      whatsapp: {
        messageId: result.messages[0].id,
        status: 'sent'
      },
      automation: {
        isAutomated: true
      }
    });
    await message.save();

    conversation.statistics.automatedMessages += 1;
    conversation.statistics.outgoingMessages += 1;
    await conversation.save();

    logger.info(`Automated response sent to ${customer.phone}`);
  } catch (error) {
    logger.error('Failed to send automated response:', error);
  }
}

// Get all conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, sort = '-updatedAt' } = req.query;
    
    const query = { user: req.userId };
    
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'lastMessage.content': { $regex: search, $options: 'i' } }
      ];
    }

    const conversations = await Conversation.find(query)
      .populate('customer', 'name phone customerType')
      .populate('assignedTo', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Conversation.countDocuments(query);

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({
      conversation: conversation._id
    })
      .sort('createdAt')
      .limit(100)
      .lean();

    res.json({ messages });
  } catch (error) {
    logger.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message to customer
router.post('/send', auth, async (req, res) => {
  try {
    const { phone, message, type = 'text', customerId, conversationId } = req.body;

    const result = await whatsappService.sendTextMessage(phone, message);

    // Get or create customer
    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    } else {
      customer = await Customer.findOne({ user: req.userId, phone });
    }

    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else if (customer) {
      conversation = await Conversation.findOne({
        user: req.userId,
        customer: customer._id,
        status: { $ne: 'closed' }
      });
    }

    // Create outgoing message
    const messageDoc = new Message({
      user: req.userId,
      customer: customer?._id,
      conversation: conversation?._id,
      direction: 'outgoing',
      type,
      content: { text: message },
      whatsapp: {
        messageId: result.messages[0].id,
        status: 'sent'
      }
    });
    await messageDoc.save();

    // Update conversation
    if (conversation) {
      conversation.lastMessage = {
        content: message,
        type: 'text',
        direction: 'outgoing',
        timestamp: new Date(),
        sender: 'agent'
      };
      conversation.statistics.outgoingMessages += 1;
      await conversation.save();
    }

    res.json({ 
      success: true, 
      messageId: result.messages[0].id,
      message: messageDoc 
    });
  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send template message
router.post('/send-template', auth, async (req, res) => {
  try {
    const { phone, templateName, language = 'en', components, customerId } = req.body;

    const result = await whatsappService.sendTemplateMessage(
      phone,
      templateName,
      language,
      components
    );

    let customer;
    if (customerId) {
      customer = await Customer.findById(customerId);
    }

    res.json({ 
      success: true, 
      messageId: result.messages[0].id 
    });
  } catch (error) {
    logger.error('Send template message error:', error);
    res.status(500).json({ error: 'Failed to send template message' });
  }
});

// Update conversation status
router.patch('/conversations/:id', auth, async (req, res) => {
  try {
    const { status, priority, assignee, labels } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status, priority, assignee, labels },
      { new: true }
    ).populate('customer', 'name phone');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    logger.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Get message templates
router.get('/templates', auth, async (req, res) => {
  try {
    // Return predefined templates
    const templates = [
      {
        name: 'order_confirmation',
        category: 'ORDER',
        languages: ['en', 'hi'],
        description: 'Confirm order placement'
      },
      {
        name: 'order_shipped',
        category: 'SHIPPING',
        languages: ['en', 'hi'],
        description: 'Notify order has been shipped'
      },
      {
        name: 'payment_received',
        category: 'PAYMENT',
        languages: ['en', 'hi'],
        description: 'Confirm payment received'
      },
      {
        name: 'invoice_reminder',
        category: 'PAYMENT',
        languages: ['en', 'hi'],
        description: 'Send payment reminder'
      }
    ];

    res.json({ templates });
  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Update WhatsApp token
router.put('/token', auth, async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Phone Number ID and Access Token are required' });
    }

    // Update the user's WhatsApp credentials
    await User.findByIdAndUpdate(req.userId, {
      whatsappPhoneId: phoneNumberId,
      whatsappAccessToken: accessToken,
      whatsappConnected: true,
      updatedAt: new Date()
    });

    logger.info(`WhatsApp token updated for user: ${req.userId}`);
    res.json({ success: true, message: 'Token updated successfully' });
  } catch (error) {
    logger.error('Update token error:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

// Also support POST for token update (fallback)
router.post('/token', auth, async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ error: 'Phone Number ID and Access Token are required' });
    }

    // Update the user's WhatsApp credentials
    await User.findByIdAndUpdate(req.userId, {
      whatsappPhoneId: phoneNumberId,
      whatsappAccessToken: accessToken,
      whatsappConnected: true,
      updatedAt: new Date()
    });

    logger.info(`WhatsApp token updated for user: ${req.userId}`);
    res.json({ success: true, message: 'Token updated successfully' });
  } catch (error) {
    logger.error('Update token error:', error);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

module.exports = router;
