const logger = require('../config/logger');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const whatsappService = require('./whatsappService');

class SchedulerService {
  async processScheduledMessages() {
    try {
      logger.info('Processing scheduled messages...');
      
      // Process overdue invoice reminders
      await this.sendPaymentReminders();
      
      // Process order follow-ups
      await this.sendOrderFollowUps();
      
      // Process customer engagement
      await this.sendCustomerEngagement();
      
      logger.info('Scheduled messages processed successfully');
    } catch (error) {
      logger.error('Error processing scheduled messages:', error);
    }
  }

  async sendPaymentReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find overdue invoices
      const overdueInvoices = await Invoice.find({
        'paymentDetails.status': { $in: ['pending', 'partial'] },
        'dates.dueDate': { $lt: today },
        status: { $ne: 'cancelled' }
      }).populate('user customer');

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (today - new Date(invoice.dates.dueDate)) / (1000 * 60 * 60 * 24)
        );

        // Send reminder based on overdue days
        if (daysOverdue <= 7 || daysOverdue === 14 || daysOverdue === 30) {
          try {
            const phone = invoice.customer.phone;
            await whatsappService.sendPaymentReminder(phone, invoice, daysOverdue);
            
            invoice.paymentDetails.reminderSentAt = new Date();
            await invoice.save();
            
            logger.info(`Payment reminder sent for invoice ${invoice.invoiceNumber}`);
          } catch (error) {
            logger.error(`Failed to send reminder for invoice ${invoice.invoiceNumber}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error sending payment reminders:', error);
    }
  }

  async sendOrderFollowUps() {
    try {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Find orders delivered 3 days ago awaiting feedback
      const orders = await Order.find({
        status: 'delivered',
        'whatsapp.lastMessageAt': { $lt: threeDaysAgo },
        'automation.feedbackRequested': { $ne: true }
      }).populate('user customer');

      for (const order of orders) {
        try {
          const phone = order.customer.phone;
          const message = `Hi ${order.customer.name}! 🌟\n\nThank you for your order ${order.orderNumber}. We hope you enjoyed your purchase!\n\nPlease share your feedback - it helps us serve you better.\n\n🙏 Thank you!`;
          
          await whatsappService.sendTextMessage(phone, message);
          
          order.automation = { ...order.automation, feedbackRequested: true };
          await order.save();
          
          logger.info(`Feedback request sent for order ${order.orderNumber}`);
        } catch (error) {
          logger.error(`Failed to send feedback request for order ${order.orderNumber}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error sending order follow-ups:', error);
    }
  }

  async sendCustomerEngagement() {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Find customers who haven't ordered in 30 days
      const customers = await Customer.find({
        lastOrderDate: { $lt: thirtyDaysAgo },
        isActive: true,
        'communicationPreferences.marketing': true
      }).populate('user');

      for (const customer of customers) {
        try {
          const phone = customer.phone;
          const daysSinceOrder = Math.floor(
            (today - new Date(customer.lastOrderDate)) / (1000 * 60 * 60 * 24)
          );

          const message = `Hi ${customer.name}! 👋\n\nIt's been ${daysSinceOrder} days since your last order with ${customer.user?.businessName || 'us'}. \n\nWe miss you! 🎁\n\nUse code WELCOME10 for 10% off on your next order.\n\nShop now and stay connected on WhatsApp!`;
          
          await whatsappService.sendTextMessage(phone, message);
          
          // Mark engagement sent
          customer.lastEngagementAt = new Date();
          await customer.save();
          
          logger.info(`Engagement message sent to customer ${customer.name}`);
        } catch (error) {
          logger.error(`Failed to send engagement to customer ${customer.name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error sending customer engagement:', error);
    }
  }

  async sendBulkCampaign(campaign) {
    try {
      const { userId, message, template, customerIds, delay = 200 } = campaign;
      
      const customers = await Customer.find({
        _id: { $in: customerIds },
        isActive: true,
        'communicationPreferences.marketing': true
      });

      const results = [];
      for (const customer of customers) {
        try {
          let result;
          if (template) {
            result = await whatsappService.sendTemplateMessage(
              customer.phone,
              template.name,
              template.language,
              template.components
            );
          } else {
            result = await whatsappService.sendTextMessage(customer.phone, message);
          }
          
          results.push({
            customerId: customer._id,
            phone: customer.phone,
            success: true,
            messageId: result.messages?.[0]?.id
          });

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, delay));
        } catch (error) {
          results.push({
            customerId: customer._id,
            phone: customer.phone,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`Bulk campaign completed. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
      
      return results;
    } catch (error) {
      logger.error('Error sending bulk campaign:', error);
      throw error;
    }
  }
}

module.exports = new SchedulerService();
