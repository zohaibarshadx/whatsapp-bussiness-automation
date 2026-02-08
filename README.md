<<<<<<< HEAD
# WhatsApp-Based Business Operating System for MSMEs

A comprehensive business management platform designed for Micro, Small, and Medium Enterprises (MSMEs) with AI automation, smart order processing, invoice generation, and customer management via WhatsApp.

## Features

### 📱 WhatsApp Business Integration
- Real-time messaging with customers
- Automated responses with AI
- Template message support
- Bulk messaging capabilities

### 🛒 Smart Order Processing
- Create and manage orders
- Order status tracking
- Order confirmation via WhatsApp
- Inventory management integration

### 📄 Invoice Generation
- Professional PDF invoice generation
- Automated payment reminders
- Invoice tracking and management
- GST-compliant invoicing

### 👥 Customer Management
- Customer database with tagging
- Purchase history tracking
- Customer segmentation (Retail/Wholesale/Corporate)
- Communication preferences

### 🤖 AI Automation
- Intelligent message processing
- Auto-responders based on keywords
- Sentiment analysis
- Smart order suggestions

### 📊 Analytics Dashboard
- Revenue tracking
- Order analytics
- Customer insights
- Performance metrics

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** Authentication
- **PDFKit** for invoice generation

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Lucide React** for icons
- **CSS** custom styling

## Project Structure

```
whatsapp-business-os/
├── server.js                 # Main server entry point
├── package.json              # Backend dependencies
├── .env.example             # Environment variables template
├── config/
│   └── logger.js            # Winston logger configuration
├── models/
│   ├── User.js              # User model
│   ├── Customer.js          # Customer model
│   ├── Product.js           # Product model
│   ├── Order.js             # Order model
│   ├── Invoice.js           # Invoice model
│   ├── Message.js           # Message model
│   ├── Conversation.js      # Conversation model
│   └── AutomationRule.js    # Automation rules model
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── customers.js         # Customer management routes
│   ├── orders.js            # Order processing routes
│   ├── invoices.js          # Invoice routes
│   ├── products.js          # Product routes
│   ├── whatsapp.js          # WhatsApp messaging routes
│   ├── analytics.js         # Analytics routes
│   └── automation.js        # Automation rules routes
├── services/
│   ├── whatsappService.js   # WhatsApp Business API
│   ├── aiAutomationService.js # AI automation logic
│   ├── invoiceService.js    # Invoice generation
│   └── schedulerService.js  # Scheduled tasks
└── frontend/
    ├── package.json         # Frontend dependencies
    ├── vite.config.js       # Vite configuration
    ├── index.html           # HTML entry point
    └── src/
        ├── main.jsx         # React entry
        ├── App.jsx          # Main app component
        └── index.css        # Global styles
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB 6+
- WhatsApp Business Account

### Backend Setup

1. Navigate to project directory:
   ```bash
   cd whatsapp-business-os
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/whatsapp_business_os
   JWT_SECRET=your-secure-jwt-secret
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status

### Invoices
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id/pdf` - Generate PDF
- `POST /api/invoices/:id/send` - Send via WhatsApp

### WhatsApp
- `POST /api/whatsapp/webhook` - Webhook endpoint
- `GET /api/whatsapp/conversations` - List conversations
- `POST /api/whatsapp/send` - Send message

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product

### Analytics
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/revenue` - Revenue chart data

### Automation
- `GET /api/automation/rules` - List automation rules
- `POST /api/automation/rules` - Create rule
- `PATCH /api/automation/rules/:id/toggle` - Toggle rule

## WhatsApp Business Setup

1. Create a WhatsApp Business Account
2. Set up Meta App in Facebook Developers
3. Configure WhatsApp Product
4. Get Phone Number ID and Access Token
5. Set up Webhook URL
6. Add credentials to `.env`

## Features by User Type

### For Retail MSMEs
- Quick order creation
- Simple invoice generation
- Customer messaging
- Basic analytics

### For Wholesale Businesses
- Bulk order processing
- Tiered pricing
- Credit management
- Advanced reporting

### For Corporates
- Multiple users/teams
- Custom workflows
- API integrations
- Dedicated support

## Security Features

- JWT-based authentication
- Rate limiting
- Helmet security headers
- Input validation
- Secure password hashing

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - feel free to use for your business!

## Support

For questions or issues, please open a GitHub issue.

---

Built with ❤️ for MSME Businesses
=======
# whatsapp-bussiness-automation
A comprehensive business management platform designed for Micro, Small, and Medium Enterprises (MSMEs) with AI automation, smart order processing, invoice generation, and customer management via WhatsApp.
>>>>>>> 4ba9c708f6167b637c6b907eca08942ce7f1e095
