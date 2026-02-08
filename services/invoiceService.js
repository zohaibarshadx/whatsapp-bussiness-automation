const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const Invoice = require('../models/Invoice');

class InvoiceService {
  constructor() {
    this.invoicesPath = path.join(__dirname, '../invoices');
    
    // Ensure invoices directory exists
    if (!fs.existsSync(this.invoicesPath)) {
      fs.mkdirSync(this.invoicesPath, { recursive: true });
    }
  }

  async createInvoiceFromOrder(order, user, options = {}) {
    const invoiceData = {
      user: user._id,
      order: order._id,
      customer: order.customer,
      customerDetails: {
        name: order.shippingAddress?.name || 'Customer',
        phone: order.shippingAddress?.phone,
        address: order.billingAddress || order.shippingAddress
      },
      businessDetails: {
        name: user.businessName || user.name,
        address: {
          street: '123 Business Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        phone: user.phone,
        email: user.email,
        gstin: options.gstin || '27AABCU1234A1Z5',
        logo: options.logo
      },
      items: order.items.map(item => ({
        description: `${item.productName} (${item.sku})`,
        product: item.product,
        sku: item.sku,
        quantity: item.quantity,
        unit: 'piece',
        unitPrice: item.unitPrice,
        discount: {
          amount: item.discount || 0
        },
        tax: {
          rate: item.tax?.rate || 0,
          amount: item.tax?.amount || 0
        },
        total: item.total
      })),
      pricing: {
        subtotal: order.pricing.subtotal,
        totalDiscount: order.pricing.totalDiscount,
        totalTax: order.pricing.totalTax,
        shipping: order.pricing.shipping || 0,
        total: order.pricing.total,
        currency: order.pricing.currency || 'INR'
      },
      paymentDetails: {
        status: 'pending',
        method: order.paymentMethod,
        paidAmount: 0,
        dueDate: new Date(Date.now() + (options.paymentTerms || 30) * 24 * 60 * 60 * 1000)
      },
      dates: {
        issueDate: new Date(),
        dueDate: new Date(Date.now() + (options.paymentTerms || 30) * 24 * 60 * 60 * 1000)
      },
      notes: {
        terms: options.terms || 'Payment due within 30 days of invoice date.',
        footer: options.footer || 'Thank you for your business!'
      },
      source: 'order'
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    return invoice;
  }

  async generatePDF(invoiceId) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('customer')
      .populate('order')
      .populate('user');

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const fileName = `invoice_${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`;
    const filePath = path.join(this.invoicesPath, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);

      // Header
      this.addHeader(doc, invoice);
      
      // Business & Customer Details
      this.addAddresses(doc, invoice);
      
      // Invoice Details
      this.addInvoiceMeta(doc, invoice);
      
      // Items Table
      this.addItemsTable(doc, invoice);
      
      // Totals
      this.addTotals(doc, invoice);
      
      // Notes
      this.addNotes(doc, invoice);
      
      // Footer
      this.addFooter(doc, invoice);

      doc.end();

      writeStream.on('finish', async () => {
        // Update invoice with PDF path
        invoice.pdf = {
          path: filePath,
          url: `/api/invoices/${invoice._id}/pdf`,
          generatedAt: new Date()
        };
        await invoice.save();
        
        logger.info(`Invoice PDF generated: ${fileName}`);
        resolve({ filePath, fileName });
      });

      writeStream.on('error', reject);
    });
  }

  addHeader(doc, invoice) {
    // Business Logo/Name
    doc.fontSize(24)
       .font('Helvetica-Bold')
       .fillColor('#2563eb')
       .text(invoice.businessDetails.name || 'Business Name', { align: 'center' });

    doc.moveDown(0.5);

    // Business Address
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor('#666');
    
    const addressLines = [];
    if (invoice.businessDetails.address?.street) addressLines.push(invoice.businessDetails.address.street);
    if (invoice.businessDetails.address?.city) addressLines.push(`${invoice.businessDetails.address.city}, ${invoice.businessDetails.address.state} ${invoice.businessDetails.address.postalCode}`);
    if (invoice.businessDetails.address?.country) addressLines.push(invoice.businessDetails.address.country);
    
    addressLines.forEach(line => {
      doc.text(line, { align: 'center' });
    });

    if (invoice.businessDetails.gstin) {
      doc.text(`GSTIN: ${invoice.businessDetails.gstin}`, { align: 'center' });
    }

    doc.moveDown(1);
    
    // Divider line
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .stroke();
    
    doc.moveDown(1);
  }

  addAddresses(doc, invoice) {
    const startY = doc.y;
    
    // Bill To
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Bill To:', 50, startY);
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text(invoice.customerDetails.name || 'Customer Name');
    
    doc.font('Helvetica')
       .fillColor('#4b5563');
    
    if (invoice.customerDetails.address?.street) {
      doc.text(invoice.customerDetails.address.street);
    }
    if (invoice.customerDetails.address?.city) {
      doc.text(`${invoice.customerDetails.address.city}, ${invoice.customerDetails.address.state} ${invoice.customerDetails.address.postalCode}`);
    }
    if (invoice.customerDetails.phone) {
      doc.text(`Phone: ${invoice.customerDetails.phone}`);
    }
    if (invoice.customerDetails.gstin) {
      doc.text(`GSTIN: ${invoice.customerDetails.gstin}`);
    }

    // Ship To (if different)
    if (invoice.order?.shippingAddress && 
        JSON.stringify(invoice.order.shippingAddress) !== JSON.stringify(invoice.customerDetails.address)) {
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#1f2937')
         .text('Ship To:', 350, startY);
      
      doc.moveDown(0.5);
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#4b5563')
         .text(invoice.order.shippingAddress.name || invoice.customerDetails.name, 350);
      
      if (invoice.order.shippingAddress.street) {
        doc.text(invoice.order.shippingAddress.street, 350);
      }
      if (invoice.order.shippingAddress.city) {
        doc.text(`${invoice.order.shippingAddress.city}, ${invoice.order.shippingAddress.state} ${invoice.order.shippingAddress.postalCode}`, 350);
      }
    }

    doc.moveDown(2);
  }

  addInvoiceMeta(doc, invoice) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#1f2937')
       .text('Invoice Details', 50, doc.y);
    
    doc.moveDown(0.5);

    const metaData = [
      { label: 'Invoice Number', value: invoice.invoiceNumber },
      { label: 'Invoice Date', value: new Date(invoice.dates.issueDate).toLocaleDateString('en-IN') },
      { label: 'Due Date', value: new Date(invoice.dates.dueDate).toLocaleDateString('en-IN') },
      { label: 'Order Number', value: invoice.order?.orderNumber || 'N/A' },
      { label: 'Payment Terms', value: invoice.paymentDetails.status.toUpperCase() }
    ];

    let xOffset = 50;
    metaData.forEach((item, index) => {
      if (index === 3) {
        xOffset = 350;
        doc.y = doc.y - (12 * 2); // Move back up for second column
      }
      
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#6b7280')
         .text(`${item.label}:`, xOffset, doc.y, { continued: true })
         .font('Helvetica')
         .fillColor('#1f2937')
         .text(` ${item.value}`);
    });

    doc.moveDown(2);
  }

  addItemsTable(doc, invoice) {
    const tableTop = doc.y;
    const tableHeaders = ['Description', 'Qty', 'Rate', 'Discount', 'Tax', 'Total'];
    const colWidths = [220, 50, 70, 70, 50, 70];
    const colPositions = [50];
    colWidths.slice(0, -1).forEach(width => {
      colPositions.push(colPositions[colPositions.length - 1] + width);
    });

    // Table Header
    doc.rect(50, tableTop, 495, 25)
       .fill('#f3f4f6');
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#1f2937');
    
    tableHeaders.forEach((header, i) => {
      let align = 'left';
      if (i === 1 || i === 2 || i === 3 || i === 4) align = 'center';
      if (i === 5) align = 'right';
      
      doc.text(header, colPositions[i] + 5, tableTop + 8, {
        width: colWidths[i] - 10,
        align
      });
    });

    // Table Rows
    let yPos = tableTop + 25;
    let subtotal = 0;

    invoice.items.forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(50, yPos, 495, 25)
           .fill('#ffffff');
      }

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#374151');

      // Description
      doc.text(item.description.substring(0, 35), colPositions[0] + 5, yPos + 8, {
        width: colWidths[0] - 10
      });

      // Qty
      doc.text(item.quantity.toString(), colPositions[1], yPos + 8, {
        width: colWidths[1],
        align: 'center'
      });

      // Rate
      doc.text(`₹${item.unitPrice.toFixed(2)}`, colPositions[2], yPos + 8, {
        width: colWidths[2],
        align: 'center'
      });

      // Discount
      doc.text(`₹${(item.discount?.amount || 0).toFixed(2)}`, colPositions[3], yPos + 8, {
        width: colWidths[3],
        align: 'center'
      });

      // Tax
      doc.text(`${(item.tax?.rate || 0)}%`, colPositions[4], yPos + 8, {
        width: colWidths[4],
        align: 'center'
      });

      // Total
      doc.font('Helvetica-Bold')
         .text(`₹${item.total.toFixed(2)}`, colPositions[5], yPos + 8, {
        width: colWidths[5] - 5,
        align: 'right'
      });

      yPos += 25;
      subtotal += item.total;
    });

    // Border
    doc.strokeColor('#e5e7eb')
       .lineWidth(1)
       .rect(50, tableTop, 495, yPos - tableTop)
       .stroke();

    doc.y = yPos + 20;
  }

  addTotals(doc, invoice) {
    const totalsStart = doc.y;
    const totalsX = 350;
    const valuesX = 495;

    const totals = [
      { label: 'Subtotal', value: invoice.pricing.subtotal },
      { label: 'Discount', value: -invoice.pricing.totalDiscount },
      { label: 'Tax', value: invoice.pricing.totalTax },
      { label: 'Shipping', value: invoice.pricing.shipping || 0 },
      { label: 'TOTAL', value: invoice.pricing.total, isBold: true }
    ];

    totals.forEach((total, index) => {
      const y = totalsStart + (index * 20);
      
      doc.fontSize(10);
      
      if (total.isBold) {
        doc.font('Helvetica-Bold')
           .fillColor('#1f2937')
           .fontSize(12);
      } else {
        doc.font('Helvetica')
           .fillColor('#6b7280');
      }

      doc.text(total.label, totalsX, y, { continued: true })
         .text(' ₹', totalsX + 100, y, { continued: true })
         .text((total.value >= 0 ? total.value : -total.value).toFixed(2), valuesX - 80, y, {
        width: 80,
        align: 'right'
      });
    });

    doc.moveDown(3);

    // Amount in words
    if (invoice.pricing.amountInWords) {
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#374151')
         .text(`Amount in Words: ${invoice.pricing.amountInWords}`);
    }

    doc.moveDown(2);
  }

  addNotes(doc, invoice) {
    if (invoice.notes?.terms || invoice.notes?.footer) {
      doc.strokeColor('#e5e7eb')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(1);

      if (invoice.notes?.terms) {
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#6b7280')
           .text('Terms & Conditions:', 50);
        
        doc.font('Helvetica')
           .fillColor('#4b5563')
           .text(invoice.notes.terms, 50, doc.y + 5, {
          width: 495
        });
        
        doc.moveDown(1);
      }

      if (invoice.notes?.footer) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#374151')
           .text(invoice.notes.footer, { align: 'center' });
      }
    }
  }

  addFooter(doc, invoice) {
    const pageHeight = doc.page.height;
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#9ca3af')
       .text('Generated by WhatsApp Business OS', 50, pageHeight - 40, {
      align: 'center',
      width: 495
    });
  }

  async sendInvoicePDF(invoiceId, phoneNumber, user) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Generate PDF if not exists
      if (!invoice.pdf?.path || !fs.existsSync(invoice.pdf.path)) {
        await this.generatePDF(invoiceId);
        await invoice.reload();
      }

      // Send via WhatsApp
      const whatsappService = require('./whatsappService');
      const message = `📄 Hi! Please find your invoice attached.\n\nInvoice #: ${invoice.invoiceNumber}\nAmount: ₹${invoice.pricing.total}\nDue Date: ${new Date(invoice.dates.dueDate).toLocaleDateString('en-IN')}`;
      
      const result = await whatsappService.sendDocumentMessage(
        phoneNumber,
        `file://${invoice.pdf.path}`,
        `Invoice_${invoice.invoiceNumber}.pdf`,
        'application/pdf'
      );

      // Update invoice status
      invoice.status = 'sent';
      invoice.whatsapp = {
        messageId: result.messages[0].id,
        sentAt: new Date()
      };
      await invoice.save();

      return { success: true, messageId: result.messages[0].id };
    } catch (error) {
      logger.error('Error sending invoice PDF:', error);
      throw error;
    }
  }

  async getInvoiceStats(userId, dateRange = {}) {
    const match = { user: userId };
    
    if (dateRange.start) {
      match.createdAt = { $gte: new Date(dateRange.start), $lte: new Date(dateRange.end) };
    }

    const stats = await Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentDetails.status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.total' }
        }
      }
    ]);

    return stats;
  }
}

module.exports = new InvoiceService();
