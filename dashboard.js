/* ============================================================
   SPEEDY DELIVERY – User Dashboard Script
   ============================================================ */

'use strict';

const STORAGE_KEY = 'speedyDeliveryOrders';
const USER_STORAGE_KEY = 'speedyCurrentUser';
const CHAT_STORAGE_KEY = 'speedyChatMessages';
const USERS_KEY = 'speedyUsers';

let orders = new Map();
let currentUser = null;
let chatMessages = [];

// ---- AUTH FUNCTIONS ----
function toggleAuth(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');

  if (!email || !pass) {
    showAuthError(errEl, 'Please fill in all fields.');
    return;
  }

  // Pull the shared account list first — this device may never have
  // signed this user up locally if they registered on another device.
  if (typeof speedyKvPull === 'function') await speedyKvPull(USERS_KEY);

  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find(u => u.email === email && u.password === pass);

  if (!user) {
    showAuthError(errEl, 'Invalid email or password.');
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  currentUser = user;
  showDashboard();
}

async function handleRegister() {
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPassword').value;
  const errEl = document.getElementById('registerError');

  if (!name || !phone || !email || !pass) {
    showAuthError(errEl, 'Please fill in all fields.');
    return;
  }
  if (pass.length < 6) {
    showAuthError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  if (typeof speedyKvPull === 'function') await speedyKvPull(USERS_KEY);
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (users.find(u => u.email === email)) {
    showAuthError(errEl, 'Email already registered.');
    return;
  }

  const newUser = { id: 'u_' + Date.now(), name, phone, email, password: pass };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  if (typeof speedyKvPush === 'function') speedyKvPush(USERS_KEY, users);
  currentUser = newUser;
  showDashboard();
}

function showAuthError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function showDashboard() {
  const authGate = document.getElementById('authGate');
  const dashboardApp = document.getElementById('dashboardApp');
  if (authGate) authGate.style.display = 'none';
  if (dashboardApp) dashboardApp.style.display = 'block';
  updateUserDisplay();
  initDashboard();
  loadChatMessages();
  initChat();
}

// ---- MOBILE MENU ----
function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
        navLinks.classList.remove('open');
        const icon = toggle.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-times');
        }
      }
    });
  }
}

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initMobileMenu();
});

function checkAuth() {
  currentUser = JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
  if (!currentUser) {
    // Show auth gate instead of redirecting
    const authGate = document.getElementById('authGate');
    const dashboardApp = document.getElementById('dashboardApp');
    if (authGate) authGate.style.display = 'flex';
    if (dashboardApp) dashboardApp.style.display = 'none';
    return;
  }
  // Hide auth gate and show dashboard
  const authGate = document.getElementById('authGate');
  const dashboardApp = document.getElementById('dashboardApp');
  if (authGate) authGate.style.display = 'none';
  if (dashboardApp) dashboardApp.style.display = 'block';
  updateUserDisplay();
  initDashboard();
  loadChatMessages();
  initChat();
}

function updateUserDisplay() {
  if (currentUser) {
    const name = currentUser.name || 'User';
    document.getElementById('userNameDisplay').textContent = name.split(' ')[0];
    document.getElementById('dashboardUserName').textContent = name;
  }
}

// ---- DASHBOARD TABS ----
function initDashboard() {
  const tabs = document.querySelectorAll('.sd-dash-tab');
  const contents = document.querySelectorAll('.sd-dash-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(targetTab + '-tab').classList.add('active');
      
      // Load content based on tab
      if (targetTab === 'stores') {
        loadStores();
      } else if (targetTab === 'orders') {
        loadUserOrders();
      }
    });
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem(USER_STORAGE_KEY);
      currentUser = null;
      const authGate = document.getElementById('authGate');
      const dashboardApp = document.getElementById('dashboardApp');
      if (authGate) authGate.style.display = 'flex';
      if (dashboardApp) dashboardApp.style.display = 'none';
    }
  });

  // Load initial content
  loadStores();
  updateUserStats();
}

// ---- STORES ----
function loadStores() {
  const list = document.getElementById('store-list');
  const loading = document.getElementById('stores-loading');
  const quickSelect = document.getElementById('quick-store-select');
  
  if (!list || !loading) return;

  loading.style.display = 'block';
  list.style.display = 'none';

  setTimeout(() => {
    list.innerHTML = STORES.map(s => `
      <div class="col-lg-6 col-md-6">
        <div class="sd-store-card h-100" onclick="selectStore('${s.id}')" style="--store-color:${s.color};">
          <span class="sd-store-icon">${s.icon}</span>
          <div class="sd-store-name">${s.name}</div>
          <div class="sd-store-type">${s.type}</div>
          <div class="sd-store-desc">${s.desc}</div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="sd-store-rating">
              <i class="fas fa-star"></i> ${s.rating}
            </div>
            <button class="sd-btn sd-btn-primary sd-btn-sm" onclick="event.stopPropagation();selectStore('${s.id}')">
              Order Now
            </button>
          </div>
        </div>
      </div>
    `).join('');

    // Populate quick order dropdown
    if (quickSelect) {
      quickSelect.innerHTML = '<option value="">Choose a store...</option>';
      STORES.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.icon} ${s.name}`;
        quickSelect.appendChild(opt);
      });
    }

    loading.style.display = 'none';
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
  }, 600);
}

window.selectStore = function(id) {
  const sel = document.getElementById('quick-store-select');
  if (sel) {
    sel.value = id;
    sel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sel.focus();
  }
};

// ---- QUICK ORDER ----
document.getElementById('quick-order-form')?.addEventListener('submit', handleQuickOrder);

function handleQuickOrder(e) {
  e.preventDefault();

  const storeId = document.getElementById('quick-store-select').value;
  const itemsRaw = document.getElementById('quick-items').value;
  const address = document.getElementById('quick-address').value;

  if (!storeId || !itemsRaw || !address) {
    showAlert('Please fill in all fields.', 'warning');
    return;
  }

  const store = STORES.find(s => s.id === storeId);
  const items = itemsRaw.split('\n').map(i => i.trim()).filter(Boolean);
  const ref = genRef();

  const order = {
    referenceNumber: ref,
    customerName: currentUser.name,
    customerPhone: currentUser.phone,
    customerEmail: currentUser.email,
    customerAddress: address,
    storeId,
    storeName: store?.name || '',
    items,
    status: 'Order Placed and Received',
    timestamp: new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 30 * 60000).toISOString(),
    userId: currentUser.id
  };

  orders.set(ref, order);
  saveOrders();
  updateUserStats();

  showAlert('Order placed successfully! Reference: ' + ref, 'success');
  e.target.reset();

  // Switch to orders tab
  setTimeout(() => {
    document.querySelector('.sd-dash-tab[data-tab="orders"]').click();
  }, 1500);
}

// ---- USER ORDERS ----
function loadUserOrders() {
  const list = document.getElementById('orders-list');
  const loading = document.getElementById('orders-loading');
  
  if (!list || !loading) return;

  loading.style.display = 'block';
  list.style.display = 'none';

  loadOrders();

  setTimeout(() => {
    const userOrders = Array.from(orders.values())
      .filter(o => o.userId === currentUser.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (userOrders.length === 0) {
      list.innerHTML = `
        <div class="col-12">
          <div class="text-center py-5">
            <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
            <h5 class="text-muted">No orders yet</h5>
            <p class="text-muted">Start by placing an order from our stores!</p>
            <button class="sd-btn sd-btn-primary" onclick="document.querySelector('.sd-dash-tab[data-tab=\"stores\"]').click()">
              Browse Stores
            </button>
          </div>
        </div>
      `;
    } else {
      list.innerHTML = userOrders.map(order => `
        <div class="col-lg-6 col-md-6">
          <div class="sd-order-history-card">
            <div class="sd-order-history-header">
              <div>
                <span class="sd-order-ref">${order.referenceNumber}</span>
                <small class="text-muted d-block mt-1">${new Date(order.timestamp).toLocaleString()}</small>
              </div>
              <span class="sd-status-badge ${statusClass(order.status)}">
                <i class="fas ${statusIcon(order.status)}"></i>
                ${order.status}
              </span>
            </div>
            <div class="mb-3">
              <small class="text-muted">Store</small>
              <div class="fw-600">${order.storeName}</div>
            </div>
            <div class="mb-3">
              <small class="text-muted">Items</small>
              <div class="fw-600">${order.items?.join(', ') || '—'}</div>
            </div>
            <div class="d-flex gap-2 mt-3">
              <button class="sd-btn sd-btn-sm sd-btn-primary" onclick="trackOrder('${order.referenceNumber}')">
                <i class="fas fa-map-marker-alt me-1"></i>Track
              </button>
              ${order.status !== 'Delivered' ? `
                <button class="sd-btn sd-btn-sm sd-btn-outline" onclick="cancelOrder('${order.referenceNumber}')">
                  <i class="fas fa-times me-1"></i>Cancel
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }

    loading.style.display = 'none';
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
  }, 600);
}

window.trackOrder = function(ref) {
  document.querySelector('.sd-dash-tab[data-tab="track"]').click();
  document.getElementById('track-input').value = ref;
  handleTrackOrder();
};

window.cancelOrder = function(ref) {
  if (confirm('Are you sure you want to cancel this order?')) {
    const order = orders.get(ref);
    if (order) {
      order.status = 'Cancelled';
      orders.set(ref, order);
      saveOrders();
      loadUserOrders();
      updateUserStats();
      showAlert('Order cancelled successfully.', 'success');
    }
  }
};

// ---- TRACKING ----
document.getElementById('track-btn')?.addEventListener('click', handleTrackOrder);
document.getElementById('track-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleTrackOrder();
});

function handleTrackOrder() {
  const inp = document.getElementById('track-input');
  const resultEl = document.getElementById('track-result');
  const ref = inp?.value.trim().toUpperCase();

  if (!ref) {
    showAlert('Please enter a reference number.', 'warning');
    return;
  }

  loadOrders();

  if (!orders.has(ref)) {
    resultEl.innerHTML = `
      <div class="sd-alert sd-alert-danger text-center">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Order not found.</strong> Please check your reference number.
      </div>
    `;
    return;
  }

  renderTrackResult(ref);
}

// ---- USER STATS ----
function updateUserStats() {
  loadOrders();
  const userOrders = Array.from(orders.values()).filter(o => o.userId === currentUser?.id);
  const activeOrders = userOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  
  document.getElementById('totalOrders').textContent = userOrders.length;
  document.getElementById('activeOrders').textContent = activeOrders.length;
}

// ---- CHAT ----
function loadChatMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    chatMessages = raw ? JSON.parse(raw) : [];
  } catch(e) {
    chatMessages = [];
  }
}

function saveChatMessages() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages));
  } catch(e) {
    console.warn('Could not save chat messages', e);
  }
}

function initChat() {
  const sendBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');

  sendBtn?.addEventListener('click', sendChatMessage);
  chatInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChatMessage();
  });

  renderChatMessages();
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input?.value.trim();

  if (!message) return;

  // Add user message
  chatMessages.push({
    id: Date.now(),
    type: 'user',
    message,
    timestamp: new Date().toISOString(),
    userId: currentUser?.id
  });

  input.value = '';
  saveChatMessages();
  renderChatMessages();

  // Simulate support response
  setTimeout(() => {
    const responses = [
      "Thank you for your message! Our team will assist you shortly.",
      "I understand. Let me check that for you right away.",
      "Thanks for reaching out! How can I help you with your order?",
      "I'm here to help! Could you provide more details?",
      "Got it! I'll look into this immediately."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    chatMessages.push({
      id: Date.now(),
      type: 'support',
      message: randomResponse,
      timestamp: new Date().toISOString()
    });
    
    saveChatMessages();
    renderChatMessages();
  }, 1500);
}

function renderChatMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  container.innerHTML = chatMessages.map(msg => {
    const isUser = msg.type === 'user';
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="sd-chat-message ${isUser ? 'sd-chat-message-user' : 'sd-chat-message-support'}">
        <div class="sd-message-content">
          <p>${msg.message}</p>
          <small class="sd-message-time">${time}</small>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// ---- SHARED FUNCTIONS ----
function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    orders.clear();
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) orders.set(k, v);
    }
  } catch(e) {
    console.warn('loadOrders error', e);
  }
  if (typeof speedySyncOrders === 'function') speedySyncOrders();
}

function saveOrders() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(orders)));
    // Push to cloud for real-time sync across all devices
    if (window.speedySync && typeof window.speedySync.syncOrders === 'function') {
      window.speedySync.syncOrders();
    }
  } catch(e) {
    console.warn('Could not save orders', e);
  }
}

function genRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `SPD-${r}`;
}

function showAlert(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.innerHTML = `<div class="sd-alert sd-alert-${type}">${msg}</div>`;
  toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9990;min-width:300px;max-width:400px;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function statusClass(status) {
  if (!status) return 'sb-default';
  const s = status.toLowerCase();
  if (s.includes('placed') || s.includes('received')) return 'sb-new';
  if (s.includes('way to store') || s.includes('assigned')) return 'sb-enroute';
  if (s.includes('at the store') || s.includes('shopping')) return 'sb-shopping';
  if (s.includes('way to customer') || s.includes('on the way')) return 'sb-otw';
  if (s.includes('delivered')) return 'sb-done';
  if (s.includes('cancelled')) return 'sb-default';
  return 'sb-default';
}

function statusIcon(status) {
  if (!status) return 'fa-circle';
  const s = status.toLowerCase();
  if (s.includes('placed')) return 'fa-receipt';
  if (s.includes('assigned')) return 'fa-user-check';
  if (s.includes('way to store')) return 'fa-route';
  if (s.includes('at the store')) return 'fa-store';
  if (s.includes('shopping')) return 'fa-shopping-cart';
  if (s.includes('way to customer')) return 'fa-truck';
  if (s.includes('delivered')) return 'fa-check-double';
  if (s.includes('cancelled')) return 'fa-times';
  return 'fa-circle';
}

// Store data
window.STORES = [
  { id:'1', name:'Wiafesco',            type:'Cosmetics & Beauty',   icon:'💄', color:'#FF6B9D', rating:4.8, desc:'Premium cosmetics, skincare, soaps and perfumes for all your beauty needs.',
    catalog: [
      { id:'w1', name:'Dettol Antibacterial Soap', price:8 },
      { id:'w2', name:'Premier Bathing Soap (3-pack)', price:10 },
      { id:'w3', name:'Vaseline Petroleum Jelly 100ml', price:15 },
      { id:'w4', name:'Nivea Body Lotion 400ml', price:45 },
      { id:'w5', name:'Nivea Roll-on Deodorant', price:18 },
      { id:'w6', name:'Nunu Body Cream', price:25 },
      { id:'w7', name:'Local Perfume Oil (small)', price:20 },
      { id:'w8', name:'Imported Perfume 50ml', price:85 },
      { id:'w9', name:'Kiss Beauty Lip Gloss', price:15 },
      { id:'w10', name:'Face Powder Compact', price:35 },
      { id:'w11', name:'Hair Relaxer Kit', price:40 },
      { id:'w12', name:'Close-Up Toothpaste', price:12 },
    ]},
  { id:'2', name:'Geneviva Lodge',       type:'Hotel & Restaurant',   icon:'🏨', color:'#4ECDC4', rating:4.6, desc:'Comfortable rooms, delicious local cuisine, drinks and catering services.',
    catalog: [
      { id:'g1', name:'Jollof Rice with Chicken', price:35 },
      { id:'g2', name:'Banku with Tilapia', price:40 },
      { id:'g3', name:'Waakye Special', price:30 },
      { id:'g4', name:'Fried Rice with Chicken', price:35 },
      { id:'g5', name:'Fufu with Light Soup', price:35 },
      { id:'g6', name:'Grilled Chicken (whole)', price:60 },
      { id:'g7', name:'Kelewele (small pack)', price:15 },
      { id:'g8', name:'Bottled Water 750ml', price:5 },
      { id:'g9', name:'Soft Drink (Coke/Fanta/Sprite)', price:12 },
      { id:'g10', name:'Malt Drink', price:15 },
      { id:'g11', name:'Breakfast Plate', price:30 },
    ]},
  { id:'3', name:'Maryking Super Market',type:'Grocery & Household',  icon:'🛒', color:'#45B7D1', rating:4.7, desc:'Fresh groceries, household essentials and daily necessities for your home.',
    catalog: [
      { id:'m1', name:'Rice (5kg bag)', price:90 },
      { id:'m2', name:'Cooking Oil 1.5L', price:35 },
      { id:'m3', name:'Sugar 1kg', price:15 },
      { id:'m4', name:'Milo 400g Tin', price:45 },
      { id:'m5', name:'Eggs (crate of 30)', price:55 },
      { id:'m6', name:'Bread (large loaf)', price:15 },
      { id:'m7', name:'Tin Milk (Peak, 400g)', price:18 },
      { id:'m8', name:'Gino Tomato Paste 400g', price:12 },
      { id:'m9', name:'Onions 1kg', price:12 },
      { id:'m10', name:'Fresh Tomatoes 1kg', price:15 },
      { id:'m11', name:'Indomie Noodles (pack of 5)', price:25 },
      { id:'m12', name:'Maggi Cubes (pack)', price:5 },
      { id:'m13', name:'Toilet Roll (4-pack)', price:20 },
    ]},
  { id:'4', name:'Chekin Pizza',         type:'Fast Food & Drinks',   icon:'🍕', color:'#96CEB4', rating:4.5, desc:'Delicious fresh pizzas, burgers, pasta and cold drinks delivered to you.',
    catalog: [
      { id:'c1', name:'Medium Pizza (12")', price:60 },
      { id:'c2', name:'Large Pizza (14")', price:90 },
      { id:'c3', name:'Classic Beef Burger', price:35 },
      { id:'c4', name:'Chicken Burger', price:35 },
      { id:'c5', name:'French Fries (regular)', price:20 },
      { id:'c6', name:'Chicken Wings (6pc)', price:40 },
      { id:'c7', name:'Spaghetti Bolognese', price:35 },
      { id:'c8', name:'Soft Drink (can)', price:12 },
      { id:'c9', name:'Milkshake', price:25 },
    ]},
];

// ---- PRICING CONFIG ----
const DELIVERY_FEE = 20; // flat fee (GHS) — swap for distance-based logic later
const MOMO_INFO = {
  number: '024 000 0000',      // TODO: replace with your real MoMo number
  name: 'Speedy Delivery GH',  // TODO: replace with the registered MoMo account name
  network: 'All Networks (MTN, Telecel, AirtelTigo)'
};
const money = (n) => `₵${Number(n || 0).toFixed(2)}`;

function renderTrackResult(ref) {
  const order = orders.get(ref);
  const resultEl = document.getElementById('track-result');
  if (!order || !resultEl) return;

  const STATUS_STEPS = [
    { label: 'Order Placed & Received', icon: 'fa-receipt' },
    { label: 'Payment Confirmed – Driver Assigned', icon: 'fa-user-check' },
    { label: 'Driver on the Way to Store', icon: 'fa-route' },
    { label: 'At the Store', icon: 'fa-store' },
    { label: 'Shopping', icon: 'fa-shopping-cart' },
    { label: 'On the Way to Customer', icon: 'fa-truck' },
    { label: 'Delivered', icon: 'fa-check-double' },
  ];

  function getStepIndex(status) {
    if (!status) return 0;
    const s = status.toLowerCase();
    if (s.includes('delivered')) return 6;
    if (s.includes('way to customer')) return 5;
    if (s.includes('shopping')) return 4;
    if (s.includes('at the store')) return 3;
    if (s.includes('way to store')) return 2;
    if (s.includes('assigned')) return 1;
    return 0;
  }

  const stepIdx = getStepIndex(order.status);
  const pct = Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100);

  const stepsHtml = STATUS_STEPS.map((step, i) => {
    const isDone = i < stepIdx;
    const isActive = i === stepIdx;
    const cls = isDone ? 'done' : isActive ? 'active' : '';
    const iconCls = isDone ? 'fa-check' : step.icon;
    return `
      <div class="sd-status-step ${cls}">
        <div class="sd-status-step-icon"><i class="fas ${iconCls}"></i></div>
        <span>${step.label}</span>
      </div>`;
  }).join('');

  resultEl.innerHTML = `
    <div class="sd-track-card">
      <div class="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div class="sd-track-title"><i class="fas fa-map-marker-alt me-2 text-brand"></i>Live Order Tracking</div>
          <span class="sd-order-ref">${ref}</span>
        </div>
        <span class="sd-status-badge ${statusClass(order.status)}">
          <i class="fas ${statusIcon(order.status)}"></i>
          ${order.status}
        </span>
      </div>

      <div class="sd-progress-bar mb-1">
        <div class="sd-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="text-end mb-4"><small class="text-muted">${pct}% complete</small></div>

      <div class="sd-status-steps mb-4">
        ${stepsHtml}
      </div>

      <div class="row g-3 pt-3 border-top">
        <div class="col-md-6">
          <small class="text-muted">Customer</small>
          <div class="fw-600">${order.customerName}</div>
        </div>
        <div class="col-md-6">
          <small class="text-muted">Phone</small>
          <div class="fw-600">${order.customerPhone}</div>
        </div>
        <div class="col-12">
          <small class="text-muted">Delivery Address</small>
          <div class="fw-600">${order.customerAddress}</div>
        </div>
        <div class="col-md-6">
          <small class="text-muted">Store</small>
          <div class="fw-600">${order.storeName}</div>
        </div>
        <div class="col-md-6">
          <small class="text-muted">Ordered At</small>
          <div class="fw-600">${new Date(order.timestamp).toLocaleString()}</div>
        </div>
        <div class="col-12">
          <small class="text-muted">Items</small>
          <div class="fw-600">${order.items?.join(', ') || '—'}</div>
        </div>
      </div>
    </div>`;
}

// Store data
const STORES = window.STORES;