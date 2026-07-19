/* =====================================================
   SPEEDY DELIVERY – ADMIN PORTAL JS
   Reads from localStorage keys used by dashboard.js
   and driver.js for seamless data sharing.
   ===================================================== */
'use strict';

/* ── UTILITIES (must come first — used throughout the file) ── */
const el = (id) => document.getElementById(id);

const safe = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);

/* ── CONSTANTS ──────────────────────────────────── */
const ORDERS_KEY  = 'speedyDeliveryOrders';
const MSG_KEY     = 'speedyAdminMessages';

let allOrders  = new Map();
let activeTabFilter = '';
let currentMsgDriverId = null;
let refreshInterval = null;

/* ── STATUS META ─────────────────────────────────── */
const STATUS_META = {
  'Order Placed and Received':           { pill:'placed',     icon:'fa-receipt',       label:'New Order' },
  'Payment Confirmed - Driver Assigned': { pill:'confirmed',  icon:'fa-check-circle',  label:'Confirmed' },
  'Driver on the Way to Store':          { pill:'enroute',    icon:'fa-route',          label:'En Route' },
  'At the Store':                        { pill:'atstore',    icon:'fa-store',          label:'At Store' },
  'Shopping':                            { pill:'shopping',   icon:'fa-cart-shopping',  label:'Shopping' },
  'On the Way to Customer':              { pill:'delivering', icon:'fa-shipping-fast',  label:'Delivering' },
  'Delivered':                           { pill:'delivered',  icon:'fa-circle-check',   label:'Delivered' },
  'Cancelled':                           { pill:'cancelled',  icon:'fa-times-circle',   label:'Cancelled' },
};

const STATUS_FLOW = [
  'Order Placed and Received',
  'Payment Confirmed - Driver Assigned',
  'Driver on the Way to Store',
  'At the Store',
  'Shopping',
  'On the Way to Customer',
  'Delivered',
];

const getMeta = (s) => STATUS_META[s] || { pill:'default', icon:'fa-circle-info', label: s || 'Unknown' };

const pillHtml = (status) => {
  const m = getMeta(status);
  return `<span class="spill spill--${m.pill}"><i class="fas ${m.icon}"></i>${m.label}</span>`;
};

/* ── DATA LOADING ────────────────────────────────── */
const loadOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      allOrders = new Map(Object.entries(obj));
    } else {
      allOrders = new Map();
    }
  } catch(e) {
    console.error('loadOrders error', e);
    allOrders = new Map();
  }
  // Pull latest orders from the shared backend (any device/browser) in the
  // background — merges into localStorage for the next loadOrders() call.
  if (typeof speedySyncOrders === 'function') speedySyncOrders();
};

const saveOrders = () => {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(Object.fromEntries(allOrders)));
    if (typeof speedyPushOrders === 'function') speedyPushOrders(Object.fromEntries(allOrders));
  } catch(e) {
    toast('Failed to save order update.', 'danger');
  }
};

const getDrivers = () => {
  try {
    const raw = localStorage.getItem('speedyDrivers');
    if (typeof speedySyncDrivers === 'function') speedySyncDrivers();
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveDrivers = (drivers) => {
  localStorage.setItem('speedyDrivers', JSON.stringify(drivers));
  if (typeof speedyPushDrivers === 'function') speedyPushDrivers(drivers);
};

/* ── SECTION NAVIGATION ──────────────────────────── */
const SECTION_LABELS = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  drivers: 'Drivers',
  analytics: 'Analytics & Reports',
};

window.showSection = (name, btn) => {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');

  const navBtn = btn || document.querySelector(`[data-section="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  document.getElementById('breadcrumb-label').textContent = SECTION_LABELS[name] || name;

  if (name === 'orders')    renderOrdersList();
  if (name === 'drivers')   renderDriversList();
  if (name === 'analytics') updateAnalytics();
  if (name === 'dashboard') renderDashboard();
};

window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
};

/* ── CLOCK ────────────────────────────────────────── */
const updateClock = () => {
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

/* ── GLOBAL REFRESH ──────────────────────────────── */
window.globalRefresh = () => {
  const icon = document.getElementById('refresh-icon');
  const btn = icon?.closest('.topbar-btn');
  if (btn) btn.classList.add('spinning');

  loadOrders();
  updateNavBadges();
  renderDashboard();

  const active = document.querySelector('.page-section.active');
  if (active?.id === 'section-orders')    renderOrdersList();
  if (active?.id === 'section-drivers')   renderDriversList();
  if (active?.id === 'section-analytics') updateAnalytics();

  setTimeout(() => btn?.classList.remove('spinning'), 600);
  toast('Data refreshed', 'info');
};

/* ── NAV BADGES ──────────────────────────────────── */
const updateNavBadges = () => {
  const active = Array.from(allOrders.values()).filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const drivers = getDrivers().length;
  document.getElementById('nav-orders-count').textContent = active || '';
  document.getElementById('nav-drivers-count').textContent = drivers || '';
};

/* ── DASHBOARD ───────────────────────────────────── */
const renderDashboard = () => {
  const orders = Array.from(allOrders.values());
  const drivers = getDrivers();
  const today = new Date().toDateString();

  const active = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const delivered = orders.filter(o => o.status === 'Delivered' && new Date(o.timestamp || o.createdAt || '').toDateString() === today).length;

  el('dash-total-orders').textContent = orders.length;
  el('dash-active-orders').textContent = active;
  el('dash-delivered').textContent = delivered;
  el('dash-drivers').textContent = drivers.length;

  // Recent orders (last 5)
  const recent = orders.sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0)).slice(0,5);
  const recentEl = el('dash-recent-orders');
  if (recentEl) {
    if (recent.length === 0) {
      recentEl.innerHTML = '<div class="empty-state-sm"><i class="fas fa-inbox"></i><span>No orders yet</span></div>';
    } else {
      recentEl.innerHTML = recent.map(o => `
        <div class="mini-order-row" onclick="openOrderModal('${o.referenceNumber}')">
          <span class="mini-ref">${o.referenceNumber}</span>
          <div class="mini-customer">${safe(o.customerName || '—')}</div>
          <span class="mini-store">${safe(o.storeName || '—')}</span>
          ${pillHtml(o.status)}
          <span class="mini-time">${timeAgo(o.timestamp)}</span>
        </div>
      `).join('');
    }
  }

  // Order breakdown by status
  const breakdown = el('dash-breakdown');
  if (breakdown) {
    const counts = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status]||0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    breakdown.innerHTML = sorted.length ? sorted.map(([status, count]) => {
      const m = getMeta(status);
      const pct = Math.round((count/max)*100);
      return `
        <div class="breakdown-item">
          <span class="breakdown-label">${m.label}</span>
          <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct}%"></div></div>
          <span class="breakdown-count">${count}</span>
        </div>`;
    }).join('') : '<div class="empty-state-sm"><i class="fas fa-chart-pie"></i><span>No data</span></div>';
  }
};

/* ── ORDERS LIST ─────────────────────────────────── */
window.setStatusTab = (btn, val) => {
  document.querySelectorAll('.stab').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  activeTabFilter = val;
  // sync the dropdown too
  const sel = el('order-status-filter');
  if (sel) sel.value = val;
  renderOrdersList();
};

window.renderOrdersList = () => {
  loadOrders();
  const search = (el('order-search')?.value || '').toLowerCase().trim();
  const statusF = activeTabFilter || (el('order-status-filter')?.value || '');
  let orders = Array.from(allOrders.values());

  if (statusF) orders = orders.filter(o => o.status === statusF);
  if (search) orders = orders.filter(o =>
    (o.referenceNumber||'').toLowerCase().includes(search) ||
    (o.customerName||'').toLowerCase().includes(search) ||
    (o.customerEmail||'').toLowerCase().includes(search) ||
    (o.storeName||'').toLowerCase().includes(search)
  );

  orders.sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0));

  const tbody   = el('orders-tbody');
  const empty   = el('orders-empty');
  const wrap    = el('orders-table-wrap');
  const loading = el('orders-loading');

  if (!tbody) return;
  loading.style.display = 'none';

  if (orders.length === 0) {
    empty.style.display = 'block';
    wrap.style.display  = 'none';
    return;
  }
  empty.style.display = 'none';
  wrap.style.display  = 'block';

  tbody.innerHTML = orders.map(o => {
    const items = Array.isArray(o.items) ? o.items : [o.items || '—'];
    const itemsStr = items.slice(0,3).join(', ') + (items.length > 3 ? ` +${items.length-3} more` : '');
    const ts = o.timestamp ? new Date(o.timestamp).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    return `
      <tr>
        <td><a class="order-ref-link" onclick="openOrderModal('${o.referenceNumber}')">${safe(o.referenceNumber)}</a></td>
        <td class="cell-customer">
          <div class="name">${safe(o.customerName||'—')}</div>
          <div class="phone">${safe(o.customerPhone||'')}</div>
          <div class="email">${safe(o.customerEmail||'')}</div>
        </td>
        <td>${safe(o.storeName||'—')}</td>
        <td class="cell-items">${safe(itemsStr)}</td>
        <td class="cell-addr">${safe(o.customerAddress||'—')}</td>
        <td>${pillHtml(o.status)}</td>
        <td>${ts}</td>
        <td class="cell-actions">
          <button class="btn-icon-sm" title="View details" onclick="openOrderModal('${o.referenceNumber}')"><i class="fas fa-eye"></i></button>
          ${o.status !== 'Delivered' && o.status !== 'Cancelled' ? `
          <button class="btn-icon-sm success" title="Mark next step" onclick="advanceOrder('${o.referenceNumber}')"><i class="fas fa-circle-arrow-right"></i></button>` : ''}
          ${o.status !== 'Cancelled' && o.status !== 'Delivered' ? `
          <button class="btn-icon-sm danger" title="Cancel order" onclick="cancelOrder('${o.referenceNumber}')"><i class="fas fa-times"></i></button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
};

/* ── ORDER MODAL ─────────────────────────────────── */
window.openOrderModal = (ref) => {
  const o = allOrders.get(ref);
  if (!o) { toast('Order not found', 'danger'); return; }

  const items = Array.isArray(o.items) ? o.items : [o.items || '—'];
  const ts = o.timestamp ? new Date(o.timestamp).toLocaleString() : '—';
  const est = o.estimatedDelivery ? new Date(o.estimatedDelivery).toLocaleString() : '—';
  const m = getMeta(o.status);

  const statusOptions = STATUS_FLOW.map(s =>
    `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`
  ).join('');

  const photoHtml = o.deliveryPhoto ? `
    <div class="delivery-photo-wrap">
      <div class="detail-label">Delivery Photo</div>
      <img src="${o.deliveryPhoto}" alt="Delivery confirmation" onclick="openMedia('${o.deliveryPhoto}','Delivery Photo')">
    </div>` : '';

  el('modal-order-title').innerHTML = `<i class="fas fa-receipt me-2"></i>Order <span style="color:var(--blue)">${safe(ref)}</span>`;
  el('modal-order-body').innerHTML = `
    <div style="margin-bottom:16px;">${pillHtml(o.status)}</div>

    <div class="order-detail-grid">
      <div class="detail-group">
        <div class="detail-label">Reference</div>
        <div class="detail-val" style="font-family:monospace;color:var(--blue)">${safe(o.referenceNumber)}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Placed At</div>
        <div class="detail-val">${ts}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Customer Name</div>
        <div class="detail-val fw-600">${safe(o.customerName||'—')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Phone</div>
        <div class="detail-val">${safe(o.customerPhone||'—')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Email</div>
        <div class="detail-val">${safe(o.customerEmail||'—')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Store</div>
        <div class="detail-val">${safe(o.storeName||'—')}</div>
      </div>
      <div class="detail-group" style="grid-column:1/-1">
        <div class="detail-label">Delivery Address</div>
        <div class="detail-val">${safe(o.customerAddress||'—')}</div>
      </div>
      <div class="detail-group">
        <div class="detail-label">Estimated Delivery</div>
        <div class="detail-val">${est}</div>
      </div>
      ${o.driverName ? `<div class="detail-group">
        <div class="detail-label">Assigned Driver</div>
        <div class="detail-val">${safe(o.driverName)}</div>
      </div>` : ''}
    </div>

    <div class="detail-label mb-2" style="margin-top:0">Items Ordered</div>
    <div class="items-list-block">
      ${items.map(i => `<div class="item-row"><i class="fas fa-circle-dot me-2" style="color:var(--blue);font-size:8px"></i>${safe(i)}</div>`).join('')}
    </div>

    ${photoHtml}

    <div class="status-update-row">
      <label>Update Status:</label>
      <select id="modal-status-select">
        ${statusOptions}
        <option value="Cancelled" ${o.status==='Cancelled'?'selected':''}>Cancelled</option>
      </select>
      <button class="btn-primary" onclick="updateOrderStatus('${ref}')">
        <i class="fas fa-save me-1"></i>Save
      </button>
    </div>
  `;

  openModal('modal-order');
};

window.updateOrderStatus = (ref) => {
  const sel = el('modal-status-select');
  if (!sel) return;
  const newStatus = sel.value;
  const o = allOrders.get(ref);
  if (!o) return;
  o.status = newStatus;
  allOrders.set(ref, o);
  saveOrders();
  renderOrdersList();
  renderDashboard();
  updateNavBadges();
  // Update the pill in the modal
  el('modal-order-body').querySelector('.spill')?.outerHTML; // refresh pill
  closeModal('modal-order');
  toast(`Status updated to "${newStatus}"`, 'success');
};

window.advanceOrder = (ref) => {
  const o = allOrders.get(ref);
  if (!o) return;
  const idx = STATUS_FLOW.indexOf(o.status);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
  o.status = STATUS_FLOW[idx + 1];
  allOrders.set(ref, o);
  saveOrders();
  renderOrdersList();
  renderDashboard();
  updateNavBadges();
  toast(`Order ${ref} → ${o.status}`, 'success');
};

window.cancelOrder = (ref) => {
  if (!confirm(`Cancel order ${ref}?`)) return;
  const o = allOrders.get(ref);
  if (!o) return;
  o.status = 'Cancelled';
  allOrders.set(ref, o);
  saveOrders();
  renderOrdersList();
  renderDashboard();
  updateNavBadges();
  toast(`Order ${ref} cancelled`, 'info');
};

/* ── DRIVERS LIST ────────────────────────────────── */
window.renderDriversList = async () => {
  const search = (el('driver-search')?.value || '').toLowerCase();
  const statusF = el('driver-status-filter')?.value || '';
  let drivers = getDrivers();

  if (search) drivers = drivers.filter(d =>
    (d.fullName||'').toLowerCase().includes(search) ||
    (d.email||'').toLowerCase().includes(search) ||
    (d.phone||'').toLowerCase().includes(search)
  );

  if (statusF === 'approved') drivers = drivers.filter(d => d.approved);
  if (statusF === 'pending')  drivers = drivers.filter(d => !d.approved);

  const grid  = el('drivers-grid');
  const empty = el('drivers-empty');
  if (!grid) return;

  if (drivers.length === 0) {
    empty.style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  // Resolve profile photos (might be in IndexedDB via auth.js)
  const cards = await Promise.all(drivers.map(async d => {
    let avatarHtml = '';
    const initials = (d.fullName||d.email||'D').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('');

    let photo = d.profilePhoto || d.selfie || null;
    if (!photo && d.mediaId && typeof speedyGetDriverMedia === 'function') {
      try {
        const media = await speedyGetDriverMedia(d.mediaId);
        photo = media?.profilePhoto || media?.selfie || null;
      } catch {}
    }

    avatarHtml = photo
      ? `<img src="${photo}" alt="${safe(d.fullName)}">`
      : initials;

    const approvedBadge = d.approved
      ? `<span style="font-size:10px;background:var(--green-lt);color:var(--green);padding:2px 8px;border-radius:10px;font-weight:600"><i class="fas fa-check me-1"></i>Approved</span>`
      : `<span style="font-size:10px;background:var(--amber-lt);color:var(--amber);padding:2px 8px;border-radius:10px;font-weight:600"><i class="fas fa-hourglass-half me-1"></i>Pending</span>`;

    const joined = d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—';

    return `
      <div class="driver-card">
        <div class="driver-card-top">
          <div class="driver-avatar">${avatarHtml}</div>
          <div>
            <div class="driver-name">${safe(d.fullName||'Driver')}</div>
            <div class="driver-email">${safe(d.email||'')}</div>
            <div style="margin-top:5px">${approvedBadge}</div>
          </div>
        </div>
        <div class="driver-meta">
          <div class="driver-meta-item">
            <div class="driver-meta-label">Phone</div>
            <div class="driver-meta-val">${safe(d.phone||'—')}</div>
          </div>
          <div class="driver-meta-item">
            <div class="driver-meta-label">Joined</div>
            <div class="driver-meta-val">${joined}</div>
          </div>
          <div class="driver-meta-item" style="grid-column:1/-1">
            <div class="driver-meta-label">Address</div>
            <div class="driver-meta-val">${safe(d.homeAddress||'—')}</div>
          </div>
        </div>
        <div class="driver-card-actions">
          <button class="btn-icon-sm" title="View details" onclick="openDriverModal('${d.id}')"><i class="fas fa-eye"></i></button>
          <button class="btn-icon-sm" title="Send message" onclick="openMessageModal('${d.id}','${safe(d.fullName||'')}')"><i class="fas fa-comment"></i></button>
          <button class="btn-icon-sm amber" title="Reset password" onclick="openResetPwModal('${d.id}','${safe(d.fullName||'')}')"><i class="fas fa-key"></i></button>
          ${d.approved
            ? `<button class="driver-approve-btn revoke" onclick="toggleDriverApproval('${d.id}',false)"><i class="fas fa-times-circle me-1"></i>Revoke</button>`
            : `<button class="driver-approve-btn approve" onclick="toggleDriverApproval('${d.id}',true)"><i class="fas fa-check me-1"></i>Approve</button>`
          }
        </div>
      </div>
    `;
  }));

  grid.innerHTML = cards.join('');
};

window.toggleDriverApproval = (driverId, approve) => {
  const drivers = getDrivers();
  const idx = drivers.findIndex(d => d.id === driverId);
  if (idx === -1) return;
  drivers[idx].approved = approve;
  saveDrivers(drivers);
  renderDriversList();
  toast(`Driver ${approve ? 'approved' : 'approval revoked'}`, approve ? 'success' : 'info');
};

window.openDriverModal = async (driverId) => {
  const drivers = getDrivers();
  const d = drivers.find(d => d.id === driverId);
  if (!d) return;

  const initials = (d.fullName||d.email||'D').trim().split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0].toUpperCase()).join('');

  let media = { licenseFront: d.licenseFront, licenseBack: d.licenseBack, selfie: d.selfie, profilePhoto: d.profilePhoto };
  if (d.mediaId && typeof speedyGetDriverMedia === 'function') {
    try {
      const dbMedia = await speedyGetDriverMedia(d.mediaId);
      if (dbMedia) media = { ...media, ...dbMedia };
    } catch {}
  }

  const photo = media.profilePhoto || media.selfie || null;
  const avatarHtml = photo ? `<img src="${photo}" alt="${safe(d.fullName)}">` : initials;

  const thumbs = [
    { src: media.licenseFront, label: 'License Front' },
    { src: media.licenseBack,  label: 'License Back' },
    { src: media.selfie,       label: 'Selfie' },
  ].filter(t => t.src);

  const approvedBadge = d.approved
    ? `<span style="font-size:11px;background:var(--green-lt);color:var(--green);padding:3px 10px;border-radius:10px;font-weight:600"><i class="fas fa-check me-1"></i>Approved</span>`
    : `<span style="font-size:11px;background:var(--amber-lt);color:var(--amber);padding:3px 10px;border-radius:10px;font-weight:600"><i class="fas fa-hourglass-half me-1"></i>Pending</span>`;

  el('modal-driver-body').innerHTML = `
    <div class="driver-detail-layout">
      <div style="text-align:center">
        <div class="driver-detail-avatar">${avatarHtml}</div>
        <div style="margin-top:10px;font-weight:600;font-size:15px">${safe(d.fullName||'Driver')}</div>
        <div style="margin-top:6px">${approvedBadge}</div>
      </div>
      <div class="driver-detail-info">
        <div class="info-row"><span class="info-key">Email</span><span class="info-val">${safe(d.email||'—')}</span></div>
        <div class="info-row"><span class="info-key">Phone</span><span class="info-val">${safe(d.phone||'—')}</span></div>
        <div class="info-row"><span class="info-key">Address</span><span class="info-val">${safe(d.homeAddress||'—')}</span></div>
        <div class="info-row"><span class="info-key">Joined</span><span class="info-val">${d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}</span></div>
        <div class="info-row"><span class="info-key">Driver ID</span><span class="info-val small text-muted">${safe(d.id)}</span></div>
      </div>
    </div>

    ${thumbs.length ? `
    <div style="margin-top:20px">
      <div class="detail-label">Verification Documents</div>
      <div class="doc-thumbs">
        ${thumbs.map(t => `
          <div class="doc-thumb" onclick="openMedia('${t.src}','${t.label}')">
            <img src="${t.src}" alt="${t.label}">
            <div class="doc-thumb-label">${t.label}</div>
          </div>`).join('')}
      </div>
    </div>` : '<p class="text-muted small mt-3">No verification documents uploaded.</p>'}

    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
      ${d.approved
        ? `<button class="driver-approve-btn revoke" onclick="toggleDriverApproval('${d.id}',false);closeModal('modal-driver')"><i class="fas fa-times-circle me-1"></i>Revoke Approval</button>`
        : `<button class="driver-approve-btn approve" onclick="toggleDriverApproval('${d.id}',true);closeModal('modal-driver')"><i class="fas fa-check me-1"></i>Approve Driver</button>`
      }
      <button class="btn-secondary" onclick="closeModal('modal-driver');openResetPwModal('${d.id}','${safe(d.fullName||'')}')">
        <i class="fas fa-key me-1"></i>Reset Password
      </button>
    </div>
  `;

  const msgBtn = el('modal-driver-msg-btn');
  if (msgBtn) {
    msgBtn.onclick = () => { closeModal('modal-driver'); openMessageModal(d.id, d.fullName||d.email||'Driver'); };
  }

  openModal('modal-driver');
};

/* ── MEDIA LIGHTBOX ──────────────────────────────── */
window.openMedia = (src, title) => {
  if (!src) return;
  el('media-lightbox-img').src = src;
  el('media-lightbox-title').textContent = title || '';
  openModal('modal-media');
};

/* ── MESSAGE MODAL ───────────────────────────────── */
window.openMessageModal = (driverId, driverName) => {
  currentMsgDriverId = driverId;
  el('msg-driver-info').textContent = `Messaging: ${driverName}`;
  renderMessages(driverId);
  openModal('modal-message');
};

const getMessages = (driverId) => {
  if (typeof speedyKvPull === 'function') speedyKvPull(`${MSG_KEY}_${driverId}`);
  try { return JSON.parse(localStorage.getItem(`${MSG_KEY}_${driverId}`) || '[]'); }
  catch { return []; }
};

const saveMessages = (driverId, msgs) => {
  localStorage.setItem(`${MSG_KEY}_${driverId}`, JSON.stringify(msgs));
  if (typeof speedyKvPush === 'function') speedyKvPush(`${MSG_KEY}_${driverId}`, msgs);
};

const renderMessages = (driverId) => {
  const msgs = getMessages(driverId);
  const hist = el('msg-history');
  if (!hist) return;
  if (msgs.length === 0) { hist.innerHTML = ''; return; }
  hist.innerHTML = msgs.map(m => `
    <div class="msg-bubble ${m.sender === 'admin' ? 'admin' : 'driver'}">
      <div>${safe(m.text)}</div>
      <div class="msg-time">${new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    </div>
  `).join('');
  hist.scrollTop = hist.scrollHeight;
};

el('msg-send-btn')?.addEventListener('click', () => {
  const inp = el('msg-input');
  const text = inp?.value.trim();
  if (!text || !currentMsgDriverId) return;
  const msgs = getMessages(currentMsgDriverId);
  msgs.push({ sender:'admin', text, ts: new Date().toISOString() });
  saveMessages(currentMsgDriverId, msgs);
  inp.value = '';
  renderMessages(currentMsgDriverId);
});

el('msg-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el('msg-send-btn')?.click(); }
});

/* ── RESET PASSWORD MODAL ────────────────────────── */
window.openResetPwModal = (driverId, driverName) => {
  el('reset-pw-driver-id').value = driverId;
  el('reset-pw-name').textContent = `Resetting password for: ${driverName}`;
  el('reset-pw-1').value = '';
  el('reset-pw-2').value = '';
  el('reset-pw-alert').innerHTML = '';
  openModal('modal-reset-pw');
};

el('reset-pw-save')?.addEventListener('click', async () => {
  const id = el('reset-pw-driver-id').value;
  const p1 = el('reset-pw-1').value;
  const p2 = el('reset-pw-2').value;
  const alertEl = el('reset-pw-alert');

  if (!p1 || !p2) { alertEl.innerHTML = alertBox('Please fill in both fields', 'warning'); return; }
  if (p1.length < 6) { alertEl.innerHTML = alertBox('Password must be at least 6 characters', 'warning'); return; }
  if (p1 !== p2) { alertEl.innerHTML = alertBox('Passwords do not match', 'danger'); return; }

  if (typeof speedyAdminResetDriverPassword === 'function') {
    const res = await speedyAdminResetDriverPassword(id, p1);
    if (!res.ok) { alertEl.innerHTML = alertBox(res.message || 'Failed to reset password', 'danger'); return; }
  }

  closeModal('modal-reset-pw');
  toast('Password reset successfully', 'success');
});

/* ── ANALYTICS ───────────────────────────────────── */
window.updateAnalytics = () => {
  const orders = Array.from(allOrders.values());
  const drivers = getDrivers();

  const delivered = orders.filter(o => o.status === 'Delivered').length;
  const active = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const cancelled = orders.filter(o => o.status === 'Cancelled').length;
  const approved = drivers.filter(d => d.approved).length;

  el('an-total').textContent = orders.length;
  el('an-delivered').textContent = delivered;
  el('an-active').textContent = active;
  el('an-drivers').textContent = drivers.length;
  el('an-cancelled').textContent = cancelled;
  el('an-approved-drivers').textContent = approved;

  // By store
  const byStore = {};
  orders.forEach(o => { const k = o.storeName||'Unknown'; byStore[k]=(byStore[k]||0)+1; });
  renderBreakdown('an-by-store', byStore);

  // By status
  const byStatus = {};
  orders.forEach(o => { const k = getMeta(o.status).label; byStatus[k]=(byStatus[k]||0)+1; });
  renderBreakdown('an-by-status', byStatus);
};

const renderBreakdown = (containerId, counts) => {
  const el2 = el(containerId);
  if (!el2) return;
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const max = Math.max(1, ...entries.map(e=>e[1]));
  el2.innerHTML = entries.length ? entries.map(([label,count]) => `
    <div class="breakdown-item">
      <span class="breakdown-label">${safe(label)}</span>
      <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${Math.round((count/max)*100)}%"></div></div>
      <span class="breakdown-count">${count}</span>
    </div>`).join('')
  : '<div class="empty-state-sm"><i class="fas fa-chart-bar"></i><span>No data</span></div>';
};

/* ── DATA INTEGRITY ──────────────────────────────── */
window.testDataIntegrity = () => {
  loadOrders();
  const orders = Array.from(allOrders.values());
  const required = ['referenceNumber','customerName','customerAddress','storeName','status','items'];
  let complete = 0, missing = 0;

  orders.forEach(o => {
    const hasAll = required.every(k => o[k] && (Array.isArray(o[k]) ? o[k].length > 0 : true));
    if (hasAll) complete++; else missing++;
  });

  el('total-orders-tracked').textContent = `${orders.length} Tracked`;
  el('complete-data-count').textContent  = `${complete} Complete`;
  el('incomplete-data-count').textContent= `${missing} Missing`;
  el('last-integrity-check').textContent = `Checked ${new Date().toLocaleTimeString()}`;
  toast(`Integrity check done: ${complete} complete, ${missing} missing`, 'info');
};

window.exportDataReport = () => {
  loadOrders();
  const orders = Array.from(allOrders.values());
  const drivers = getDrivers();
  const report = {
    exported: new Date().toISOString(),
    summary: {
      totalOrders: orders.length,
      activeOrders: orders.filter(o=>o.status!=='Delivered'&&o.status!=='Cancelled').length,
      deliveredOrders: orders.filter(o=>o.status==='Delivered').length,
      totalDrivers: drivers.length,
      approvedDrivers: drivers.filter(d=>d.approved).length,
    },
    orders,
    drivers: drivers.map(({password: _p, ...rest}) => rest), // strip passwords
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `speedy-report-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Report exported', 'success');
};

/* ── MODAL HELPERS ───────────────────────────────── */
window.openModal = (id) => {
  const m = el(id);
  if (m) { m.classList.add('open'); document.body.style.overflow='hidden'; }
};
window.closeModal = (id) => {
  const m = el(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow=''; }
};

/* ── TOAST ────────────────────────────────────────── */
const toast = (msg, type='info') => {
  const tc = el('toast-container');
  if (!tc) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.remove(), 3500);
};

/* ── ALERT BOX HTML ─────────────────────────────── */
const alertBox = (msg, type) =>
  `<div class="alert-box ${type}">${safe(msg)}</div>`;

/* ── UTILITIES ───────────────────────────────────── */
const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
};

/* ── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  updateNavBadges();
  renderDashboard();

  updateClock();
  setInterval(updateClock, 1000);

  // Fast poll (3s) — mirrors driver.js: catch new/changed orders quickly
  // and only do a full re-render when something actually changed.
  setInterval(() => {
    const prevCount = allOrders.size;
    const prevSnapshot = JSON.stringify(Array.from(allOrders.values()).map(o => `${o.referenceNumber}:${o.status}`));
    loadOrders();
    const newSnapshot = JSON.stringify(Array.from(allOrders.values()).map(o => `${o.referenceNumber}:${o.status}`));
    if (allOrders.size !== prevCount || newSnapshot !== prevSnapshot) {
      updateNavBadges();
      const active = document.querySelector('.page-section.active');
      if (active?.id === 'section-dashboard') renderDashboard();
      if (active?.id === 'section-orders')   renderOrdersList();
    }
  }, 3000);

  // Full refresh (5s) — same cadence as driver.js's secondary poll, in case
  // something was missed by the change-detection pass above.
  refreshInterval = setInterval(() => {
    loadOrders();
    updateNavBadges();
    const active = document.querySelector('.page-section.active');
    if (active?.id === 'section-dashboard') renderDashboard();
    if (active?.id === 'section-orders')   renderOrdersList();
    if (active?.id === 'section-drivers')  renderDriversList();
  }, 5000);
});

// Window-level exposures required by inline HTML handlers
window.refreshOrders = window.globalRefresh;
window.filterOrders  = window.renderOrdersList;

// Also expose speedyGetOrders for any legacy calls
window.speedyGetOrders = () => Array.from(allOrders.values());