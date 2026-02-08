const express = require('express');
const jwt = require('jsonwebtoken');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const invoiceService = require('../services/invoiceService');
const whatsappService = require('../services/whatsappService');
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

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customer, search, sort = '-createdAt' } = req.query;
    
    const query = { user: req.userId };
    
    if (status) query['paymentDetails.status'] = status;
    if (customer) query.customer = customer;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    })
      .populate('customer')
      .populate('order')
      .populate('user', 'businessName email phone');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ invoice });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Generate PDF for invoice
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate PDF if not exists
    if (!invoice.pdf?.path) {
      await invoiceService.generatePDF(invoice._id);
      await invoice.reload();
    }

    res.json({ 
      pdfPath: invoice.pdf.path,
      pdfUrl: `/api/invoices/${invoice._id}/download`
    });
  } catch (error) {
    logger.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Download invoice PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice || !invoice.pdf?.path) {
      return res.status(404).json({ error: 'Invoice PDF not found' });
    }

    res.download(invoice.pdf.path, `Invoice_${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    logger.error('Download PDF error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

// Create manual invoice
router.post('/', auth, async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      user: req.userId
    };

    // Validate customer
    const customer = await Customer.findOne({
      _id: invoiceData.customer,
      user: req.userId
    });

    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    logger.info(`Manual invoice created: ${invoice.invoiceNumber}`);

    res.status(201).json({ invoice, message: 'Invoice created successfully' });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Regenerate PDF if pricing changed
    if (req.body.items || req.body.pricing) {
      await invoiceService.generatePDF(invoice._id);
    }

    res.json({ invoice, message: 'Invoice updated successfully' });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Send invoice via WhatsApp
router.post('/:id/send', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('customer');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const result = await invoiceService.sendInvoicePDF(
      invoice._id,
      invoice.customer.phone,
      req.user
    );

    res.json({ 
      success: true, 
      messageId: result.messageId,
      message: 'Invoice sent successfully' 
    });
  } catch (error) {
    logger.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

// Record payment
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, method, reference, notes } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Add payment
    invoice.paymentDetails.payments = invoice.paymentDetails.payments || [];
    invoice.paymentDetails.payments.push({
      amount,
      method,
      reference,
      notes,
      date: new Date()
    });

    // Update paid amount
    invoice.paymentDetails.paidAmount += amount;

    // Check if fully paid
    if (invoice.paymentDetails.paidAmount >= invoice.pricing.total) {
      invoice.paymentDetails.status = 'paid';
      invoice.paymentDetails.paidDate = new Date();
      invoice.dates.paidDate = new Date();
      invoice.status = 'paid';
    } else {
      invoice.paymentDetails.status = 'partial';
    }

    await invoice.save();

    // Send payment confirmation
    try {
      await invoice.populate('customer');
      const message = `💰 Payment Received!\n\nInvoice: ${invoice.invoiceNumber}\nAmount: ₹${amount}\nTotal Paid: ₹${invoice.paymentDetails.paidAmount}\nBalance: ₹${invoice.pricing.total - invoice.paymentDetails.paidAmount}`;
      
      await whatsappService.sendTextMessage(invoice.customer.phone, message);
    } catch (error) {
      logger.error('Failed to send payment confirmation:', error);
    }

    res.json({ invoice, message: 'Payment recorded successfully' });
  } catch (error) {
    logger.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Send payment reminder
router.post('/:id/reminder', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('customer');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const today = new Date();
    const daysOverdue = Math.floor(
      (today - new Date(invoice.dates.dueDate)) / (1000 * 60 * 60 * 24)
    );

    await whatsappService.sendPaymentReminder(
      invoice.customer.phone,
      invoice,
      daysOverdue
    );

    invoice.paymentDetails.reminderSentAt = new Date();
    await invoice.save();

    res.json({ message: 'Payment reminder sent successfully' });
  } catch (error) {
    logger.error('Send reminder error:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Get invoice statistics
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

    const stats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$pricing.total' },
          totalPaid: { $sum: '$paymentDetails.paidAmount' },
          totalOutstanding: { $sum: { $subtract: ['$pricing.total', '$paymentDetails.paidAmount'] } },
          pendingInvoices: {
            $sum: { $cond: [{ $in: ['$paymentDetails.status', ['pending', 'partial']] }, 1, 0] }
          },
          overdueInvoices: {
            $sum: { $cond: [{ $eq: ['$paymentDetails.status', 'overdue'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get invoices by status
    const byStatus = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$paymentDetails.status',
          count: { $sum: 1 },
          amount: { $sum: '$pricing.total' }
        }
      }
    ]);

    res.json({
      stats: stats[0] || {},
      byStatus
    });
  } catch (error) {
    logger.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
