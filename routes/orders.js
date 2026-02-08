const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const whatsappService = require('../services/whatsappService');
const invoiceService = require('../services/invoiceService');
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

// Get all orders
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customer, search, sort = '-createdAt' } = req.query;
    
    const query = { user: req.userId };
    
    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('customer', 'name phone')
      .populate('assignedTo', 'name')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId
    })
      .populate('customer')
      .populate('items.product')
      .populate('assignedTo', 'name email');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get related invoice
    const invoice = await Invoice.findOne({ order: order._id });

    res.json({ order, invoice });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      user: req.userId,
      source: req.body.source || 'manual'
    };

    // Validate customer
    const customer = await Customer.findOne({
      _id: orderData.customer,
      user: req.userId
    });

    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    // Calculate totals and validate products
    let subtotal = 0;
    const processedItems = [];

    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(400).json({ error: `Product not found: ${item.product}` });
      }

      const unitPrice = item.unitPrice || product.pricing.sellingPrice;
      const discount = item.discount || 0;
      const taxRate = item.tax?.rate || product.tax.rate;
      const taxableAmount = (unitPrice * item.quantity) - discount;
      const taxAmount = taxableAmount * (taxRate / 100);
      const itemTotal = taxableAmount + taxAmount;

      subtotal += itemTotal;

      processedItems.push({
        product: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice,
        discount,
        tax: { rate: taxRate, amount: taxAmount },
        total: itemTotal,
        notes: item.notes
      });

      // Update inventory if tracking
      if (product.inventory.trackInventory) {
        product.inventory.quantity -= item.quantity;
        await product.save();
      }
    }

    const order = new Order({
      ...orderData,
      items: processedItems,
      pricing: {
        subtotal,
        totalDiscount: orderData.items.reduce((sum, item) => sum + (item.discount || 0), 0),
        totalTax: processedItems.reduce((sum, item) => sum + item.tax.amount, 0),
        shipping: orderData.pricing?.shipping || 0,
        packaging: orderData.pricing?.packaging || 0,
        total: subtotal + (orderData.pricing?.shipping || 0) + (orderData.pricing?.packaging || 0),
        amountPaid: orderData.pricing?.amountPaid || 0,
        amountDue: subtotal + (orderData.pricing?.shipping || 0) - (orderData.pricing?.amountPaid || 0)
      }
    });

    await order.save();

    // Update customer stats
    customer.totalOrders += 1;
    customer.totalSpent += order.pricing.total;
    customer.lastOrderDate = new Date();
    await customer.save();

    logger.info(`New order created: ${order.orderNumber}`);

    res.status(201).json({ order, message: 'Order created successfully' });
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order fields
    Object.assign(order, req.body);
    await order.save();

    // If status changed, send notification
    if (req.body.status && req.body.status !== order.status) {
      try {
        await order.populate('customer');
        await whatsappService.sendOrderStatusUpdate(
          order.customer.phone,
          order,
          req.body.status
        );
      } catch (error) {
        logger.error('Failed to send order status update:', error);
      }
    }

    res.json({ order, message: 'Order updated successfully' });
  } catch (error) {
    logger.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Update order status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes, tracking } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousStatus = order.status;
    order.status = status;

    if (notes) {
      order.notes.internal = notes;
    }

    if (tracking) {
      order.tracking = {
        ...order.tracking,
        ...tracking
      };
    }

    // Add to tracking history
    if (status !== previousStatus) {
      order.tracking.history = order.tracking.history || [];
      order.tracking.history.push({
        status,
        location: tracking?.location || '',
        timestamp: new Date(),
        notes: notes || ''
      });
    }

    if (status === 'delivered') {
      order.tracking.actualDelivery = new Date();
    }

    await order.save();

    // Send WhatsApp notification
    try {
      await whatsappService.sendOrderStatusUpdate(
        order.customer.phone,
        order,
        status
      );
    } catch (error) {
      logger.error('Failed to send order status notification:', error);
    }

    logger.info(`Order ${order.orderNumber} status updated to ${status}`);

    res.json({ order, message: 'Order status updated' });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Create invoice from order
router.post('/:id/invoice', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const user = await User.findById(req.userId);
    const invoice = await invoiceService.createInvoiceFromOrder(order, user, req.body);

    logger.info(`Invoice created from order: ${order.orderNumber}`);

    res.status(201).json({ invoice, message: 'Invoice created successfully' });
  } catch (error) {
    logger.error('Create invoice from order error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Cancel order
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Restore inventory
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product && product.inventory.trackInventory) {
        product.inventory.quantity += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    // Send cancellation notification
    try {
      await whatsappService.sendOrderStatusUpdate(
        order.customer.phone,
        order,
        'cancelled'
      );
    } catch (error) {
      logger.error('Failed to send cancellation notification:', error);
    }

    res.json({ order, message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get order statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter.$gte = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        dateFilter.$gte = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter.$gte = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        dateFilter.$gte = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }

    const matchStage = { user: req.userId };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get daily revenue for chart
    const dailyRevenue = await Order.aggregate([
      { $match: { ...matchStage, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.json({
      stats: stats[0] || {},
      dailyRevenue
    });
  } catch (error) {
    logger.error('Get order stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
