/* ============================================================
   SPEEDY DELIVERY – Customer Portal Script
   ============================================================ */

'use strict';

const STORAGE_KEY = 'speedyDeliveryOrders';
const CHANNEL_NAME = 'speedyDelivery';
const DELIVERY_FEE = 25; // flat delivery fee, GH₵

let orders = new Map();
let broadcastChannel = null;

// ---- STORES ----
const STORES = [
  { 
    id:'1', 
    name:'Wiafesco',            
    type:'Cosmetics & Beauty',   
    icon:'💄', 
    color:'#FF6B9D', 
    rating:4.8, 
    desc:'Premium cosmetics, skincare, soaps and perfumes for all your beauty needs.',
    inventory: [
      { name: 'Face Cream', price: 45, category: 'Skincare' },
      { name: 'Body Lotion', price: 35, category: 'Skincare' },
      { name: 'Lipstick Set', price: 25, category: 'Makeup' },
      { name: 'Perfume 50ml', price: 80, category: 'Fragrance' },
      { name: 'Face Wash', price: 20, category: 'Skincare' },
      { name: 'Hair Oil', price: 30, category: 'Hair Care' },
      { name: 'Makeup Kit', price: 120, category: 'Makeup' },
      { name: 'Body Soap Pack', price: 15, category: 'Body Care' }
    ]
  },
  { 
    id:'2', 
    name:'Geneviva Lodge',       
    type:'Hotel & Restaurant',   
    icon:'🏨', 
    color:'#4ECDC4', 
    rating:4.6, 
    desc:'Comfortable rooms, delicious local cuisine, drinks and catering services.',
    inventory: [
      { name: 'Jollof Rice Plate', price: 25, category: 'Main Course' },
      { name: 'Fried Rice', price: 25, category: 'Main Course' },
      { name: 'Banku & Tilapia', price: 35, category: 'Main Course' },
      { name: 'Chicken Wings (6pcs)', price: 30, category: 'Appetizer' },
      { name: 'Fresh Juice', price: 15, category: 'Drinks' },
      { name: 'Soft Drink', price: 8, category: 'Drinks' },
      { name: 'Bottle Water', price: 5, category: 'Drinks' },
      { name: 'Salad Bowl', price: 20, category: 'Sides' }
    ]
  },
  { 
    id:'3', 
    name:'Maryking Super Market',
    type:'Grocery & Household',  
    icon:'🛒', 
    color:'#45B7D1', 
    rating:4.7, 
    desc:'Fresh groceries, household essentials and daily necessities for your home.',
    inventory: [
      { name: 'Rice (5kg)', price: 50, category: 'Grains' },
      { name: 'Cooking Oil (1L)', price: 25, category: 'Cooking' },
      { name: 'Tomatoes (1kg)', price: 15, category: 'Vegetables' },
      { name: 'Onions (1kg)', price: 12, category: 'Vegetables' },
      { name: 'Detergent', price: 18, category: 'Household' },
      { name: 'Toilet Paper (12 rolls)', price: 20, category: 'Household' },
      { name: 'Bread Loaf', price: 10, category: 'Bakery' },
      { name: 'Eggs (12pcs)', price: 22, category: 'Dairy' }
    ]
  },
  { 
    id:'4', 
    name:'Chekin Pizza',         
    type:'Fast Food & Drinks',   
    icon:'🍕', 
    color:'#96CEB4', 
    rating:4.5, 
    desc:'Delicious fresh pizzas, burgers, pasta and cold drinks delivered to you.',
    inventory: [
      { name: 'Margherita Pizza (Medium)', price: 45, category: 'Pizza' },
      { name: 'Pepperoni Pizza (Medium)', price: 55, category: 'Pizza' },
      { name: 'Cheese Burger', price: 25, category: 'Burgers' },
      { name: 'Chicken Burger', price: 28, category: 'Burgers' },
      { name: 'Spaghetti Bolognese', price: 30, category: 'Pasta' },
      { name: 'Carbonara', price: 32, category: 'Pasta' },
      { name: 'French Fries', price: 15, category: 'Sides' },
      { name: 'Coca Cola', price: 8, category: 'Drinks' }
    ]
  },
];

// ---- ORDER STORAGE ----
function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    orders.clear();
    if (raw) {
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) orders.set(k, v);
    }
    // Pull latest orders from cloud backend
    if (typeof speedySyncOrders === 'function') speedySyncOrders();
  } catch(e) { console.warn('loadOrders error', e); }
}

function saveOrders() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(orders)));
    broadcast({ type: 'ordersUpdated', ts: Date.now() });
    // Push to cloud for real-time sync across all devices
    if (window.speedySync && typeof window.speedySync.syncOrders === 'function') {
      window.speedySync.syncOrders();
    }
  } catch(e) { showAlert('Could not save order. Please try again.', 'danger', 'order-form-alert'); }
}

function broadcast(payload) {
  try {
    if (broadcastChannel) broadcastChannel.postMessage(payload);
  } catch(e) {}
}

// ---- STORE INVENTORY MODAL ----
let selectedStore = null;
let selectedItems = [];

window.openStoreInventory = function(storeId) {
  selectedStore = STORES.find(s => s.id === storeId);
  if (!selectedStore) return;

  const modal = el('storeInventoryModal');
  const storeIcon = el('inventoryStoreIcon');
  const storeName = el('inventoryStoreName');
  const storeType = el('inventoryStoreType');
  const loading = el('inventory-loading');
  const list = el('inventory-list');

  if (storeIcon) storeIcon.textContent = selectedStore.icon;
  if (storeName) storeName.textContent = selectedStore.name;
  if (storeType) storeType.textContent = selectedStore.type;

  selectedItems = [];
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  loading.style.display = 'block';
  list.style.display = 'none';

  setTimeout(() => {
    renderInventory();
    loading.style.display = 'none';
    list.style.display = 'block';
  }, 500);
}

window.renderInventory = function() {
  const list = el('inventory-list');
  if (!list || !selectedStore) return;

  list.innerHTML = selectedStore.inventory.map((item, index) => `
    <div class="sd-inventory-item" data-index="${index}" onclick="toggleItemSelection(${index})">
      <div>
        <div class="sd-inventory-item-name">${item.name}</div>
        <div class="sd-inventory-item-category">${item.category}</div>
      </div>
      <div class="sd-inventory-item-price">GH₵${item.price}</div>
    </div>
  `).join('');
}

window.toggleItemSelection = function(index) {
  const item = selectedStore.inventory[index];
  const itemEl = document.querySelector(`.sd-inventory-item[data-index="${index}"]`);
  
  const existingIndex = selectedItems.findIndex(i => i.name === item.name);
  
  if (existingIndex > -1) {
    selectedItems.splice(existingIndex, 1);
    itemEl.classList.remove('selected');
  } else {
    selectedItems.push(item);
    itemEl.classList.add('selected');
  }
}

window.closeInventoryModal = function() {
  const modal = el('storeInventoryModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

window.addSelectedToOrder = function() {
  if (selectedItems.length === 0) {
    showAlert('Please select at least one item.', 'warning');
    return;
  }

  const itemsText = selectedItems.map(i => i.name).join(', ');
  const itemsField = el('items');
  
  if (itemsField) {
    itemsField.value = itemsText;
  }

  closeInventoryModal();
  showAlert(`${selectedItems.length} items added to your order!`, 'success');
  
  // Scroll to order form
  const orderSection = el('order');
  if (orderSection) {
    orderSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Initialize inventory modal
document.addEventListener('DOMContentLoaded', () => {
  el('closeInventoryModal')?.addEventListener('click', closeInventoryModal);
  el('addToOrderBtn')?.addEventListener('click', addSelectedToOrder);
  
  el('storeInventoryModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'storeInventoryModal') closeInventoryModal();
  });
});

// ---- UI HELPERS ----
function el(id) { return document.getElementById(id); }

function showAlert(msg, type = 'info', targetId = null) {
  const html = `<div class="sd-alert sd-alert-${type}">${msg}</div>`;
  if (targetId) {
    const target = el(targetId);
    if (target) { target.innerHTML = html; return; }
  }
  const toast = document.createElement('div');
  toast.innerHTML = html;
  toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:9990;min-width:300px;max-width:400px;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function setLoading(show) {
  const ov = el('loading-overlay');
  if (ov) ov.style.display = show ? 'flex' : 'none';
}

function statusClass(status) {
  if (!status) return 'sb-default';
  const s = status.toLowerCase();
  if (s.includes('placed') || s.includes('received')) return 'sb-new';
  if (s.includes('way to store') || s.includes('assigned')) return 'sb-enroute';
  if (s.includes('at the store') || s.includes('shopping')) return 'sb-shopping';
  if (s.includes('way to customer') || s.includes('on the way')) return 'sb-otw';
  if (s.includes('delivered')) return 'sb-done';
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
  return 'fa-circle';
}

// ---- REFERENCE GENERATOR ----
function genRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `SPD-${r}`;
}

// ---- RENDER STORES ----
function renderStores() {
  const list = el('store-list');
  const loading = el('stores-loading');
  if (!list || !loading) return;

  loading.style.display = 'block';
  list.style.display = 'none';

  setTimeout(() => {
    list.innerHTML = STORES.map(s => `
      <div class="col-lg-6 col-md-6">
        <div class="sd-store-card h-100" onclick="openStoreInventory('${s.id}')" style="--store-color:${s.color};">
          <div class="sd-store-card::before" style="background:${s.color};"></div>
          <style>
            .sd-store-card:hover::before { background: ${s.color}; }
          </style>
          <span class="sd-store-icon">${s.icon}</span>
          <div class="sd-store-name">${s.name}</div>
          <div class="sd-store-type">${s.type}</div>
          <div class="sd-store-desc">${s.desc}</div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <div class="sd-store-rating">
              <i class="fas fa-star"></i> ${s.rating}
            </div>
            <button class="sd-btn sd-btn-primary sd-btn-sm" onclick="event.stopPropagation();openStoreInventory('${s.id}')">
              View Inventory
            </button>
          </div>
        </div>
      </div>
    `).join('');

    loading.style.display = 'none';
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
  }, 600);
}

window.selectStore = function(id) {
  const sel = el('store-select');
  if (sel) {
    sel.value = id;
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// ---- POPULATE DROPDOWN ----
function populateStoreDropdown() {
  const sel = el('store-select');
  if (!sel) return;
  sel.innerHTML = '<option value="" disabled selected>Select a store…</option>';
  STORES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.icon} ${s.name} — ${s.type}`;
    sel.appendChild(opt);
  });
}

// ---- Holds the validated order form data while the refund policy modal is open ----
let pendingOrderData = null;

// ---- ORDER FORM SUBMIT (validates, then shows refund policy popup) ----
function handleOrderSubmit(e) {
  e.preventDefault();

  const name    = el('customer-name')?.value.trim();
  const phone   = el('customer-phone')?.value.trim();
  const address = el('customer-address')?.value.trim();
  const storeId = el('store-select')?.value;
  const itemsRaw= el('items')?.value;
  const note    = el('custom-request')?.value.trim();
  const eco     = el('eco-friendly')?.checked;

  el('order-form-alert').innerHTML = '';

  const errs = [];
  if (!name || name.length < 2)           errs.push('Please enter your full name.');
  if (!phone || phone.replace(/\D/g,'').length < 9) errs.push('Please enter a valid phone number.');
  if (!address || address.length < 8)     errs.push('Please enter a delivery address.');
  if (!storeId)                           errs.push('Please select a store.');
  const items = (itemsRaw || '').split('\n').map(i => i.trim()).filter(Boolean);
  if (items.length === 0)                 errs.push('Please list at least one item.');

  if (errs.length) {
    showAlert(errs.join('<br>'), 'danger', 'order-form-alert');
    return;
  }

  // Items subtotal comes from whatever was picked in the store inventory modal.
  // If the shopper typed items manually instead of picking from inventory, we
  // simply have no price for those lines, so the subtotal is 0 and only the
  // flat delivery fee is charged at this step.
  const itemsSubtotal = selectedItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

  pendingOrderData = { name, phone, address, storeId, items, note, eco, itemsSubtotal };

  openRefundPolicyModal();
}

// ---- REFUND POLICY MODAL ----
function openRefundPolicyModal() {
  const modal = el('refundPolicyModal');
  if (!modal) { finalizeOrderAndShowPayment(); return; } // fallback if modal missing
  el('refund-policy-agree').checked = false;
  el('refund-policy-alert').innerHTML = '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeRefundPolicyModal() {
  const modal = el('refundPolicyModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function finalizeOrderAndShowPayment() {
  if (!pendingOrderData) return;
  const { name, phone, address, storeId, items, note, eco, itemsSubtotal } = pendingOrderData;

  const btn = el('submit-order-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="sd-spinner" style="width:18px;height:18px;border-width:3px;"></span> Processing…';
  }

  const store = STORES.find(s => s.id === storeId);
  const ref = genRef();
  const totalAmount = itemsSubtotal + DELIVERY_FEE;
  const order = {
    referenceNumber: ref,
    customerName:    name,
    customerPhone:   phone,
    customerAddress: address,
    storeId,
    storeName:       store?.name || '',
    items,
    customRequest:   note,
    ecoFriendly:     eco,
    itemsSubtotal,
    deliveryFee:     DELIVERY_FEE,
    totalAmount,
    status:          'Order Placed and Received',
    timestamp:       new Date().toISOString(),
    estimatedDelivery: new Date(Date.now() + 30 * 60000).toISOString(),
  };

  orders.set(ref, order);
  saveOrders();

  // Show payment step with the breakdown
  el('payment-items-subtotal').textContent = `GH₵${itemsSubtotal}`;
  el('payment-delivery-fee').textContent = `GH₵${DELIVERY_FEE}`;
  el('payment-reference').textContent = ref;
  el('payment-step').style.display = 'block';
  el('payment-step').dataset.ref = ref;
  el('payment-step').scrollIntoView({ behavior: 'smooth', block: 'start' });

  el('order-form')?.reset();
  selectedItems = [];
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Continue to Payment';
  }

  pendingOrderData = null;
}

// ---- PAYMENT CONFIRM ----
function handlePaymentConfirm() {
  const paymentStep = el('payment-step');
  const ref = paymentStep?.dataset.ref;
  if (!ref) return;

  const order = orders.get(ref);
  if (!order) return;

  const btn = el('confirm-payment');
  btn.disabled = true;
  btn.innerHTML = '<span class="sd-spinner" style="width:18px;height:18px;border-width:3px;"></span> Confirming…';

  setTimeout(() => {
    order.status = 'Payment Confirmed - Driver Assigned';
    order.paymentTime = new Date().toISOString();
    orders.set(ref, order);
    saveOrders();

    paymentStep.style.display = 'none';
    el('order-result').innerHTML = `
      <div class="sd-order-success mt-4">
        <div class="sd-order-success-icon"><i class="fas fa-check"></i></div>
        <h4 class="text-center fw-bold mb-2">Order Confirmed! 🎉</h4>
        <p class="text-center text-muted mb-4">Your payment was received and a driver is being assigned.</p>
        <div class="row g-3">
          <div class="col-md-6">
            <small class="text-muted d-block">Reference</small>
            <strong class="sd-ref-pill d-inline-block mt-1">${ref}</strong>
          </div>
          <div class="col-md-6">
            <small class="text-muted d-block">Customer</small>
            <strong>${order.customerName}</strong>
          </div>
          <div class="col-md-6">
            <small class="text-muted d-block">Phone</small>
            <strong>${order.customerPhone}</strong>
          </div>
          <div class="col-md-6">
            <small class="text-muted d-block">Store</small>
            <strong>${order.storeName}</strong>
          </div>
          <div class="col-12">
            <small class="text-muted d-block">Delivery Address</small>
            <strong>${order.customerAddress}</strong>
          </div>
          <div class="col-12">
            <small class="text-muted d-block">Items</small>
            <strong>${order.items.join(', ')}</strong>
          </div>
          <div class="col-md-4">
            <small class="text-muted d-block">Items Subtotal</small>
            <strong>GH₵${order.itemsSubtotal ?? 0}</strong>
          </div>
          <div class="col-md-4">
            <small class="text-muted d-block">Delivery Fee</small>
            <strong>GH₵${order.deliveryFee ?? DELIVERY_FEE}</strong>
          </div>
          <div class="col-md-4">
            <small class="text-muted d-block">Total Paid</small>
            <strong>GH₵${order.totalAmount ?? DELIVERY_FEE}</strong>
          </div>
        </div>
        <div class="d-flex gap-3 mt-4 flex-wrap">
          <button class="sd-btn sd-btn-primary" onclick="prefillTrack('${ref}')">
            <i class="fas fa-map-marker-alt me-2"></i>Track My Order
          </button>
        </div>
        <p class="text-muted small mt-3 mb-0"><i class="fas fa-clock me-1"></i>Estimated delivery: ${new Date(order.estimatedDelivery).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</p>
      </div>
    `;

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>I\'ve Sent the Payment';

    setTimeout(() => prefillTrack(ref), 2500);
  }, 1800);
}

window.prefillTrack = function(ref) {
  const inp = el('track-input');
  if (inp) {
    inp.value = ref;
    document.getElementById('track')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    handleTrackOrder();
  }
};

// ---- TRACKING ----
function handleTrackOrder() {
  const inp = el('track-input');
  const resultEl = el('track-result');
  const ref = inp?.value.trim().toUpperCase();

  if (!ref) { showAlert('Please enter a reference number.', 'warning'); return; }

  const btn = el('track-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="sd-spinner" style="width:16px;height:16px;border-width:3px;"></span>';

  setTimeout(() => {
    loadOrders();
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search me-1"></i>Track';

    if (!orders.has(ref)) {
      resultEl.innerHTML = `
        <div class="sd-alert sd-alert-danger text-center">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Order not found.</strong> Please check your reference number and try again.
        </div>`;
      return;
    }
    renderTrackResult(ref);
    startPolling(ref);
  }, 900);
}

const STATUS_STEPS = [
  { label: 'Order Placed & Received',      icon: 'fa-receipt' },
  { label: 'Payment Confirmed – Driver Assigned', icon: 'fa-user-check' },
  { label: 'Driver on the Way to Store',   icon: 'fa-route' },
  { label: 'At the Store',                 icon: 'fa-store' },
  { label: 'Shopping',                     icon: 'fa-shopping-cart' },
  { label: 'On the Way to Customer',       icon: 'fa-truck' },
  { label: 'Delivered',                    icon: 'fa-check-double' },
];

function getStepIndex(status) {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s.includes('delivered'))             return 6;
  if (s.includes('way to customer'))       return 5;
  if (s.includes('shopping'))              return 4;
  if (s.includes('at the store'))          return 3;
  if (s.includes('way to store'))          return 2;
  if (s.includes('assigned'))              return 1;
  return 0;
}

function renderTrackResult(ref) {
  const order = orders.get(ref);
  const resultEl = el('track-result');
  if (!order || !resultEl) return;

  const stepIdx = getStepIndex(order.status);
  const pct = Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100);

  const stepsHtml = STATUS_STEPS.map((step, i) => {
    const isDone   = i < stepIdx;
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
        ${order.customRequest ? `<div class="col-12"><small class="text-muted">Special Instructions</small><div class="fw-600">${order.customRequest}</div></div>` : ''}
      </div>

      ${order.deliveryPhoto ? `
        <div class="mt-4 text-center">
          <small class="text-muted d-block mb-2"><i class="fas fa-camera me-1"></i>Delivery Confirmation Photo</small>
          <img src="${order.deliveryPhoto}" alt="Delivery proof" class="rounded" style="max-width:300px;max-height:220px;object-fit:cover;box-shadow:var(--shadow);">
        </div>` : ''}

      <p class="text-muted small mt-4 mb-0 text-center">
        Need help? Call <a href="tel:+233556359890">+233 55 635 9890</a>
      </p>
    </div>`;
}

let pollingInterval = null;
function startPolling(ref) {
  clearInterval(pollingInterval);
  pollingInterval = setInterval(() => {
    loadOrders();
    const order = orders.get(ref);
    if (!order || order.status === 'Delivered') { clearInterval(pollingInterval); }
    renderTrackResult(ref);
  }, 5000);
}

// ---- SMOOTH SCROLL ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const tgt = document.querySelector(a.getAttribute('href'));
      if (tgt) { e.preventDefault(); tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

// ---- NAV SCROLL ----
function initNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });
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
    
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        const icon = toggle.querySelector('i');
        if (icon) {
          icon.classList.add('fa-bars');
          icon.classList.remove('fa-times');
        }
      });
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

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  if (!el('order-form')) return; // only run on customer page

  loadOrders();
  renderStores();
  populateStoreDropdown();
  initSmoothScroll();
  initNavScroll();
  initMobileMenu();

  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  el('order-form')?.addEventListener('submit', handleOrderSubmit);
  el('confirm-payment')?.addEventListener('click', handlePaymentConfirm);
  el('track-btn')?.addEventListener('click', handleTrackOrder);
  el('track-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleTrackOrder(); });

  // Refund policy popup
  el('acceptRefundPolicy')?.addEventListener('click', () => {
    if (!el('refund-policy-agree')?.checked) {
      showAlert('Please check the box to confirm you agree to the refund policy.', 'warning', 'refund-policy-alert');
      return;
    }
    closeRefundPolicyModal();
    finalizeOrderAndShowPayment();
  });
  el('declineRefundPolicy')?.addEventListener('click', () => {
    pendingOrderData = null;
    closeRefundPolicyModal();
    const btn = el('submit-order-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Continue to Payment'; }
  });
  el('closeRefundPolicyModal')?.addEventListener('click', () => el('declineRefundPolicy')?.click());
  el('refundPolicyModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'refundPolicyModal') el('declineRefundPolicy')?.click();
  });

  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) {
      loadOrders();
      const cur = el('track-input')?.value.trim().toUpperCase();
      if (cur && orders.has(cur)) renderTrackResult(cur);
    }
  });
});

// expose for driver portal use
window.updateOrderStatus = function(ref, status, photo = null) {
  loadOrders();
  const order = orders.get(ref);
  if (!order) return;
  order.status = status;
  order.lastUpdated = new Date().toISOString();
  if (photo) order.deliveryPhoto = photo;
  if (status === 'On the Way to Customer') {
    order.estimatedDelivery = new Date(Date.now() + 15 * 60000).toISOString();
  }
  orders.set(ref, order);
  saveOrders();
};

window.getOrders = () => { loadOrders(); return orders; };
window.STORES = STORES;