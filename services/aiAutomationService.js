const logger = require('../config/logger');
const whatsappService = require('./whatsappService');

class AIAutomationService {
  constructor() {
    this.responseTemplates = this.loadResponseTemplates();
    this.orderKeywords = ['order', 'status', 'track', 'delivery', 'shipment', 'when'];
    this.productKeywords = ['product', 'price', 'available', 'stock', 'catalog'];
    this.invoiceKeywords = ['invoice', 'bill', 'payment', 'due', 'receipt'];
    this.greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'नमस्ते'];
    this.thanksKeywords = ['thanks', 'thank you', ' धन्यवाद', 'shukriya', 'appreciate'];
  }

  loadResponseTemplates() {
    return {
      greeting: [
        "Hello! 👋 Welcome to {businessName}. How can I assist you today?",
        "Hi there! 😊 How may I help you?",
        "Namaste! 🙏 Welcome to {businessName}. What can I do for you?"
      ],
      greetingWithName: [
        "Hello {customerName}! 👋 Great to hear from you. How can I help?",
        "Hi {customerName}! 😊 How may I assist you today?"
      ],
      orderStatus: [
        "Let me check your order status. Please provide your order number.",
        "I'll look up your order. Could you please share your order number?"
      ],
      productInquiry: [
        "We have a wide range of products! Would you like me to share our latest catalog?",
        "I'd be happy to help with product information. What are you looking for?"
      ],
      thanks: [
        "You're welcome! 😊 Feel free to reach out anytime.",
        "My pleasure! 🙏 Is there anything else I can help with?"
      ],
      goodbye: [
        "Thank you for connecting with us! Have a great day! 🌟",
        "Goodbye for now! 😊 Don't hesitate to message us if you need anything."
      ],
      default: [
        "I understand. Let me connect you with our team for better assistance.",
        "I see. An executive will respond to you shortly.",
        "Thanks for reaching out! We'll get back to you soon."
      ]
    };
  }

  async processIncomingMessage(message, customer, conversation, user) {
    try {
      const messageText = (message.content?.text || '').toLowerCase();
      const intent = this.detectIntent(messageText);
      const sentiment = this.analyzeSentiment(messageText);
      
      const response = {
        intent,
        sentiment,
        suggestedResponse: null,
        suggestedAction: null,
        automated: false
      };

      // Process based on detected intent
      switch (intent) {
        case 'greeting':
          response.suggestedResponse = this.generateResponse('greeting', user.businessName, customer.name);
          response.automated = true;
          break;
        
        case 'order_status':
          response.suggestedResponse = this.generateResponse('order_status');
          response.suggestedAction = { type: 'request_order_number' };
          break;
        
        case 'product_inquiry':
          response.suggestedResponse = this.generateResponse('product_inquiry');
          response.suggestedAction = { type: 'send_catalog' };
          break;
        
        case 'thanks':
          response.suggestedResponse = this.generateResponse('thanks');
          response.automated = true;
          break;
        
        case 'goodbye':
          response.suggestedResponse = this.generateResponse('goodbye');
          response.automated = true;
          break;
        
        case 'invoice_payment':
          response.suggestedResponse = this.getInvoicePaymentResponse(messageText, customer);
          break;
        
        case 'new_order':
          response.suggestedResponse = this.getNewOrderResponse(messageText);
          response.suggestedAction = { type: 'create_order', collectItems: true };
          break;
        
        default:
          response.suggestedResponse = this.generateResponse('default');
      }

      return response;
    } catch (error) {
      logger.error('AI Automation Error:', error);
      return {
        intent: 'unknown',
        sentiment: 'neutral',
        suggestedResponse: this.generateResponse('default'),
        automated: false
      };
    }
  }

  detectIntent(messageText) {
    // Check for greeting
    if (this.greetingKeywords.some(keyword => messageText.includes(keyword))) {
      if (this.thanksKeywords.some(keyword => messageText.includes(keyword))) {
        return 'thanks';
      }
      return 'greeting';
    }

    // Check for order status
    if (this.orderKeywords.some(keyword => messageText.includes(keyword))) {
      if (messageText.includes('new') || messageText.includes('place') || messageText.includes('want to buy')) {
        return 'new_order';
      }
      return 'order_status';
    }

    // Check for product inquiry
    if (this.productKeywords.some(keyword => messageText.includes(keyword))) {
      return 'product_inquiry';
    }

    // Check for invoice/payment
    if (this.invoiceKeywords.some(keyword => messageText.includes(keyword))) {
      return 'invoice_payment';
    }

    // Check for thanks
    if (this.thanksKeywords.some(keyword => messageText.includes(keyword))) {
      return 'thanks';
    }

    // Check for goodbye
    if (messageText.includes('bye') || messageText.includes('tata') || messageText.includes('जय हिंद')) {
      return 'goodbye';
    }

    return 'general_inquiry';
  }

  analyzeSentiment(messageText) {
    const positiveWords = ['great', 'awesome', 'excellent', 'amazing', 'wonderful', 'good', 'nice', 'love', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'disappointed', 'worst', 'angry', 'frustrated', 'problem', 'issue'];

    let score = 0;
    positiveWords.forEach(word => {
      if (messageText.includes(word)) score += 1;
    });
    negativeWords.forEach(word => {
      if (messageText.includes(word)) score -= 1;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  generateResponse(type, ...args) {
    const templates = this.responseTemplates[type];
    if (!templates) return null;

    let response = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    args.forEach((arg, index) => {
      response = response.replace(`{${index}}`, arg);
    });

    return response;
  }

  getInvoicePaymentResponse(messageText, customer) {
    if (messageText.includes('pay') || messageText.includes('payment')) {
      return "I'll help you with payment. Would you like to know our payment options or get a payment link?";
    }
    
    if (messageText.includes('overdue') || messageText.includes('pending') || messageText.includes('due')) {
      return "Let me check your pending invoices. One moment please...";
    }

    return "I can help you with invoice-related queries. Please provide more details.";
  }

  getNewOrderResponse(messageText) {
    // Extract potential order items
    const itemPatterns = [
      /(\d+)\s*(pcs?|pieces?|pieces?)\s*(of)?\s*(.+)/gi,
      /(want|need|order)\s*(.+)/gi
    ];

    return "I'd be happy to help you place a new order! 📝\n\nPlease share:\n1. Product names and quantities\n2. Your delivery address\n3. Any special requirements\n\nOr I can send you our product catalog.";
  }

  async sendAutomatedResponse(phoneNumber, message, user) {
    try {
      const result = await whatsappService.sendTextMessage(phoneNumber, message);
      logger.info('Automated response sent successfully');
      return result;
    } catch (error) {
      logger.error('Failed to send automated response:', error);
      throw error;
    }
  }

  async processOrderFromMessage(messageText, customer, conversation) {
    const orderData = {
      customer: customer._id,
      items: [],
      source: 'whatsapp',
      notes: {
        customer: messageText
      }
    };

    // Extract products and quantities from message
    const quantityPatterns = [
      /(\d+)\s*(x|×)\s*(.+?)(?=\d+\s*(?:x|×)|$)/gi,
      /(\d+)\s*(.+?)(?=\d+\s*(?:x|×)|$)/gi
    ];

    // This is a simplified extraction - in production, use NLP
    const products = this.extractProductsFromText(messageText);

    return {
      orderData,
      extractedProducts: products,
      message: "Thank you! I've noted your order request. Let me confirm the details with you."
    };
  }

  extractProductsFromText(text) {
    // Simplified product extraction
    // In production, integrate with ML/NLP service
    const products = [];
    const patterns = [
      /(\d+)\s*(?:pieces?|pcs?|units?)\s*(?:of)?\s*(.+?)(?=\d+\s*(?:pieces?|pcs?)|$)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        products.push({
          quantity: parseInt(match[1]),
          name: match[2].trim()
        });
      }
    });

    return products;
  }

  generateSmartSuggestions(conversation, customer) {
    const suggestions = [];

    // Based on conversation context
    if (conversation.statistics?.totalMessages > 5) {
      suggestions.push('Create order from conversation');
      suggestions.push('Schedule follow-up');
    }

    // Based on customer type
    if (customer?.customerType === 'wholesale') {
      suggestions.push('Send wholesale catalog');
      suggestions.push('Check credit limit');
    }

    // Based on last order
    if (customer?.lastOrderDate) {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastOrder > 30) {
        suggestions.push('Re-engagement offer');
      }
    }

    return suggestions;
  }
}

module.exports = new AIAutomationService();
