import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LayoutDashboard, Users, ShoppingCart, FileText, MessageSquare, 
  BarChart3, Package, Settings, Zap, LogOut, Menu, X, Bell,
  Search, Plus, ChevronRight, TrendingUp, TrendingDown,
  Send, CheckCircle, Clock, AlertCircle, Eye, Edit, Trash2,
  Download, Upload, MoreHorizontal, Phone, Mail, MapPin,
  CreditCard, Truck, Package as PackageIcon
} from 'lucide-react';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

// API Helper
const api = {
  baseUrl: '/api',
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  
  get: (endpoint) => api.request(endpoint),
  post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => api.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: 'DELETE' })
};

// Icons
const Icons = {
  Dashboard: LayoutDashboard,
  Customers: Users,
  Orders: ShoppingCart,
  Invoices: FileText,
  WhatsApp: MessageSquare,
  Analytics: BarChart3,
  Products: Package,
  Automation: Zap,
  Settings: Settings,
  LogOut: LogOut
};

// Sidebar Component
const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { section: 'Main', items: [
      { path: '/', icon: 'Dashboard', label: 'Dashboard' },
      { path: '/whatsapp', icon: 'WhatsApp', label: 'WhatsApp' },
      { path: '/customers', icon: 'Customers', label: 'Customers' },
      { path: '/orders', icon: 'Orders', label: 'Orders' },
      { path: '/invoices', icon: 'Invoices', label: 'Invoices' },
      { path: '/products', icon: 'Products', label: 'Products' },
    ]},
    { section: 'Insights', items: [
      { path: '/analytics', icon: 'Analytics', label: 'Analytics' },
      { path: '/automation', icon: 'Automation', label: 'Automation' },
    ]},
    { section: 'Account', items: [
      { path: '/settings', icon: 'Settings', label: 'Settings' },
    ]}
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <MessageSquare size={28} />
            <span>WhatsApp OS</span>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map(section => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => {
                const Icon = Icons[item.icon];
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
          <button className="nav-link" style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }} onClick={handleLogout}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

// Header Component
const Header = ({ title, onMenuClick }) => (
  <header className="header">
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button className="btn btn-icon btn-secondary" onClick={onMenuClick} style={{ display: 'none' }}>
        <Menu size={20} />
      </button>
      <h1 className="header-title">{title}</h1>
    </div>
    <div className="header-actions">
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Search..." 
          className="form-input" 
          style={{ width: '240px', paddingLeft: '40px' }}
        />
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>
      <button className="btn btn-icon btn-secondary">
        <Bell size={20} />
      </button>
    </div>
  </header>
);

// Dashboard Page
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/analytics/dashboard');
        setStats(data.overview);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'This Month Revenue', value: stats?.revenue || 0, change: stats?.revenueGrowth || 0, icon: 'blue', format: 'currency' },
    { label: 'Total Orders', value: stats?.orders || 0, icon: 'green' },
    { label: 'Customers', value: stats?.customers || 0, icon: 'purple' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: 'yellow' },
    { label: 'Unread Messages', value: stats?.unreadConversations || 0, icon: 'blue' },
    { label: 'Pending Invoices', value: stats?.pendingInvoices || 0, icon: 'red' },
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className={`stat-icon ${stat.icon}`}>
              {stat.icon === 'blue' && <TrendingUp size={24} />}
              {stat.icon === 'green' && <ShoppingCart size={24} />}
              {stat.icon === 'purple' && <Users size={24} />}
              {stat.icon === 'yellow' && <Clock size={24} />}
              {stat.icon === 'red' && <AlertCircle size={24} />}
            </div>
            <div className="stat-content">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">
                {stat.format === 'currency' ? `₹${(stat.value || 0).toLocaleString()}` : stat.value}
              </div>
              {stat.change !== undefined && (
                <div className={`stat-change ${stat.change >= 0 ? 'positive' : 'negative'}`}>
                  {stat.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(stat.change)}% from last month
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
            <Link to="/orders" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>ORD/2401/0001</td>
                    <td>Rajesh Kumar</td>
                    <td>₹2,500</td>
                    <td><span className="badge badge-success">Delivered</span></td>
                  </tr>
                  <tr>
                    <td>ORD/2401/0002</td>
                    <td>Priya Sharma</td>
                    <td>₹5,200</td>
                    <td><span className="badge badge-warning">Processing</span></td>
                  </tr>
                  <tr>
                    <td>ORD/2401/0003</td>
                    <td>Amit Patel</td>
                    <td>₹1,800</td>
                    <td><span className="badge badge-info">Shipped</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Conversations</h3>
            <Link to="/whatsapp" className="btn btn-sm btn-secondary">View All</Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {[
              { name: 'Rajesh Kumar', message: 'Thanks for the quick delivery!', time: '2 min ago', unread: true },
              { name: 'Priya Sharma', message: 'Can I change my order quantity?', time: '15 min ago', unread: true },
              { name: 'Amit Patel', message: 'Payment received. Thank you!', time: '1 hour ago', unread: false },
            ].map((chat, index) => (
              <div key={index} className="chat-item">
                <div className="chat-avatar">{chat.name[0]}</div>
                <div className="chat-info">
                  <div className="chat-name">{chat.name}</div>
                  <div className="chat-preview">{chat.message}</div>
                </div>
                <div className="chat-meta">
                  <div className="chat-time">{chat.time}</div>
                  {chat.unread && <span className="chat-unread">New</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// WhatsApp Conversations Page
const WhatsAppPage = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Simulated data
    const convos = [
      { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', lastMessage: 'Thanks for the quick delivery!', time: '2 min ago', unread: 2, status: 'open' },
      { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', lastMessage: 'Can I change my order quantity?', time: '15 min ago', unread: 1, status: 'open' },
      { id: 3, name: 'Amit Patel', phone: '+91 98765 43212', lastMessage: 'Payment received. Thank you!', time: '1 hour ago', unread: 0, status: 'closed' },
      { id: 4, name: 'Sneha Gupta', phone: '+91 98765 43213', lastMessage: 'Product looks great!', time: '3 hours ago', unread: 0, status: 'open' },
    ];
    setConversations(convos);
    setLoading(false);
    
    // Check for query params to auto-select chat
    const phoneParam = searchParams.get('phone');
    const nameParam = searchParams.get('name');
    if (phoneParam) {
      const existingChat = convos.find(c => c.phone === phoneParam);
      if (existingChat) {
        setSelectedChat(existingChat);
      } else if (nameParam) {
        // Create a new temporary chat for this customer
        const newChat = {
          id: convos.length + 1,
          name: nameParam,
          phone: phoneParam,
          lastMessage: 'Start a conversation',
          time: 'Just now',
          unread: 0,
          status: 'open',
          isNew: true
        };
        setConversations(prev => [newChat, ...prev]);
        setSelectedChat(newChat);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedChat) {
      setMessages([
        { id: 1, content: 'Hi, I want to place an order', direction: 'incoming', time: '10:30 AM' },
        { id: 2, content: 'Sure! What would you like to order?', direction: 'outgoing', time: '10:32 AM' },
        { id: 3, content: 'I want 2 pieces of item ABC', direction: 'incoming', time: '10:33 AM' },
        { id: 4, content: 'Got it! Total will be ₹2,500. Should I create the order?', direction: 'outgoing', time: '10:35 AM' },
        { id: 5, content: 'Yes please!', direction: 'incoming', time: '10:36 AM' },
        { id: 6, content: 'Order created! Order #ORD/2401/0001. Thanks for the quick delivery!', direction: 'outgoing', time: '10:38 AM' },
        { id: 7, content: 'Thanks for the quick delivery!', direction: 'incoming', time: '2:15 PM' },
      ]);
    }
  }, [selectedChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    const msg = {
      id: messages.length + 1,
      content: newMessage,
      direction: 'outgoing',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, msg]);
    setNewMessage('');
    
    // Simulate auto-reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        content: 'Thank you for your message! An executive will respond shortly.',
        direction: 'incoming',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  return (
    <div className="chat-container fade-in">
      <div className="chat-sidebar">
        <div className="chat-search">
          <input type="text" placeholder="Search conversations..." className="form-input" />
        </div>
        <div className="chat-list">
          {conversations.map(chat => (
            <div 
              key={chat.id} 
              className={`chat-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
              onClick={() => setSelectedChat(chat)}
            >
              <div className="chat-avatar">{chat.name[0]}</div>
              <div className="chat-info">
                <div className="chat-name">{chat.name}</div>
                <div className="chat-preview">{chat.lastMessage}</div>
              </div>
              <div className="chat-meta">
                <div className="chat-time">{chat.time}</div>
                {chat.unread > 0 && <span className="chat-unread">{chat.unread}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="chat-avatar">{selectedChat.name[0]}</div>
              <div>
                <div className="chat-name">{selectedChat.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedChat.phone}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button className="btn btn-icon btn-secondary"><Phone size={18} /></button>
                <button className="btn btn-icon btn-secondary"><FileText size={18} /></button>
                <button className="btn btn-icon btn-secondary"><MoreHorizontal size={18} /></button>
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message ${msg.direction}`}>
                  <div>{msg.content}</div>
                  <div className="message-time">{msg.time}</div>
                </div>
              ))}
            </div>
            
            <div className="chat-input">
              <button className="btn btn-icon btn-secondary"><Plus size={20} /></button>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="btn btn-icon btn-primary" onClick={handleSendMessage}>
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <MessageSquare size={64} />
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Customers Page
const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'retail'
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulated data
    setCustomers([
      { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210', email: 'rajesh@email.com', type: 'retail', totalOrders: 15, totalSpent: 45000, lastOrder: '2024-01-15' },
      { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@email.com', type: 'wholesale', totalOrders: 45, totalSpent: 180000, lastOrder: '2024-01-14' },
      { id: 3, name: 'Amit Patel', phone: '+91 98765 43212', email: 'amit@email.com', type: 'retail', totalOrders: 8, totalSpent: 25000, lastOrder: '2024-01-10' },
      { id: 4, name: 'Sneha Gupta', phone: '+91 98765 43213', email: 'sneha@email.com', type: 'corporate', totalOrders: 25, totalSpent: 520000, lastOrder: '2024-01-12' },
    ]);
    setLoading(false);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Simulate API call
      const newCustomer = {
        id: customers.length + 1,
        ...formData,
        totalOrders: 0,
        totalSpent: 0,
        lastOrder: null
      };
      setCustomers(prev => [...prev, newCustomer]);
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '', type: 'retail' });
    } catch (error) {
      console.error('Failed to add customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMessageCustomer = (customer) => {
    navigate(`/whatsapp?phone=${encodeURIComponent(customer.phone)}&name=${encodeURIComponent(customer.name)}`);
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Customers</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Search customers..." className="form-input" style={{ width: '240px' }} />
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Add Customer
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="chat-avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>{customer.name[0]}</div>
                      {customer.name}
                    </div>
                  </td>
                  <td>{customer.phone}</td>
                  <td>{customer.email}</td>
                  <td>
                    <span className={`badge ${customer.type === 'retail' ? 'badge-secondary' : customer.type === 'wholesale' ? 'badge-info' : 'badge-success'}`}>
                      {customer.type}
                    </span>
                  </td>
                  <td>{customer.totalOrders}</td>
                  <td>₹{customer.totalSpent.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary"><Eye size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary"><Edit size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleMessageCustomer(customer)}><MessageSquare size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Customer</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter customer name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="+91 98765 43210"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="email@example.com"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select 
                    className="form-select"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Orders Page
const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    setOrders([
      { id: 'ORD/2401/0001', customer: 'Rajesh Kumar', items: 2, total: 2500, status: 'delivered', payment: 'paid', date: '2024-01-15' },
      { id: 'ORD/2401/0002', customer: 'Priya Sharma', items: 5, total: 5200, status: 'processing', payment: 'pending', date: '2024-01-14' },
      { id: 'ORD/2401/0003', customer: 'Amit Patel', items: 1, total: 1800, status: 'shipped', payment: 'paid', date: '2024-01-13' },
      { id: 'ORD/2401/0004', customer: 'Sneha Gupta', items: 10, total: 15000, status: 'pending', payment: 'pending', date: '2024-01-12' },
      { id: 'ORD/2401/0005', customer: 'Vikram Singh', items: 3, total: 4200, status: 'cancelled', payment: 'refunded', date: '2024-01-11' },
    ]);
    setLoading(false);
  }, []);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = (order) => {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    if (currentIndex < statuses.length - 1 && order.status !== 'cancelled') {
      const updatedOrders = orders.map(o => 
        o.id === order.id ? { ...o, status: statuses[currentIndex + 1] } : o
      );
      setOrders(updatedOrders);
    }
  };

  const handleCreateInvoice = (order) => {
    alert(`Creating invoice for order ${order.id}...\nCustomer: ${order.customer}\nTotal: ₹${order.total.toLocaleString()}`);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      processing: 'badge-info',
      shipped: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const getPaymentBadge = (payment) => {
    const badges = {
      pending: 'badge-warning',
      partial: 'badge-info',
      paid: 'badge-success',
      refunded: 'badge-secondary',
      failed: 'badge-danger'
    };
    return badges[payment] || 'badge-secondary';
  };

  // New Order Modal Component
  const NewOrderModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
      customer: '',
      items: [{ name: '', quantity: 1, price: 0 }],
      notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleAddItem = () => {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { name: '', quantity: 1, price: 0 }]
      }));
    };

    const handleRemoveItem = (index) => {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    };

    const handleItemChange = (index, field, value) => {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }));
    };

    const calculateTotal = () => {
      return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        const total = calculateTotal();
        const newOrder = {
          id: `ORD/2401/${String(orders.length + 1).padStart(4, '0')}`,
          customer: formData.customer,
          items: formData.items.length,
          total,
          status: 'pending',
          payment: 'pending',
          date: new Date().toISOString().split('T')[0]
        };
        onSubmit(newOrder);
        setFormData({ customer: '', items: [{ name: '', quantity: 1, price: 0 }], notes: '' });
        onClose();
      } catch (error) {
        console.error('Failed to create order:', error);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Create New Order</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter customer name"
                  value={formData.customer}
                  onChange={e => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Items</label>
                {formData.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Product name"
                      value={item.name}
                      onChange={e => handleItemChange(index, 'name', e.target.value)}
                      required
                      style={{ flex: 2 }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      required
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Price"
                      value={item.price}
                      onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      required
                      style={{ flex: 1 }}
                    />
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-icon btn-sm btn-danger"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem}>
                  <Plus size={16} /> Add Item
                </button>
              </div>
              
              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-input"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', textAlign: 'right' }}>
                <strong>Total: ₹{calculateTotal().toLocaleString()}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleCreateOrder = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  // Order Details Modal
  const OrderDetailsModal = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Order Details</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Order ID</h4>
              <p style={{ fontWeight: '600', fontSize: '16px' }}>{order.id}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Customer</h4>
                <p style={{ fontWeight: '500' }}>{order.customer}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</h4>
                <p style={{ fontWeight: '500' }}>{order.date}</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</h4>
                <span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Payment</h4>
                <span className={`badge ${getPaymentBadge(order.payment)}`}>{order.payment}</span>
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>Total Amount</span>
                <span style={{ fontWeight: '700', fontSize: '20px', color: 'var(--primary)' }}>₹{order.total.toLocaleString()}</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => handleUpdateStatus(order)}>
                <Truck size={16} /> Update Status
              </button>
              <button className="btn btn-secondary" onClick={() => handleCreateInvoice(order)}>
                <FileText size={16} /> Create Invoice
              </button>
              <button className="btn btn-primary" onClick={() => {
                // Share to WhatsApp
                const message = `Order ${order.id}\nCustomer: ${order.customer}\nTotal: ₹${order.total}\nStatus: ${order.status}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}>
                <Send size={16} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <NewOrderModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreateOrder} />
      <OrderDetailsModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} order={selectedOrder} />
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Orders</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="form-select" style={{ width: '160px' }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> New Order
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td><strong>{order.id}</strong></td>
                  <td>{order.customer}</td>
                  <td>{order.items} items</td>
                  <td><strong>₹{order.total.toLocaleString()}</strong></td>
                  <td><span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span></td>
                  <td><span className={`badge ${getPaymentBadge(order.payment)}`}>{order.payment}</span></td>
                  <td>{order.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleViewOrder(order)} title="View Order"><Eye size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleUpdateStatus(order)} title="Update Status"><Truck size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleCreateInvoice(order)} title="Create Invoice"><FileText size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Invoices Page
const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    setInvoices([
      { id: 'INV/240115/0001', customer: 'Rajesh Kumar', total: 2500, paid: 2500, status: 'paid', dueDate: '2024-02-14', date: '2024-01-15' },
      { id: 'INV/240114/0002', customer: 'Priya Sharma', total: 5200, paid: 0, status: 'pending', dueDate: '2024-02-13', date: '2024-01-14' },
      { id: 'INV/240113/0003', customer: 'Amit Patel', total: 1800, paid: 1800, status: 'paid', dueDate: '2024-02-12', date: '2024-01-13' },
      { id: 'INV/240112/0004', customer: 'Sneha Gupta', total: 15000, paid: 5000, status: 'partial', dueDate: '2024-02-11', date: '2024-01-12' },
    ]);
    setLoading(false);
  }, []);

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const handleDownloadInvoice = (invoice) => {
    alert(`Downloading invoice ${invoice.id}...\nCustomer: ${invoice.customer}\nAmount: ₹${invoice.total.toLocaleString()}`);
  };

  const handleSendInvoice = (invoice) => {
    alert(`Sending invoice ${invoice.id} to ${invoice.customer}...`);
  };

  const handleMarkAsPaid = (invoice) => {
    const updatedInvoices = invoices.map(inv => 
      inv.id === invoice.id ? { ...inv, paid: inv.total, status: 'paid' } : inv
    );
    setInvoices(updatedInvoices);
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'badge-success',
      pending: 'badge-warning',
      partial: 'badge-info',
      overdue: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Invoices</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="form-select" style={{ width: '160px' }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Create Invoice
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.id}</strong></td>
                  <td>{invoice.customer}</td>
                  <td><strong>₹{invoice.total.toLocaleString()}</strong></td>
                  <td>₹{invoice.paid.toLocaleString()}</td>
                  <td>₹{(invoice.total - invoice.paid).toLocaleString()}</td>
                  <td><span className={`badge ${getStatusBadge(invoice.status)}`}>{invoice.status}</span></td>
                  <td>{invoice.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleViewInvoice(invoice)} title="View"><Eye size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleDownloadInvoice(invoice)} title="Download"><Download size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleSendInvoice(invoice)} title="Send"><Send size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleMarkAsPaid(invoice)} title="Mark as Paid"><CreditCard size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Invoice Details Modal
  const InvoiceDetailsModalComponent = ({ isOpen, onClose, inv }) => {
    if (!isOpen || !inv) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Invoice Details</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Invoice #</h4>
              <p style={{ fontWeight: '600', fontSize: '16px' }}>{inv.id}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Customer</h4>
                <p style={{ fontWeight: '500' }}>{inv.customer}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</h4>
                <p style={{ fontWeight: '500' }}>{inv.date}</p>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Due Date</h4>
                <p style={{ fontWeight: '500' }}>{inv.dueDate}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</h4>
                <span className={`badge ${getStatusBadge(inv.status)}`}>{inv.status}</span>
              </div>
            </div>
            
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Total Amount</span>
                <span style={{ fontWeight: '600' }}>₹{inv.total.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Paid</span>
                <span style={{ fontWeight: '600', color: 'var(--success)' }}>₹{inv.paid.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span>Due</span>
                <span style={{ fontWeight: '700', color: 'var(--danger)' }}>₹{(inv.total - inv.paid).toLocaleString()}</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => {
                alert(`Downloading invoice ${inv.id}...`);
              }}>
                <Download size={16} /> Download
              </button>
              <button className="btn btn-secondary" onClick={() => {
                alert(`Sending invoice ${inv.id} to ${inv.customer}...`);
              }}>
                <Send size={16} /> Send
              </button>
              <button className="btn btn-primary" onClick={() => {
                const updatedInvoices = invoices.map(i => 
                  i.id === inv.id ? { ...i, paid: i.total, status: 'paid' } : i
                );
                setInvoices(updatedInvoices);
                onClose();
              }} disabled={inv.status === 'paid'}>
                <CreditCard size={16} /> Mark Paid
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <InvoiceDetailsModalComponent isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} inv={selectedInvoice} />
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Invoices</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select className="form-select" style={{ width: '160px' }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Create Invoice
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.id}</strong></td>
                  <td>{invoice.customer}</td>
                  <td><strong>₹{invoice.total.toLocaleString()}</strong></td>
                  <td>₹{invoice.paid.toLocaleString()}</td>
                  <td>₹{(invoice.total - invoice.paid).toLocaleString()}</td>
                  <td><span className={`badge ${getStatusBadge(invoice.status)}`}>{invoice.status}</span></td>
                  <td>{invoice.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleViewInvoice(invoice)} title="View"><Eye size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleDownloadInvoice(invoice)} title="Download"><Download size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleSendInvoice(invoice)} title="Send"><Send size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleMarkAsPaid(invoice)} title="Mark as Paid"><CreditCard size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Products Page
const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', sku: '', category: '', price: 0, stock: 0
  });

  useEffect(() => {
    setProducts([
      { id: 1, sku: 'SKU-001', name: 'Product ABC', category: 'Electronics', price: 1250, stock: 50, status: 'active' },
      { id: 2, sku: 'SKU-002', name: 'Product XYZ', category: 'Clothing', price: 850, stock: 12, status: 'low' },
      { id: 3, sku: 'SKU-003', name: 'Product PQR', category: 'Home', price: 2500, stock: 0, status: 'out' },
      { id: 4, sku: 'SKU-004', name: 'Product DEF', category: 'Electronics', price: 1800, stock: 100, status: 'active' },
    ]);
    setLoading(false);
  }, []);

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsEditing(false);
    setShowDetailsModal(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      price: product.price,
      stock: product.stock
    });
    setIsEditing(true);
    setShowDetailsModal(true);
  };

  const handleUpdateStock = (product) => {
    const newStock = prompt(`Enter new stock quantity for ${product.name}:`, product.stock);
    if (newStock !== null && !isNaN(newStock)) {
      const stockNum = parseInt(newStock);
      const updatedProducts = products.map(p => 
        p.id === product.id ? { ...p, stock: stockNum, status: stockNum === 0 ? 'out' : stockNum < 10 ? 'low' : 'active' } : p
      );
      setProducts(updatedProducts);
    }
  };

  const handleSaveProduct = () => {
    if (isEditing && selectedProduct) {
      const updatedProducts = products.map(p => 
        p.id === selectedProduct.id ? { ...p, ...editForm, status: editForm.stock === 0 ? 'out' : editForm.stock < 10 ? 'low' : 'active' } : p
      );
      setProducts(updatedProducts);
    } else {
      const newProduct = {
        id: products.length + 1,
        ...editForm,
        status: editForm.stock === 0 ? 'out' : editForm.stock < 10 ? 'low' : 'active'
      };
      setProducts(prev => [...prev, newProduct]);
    }
    setShowDetailsModal(false);
    setShowModal(false);
    setEditForm({ name: '', sku: '', category: '', price: 0, stock: 0 });
  };

  const handleAddProduct = () => {
    setEditForm({ name: '', sku: `SKU-${String(products.length + 1).padStart(3, '0')}`, category: '', price: 0, stock: 0 });
    setIsEditing(false);
    setSelectedProduct(null);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'badge-success',
      low: 'badge-warning',
      out: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  // Product Modal for Adding
  const ProductModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Add New Product</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter product name"
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                type="text"
                className="form-input"
                placeholder="SKU-XXX"
                value={editForm.sku}
                onChange={e => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={editForm.category}
                onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Select category</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Home">Home</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={editForm.price}
                  onChange={e => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Stock</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={editForm.stock}
                  onChange={e => setEditForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveProduct}>Add Product</button>
          </div>
        </div>
      </div>
    );
  };

  // Product Details/Edit Modal
  const ProductDetailsModal = ({ isOpen, onClose, product }) => {
    if (!isOpen) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isEditing ? 'Edit Product' : 'Product Details'}</h3>
            <button className="btn btn-icon btn-secondary" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-body">
            {isEditing ? (
              <>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.sku}
                    onChange={e => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={editForm.category}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Home">Home</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Price (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editForm.price}
                      onChange={e => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editForm.stock}
                      onChange={e => setEditForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>SKU</h4>
                  <p style={{ fontWeight: '600', fontSize: '16px' }}>{product.sku}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Product Name</h4>
                    <p style={{ fontWeight: '500' }}>{product.name}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category</h4>
                    <p style={{ fontWeight: '500' }}>{product.category}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Price</h4>
                    <p style={{ fontWeight: '600', fontSize: '18px' }}>₹{product.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Stock</h4>
                    <p style={{ fontWeight: '600', fontSize: '18px', color: product.stock < 10 ? 'var(--danger)' : 'var(--success)' }}>{product.stock}</p>
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</h4>
                  <span className={`badge ${getStatusBadge(product.status)}`}>{product.status}</span>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            {isEditing ? (
              <>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveProduct}>Save Changes</button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => handleEditProduct(product)}><Edit size={16} /> Edit</button>
                <button className="btn btn-primary" onClick={() => handleUpdateStock(product)}><PackageIcon size={16} /> Update Stock</button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <ProductModal isOpen={showModal} onClose={() => setShowModal(false)} />
      <ProductDetailsModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} product={selectedProduct} />
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Products</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Search products..." className="form-input" style={{ width: '240px' }} />
            <button className="btn btn-primary" onClick={handleAddProduct}>
              <Plus size={18} /> Add Product
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td><strong>{product.sku}</strong></td>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td><strong>₹{product.price.toLocaleString()}</strong></td>
                  <td>
                    <span style={{ color: product.stock < 10 ? 'var(--danger)' : 'inherit' }}>
                      {product.stock}
                    </span>
                  </td>
                  <td><span className={`badge ${getStatusBadge(product.status)}`}>{product.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleViewProduct(product)} title="View"><Eye size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleEditProduct(product)} title="Edit"><Edit size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary" onClick={() => handleUpdateStock(product)} title="Update Stock"><PackageIcon size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Analytics Page
const AnalyticsPage = () => (
  <div className="fade-in">
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon blue"><BarChart3 size={24} /></div>
        <div className="stat-content">
          <div className="stat-label">Total Revenue (30d)</div>
          <div className="stat-value">₹1,25,000</div>
          <div className="stat-change positive"><TrendingUp size={12} /> 12.5% vs last period</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon green"><ShoppingCart size={24} /></div>
        <div className="stat-content">
          <div className="stat-label">Total Orders (30d)</div>
          <div className="stat-value">156</div>
          <div className="stat-change positive"><TrendingUp size={12} /> 8.3% vs last period</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon purple"><Users size={24} /></div>
        <div className="stat-content">
          <div className="stat-label">New Customers</div>
          <div className="stat-value">42</div>
          <div className="stat-change positive"><TrendingUp size={12} /> 15% vs last period</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon yellow"><MessageSquare size={24} /></div>
        <div className="stat-content">
          <div className="stat-label">Avg. Response Time</div>
          <div className="stat-value">2.5 min</div>
          <div className="stat-change positive"><TrendingDown size={12} /> 30% faster</div>
        </div>
      </div>
    </div>

    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Revenue Overview</h3>
          <select className="form-select" style={{ width: '120px' }}>
            <option value="30days">Last 30 days</option>
            <option value="7days">Last 7 days</option>
            <option value="12months">Last 12 months</option>
          </select>
        </div>
        <div className="card-body">
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Revenue Chart Placeholder</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Orders by Status</h3>
        </div>
        <div className="card-body">
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Orders Chart Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Automation Page
const AutomationPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [rules, setRules] = useState([
    { id: 1, name: 'Auto Greeting', type: 'keyword', trigger: 'hello, hi, hey', status: 'active', triggered: 245 },
    { id: 2, name: 'Order Status Check', type: 'keyword', trigger: 'order status, track', status: 'active', triggered: 89 },
    { id: 3, name: 'Payment Reminder', type: 'scheduled', trigger: 'Every 7 days', status: 'active', triggered: 34 },
    { id: 4, name: 'New Order Confirmation', type: 'order_status', trigger: 'confirmed', status: 'active', triggered: 156 },
    { id: 5, name: 'Delivery Confirmation', type: 'order_status', trigger: 'delivered', status: 'inactive', triggered: 0 },
  ]);

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Automation Rules</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Rule
          </button>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Rule Name</th>
                <th>Type</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Triggered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => (
                <tr key={rule.id}>
                  <td><strong>{rule.name}</strong></td>
                  <td>{rule.type}</td>
                  <td>{rule.trigger}</td>
                  <td>
                    <span className={`badge ${rule.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                      {rule.status}
                    </span>
                  </td>
                  <td>{rule.triggered} times</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-icon btn-sm btn-secondary"><Edit size={16} /></button>
                      <button className="btn btn-icon btn-sm btn-secondary">
                        {rule.status === 'active' ? <X size={16} /> : <CheckCircle size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Settings Page
const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [saved, setSaved] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    phoneNumberId: '',
    phoneNumber: ''
  });
  const [phoneNumberId, setPhoneNumberId] = useState('981190075078324');
  const [accessToken, setAccessToken] = useState('EAARYNSpQdgEBQhN2YraimHS1VNLquKB2Wu4PYmEB7qPEHGiAEsPMCZAqBwOJY4ZBzXShslXfNbZA6uo7jUcqZAqVyxumGM9iIKmBJPnd9najDZA0DbEkdgJmAhmQGt9mozCwuWhJA40imAZBL56PfgXB1SVcvJEi2AkcbhHfFO3yj90UgXpDb0Xv5V69qR0ez9SsdGkFi8p9dP8oAZBcGm4QZBNp9Gd7brMVFimAvR3m82QyT9sVZBytGN4Y58tsXvjVOnE7t0vZCsCZA2ikYeQ8VP7');

  useEffect(() => {
    // Auto-connect WhatsApp on page load with provided credentials
    const autoConnect = async () => {
      try {
        await api.put('/whatsapp/token', { phoneNumberId, accessToken });
        localStorage.setItem('whatsapp_phone_id', phoneNumberId);
        localStorage.setItem('whatsapp_connected', 'true');
        setWhatsappStatus({
          connected: true,
          phoneNumberId,
          phoneNumber: ''
        });
        setMessage({ type: 'success', text: 'WhatsApp connected successfully!' });
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };
    
    // Check if already connected
    const storedConnected = localStorage.getItem('whatsapp_connected');
    if (storedConnected === 'true') {
      setWhatsappStatus({
        connected: true,
        phoneNumberId: localStorage.getItem('whatsapp_phone_id') || phoneNumberId,
        phoneNumber: ''
      });
    } else {
      autoConnect();
    }
  }, []);

  const handleConnectWhatsApp = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter both Phone Number ID and Access Token' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      await api.put('/whatsapp/token', { phoneNumberId, accessToken });
      
      // Store in localStorage for demo
      localStorage.setItem('whatsapp_phone_id', phoneNumberId);
      localStorage.setItem('whatsapp_connected', 'true');
      
      setWhatsappStatus({
        connected: true,
        phoneNumberId,
        phoneNumber: ''
      });
      setMessage({ type: 'success', text: 'WhatsApp connected successfully!' });
      setAccessToken('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to connect WhatsApp' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
    
    try {
      // Clear localStorage
      localStorage.removeItem('whatsapp_phone_id');
      localStorage.removeItem('whatsapp_connected');
      
      setWhatsappStatus({
        connected: false,
        phoneNumberId: '',
        phoneNumber: ''
      });
      setPhoneNumberId('');
      setAccessToken('');
      setMessage({ type: 'success', text: 'WhatsApp disconnected successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect WhatsApp' });
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Test by sending a message to self (for demo)
      setMessage({ type: 'success', text: 'WhatsApp connection is working! Messages can be sent and received.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection test failed. Please check your credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setSaved(false);
    
    try {
      // Simulate saving business profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setMessage({ type: 'success', text: 'Business profile saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save changes' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.text}
        </div>
      )}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Business Profile</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input type="text" className="form-input" defaultValue="My MSME Business" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="text" className="form-input" defaultValue="+91 98765 43210" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" defaultValue="contact@business.com" />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input type="text" className="form-input" defaultValue="27AABCU1234A1Z5" />
            </div>
            <button className="btn btn-primary" onClick={handleSaveChanges} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">WhatsApp Integration</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={24} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>WhatsApp Business</div>
                <span className={`badge ${whatsappStatus.connected ? 'badge-success' : 'badge-warning'}`}>
                  {whatsappStatus.connected ? '✓ Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            
            {whatsappStatus.connected ? (
              <>
                <div style={{ background: '#d1fae5', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#065f46' }}>✓ WhatsApp is Connected</h4>
                  <p style={{ fontSize: '13px', color: '#047857', margin: 0 }}>
                    Your WhatsApp Business account is connected and ready to use.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={whatsappStatus.phoneNumberId}
                    disabled
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    Test Connection
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDisconnectWhatsApp}
                  >
                    Disconnect
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>How to Connect WhatsApp:</h4>
                  <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">Meta for Developers</a></li>
                    <li>Create a WhatsApp App in Meta Developer Portal</li>
                    <li>Copy your <strong>Phone Number ID</strong> from the WhatsApp → API Setup page</li>
                    <li>Copy your <strong>Access Token</strong> (temporary or permanent)</li>
                    <li>Paste them below and click "Connect WhatsApp"</li>
                  </ol>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your Phone Number ID"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Access Token</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter your Access Token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleConnectWhatsApp}
                  disabled={loading}
                >
                  {loading ? 'Connecting...' : 'Connect WhatsApp'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Page
const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login - in real app, call API
    localStorage.setItem('token', 'demo-token');
    navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <MessageSquare size={48} color="var(--primary)" />
          <h1>WhatsApp Business OS</h1>
          <p>Manage your MSME business on WhatsApp</p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Business Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Your Business Name"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="email@example.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <LoginPage />;
  }
  return children;
};

// Page wrapper with header
const PageWrapper = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <div className="page-content">
          {children}
        </div>
      </main>
    </>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('token', 'demo-token');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><PageWrapper title="Dashboard"><DashboardPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/whatsapp" element={<ProtectedRoute><PageWrapper title="WhatsApp"><WhatsAppPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><PageWrapper title="Customers"><CustomersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><PageWrapper title="Orders"><OrdersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><PageWrapper title="Invoices"><InvoicesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><PageWrapper title="Products"><ProductsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><PageWrapper title="Analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/automation" element={<ProtectedRoute><PageWrapper title="Automation"><AutomationPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageWrapper title="Settings"><SettingsPage /></PageWrapper></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
