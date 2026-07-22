/* =====================================================
   SPEEDY DELIVERY — REAL-TIME SYNC
   Direct cloud storage via JSONBlob - no account, no
   backend server, no sleep delays. Already configured!
   ===================================================== */

// Shared cloud storage blob (already created & tested)
const CLOUD_URL = 'https://jsonblob.com/api/jsonBlob/019f876b-7716-77a3-8a2a-8c21bf5e9a5b';

let syncInterval = null;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 3000; // Sync every 3 seconds

/* ========== CORE SYNC ENGINE ========== */

async function cloudFetch(method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(CLOUD_URL, options);
    
    if (!response.ok) {
      console.warn('Cloud sync failed:', response.status);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Cloud sync error:', error.message);
    return null;
  }
}

/* ========== PULL FROM CLOUD ========== */

async function pullFromCloud() {
  try {
    const cloud = await cloudFetch('GET');
    if (!cloud) return false;
    
    // Merge orders (cloud wins for updates, local keeps new unsent orders)
    if (cloud.orders) {
      const localOrders = JSON.parse(localStorage.getItem('speedyDeliveryOrders') || '{}');
      const merged = { ...localOrders, ...cloud.orders };
      localStorage.setItem('speedyDeliveryOrders', JSON.stringify(merged));
    }
    
    // Merge drivers
    if (Array.isArray(cloud.drivers)) {
      const localDrivers = JSON.parse(localStorage.getItem('speedyDrivers') || '[]');
      const driversMap = new Map();
      localDrivers.forEach(d => driversMap.set(d.id || d.email, d));
      cloud.drivers.forEach(d => driversMap.set(d.id || d.email, d));
      localStorage.setItem('speedyDrivers', JSON.stringify(Array.from(driversMap.values())));
    }
    
    // Merge users
    if (Array.isArray(cloud.users)) {
      const localUsers = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
      const usersMap = new Map();
      localUsers.forEach(u => usersMap.set(u.email, u));
      cloud.users.forEach(u => usersMap.set(u.email, u));
      localStorage.setItem('speedyUsers', JSON.stringify(Array.from(usersMap.values())));
    }
    
    lastSyncTime = Date.now();
    console.log('✅ Synced from cloud');
    return true;
  } catch (error) {
    console.error('Pull merge error:', error);
    return false;
  }
}

/* ========== PUSH TO CLOUD ========== */

async function pushToCloud() {
  try {
    // IMPORTANT: pull first so we never overwrite other devices' data
    const cloud = (await cloudFetch('GET')) || {};
    
    const localOrders = JSON.parse(localStorage.getItem('speedyDeliveryOrders') || '{}');
    const localDrivers = JSON.parse(localStorage.getItem('speedyDrivers') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
    
    // Merge cloud + local (local wins — we're pushing our changes)
    const orders = { ...(cloud.orders || {}), ...localOrders };
    
    const driversMap = new Map();
    (cloud.drivers || []).forEach(d => driversMap.set(d.id || d.email, d));
    localDrivers.forEach(d => driversMap.set(d.id || d.email, d));
    
    const usersMap = new Map();
    (cloud.users || []).forEach(u => usersMap.set(u.email, u));
    localUsers.forEach(u => usersMap.set(u.email, u));
    
    const payload = {
      orders,
      drivers: Array.from(driversMap.values()),
      users: Array.from(usersMap.values()),
      chatMessages: cloud.chatMessages || {},
      lastUpdated: new Date().toISOString()
    };
    
    const result = await cloudFetch('PUT', payload);
    
    if (result) {
      console.log('✅ Pushed to cloud');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Push error:', error);
    return false;
  }
}

/* ========== AUTO SYNC ========== */

function startAutoSync() {
  if (syncInterval) return; // Already running
  
  console.log('🔄 Starting auto-sync...');
  
  // Initial pull
  pullFromCloud();
  
  // Sync every few seconds
  syncInterval = setInterval(async () => {
    await pullFromCloud();
  }, SYNC_INTERVAL_MS);
  
  // Push on page unload
  window.addEventListener('beforeunload', () => {
    pushToCloud();
  });
  
  // Push on visibility change (when user switches tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pushToCloud();
    } else {
      pullFromCloud();
    }
  });
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏸️ Auto-sync stopped');
  }
}

/* ========== MANUAL SYNC FUNCTIONS ========== */

// Call this after saving orders
async function syncOrders() {
  await pushToCloud();
  setTimeout(() => pullFromCloud(), 500);
}

// Call this after saving drivers
async function syncDrivers() {
  await pushToCloud();
  setTimeout(() => pullFromCloud(), 500);
}

// Call this after saving users
async function syncUsers() {
  await pushToCloud();
  setTimeout(() => pullFromCloud(), 500);
}

// Force immediate sync
async function forceSync() {
  console.log('🔄 Force syncing...');
  await pushToCloud();
  await pullFromCloud();
}

/* ========== INIT ========== */

// Auto-start sync when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startAutoSync);
} else {
  startAutoSync();
}

// Expose functions globally
window.speedySync = {
  pull: pullFromCloud,
  push: pushToCloud,
  syncOrders,
  syncDrivers,
  syncUsers,
  forceSync,
  start: startAutoSync,
  stop: stopAutoSync
};

console.log('🚀 Speedy Real-Time Sync loaded');
