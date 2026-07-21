/* =========================================================
   SPEEDY DELIVERY — DRIVER PORTAL JS
   All original logic preserved, updated for new HTML/CSS
   ========================================================= */

'use strict';

let currentOrderRef = null;
let filteredOrders = new Map();
let lastOrderCount = 0;
let isInitialLoad = true;
let activeFilter = '';
let dataIntegrityMonitorInterval = null;

let orders = new Map();

/* ── Stores reference data ──────────────────────────────── */
const STORES = [
  { id:"1", name:"Wiafesco",           type:"Cosmetics Store",       items:["Creams","Soaps","Perfumes","Makeup","Skincare"], icon:"fas fa-spa",            color:"#ff6b6b", rating:4.8 },
  { id:"2", name:"Geneviva Lodge",     type:"Hotel & Restaurant",    items:["Room Booking","Local Meals","Drinks","Breakfast","Catering"], icon:"fas fa-hotel",         color:"#4ecdc4", rating:4.6 },
  { id:"3", name:"Maryking Super Market", type:"Grocery Store",     items:["Milk","Bread","Rice","Fruits","Vegetables","Household Items"], icon:"fas fa-shopping-basket", color:"#45b7d1", rating:4.7 },
  { id:"4", name:"Chekin Pizza",       type:"Fast Food Restaurant",  items:["Pizza","Drinks","Sides","Pasta","Burgers"], icon:"fas fa-pizza-slice",   color:"#96ceb4", rating:4.5 }
];

/* ── Utility ────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

/* ── Storage ────────────────────────────────────────────── */
const loadOrders = () => {
  try {
    const raw = localStorage.getItem('speedyDeliveryOrders');
    if (raw) {
      orders = new Map(Object.entries(JSON.parse(raw)));
      console.log(`📦 Loaded ${orders.size} orders`);
    } else {
      orders = new Map();
    }
  } catch (e) {
    console.error('Error loading orders:', e);
    orders = new Map();
  }
  // Pull the latest from the shared backend in the background — merged
  // into localStorage so the NEXT loadOrders() (this app polls every
  // 1-3s already) picks up orders/updates made on other devices.
  if (typeof speedySyncOrders === 'function') speedySyncOrders();
};

const saveOrders = () => {
  try {
    localStorage.setItem('speedyDeliveryOrders', JSON.stringify(Object.fromEntries(orders)));
    console.log('💾 Orders saved');
    // Push to cloud for real-time sync across all devices
    if (window.speedySync && typeof window.speedySync.syncOrders === 'function') {
      window.speedySync.syncOrders();
    }
  } catch (e) {
    console.error('Error saving orders:', e);
    showNotification('Error saving order. Please try again.', 'error');
  }
};

/* ── Status helpers ─────────────────────────────────────── */
const STATUS_FLOW = [
  'Order Placed and Received',
  'Payment Confirmed - Driver Assigned',
  'Driver on the Way to Store',
  'At the Store',
  'Shopping',
  'On the Way to Customer',
  'Delivered'
];

const STATUS_META = {
  'Order Placed and Received':           { key:'placed',     label:'New Order',      icon:'fa-receipt',        pill:'pill-placed',     accentClass:'placed' },
  'Payment Confirmed - Driver Assigned': { key:'confirmed',  label:'Confirmed',      icon:'fa-check-circle',   pill:'pill-confirmed',  accentClass:'confirmed' },
  'Driver on the Way to Store':          { key:'enroute',    label:'En Route',       icon:'fa-route',          pill:'pill-enroute',    accentClass:'enroute' },
  'At the Store':                        { key:'atstore',    label:'At Store',       icon:'fa-store',          pill:'pill-atstore',    accentClass:'atstore' },
  'Shopping':                            { key:'shopping',   label:'Shopping',       icon:'fa-cart-shopping',  pill:'pill-shopping',   accentClass:'shopping' },
  'On the Way to Customer':              { key:'delivering', label:'Delivering',     icon:'fa-shipping-fast',  pill:'pill-delivering', accentClass:'delivering' },
  'Delivered':                           { key:'delivered',  label:'Delivered',      icon:'fa-circle-check',   pill:'pill-delivered',  accentClass:'delivered' }
};

const getMeta = (status) => STATUS_META[status] || { key:'placed', label:status, icon:'fa-circle-info', pill:'pill-placed', accentClass:'placed' };

const NEXT_BTN = {
  'Payment Confirmed - Driver Assigned': { label:'Head to Store',     icon:'fa-route',         cls:'btn-action-blue' },
  'Driver on the Way to Store':          { label:'Arrived at Store',  icon:'fa-store',         cls:'btn-action-amber' },
  'At the Store':                        { label:'Start Shopping',    icon:'fa-cart-shopping', cls:'btn-action-amber' },
  'Shopping':                            { label:'Head to Customer',  icon:'fa-shipping-fast', cls:'btn-action-teal' },
  'On the Way to Customer':              { label:'Complete Delivery', icon:'fa-camera',        cls:'btn-action-red' }
};

/* ── Render ─────────────────────────────────────────────── */
const renderOrders = (showLoading = false) => {
  const list   = $('order-list');
  const loader = $('orders-loading');
  const empty  = $('orders-empty');
  if (!list) return;

  if (showLoading && loader) loader.style.display = 'flex';

  applyFilters();

  if (loader) loader.style.display = 'none';

  if (filteredOrders.size === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  const sorted = Array.from(filteredOrders.entries())
    .sort(([,a],[,b]) => new Date(b.timestamp) - new Date(a.timestamp));

  const newHtml = sorted.map(([ref, order]) => buildOrderCard(ref, order)).join('');
  if (list.innerHTML !== newHtml) {
    list.innerHTML = newHtml;
    // Bind drawer toggles
    list.querySelectorAll('.items-drawer-head').forEach(h => {
      h.addEventListener('click', () => toggleItemsDrawer(h));
    });
  }
  updateDataIntegrityStatus();
};

const buildOrderCard = (ref, order) => {
  const meta    = getMeta(order.status);
  const orderId = ref.split('-')[1] || ref;
  const idx     = STATUS_FLOW.indexOf(order.status);
  const next    = STATUS_FLOW[idx + 1];

  const infoGrid = `
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Customer</span>
        <span class="info-value">${esc(order.customerName || 'N/A')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Location</span>
        <span class="info-value">${esc(order.location || order.customerAddress || 'N/A')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone</span>
        <span class="info-value">
          ${order.customerPhone
            ? `<a href="tel:${esc(order.customerPhone)}">${esc(order.customerPhone)}</a>`
            : 'N/A'}
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Store</span>
        <span class="info-value">${esc(order.storeName || 'N/A')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Placed</span>
        <span class="info-value">${formatTime(order.timestamp)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment</span>
        <span class="info-value">${order.paymentConfirmed ? '✓ Confirmed' : '⏳ Pending'}</span>
      </div>
    </div>`;

  const itemCount = (order.items || []).length;
  const itemsHtml = `
    <div class="items-drawer">
      <div class="items-drawer-head">
        <span class="items-drawer-title">
          <i class="fas fa-list-check"></i>
          Items to Collect
          <span class="items-count">${itemCount}</span>
        </span>
        <i class="fas fa-chevron-down items-toggle"></i>
      </div>
      <div class="items-list" style="display:none;">
        ${(order.items || []).map(i => `<div class="item-row">${esc(i)}</div>`).join('')}
      </div>
    </div>`;

  const specialNote = order.customRequest
    ? `<div class="special-note"><i class="fas fa-triangle-exclamation"></i><span>${esc(order.customRequest)}</span></div>`
    : '';

  let actions = '';
  if (idx === STATUS_FLOW.length - 1) {
    actions = `<span class="completed-tag"><i class="fas fa-circle-check"></i> Delivered</span>`;
  } else if (order.status === 'On the Way to Customer') {
    actions = `
      <button class="btn-action btn-action-outline" onclick="showOrderDetails('${ref}')">
        <i class="fas fa-eye"></i> Details
      </button>
      <button class="btn-action btn-action-red" onclick="initiateDelivery('${ref}')">
        <i class="fas fa-camera"></i> Complete Delivery
      </button>`;
  } else {
    const cfg = NEXT_BTN[next];
    const nextBtn = cfg
      ? `<button class="btn-action ${cfg.cls}" onclick="updateOrderStatus('${ref}', '${next}')">
           <i class="fas ${cfg.icon}"></i> ${cfg.label}
         </button>`
      : '';
    actions = `
      <button class="btn-action btn-action-outline" onclick="showOrderDetails('${ref}')">
        <i class="fas fa-eye"></i> Details
      </button>
      ${nextBtn}`;
  }

  return `
    <div class="order-card" data-status="${meta.accentClass}" role="listitem" aria-label="Order ${ref}">
      <div class="card-head">
        <div class="card-head-left">
          <span class="order-num">Order #${orderId}</span>
          <span class="order-ref">${ref}</span>
        </div>
        <span class="status-pill ${meta.pill}">
          <i class="fas ${meta.icon}"></i>
          ${meta.label}
        </span>
      </div>
      <div class="card-body">
        ${infoGrid}
        ${itemsHtml}
        ${specialNote}
      </div>
      <div class="card-foot">${actions}</div>
    </div>`;
};

/* ── Items drawer toggle ────────────────────────────────── */
const toggleItemsDrawer = (head) => {
  const list   = head.nextElementSibling;
  const toggle = head.querySelector('.items-toggle');
  const open   = list.style.display !== 'none';
  list.style.display = open ? 'none' : 'flex';
  toggle.classList.toggle('open', !open);
};

/* ── Filters ────────────────────────────────────────────── */
const applyFilters = () => {
  filteredOrders.clear();
  orders.forEach((order, ref) => {
    if (!activeFilter || order.status === activeFilter) {
      filteredOrders.set(ref, order);
    }
  });
};

const setFilter = (btn, value) => {
  activeFilter = value;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderOrders();
  updateOrderStats();
};

/* ── Stats ──────────────────────────────────────────────── */
const updateOrderStats = () => {
  const active  = Array.from(orders.values()).filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const pending = Array.from(orders.values()).filter(o => o.status === 'Order Placed and Received');
  const elA = $('total-orders'), elP = $('pending-orders');
  if (elA) elA.textContent = active.length;
  if (elP) elP.textContent = pending.length;
  updateConnectionStatus('connected');
};

/* ── Update status ──────────────────────────────────────── */
const updateOrderStatus = (ref, newStatus, photo = null) => {
  const order = orders.get(ref);
  if (!order) return;
  console.log(`🔄 ${ref} → ${newStatus}`);
  order.status = newStatus;
  order.lastUpdated = new Date().toISOString();
  if (photo) order.deliveryPhoto = photo;
  if (newStatus === 'On the Way to Customer') {
    order.estimatedDelivery = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  if (newStatus === 'Delivered') {
    order.completedAt = new Date().toISOString();
    order.deliveryConfirmed = true;
    showNotification(`Order ${ref} marked as delivered!`, 'success', 'Delivery Complete');
  }
  orders.set(ref, order);
  saveOrders();
  renderOrders();
  updateOrderStats();
  updateDataIntegrityStatus();
};

/* ── Order details modal ────────────────────────────────── */
const showOrderDetails = (ref) => {
  const order = orders.get(ref);
  if (!order) return;
  const meta = getMeta(order.status);
  const body = $('orderModalBody');
  if (!body) return;

  const hasName    = !!order.customerName;
  const hasPhone   = !!order.customerPhone;
  const hasAddress = !!order.customerAddress;
  const isComplete = hasName && hasPhone && hasAddress && order.storeName && order.items;

  body.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">Order Information</div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-key">Reference</span>
          <span class="detail-val mono">${esc(ref)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Status</span>
          <span class="detail-val">
            <span class="status-pill ${meta.pill}">
              <i class="fas ${meta.icon}"></i> ${meta.label}
            </span>
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Order Time</span>
          <span class="detail-val">${formatTime(order.timestamp)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Payment</span>
          <span class="detail-val">${order.paymentConfirmed ? '✓ Confirmed' : '⏳ Pending'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Eco-Friendly</span>
          <span class="detail-val">${order.ecoFriendly ? 'Yes 🌿' : 'No'}</span>
        </div>
        ${order.estimatedDelivery ? `
        <div class="detail-item">
          <span class="detail-key">ETA</span>
          <span class="detail-val">${formatTime(order.estimatedDelivery)}</span>
        </div>` : ''}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Customer</div>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-key">Name</span>
          <span class="detail-val">${esc(order.customerName || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Phone</span>
          <span class="detail-val">
            ${order.customerPhone
              ? `<a href="tel:${esc(order.customerPhone)}" style="color:var(--teal)">${esc(order.customerPhone)}</a>`
              : 'N/A'}
          </span>
        </div>
        <div class="detail-item" style="grid-column:1/-1">
          <span class="detail-key">Address</span>
          <span class="detail-val">${esc(order.customerAddress || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Location</span>
          <span class="detail-val">${esc(order.location || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-key">Store</span>
          <span class="detail-val">${esc(order.storeName || 'N/A')}</span>
        </div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Items to Collect (${(order.items || []).length})</div>
      <div class="modal-items-list">
        ${(order.items || []).map(i => `<div class="modal-item-row">${esc(i)}</div>`).join('')}
      </div>
    </div>

    ${order.customRequest ? `
    <div class="modal-section">
      <div class="modal-section-title">Special Instructions</div>
      <div class="special-note"><i class="fas fa-triangle-exclamation"></i><span>${esc(order.customRequest)}</span></div>
    </div>` : ''}

    ${order.deliveryPhoto ? `
    <div class="modal-section">
      <div class="modal-section-title">Delivery Photo</div>
      <div class="photo-preview-wrap"><img src="${order.deliveryPhoto}" alt="Delivery confirmation"></div>
    </div>` : ''}

    <div class="modal-section">
      <div class="modal-section-title">Data Integrity</div>
      <div class="integrity-check-box">
        <div class="check-row">
          <span>Customer Name</span>
          <span class="${hasName ? 'check-pass' : 'check-fail'}">${hasName ? '✓ Present' : '✗ Missing'}</span>
        </div>
        <div class="check-row">
          <span>Customer Phone</span>
          <span class="${hasPhone ? 'check-pass' : 'check-fail'}">${hasPhone ? '✓ Present' : '✗ Missing'}</span>
        </div>
        <div class="check-row">
          <span>Delivery Address</span>
          <span class="${hasAddress ? 'check-pass' : 'check-fail'}">${hasAddress ? '✓ Present' : '✗ Missing'}</span>
        </div>
        <div class="check-row">
          <span>Overall Status</span>
          <span class="${isComplete ? 'check-pass' : 'check-fail'}">${isComplete ? '✓ All data verified' : '✗ Incomplete'}</span>
        </div>
      </div>
    </div>`;

  openModal('order-modal-backdrop');
};

/* ── Delivery photo ─────────────────────────────────────── */
const initiateDelivery = (ref) => {
  currentOrderRef = ref;
  // Reset photo modal
  const photoInput = $('deliveryPhoto');
  const preview    = $('photoPreview');
  const confirmBtn = $('confirmDeliveryBtn');
  if (photoInput) photoInput.value = '';
  if (preview)    preview.style.display = 'none';
  if (confirmBtn) confirmBtn.disabled = true;
  openModal('photo-modal-backdrop');
};

const setupPhotoUpload = () => {
  const photoInput = $('deliveryPhoto');
  if (!photoInput) return;
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = $('previewImage'), pre = $('photoPreview'), btn = $('confirmDeliveryBtn');
      if (img) img.src = ev.target.result;
      if (pre) pre.style.display = 'block';
      if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
  });
};

const confirmDeliveryWithPhoto = () => {
  const photoInput = $('deliveryPhoto');
  const confirmBtn = $('confirmDeliveryBtn');
  if (!photoInput || !photoInput.files[0]) {
    showNotification('Please select a photo to confirm delivery.', 'warning');
    return;
  }
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing…';
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    updateOrderStatus(currentOrderRef, 'Delivered', e.target.result);
    closeModal('photo-modal-backdrop');
    photoInput.value = '';
    $('photoPreview').style.display = 'none';
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm Delivery';
    }
  };
  reader.readAsDataURL(photoInput.files[0]);
};

/* ── Modal helpers ──────────────────────────────────────── */
const openModal = (id) => {
  const el = $(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

const closeModal = (id) => {
  const el = $(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

// Close modals on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(bd => {
  bd.addEventListener('click', (e) => {
    if (e.target === bd) closeModal(bd.id);
  });
});

/* ── Notifications ──────────────────────────────────────── */
const showNotification = (message, type = 'info', title = '') => {
  const container = $('notification-container');
  if (!container) return;

  const icons = { success:'fa-circle-check', warning:'fa-triangle-exclamation', info:'fa-circle-info', error:'fa-circle-xmark' };
  const titles = { success:'Success', warning:'Warning', info:'Info', error:'Error' };

  const n = document.createElement('div');
  n.className = `notification ${type}`;
  n.innerHTML = `
    <div class="notification-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
    <div class="notification-content">
      <div class="notification-title">${title || titles[type]}</div>
      <div class="notification-body">${message}</div>
    </div>
    <button class="notification-dismiss" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>`;

  container.appendChild(n);

  n.querySelector('.notification-dismiss').addEventListener('click', () => dismissNotification(n));
  setTimeout(() => dismissNotification(n), type === 'error' ? 8000 : 4000);
};

const dismissNotification = (el) => {
  el.style.animation = 'slide-out-right 0.25s ease forwards';
  setTimeout(() => el.remove(), 250);
};

/* ── New order notification ─────────────────────────────── */
const showNewOrderNotification = (ref) => {
  const order = orders.get(ref);
  if (!order) return;
  console.log('🔔 New order notification:', ref);
  showNotification(
    `<strong>${esc(order.customerName || 'Unknown')}</strong> · ${esc(order.storeName || '')}
     <br><a href="tel:${esc(order.customerPhone || '')}">${esc(order.customerPhone || 'N/A')}</a>`,
    'warning',
    `🎉 New Order · #${ref.split('-')[1] || ref}`
  );
  playNotificationSound();
  flashBrowserTab();
};

/* ── Sound & Tab flash ──────────────────────────────────── */
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 550, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.25);
    });
  } catch (e) { /* silently fail */ }
};

const flashBrowserTab = () => {
  const orig = document.title;
  let n = 0;
  const iv = setInterval(() => {
    document.title = n++ % 2 === 0 ? '🔴 NEW ORDER!' : '🟢 Driver Portal';
    if (n >= 10) { clearInterval(iv); document.title = orig; }
  }, 600);
};

/* ── Connection status ──────────────────────────────────── */
const updateConnectionStatus = (status = 'connected') => {
  const dot   = $('live-dot');
  const label = $('live-label');
  const sync  = $('last-sync');

  if (dot) {
    dot.style.background   = status === 'connected' ? 'var(--teal)' : status === 'updating' ? 'var(--amber)' : 'var(--red)';
    dot.style.boxShadow    = status === 'connected' ? '0 0 8px var(--teal)' : status === 'updating' ? '0 0 8px var(--amber)' : '0 0 8px var(--red)';
  }
  if (label) {
    label.textContent = status === 'connected' ? 'Live' : status === 'updating' ? 'Syncing…' : 'Offline';
    label.style.color = status === 'connected' ? 'var(--teal)' : status === 'updating' ? 'var(--amber)' : 'var(--red)';
  }
  if (sync) sync.textContent = `Synced at ${new Date().toLocaleTimeString()}`;
};

/* ── Refresh ────────────────────────────────────────────── */
const refreshOrders = () => {
  console.log('🔄 Manual refresh');
  updateConnectionStatus('updating');
  const icon = $('refresh-icon');
  if (icon) { icon.style.transform = 'rotate(360deg)'; icon.style.transition = 'transform 0.6s'; }

  loadOrders();
  setTimeout(() => {
    renderOrders(true);
    updateOrderStats();
    checkForNewOrders();
    updateDataIntegrityStatus();
    updateConnectionStatus('connected');
    if (icon) { icon.style.transform = ''; icon.style.transition = ''; }
    showNotification(`Orders refreshed at ${new Date().toLocaleTimeString()}`, 'success');
  }, 400);
};

/* ── Storage event / cross-tab sync ────────────────────── */
const handleStorageChange = (e) => {
  const watched = ['speedyDeliveryOrders','speedyDeliveryLastUpdate','speedyDeliverySync','speedyDeliveryNewOrder','speedyDeliveryPollTrigger'];
  if (!watched.includes(e.key)) return;
  console.log('📡 Storage change:', e.key);
  triggerDataRefresh();
  if (e.key === 'speedyDeliveryNewOrder') {
    try {
      const d = JSON.parse(e.newValue || '{}');
      if (d.referenceNumber) showNewOrderNotification(d.referenceNumber);
    } catch {}
  }
};

const triggerDataRefresh = () => {
  updateConnectionStatus('updating');
  setTimeout(() => {
    loadOrders();
    updateDataIntegrityStatus();
    renderOrders();
    updateOrderStats();
    checkForNewOrders();
    updateConnectionStatus('connected');
  }, 100);
};

/* ── Check for new orders ───────────────────────────────── */
const checkForNewOrders = () => {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  orders.forEach((order) => {
    if (new Date(order.timestamp) > cutoff && order.status === 'Order Placed and Received') {
      showNewOrderNotification(order.referenceNumber);
    }
  });
};

/* ── BroadcastChannel ───────────────────────────────────── */
const setupBroadcastChannel = () => {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const ch = new BroadcastChannel('speedyDeliveryChannel');
    ch.onmessage = (e) => {
      console.log('📢 Broadcast:', e.data);
      if (e.data.type === 'newOrder') {
        triggerDataRefresh();
        setTimeout(() => showNewOrderNotification(e.data.referenceNumber), 300);
      } else if (e.data.type === 'ordersUpdated') {
        triggerDataRefresh();
      }
    };
    window._speedyCh = ch;
  } catch (e) { /* not supported */ }
};

/* ── Polling ────────────────────────────────────────────── */
const setupPolling = () => {
  // Primary 3s poll
  setInterval(() => {
    const prev = orders.size;
    loadOrders();
    if (orders.size !== prev) triggerDataRefresh();
  }, 3000);

  // Secondary 5s full refresh
  setInterval(() => {
    loadOrders();
    renderOrders();
    updateOrderStats();
    checkForNewOrders();
  }, 5000);

  // Trigger polling
  setInterval(() => {
    const t = localStorage.getItem('speedyDeliveryPollTrigger');
    const l = localStorage.getItem('_lastPollCheck');
    if (t && t !== l) {
      localStorage.setItem('_lastPollCheck', t);
      triggerDataRefresh();
    }
  }, 1000);
};

/* ── Data Integrity ─────────────────────────────────────── */
const testDataIntegrity = () => {
  console.group('🔍 DATA INTEGRITY TEST');
  orders.forEach((order, ref) => {
    const ok = order.customerName && order.customerPhone && order.customerAddress && order.storeName && order.items;
    console.log(ref, ok ? '✅ Complete' : '❌ Incomplete', { name:order.customerName, phone:order.customerPhone });
  });
  console.groupEnd();
  showNotification(`Integrity test logged to console (${orders.size} orders).`, 'info', 'Test Complete');
};

const diagnoseDataIntegrityIssues = () => {
  const issues = [];
  orders.forEach((order, ref) => {
    if (!order.customerName) issues.push(`${ref}: missing customer name`);
    if (!order.customerPhone) issues.push(`${ref}: missing phone`);
    if (!order.items || !order.items.length) issues.push(`${ref}: no items`);
  });
  if (issues.length === 0) {
    showNotification('No issues found — all orders have complete data.', 'success', 'Diagnosis');
  } else {
    showNotification(`Found ${issues.length} issue(s). Check console for details.`, 'warning', 'Issues Found');
    console.warn('Data issues:', issues);
  }
};

const attemptDataIntegrityFix = () => {
  let fixed = 0;
  orders.forEach((order, ref) => {
    let changed = false;
    if (!order.customerName)    { order.customerName = 'Unknown Customer'; changed = true; }
    if (!order.customerPhone)   { order.customerPhone = 'N/A'; changed = true; }
    if (!order.customerAddress) { order.customerAddress = 'N/A'; changed = true; }
    if (changed) { orders.set(ref, order); fixed++; }
  });
  if (fixed > 0) {
    saveOrders();
    renderOrders();
    showNotification(`Auto-fixed ${fixed} order(s) with missing fields.`, 'success', 'Auto Fix');
  } else {
    showNotification('No fixes needed — all data looks good.', 'info', 'Auto Fix');
  }
};

const exportDataReport = () => {
  const report = {
    timestamp: new Date().toISOString(),
    orders: Array.from(orders.entries()).map(([ref, o]) => ({
      ref,
      customerName: o.customerName || 'MISSING',
      customerPhone: o.customerPhone || 'MISSING',
      store: o.storeName,
      itemCount: (o.items || []).length,
      status: o.status,
      complete: !!(o.customerName && o.customerPhone && o.customerAddress && o.storeName && o.items)
    }))
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `speedy-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('Report downloaded as JSON.', 'success', 'Export');
};

const updateDataIntegrityStatus = () => {
  let complete = 0, incomplete = 0, delivered = 0, active = 0;
  orders.forEach((order) => {
    const ok = order.customerName && order.customerPhone && order.customerAddress && order.storeName && order.items;
    ok ? complete++ : incomplete++;
    order.status === 'Delivered' ? delivered++ : active++;
  });
  const total = orders.size;

  const elTotal = $('total-orders-tracked');
  const elComp  = $('complete-data-count');
  const elInc   = $('incomplete-data-count');
  const elLast  = $('last-integrity-check');

  if (elTotal) elTotal.textContent = `${total} Orders (${active} Active, ${delivered} Done)`;
  if (elComp)  elComp.textContent  = `${complete} Complete`;
  if (elInc) {
    elInc.textContent = `${incomplete} Missing`;
    elInc.className = `badge ${incomplete > 0 ? 'amber' : 'green'}`;
  }
  if (elLast) elLast.textContent = `Updated ${new Date().toLocaleTimeString()}`;

  const pct = total > 0 ? ((complete/total)*100).toFixed(1) : 0;
  if (total > 0 && pct < 80) console.warn(`⚠️ Only ${pct}% of orders have complete data`);

  return { total, complete, incomplete, delivered, active };
};

const startAutomatedDataIntegrityMonitoring = () => {
  if (dataIntegrityMonitorInterval) clearInterval(dataIntegrityMonitorInterval);
  updateDataIntegrityStatus();
  dataIntegrityMonitorInterval = setInterval(() => {
    updateDataIntegrityStatus();
    updateConnectionStatus('connected');
  }, 10000);
};

/* ── Helpers ────────────────────────────────────────────── */
const esc = (s) => {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
};

const formatTime = (ts) => {
  if (!ts) return 'N/A';
  try {
    return new Date(ts).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return ts; }
};

/* ── Init ───────────────────────────────────────────────── */
/* ── Auth / Approval Gate ────────────────────────────────── */
let pendingPollInterval = null;

const getDriverRecord = (driverId) => {
  try {
    const drivers = typeof speedyGetDrivers === 'function' ? speedyGetDrivers() : [];
    return drivers.find((d) => d && d.id === driverId) || null;
  } catch {
    return null;
  }
};

const formatAppliedDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

const populateSidebarIdentity = (driver) => {
  const nameEl = $('sidebarDriverName');
  if (nameEl) nameEl.textContent = driver.fullName || driver.email || 'Driver';
};

const populatePendingScreen = (driver) => {
  const firstName = (driver.fullName || '').split(' ')[0] || 'there';
  $('pendingDriverFirstName') && ($('pendingDriverFirstName').textContent = firstName);
  $('pendingProfileName') && ($('pendingProfileName').textContent = driver.fullName || '—');
  $('pendingEmail') && ($('pendingEmail').textContent = driver.email || '—');
  $('pendingPhone') && ($('pendingPhone').textContent = driver.phone || '—');
  $('pendingApplied') && ($('pendingApplied').textContent = formatAppliedDate(driver.createdAt));
  const hasDocs = !!(driver.mediaId || driver.licenseFront || driver.licenseBack || driver.selfie);
  $('pendingDocs') && ($('pendingDocs').textContent = hasDocs ? 'Submitted ✓' : 'Missing');
};

const showPendingApprovalScreen = (driver) => {
  populatePendingScreen(driver);
  $('driverSidebar') && ($('driverSidebar').style.display = 'none');
  $('main-content') && ($('main-content').style.display = 'none');
  $('pendingApprovalScreen') && ($('pendingApprovalScreen').style.display = 'flex');
};

const showDriverDashboard = (driver) => {
  currentDriver = driver;
  populateSidebarIdentity(driver);
  loadDriverAvatar(driver);
  $('pendingApprovalScreen') && ($('pendingApprovalScreen').style.display = 'none');
  $('driverSidebar') && ($('driverSidebar').style.display = '');
  $('main-content') && ($('main-content').style.display = '');
};

/* ── Profile (avatar + info) ─────────────────────────────── */
let currentDriver = null;

const setAvatarHtml = (containerId, dataUrl, fallbackIcon) => {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = dataUrl
    ? `<img src="${dataUrl}" alt="Profile photo">`
    : `<i class="fas ${fallbackIcon}"></i>`;
};

const loadDriverAvatar = async (driver) => {
  let photo = driver.profilePhoto || null;
  if (!photo && driver.mediaId && typeof speedyGetDriverMedia === 'function') {
    try {
      const media = await speedyGetDriverMedia(driver.mediaId);
      photo = media?.profilePhoto || media?.selfie || null;
    } catch { /* ignore */ }
  }
  setAvatarHtml('sidebarDriverAvatar', photo, 'fa-user');
  setAvatarHtml('profilePhotoWrap', photo, 'fa-user');
};

const populateProfileModal = (driver) => {
  $('profileName') && ($('profileName').textContent = driver.fullName || '—');
  $('profileEmail') && ($('profileEmail').textContent = driver.email || '—');
  $('profilePhone') && ($('profilePhone').textContent = driver.phone || '—');
  $('profileSince') && ($('profileSince').textContent = formatAppliedDate(driver.createdAt));
  $('profile-alert') && ($('profile-alert').innerHTML = '');
};

const compressImage = (dataUrl, maxDim, quality) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const max = Math.max(w, h);
      const scale = max > maxDim ? maxDim / max : 1;
      const tw = Math.round(w * scale), th = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      canvas.getContext('2d').drawImage(img, 0, 0, tw, th);
      resolve(canvas.toDataURL('image/jpeg', quality));
    } catch { resolve(dataUrl); }
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Read failed'));
  r.readAsDataURL(file);
});

const setupProfileModal = () => {
  $('sidebarProfileTrigger')?.addEventListener('click', () => {
    if (!currentDriver) return;
    populateProfileModal(currentDriver);
    openModal('profile-modal-backdrop');
  });

  $('profilePhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentDriver) return;

    if (file.size > 4 * 1024 * 1024) {
      $('profile-alert').innerHTML = '<div class="sd-inline-alert danger">Image must be under 4MB.</div>';
      e.target.value = '';
      return;
    }

    try {
      const raw = await readFileAsDataUrl(file);
      const compressed = await compressImage(raw, 500, 0.85);
      setAvatarHtml('profilePhotoWrap', compressed, 'fa-user');

      if (typeof speedyUpdateDriverProfilePhoto === 'function') {
        const res = await speedyUpdateDriverProfilePhoto({ driverId: currentDriver.id, profilePhoto: compressed });
        if (!res?.ok) {
          $('profile-alert').innerHTML = `<div class="sd-inline-alert danger">${res?.message || 'Failed to save photo.'}</div>`;
          return;
        }
      }

      currentDriver = getDriverRecord(currentDriver.id) || currentDriver;
      setAvatarHtml('sidebarDriverAvatar', compressed, 'fa-user');
      $('profile-alert').innerHTML = '<div class="sd-inline-alert success">Profile photo updated ✓</div>';
    } catch {
      $('profile-alert').innerHTML = '<div class="sd-inline-alert danger">Something went wrong uploading that photo.</div>';
    } finally {
      e.target.value = '';
    }
  });
};

/* ── Chat with Admin ─────────────────────────────────────── */
const CHAT_KEY_PREFIX = 'speedyAdminMessages';
const CHAT_SEEN_PREFIX = 'speedyDriverChatSeen';

const getChatMessages = (driverId) => {
  if (typeof speedyKvPull === 'function') speedyKvPull(`${CHAT_KEY_PREFIX}_${driverId}`);
  try { return JSON.parse(localStorage.getItem(`${CHAT_KEY_PREFIX}_${driverId}`) || '[]'); }
  catch { return []; }
};

const saveChatMessages = (driverId, msgs) => {
  localStorage.setItem(`${CHAT_KEY_PREFIX}_${driverId}`, JSON.stringify(msgs));
  if (typeof speedyKvPush === 'function') speedyKvPush(`${CHAT_KEY_PREFIX}_${driverId}`, msgs);
};

const getChatSeenCount = (driverId) => {
  return Number(localStorage.getItem(`${CHAT_SEEN_PREFIX}_${driverId}`) || 0);
};

const setChatSeenCount = (driverId, count) => {
  localStorage.setItem(`${CHAT_SEEN_PREFIX}_${driverId}`, String(count));
};

const renderDriverChat = (driverId) => {
  const msgs = getChatMessages(driverId);
  const box = $('driverChatMessages');
  if (!box) return;
  if (msgs.length === 0) {
    box.innerHTML = '<div class="driver-chat-empty">No messages yet — say hello to admin support 👋</div>';
    return;
  }
  box.innerHTML = msgs.map(m => `
    <div class="driver-msg-bubble ${m.sender === 'driver' ? 'driver' : 'admin'}">
      <div>${(m.text || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c])}</div>
      <span class="driver-msg-time">${new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
};

const updateChatUnreadBadge = (driverId) => {
  const badge = $('chatUnreadBadge');
  if (!badge) return;
  const msgs = getChatMessages(driverId);
  const seen = getChatSeenCount(driverId);
  const adminUnread = msgs.filter((m, i) => i >= seen && m.sender === 'admin').length;
  if (adminUnread > 0) {
    badge.textContent = String(adminUnread);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
};

const sendDriverChatMessage = () => {
  const input = $('driverChatInput');
  const text = input?.value.trim();
  if (!text || !currentDriver) return;
  const msgs = getChatMessages(currentDriver.id);
  msgs.push({ sender: 'driver', text, ts: new Date().toISOString() });
  saveChatMessages(currentDriver.id, msgs);
  setChatSeenCount(currentDriver.id, msgs.length);
  input.value = '';
  renderDriverChat(currentDriver.id);
};

const setupChatModal = () => {
  $('navMessagesBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentDriver) return;
    renderDriverChat(currentDriver.id);
    setChatSeenCount(currentDriver.id, getChatMessages(currentDriver.id).length);
    updateChatUnreadBadge(currentDriver.id);
    openModal('chat-modal-backdrop');
  });

  $('driverChatSendBtn')?.addEventListener('click', sendDriverChatMessage);
  $('driverChatInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDriverChatMessage(); }
  });

  window.addEventListener('storage', (e) => {
    if (!currentDriver || !e.key) return;
    if (e.key === `${CHAT_KEY_PREFIX}_${currentDriver.id}`) {
      const chatModalOpen = $('chat-modal-backdrop')?.classList.contains('open');
      if (chatModalOpen) {
        renderDriverChat(currentDriver.id);
        setChatSeenCount(currentDriver.id, getChatMessages(currentDriver.id).length);
      }
      updateChatUnreadBadge(currentDriver.id);
    }
  });

  setInterval(() => {
    if (currentDriver) updateChatUnreadBadge(currentDriver.id);
  }, 5000);
};

const checkPendingApprovalNow = async (silent) => {
  const session = typeof speedyGetSession === 'function' ? speedyGetSession() : null;
  if (!session || session.role !== 'driver') {
    window.location.replace('driver-login.html');
    return;
  }
  if (typeof speedySyncDrivers === 'function') await speedySyncDrivers();
  const driver = getDriverRecord(session.driverId);
  if (!driver) {
    if (typeof speedyClearSession === 'function') speedyClearSession();
    window.location.replace('driver-login.html');
    return;
  }
  if (driver.approved) {
    if (pendingPollInterval) { clearInterval(pendingPollInterval); pendingPollInterval = null; }
    window.location.reload();
    return;
  }
  if (!silent) showNotification('Still pending admin approval — check back soon.', 'info');
};

const setupPendingApprovalWatch = () => {
  pendingPollInterval = setInterval(() => checkPendingApprovalNow(true), 5000);
  window.addEventListener('storage', (e) => { if (e.key === 'speedyDrivers') checkPendingApprovalNow(true); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPendingApprovalNow(true); });
  $('pendingRefreshBtn')?.addEventListener('click', () => checkPendingApprovalNow(false));
  $('pendingLogoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof speedyLogout === 'function') speedyLogout('driver-login.html');
  });
};

/* ── Mobile Swipe Gesture for Sidebar ───────────────────────────────────────── */
let driverTouchStartX = 0;
let driverTouchEndX = 0;

document.addEventListener('touchstart', (e) => {
  driverTouchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', (e) => {
  driverTouchEndX = e.changedTouches[0].screenX;
  handleDriverSwipe();
}, { passive: true });

function handleDriverSwipe() {
  const swipeThreshold = 100;
  const diff = driverTouchStartX - driverTouchEndX;
  const sidebar = document.getElementById('driverSidebar');
  
  if (!sidebar) return;
  
  // Swipe right from left edge to open sidebar
  if (driverTouchEndX < driverTouchStartX && Math.abs(diff) > swipeThreshold && driverTouchStartX < 50) {
    sidebar.classList.add('open');
  }
  // Swipe left to close sidebar
  else if (driverTouchEndX > driverTouchStartX && Math.abs(diff) > swipeThreshold) {
    sidebar.classList.remove('open');
  }
}

// Runs the driver auth/approval gate. Returns the approved driver record, or null
// if the caller should stop (either redirected away, or showing the pending screen).
const runDriverAuthGate = () => {
  const session = typeof speedyGetSession === 'function' ? speedyGetSession() : null;
  if (!session || session.role !== 'driver') {
    window.location.replace('driver-login.html');
    return null;
  }

  const driver = getDriverRecord(session.driverId);
  if (!driver) {
    if (typeof speedyClearSession === 'function') speedyClearSession();
    window.location.replace('driver-login.html');
    return null;
  }

  if (!driver.approved) {
    showPendingApprovalScreen(driver);
    setupPendingApprovalWatch();
    return null;
  }

  showDriverDashboard(driver);
  $('sidebarLogoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof speedyLogout === 'function') speedyLogout('driver-login.html');
  });
  return driver;
};

document.addEventListener('DOMContentLoaded', () => {
  const driver = runDriverAuthGate();
  if (!driver) return; // redirected, or showing the pending-approval screen

  console.log('🚚 Speedy Delivery Driver Portal — initialising');

  setupProfileModal();
  setupChatModal();
  updateChatUnreadBadge(driver.id);

  loadOrders();
  renderOrders(true);
  updateOrderStats();
  setupPhotoUpload();
  setupBroadcastChannel();
  setupPolling();
  startAutomatedDataIntegrityMonitoring();

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('ordersUpdated', triggerDataRefresh);
  window.addEventListener('newOrderPlaced', (e) => {
    triggerDataRefresh();
    setTimeout(() => showNewOrderNotification(e.detail?.referenceNumber), 300);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) triggerDataRefresh();
  });
  window.addEventListener('focus', () => triggerDataRefresh());
  window.addEventListener('online',  () => { showNotification('Back online — refreshing.', 'success'); refreshOrders(); });
  window.addEventListener('offline', () => { showNotification('No connection — working offline.', 'warning'); });
  window.addEventListener('beforeunload', () => {
    if (dataIntegrityMonitorInterval) clearInterval(dataIntegrityMonitorInterval);
  });
  window.addEventListener('error', (e) => {
    console.error('Driver Portal Error:', e.error);
  });

  isInitialLoad = false;
  console.log('✅ Driver Portal ready');
});