const fetch = require('node-fetch');
const logger = require('../config/logger');

class WhatsAppService {
  constructor() {
    this.baseUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '981190075078324';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'EAARYNSpQdgEBQl6SoqjWvwWD1HiMgcRcxTppSluZBPcvE9dE2wpQcni492fmq63DLJpy35v6YQzqzHuzFUFCza11VANNiycdh5BLTBjbjlW3UkRm7bq79pOdPeCaBEwQvweS29YjR2PG4Qd6BT7hmqh4sxMwEZBepUZCAmwLKQ9cWLx8ThtvIFp84q7GbWYX3Um0AWJeWMnrouDgcqSMEFDFrFJzi44vER2tZApzTE2DWGFXqbkvwM1ZA1KYCFLf35i5XBDPI7sDoSoCDqmmn';
    this.version = process.env.WHATSAPP_VERSION || 'v22.0';
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        logger.error('WhatsApp API Error:', { status: response.status, data });
        throw new Error(data.error?.message || 'WhatsApp API request failed');
      }

      return data;
    } catch (error) {
      logger.error('WhatsApp API Request Failed:', error);
      throw error;
    }
  }

  async sendTextMessage(phoneNumber, message, options = {}) {
    const body = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        preview_url: options.previewUrl || false,
        body: message
      }
    };

    return await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', body);
  }

  async sendTemplateMessage(phoneNumber, templateName, language = 'en', components = []) {
    const body = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language
        },
        components: components
      }
    };

    return await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', body);
  }

  async sendImageMessage(phoneNumber, imageUrl, caption = '', mimeType = 'image/jpeg') {
    const body = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption,
        mime_type: mimeType
      }
    };

    return await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', body);
  }

  async sendDocumentMessage(phoneNumber, documentUrl, fileName, mimeType = 'application/pdf') {
    const body = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'document',
      document: {
        link: documentUrl,
        caption: fileName,
        mime_type: mimeType
      }
    };

    return await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', body);
  }

  async sendOrderDetails(phoneNumber, order, businessName) {
    const itemsList = order.items.map((item, index) => {
      return `${index + 1}. ${item.productName}\n   Qty: ${item.quantity} × ₹${item.unitPrice}\n   Total: ₹${item.total}`;
    }).join('\n');

    const message = `
🏪 *${businessName}*

📋 *Order Details*
━━━━━━━━━━━━━━━━━━
📝 Order #: *${order.orderNumber}*
📅 Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}

*Items:*
${itemsList}

━━━━━━━━━━━━━━━━━━
💰 *Total: ₹${order.pricing.total}*
📍 Payment: ${order.paymentMethod.toUpperCase()}
📦 Status: ${order.status.toUpperCase()}

Thank you for your order! 🙏
    `.trim();

    return await this.sendTextMessage(phoneNumber, message);
  }

  async sendInvoiceMessage(phoneNumber, invoice, businessName) {
    const message = `
🏪 *${businessName}*

📄 *Invoice Details*
━━━━━━━━━━━━━━━━━━
🧾 Invoice #: *${invoice.invoiceNumber}*
📅 Date: ${new Date(invoice.dates.issueDate).toLocaleDateString('en-IN')}
⏰ Due Date: ${new Date(invoice.dates.dueDate).toLocaleDateString('en-IN')}

💵 *Total Amount: ₹${invoice.pricing.total}*
📍 Status: ${invoice.paymentDetails.status.toUpperCase()}

${invoice.notes?.footer || 'Thank you for your business!'}
    `.trim();

    return await this.sendTextMessage(phoneNumber, message);
  }

  async sendPaymentReminder(phoneNumber, invoice, daysOverdue) {
    const message = `
🏪 *Payment Reminder*

Dear Customer,

This is a friendly reminder that your invoice *${invoice.invoiceNumber}* is due.

💰 *Amount Due: ₹${invoice.pricing.total - invoice.paymentDetails.paidAmount}*
📅 *Days Overdue: ${daysOverdue}*

Please arrange payment at your earliest convenience.

Thank you! 🙏
    `.trim();

    return await this.sendTextMessage(phoneNumber, message);
  }

  async sendOrderStatusUpdate(phoneNumber, order, status) {
    const statusMessages = {
      confirmed: `✅ Your order *${order.orderNumber}* has been confirmed and is being processed.`,
      processing: `📦 Your order *${order.orderNumber}* is now being prepared for shipment.`,
      shipped: `🚚 Great news! Your order *${order.orderNumber}* has been shipped.\n\n${order.tracking?.trackingNumber ? `Tracking: ${order.tracking.trackingNumber}` : ''}`,
      delivered: `🎉 Your order *${order.orderNumber}* has been delivered successfully!\n\nThank you for shopping with us!`,
      cancelled: `❌ Your order *${order.orderNumber}* has been cancelled.\n\n${order.cancellationReason ? `Reason: ${order.cancellationReason}` : ''}`
    };

    const message = statusMessages[status] || `Order ${order.orderNumber} status updated to: ${status}`;
    return await this.sendTextMessage(phoneNumber, message);
  }

  async sendBulkMessages(phoneNumbers, message, options = {}) {
    const results = [];
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.sendTextMessage(phoneNumber, message, options);
        results.push({ phoneNumber, success: true, messageId: result.messages[0].id });
        
        // Rate limiting - wait 200ms between messages
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }
    return results;
  }

  async getMessageStatus(messageId) {
    return await this.makeRequest(messageId, 'GET');
  }

  async markMessagesAsRead(messageIds) {
    const body = {
      messaging_product: 'whatsapp',
      statuses: messageIds.map(id => ({
        id: id,
        status: 'read'
      }))
    };

    return await this.makeRequest(`${this.phoneNumberId}/messages`, 'POST', body);
  }

  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    return null;
  }

  async handleIncomingMessage(payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    const messages = value?.messages;
    if (!messages || messages.length === 0) return null;

    const message = messages[0];
    const contacts = value.contacts || [];

    const messageData = {
      whatsapp: {
        messageId: message.id,
        messageTimestamp: parseInt(message.timestamp),
        type: message.type
      },
      from: message.from,
      phone: message.from,
      direction: 'incoming',
      timestamp: new Date(parseInt(message.timestamp) * 1000)
    };

    if (contacts.length > 0) {
      messageData.contactName = contacts[0].wa_id;
    }

    switch (message.type) {
      case 'text':
        messageData.content = { text: message.text.body };
        break;
      case 'image':
        messageData.content = {
          media: {
            url: message.image.id,
            mimeType: message.image.mime_type,
            caption: message.image.caption
          }
        };
        break;
      case 'document':
        messageData.content = {
          media: {
            url: message.document.id,
            fileName: message.document.filename,
            mimeType: message.document.mime_type
          }
        };
        break;
      case 'button':
        messageData.content = { text: message.button.text };
        break;
      case 'interactive':
        messageData.content = {
          text: message.interactive?.button_reply?.title || 
                message.interactive?.list_reply?.title
        };
        break;
      default:
        messageData.content = { text: message[message.type]?.id || 'Unknown message type' };
    }

    return messageData;
  }
}

module.exports = new WhatsAppService();
