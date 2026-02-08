const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
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

// Dashboard overview
router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Current month stats
    const currentMonthOrders = await Order.find({
      user: req.userId,
      createdAt: { $gte: thisMonth },
      status: { $ne: 'cancelled' }
    });

    const currentMonthRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + order.pricing.total, 0
    );

    // Last month stats
    const lastMonthOrders = await Order.find({
      user: req.userId,
      createdAt: { $gte: lastMonth, $lt: thisMonth },
      status: { $ne: 'cancelled' }
    });

    const lastMonthRevenue = lastMonthOrders.reduce(
      (sum, order) => sum + order.pricing.total, 0
    );

    // Calculate growth
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // Other counts
    const [
      totalCustomers,
      activeCustomers,
      pendingOrders,
      unreadConversations,
      pendingInvoices,
      lowStockProducts
    ] = await Promise.all([
      Customer.countDocuments({ user: req.userId, isActive: true }),
      Customer.countDocuments({ 
        user: req.userId, 
        isActive: true,
        lastOrderDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      Order.countDocuments({ user: req.userId, status: 'pending' }),
      Conversation.countDocuments({ 
        user: req.userId, 
        status: 'open',
        'lastMessage.direction': 'incoming'
      }),
      Invoice.countDocuments({ 
        user: req.userId, 
        'paymentDetails.status': { $in: ['pending', 'partial'] }
      }),
      Product.countDocuments({
        user: req.userId,
        isActive: true,
        'inventory.trackInventory': true,
        $expr: { $lte: ['$inventory.quantity', '$inventory.minimumStock'] }
      })
    ]);

    res.json({
      overview: {
        revenue: currentMonthRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        orders: currentMonthOrders.length,
        customers: totalCustomers,
        activeCustomers,
        pendingOrders,
        unreadConversations,
        pendingInvoices,
        lowStockProducts
      }
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Revenue chart data
router.get('/revenue', auth, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    const now = new Date();
    let startDate;
    let groupBy;

    switch (period) {
      case '7days':
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case '12weeks':
        startDate = new Date(now.setDate(now.getDate() - 84));
        groupBy = { $dateToString: { format: '%Y-%W', date: '$createdAt' } };
        break;
      case '12months':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
        groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const data = await Order.aggregate([
      {
        $match: {
          user: req.userId,
          createdAt: { $gte: startDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ data });
  } catch (error) {
    logger.error('Revenue chart error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

// Orders by status
router.get('/orders-by-status', auth, async (req, res) => {
  try {
    const data = await Order.aggregate([
      { $match: { user: req.userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' }
        }
      }
    ]);

    res.json({ data });
  } catch (error) {
    logger.error('Orders by status error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Top customers
router.get('/top-customers', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const customers = await Customer.find({
      user: req.userId,
      isActive: true
    })
      .sort('-totalSpent')
      .limit(parseInt(limit))
      .select('name phone totalOrders totalSpent averageOrderValue')
      .lean();

    res.json({ customers });
  } catch (error) {
    logger.error('Top customers error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Top products
router.get('/top-products', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({
      user: req.userId,
      isActive: true
    })
      .sort('-inventory.quantity')
      .limit(parseInt(limit))
      .select('name sku pricing sellingPrice inventory quantity')
      .lean();

    res.json({ products });
  } catch (error) {
    logger.error('Top products error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Conversation analytics
router.get('/conversations', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byStatus, byDay, responseTime] = await Promise.all([
      Conversation.aggregate([
        { $match: { user: req.userId, createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Message.aggregate([
        {
          $match: {
            user: req.userId,
            direction: 'outgoing',
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      {
        totalMessages: await Message.countDocuments({
          user: req.userId,
          createdAt: { $gte: startDate }
        }),
        automatedMessages: await Message.countDocuments({
          user: req.userId,
          'automation.isAutomated': true,
          createdAt: { $gte: startDate }
        })
      }
    ]);

    res.json({
      byStatus,
      byDay,
      summary: {
        ...responseTime,
        automationRate: responseTime.totalMessages > 0
          ? ((responseTime.automatedMessages / responseTime.totalMessages) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    logger.error('Conversation analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Invoice analytics
router.get('/invoices', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byStatus, overdue] = await Promise.all([
      Invoice.aggregate([
        { $match: { user: req.userId, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$paymentDetails.status',
            count: { $sum: 1 },
            total: { $sum: '$pricing.total' },
            paid: { $sum: '$paymentDetails.paidAmount' }
          }
        }
      ]),
      Invoice.find({
        user: req.userId,
        'paymentDetails.status': { $in: ['pending', 'partial'] },
        'dates.dueDate': { $lt: new Date() }
      })
        .select('invoiceNumber pricing.total paymentDetails.paidAmount customer')
        .populate('customer', 'name phone')
        .lean()
    ]);

    res.json({
      byStatus,
      overdue,
      summary: {
        totalOverdue: overdue.length,
        totalOverdueAmount: overdue.reduce(
          (sum, inv) => sum + (inv.pricing.total - inv.paymentDetails.paidAmount),
          0
        )
      }
    });
  } catch (error) {
    logger.error('Invoice analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Export report
router.get('/export', auth, async (req, res) => {
  try {
    const { type = 'orders', format = 'json', dateFrom, dateTo } = req.query;
    
    const query = { user: req.userId };
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    let data;
    
    switch (type) {
      case 'orders':
        data = await Order.find(query)
          .populate('customer', 'name phone email')
          .sort('-createdAt')
          .lean();
        break;
      case 'customers':
        data = await Customer.find(query)
          .sort('-createdAt')
          .lean();
        break;
      case 'invoices':
        data = await Invoice.find(query)
          .populate('customer', 'name phone')
          .sort('-createdAt')
          .lean();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(item => 
        Object.values(item).map(v => 
          typeof v === 'object' ? JSON.stringify(v) : v
        ).join(',')
      );
      const csv = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
      return res.send(csv);
    }

    res.json({ data });
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
