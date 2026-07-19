/* =====================================================
   SPEEDY DELIVERY — SYNC LAYER
   Include this file BEFORE auth.js / script.js / driver.js /
   admin.js / dashboard.js on every page.

   It does not replace your localStorage code — it sits next
   to it. Your existing loadOrders()/saveOrders()/etc still
   write to localStorage first (so the page never breaks or
   feels slow), and this file pushes those changes to the
   shared backend + pulls down whatever other devices saved,
   merging it into localStorage so your next loadOrders() call
   picks it up automatically.
   ===================================================== */

// 1) SET THIS to your deployed backend URL after you deploy it
//    (see backend/README.md). Example: 'https://speedy-backend.onrender.com/api'
const SPEEDY_API_BASE = 'http://localhost:3001/api';

const speedyFetchJson = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    return null; // offline / server unreachable — caller falls back to local cache
  }
};

/* ---------- ORDERS ---------- */

// Push whatever is currently in localStorage's speedyDeliveryOrders up to the server.
const speedyPushOrders = async (ordersObj) => {
  await speedyFetchJson(`${SPEEDY_API_BASE}/orders/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders: ordersObj })
  });
};

// Pull the server's orders and merge them into localStorage.
// Call this at the top of loadOrders() in each portal.
const speedySyncOrders = async () => {
  const data = await speedyFetchJson(`${SPEEDY_API_BASE}/orders`);
  if (!data) return false;
  try {
    const raw = localStorage.getItem('speedyDeliveryOrders');
    const local = raw ? JSON.parse(raw) : {};
    const merged = { ...local, ...(data.orders || {}) };
    localStorage.setItem('speedyDeliveryOrders', JSON.stringify(merged));
    return true;
  } catch (e) {
    return false;
  }
};

/* ---------- DRIVERS ---------- */

const speedyPushDrivers = async (driversArr) => {
  await speedyFetchJson(`${SPEEDY_API_BASE}/drivers/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drivers: driversArr })
  });
};

const speedySyncDrivers = async () => {
  const data = await speedyFetchJson(`${SPEEDY_API_BASE}/drivers`);
  if (!data) return false;
  try {
    const raw = localStorage.getItem('speedyDrivers');
    const local = raw ? JSON.parse(raw) : [];
    const byId = new Map(local.map((d) => [d.id, d]));
    (data.drivers || []).forEach((d) => byId.set(d.id, d));
    localStorage.setItem('speedyDrivers', JSON.stringify(Array.from(byId.values())));
    return true;
  } catch (e) {
    return false;
  }
};

/* ---------- GENERIC (chat messages, customer accounts, etc.) ---------- */

const speedyKvPush = async (key, value) => {
  await speedyFetchJson(`${SPEEDY_API_BASE}/kv/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  });
};

const speedyKvPull = async (key) => {
  const data = await speedyFetchJson(`${SPEEDY_API_BASE}/kv/${encodeURIComponent(key)}`);
  if (!data || data.value === null || data.value === undefined) return false;
  try {
    localStorage.setItem(key, JSON.stringify(data.value));
    return true;
  } catch (e) {
    return false;
  }
};