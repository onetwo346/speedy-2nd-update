/* =====================================================
   SPEEDY DELIVERY — SHARED SYNC BACKEND
   JSONBin.io-backed storage for persistent data across
   all devices/browsers. Works worldwide for all users.
   ===================================================== */
'use strict';

const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const JSONBIN_KEY = process.env.JSONBIN_KEY || 'your-jsonbin-api-key';
const JSONBIN_BIN_ID = process.env.JSONBIN_BIN_ID || 'your-jsonbin-bin-id';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

/* ---------- JSONBin.io storage ---------- */
async function readStore() {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': JSONBIN_KEY }
    });
    if (!response.ok) return { orders: {}, drivers: [], kv: {} };
    const data = await response.json();
    return data.record || { orders: {}, drivers: [], kv: {} };
  } catch (e) {
    console.error('readStore error', e);
    return { orders: {}, drivers: [], kv: {} };
  }
}

async function writeStore(store) {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_KEY
      },
      body: JSON.stringify(store)
    });
  } catch (e) {
    console.error('writeStore error', e);
  }
}

/* ---------- health check ---------- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------- ORDERS ---------- */
app.get('/api/orders', async (req, res) => {
  const store = await readStore();
  res.json({ orders: store.orders });
});

app.post('/api/orders/sync', async (req, res) => {
  const incoming = (req.body && req.body.orders) || {};
  const store = await readStore();

  for (const [ref, order] of Object.entries(incoming)) {
    const existing = store.orders[ref];
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
  const store = await readStore();
  delete store.orders[req.params.ref];
  await writeStore(store);
  res.json({ ok: true });
});

/* ---------- DRIVERS ---------- */
app.get('/api/drivers', async (req, res) => {
  const store = await readStore();
  res.json({ drivers: store.drivers });
});

app.post('/api/drivers/sync', async (req, res) => {
  const incoming = Array.isArray(req.body?.drivers) ? req.body.drivers : [];
  const store = await readStore();

  for (const driver of incoming) {
    if (!driver || !driver.id) continue;
    const idx = store.drivers.findIndex((d) => d.id === driver.id);
    if (idx === -1) {
      store.drivers.push(driver);
    } else {
      const existing = store.drivers[idx];
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(driver.updatedAt || driver.createdAt || 0).getTime();
      store.drivers[idx] = incomingTime >= existingTime ? { ...existing, ...driver } : existing;
    }
  }

  await writeStore(store);
  res.json({ drivers: store.drivers });
});

/* ---------- GENERIC KEY-VALUE STORE ---------- */
app.get('/api/kv/:key', async (req, res) => {
  const store = await readStore();
  res.json({ value: store.kv[req.params.key] ?? null });
});

app.put('/api/kv/:key', async (req, res) => {
  const store = await readStore();
  store.kv[req.params.key] = req.body?.value ?? null;
  await writeStore(store);
  res.json({ value: store.kv[req.params.key] });
});

app.listen(PORT, () => {
  console.log(`Speedy Delivery sync backend running on port ${PORT}`);
});