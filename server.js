/* =====================================================
   SPEEDY DELIVERY — SHARED SYNC BACKEND
   One server, one data file, every device/browser reads
   and writes here instead of its own localStorage.
   ===================================================== */
'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');

const app = express();
app.use(cors()); // allow requests from your GitHub Pages site (any origin)
app.use(express.json({ limit: '15mb' })); // driver license/selfie photos are base64, can be large

/* ---------- simple file-backed store with a write queue ---------- */
/* (avoids two requests corrupting the file if they land at once) */

let writeQueue = Promise.resolve();

function readStore() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { orders: {}, drivers: [], kv: {} };
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      orders: parsed.orders || {},
      drivers: parsed.drivers || [],
      kv: parsed.kv || {}
    };
  } catch (e) {
    console.error('readStore error', e);
    return { orders: {}, drivers: [], kv: {} };
  }
}

function writeStore(store) {
  writeQueue = writeQueue.then(() => {
    return new Promise((resolve) => {
      fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), (err) => {
        if (err) console.error('writeStore error', err);
        resolve();
      });
    });
  });
  return writeQueue;
}

/* ---------- health check ---------- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------- ORDERS ----------
   orders are stored as an object keyed by referenceNumber,
   exactly like your localStorage speedyDeliveryOrders object.
   /sync merges what a client sends into the shared store
   (so one device's save never wipes out another device's order),
   then returns the full merged set.
------------------------------- */
app.get('/api/orders', (req, res) => {
  const store = readStore();
  res.json({ orders: store.orders });
});

app.post('/api/orders/sync', async (req, res) => {
  const incoming = (req.body && req.body.orders) || {};
  const store = readStore();

  for (const [ref, order] of Object.entries(incoming)) {
    const existing = store.orders[ref];
    // last-write-wins by updatedAt/timestamp if present, otherwise incoming wins
    if (!existing) {
      store.orders[ref] = order;
    } else {
      const existingTime = new Date(existing.updatedAt || existing.timestamp || 0).getTime();
      const incomingTime = new Date(order.updatedAt || order.timestamp || 0).getTime();
      store.orders[ref] = incomingTime >= existingTime ? order : existing;
    }
  }

  await writeStore(store);
  res.json({ orders: store.orders });
});

app.delete('/api/orders/:ref', async (req, res) => {
  const store = readStore();
  delete store.orders[req.params.ref];
  await writeStore(store);
  res.json({ ok: true });
});

/* ---------- DRIVERS ----------
   drivers are an array of driver objects (id, fullName, email,
   phone, approved, password hash, etc.) just like speedyDrivers.
   /sync upserts by id.
-------------------------------- */
app.get('/api/drivers', (req, res) => {
  const store = readStore();
  res.json({ drivers: store.drivers });
});

app.post('/api/drivers/sync', async (req, res) => {
  const incoming = Array.isArray(req.body?.drivers) ? req.body.drivers : [];
  const store = readStore();

  for (const driver of incoming) {
    if (!driver || !driver.id) continue;
    const idx = store.drivers.findIndex((d) => d.id === driver.id);
    if (idx === -1) {
      store.drivers.push(driver);
    } else {
      // merge so an admin approving on one device isn't overwritten
      // by a stale copy synced from another device a moment later
      const existing = store.drivers[idx];
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(driver.updatedAt || driver.createdAt || 0).getTime();
      store.drivers[idx] = incomingTime >= existingTime ? { ...existing, ...driver } : existing;
    }
  }

  await writeStore(store);
  res.json({ drivers: store.drivers });
});

/* ---------- GENERIC KEY-VALUE STORE ----------
   Drop-in replacement for any other localStorage key
   (chat messages, customer accounts, etc). Full replace
   per key — same semantics as localStorage.setItem/getItem,
   just shared across every device.
------------------------------------------------- */
app.get('/api/kv/:key', (req, res) => {
  const store = readStore();
  res.json({ value: store.kv[req.params.key] ?? null });
});

app.put('/api/kv/:key', async (req, res) => {
  const store = readStore();
  store.kv[req.params.key] = req.body?.value ?? null;
  await writeStore(store);
  res.json({ value: store.kv[req.params.key] });
});

app.listen(PORT, () => {
  console.log(`Speedy Delivery sync backend running on port ${PORT}`);
});