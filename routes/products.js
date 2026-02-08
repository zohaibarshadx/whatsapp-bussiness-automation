const express = require('express');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
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

// Get all products
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, inStock, sort = '-createdAt' } = req.query;
    
    const query = { user: req.userId, isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    if (inStock === 'true') {
      query['inventory.quantity'] = { $gt: 0 };
    }

    const products = await Product.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
router.post('/', auth, async (req, res) => {
  try {
    const productData = {
      ...req.body,
      user: req.userId
    };

    // Check for duplicate SKU
    const existing = await Product.findOne({
      user: req.userId,
      sku: productData.sku
    });

    if (existing) {
      return res.status(400).json({ error: 'Product with this SKU already exists' });
    }

    const product = new Product(productData);
    await product.save();

    logger.info(`New product created: ${product.name} (${product.sku})`);

    res.status(201).json({ product, message: 'Product created successfully' });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product, message: 'Product updated successfully' });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update inventory
router.patch('/:id/inventory', auth, async (req, res) => {
  try {
    const { quantity, operation = 'set', minimumStock } = req.body;

    const product = await Product.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    switch (operation) {
      case 'set':
        product.inventory.quantity = quantity;
        break;
      case 'add':
        product.inventory.quantity += quantity;
        break;
      case 'subtract':
        product.inventory.quantity = Math.max(0, product.inventory.quantity - quantity);
        break;
    }

    if (minimumStock !== undefined) {
      product.inventory.minimumStock = minimumStock;
    }

    await product.save();

    res.json({ product, message: 'Inventory updated successfully' });
  } catch (error) {
    logger.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// Get low stock products
router.get('/stats/low-stock', auth, async (req, res) => {
  try {
    const products = await Product.find({
      user: req.userId,
      isActive: true,
      'inventory.trackInventory': true,
      $expr: { $lte: ['$inventory.quantity', '$inventory.minimumStock'] }
    })
      .select('name sku inventory')
      .sort('inventory.quantity')
      .lean();

    res.json({ products });
  } catch (error) {
    logger.error('Get low stock error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock products' });
  }
});

// Get product categories
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = await Product.distinct('category', { user: req.userId });
    res.json({ categories });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Bulk import products
router.post('/import', auth, async (req, res) => {
  try {
    const { products } = req.body;
    const results = [];
    const errors = [];

    for (const productData of products) {
      try {
        const existing = await Product.findOne({
          user: req.userId,
          sku: productData.sku
        });

        if (existing) {
          errors.push({ sku: productData.sku, error: 'Already exists' });
          continue;
        }

        const product = new Product({
          ...productData,
          user: req.userId
        });
        await product.save();
        results.push({ sku: productData.sku, success: true });
      } catch (error) {
        errors.push({ sku: productData.sku, error: error.message });
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
