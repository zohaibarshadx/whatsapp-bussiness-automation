require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const cron = require('node-cron');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const invoiceRoutes = require('./routes/invoices');
const whatsappRoutes = require('./routes/whatsapp');
const analyticsRoutes = require('./routes/analytics');
const productRoutes = require('./routes/products');
const automationRoutes = require('./routes/automation');

// Import services
const { processScheduledMessages } = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_business_os';

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB successfully');
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/automation', automationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Schedule daily tasks
cron.schedule('0 9 * * *', () => {
  logger.info('Running daily scheduled tasks');
  processScheduledMessages();
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(false, () => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
