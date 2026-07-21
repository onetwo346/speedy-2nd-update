/* =====================================================
   SPEEDY DELIVERY — REAL-TIME SYNC
   Uses your existing Render backend - Already configured!
   NO ADDITIONAL SETUP REQUIRED!
   ===================================================== */

// Your existing Render backend (already set up with JSONBin.io)
const BACKEND_API = 'https://speedy-delivery-service-kxzv.onrender.com/api';

let syncInterval = null;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 3000; // Sync every 3 seconds

/* ========== CORE SYNC ENGINE ========== */

async function cloudFetch(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BACKEND_API}${endpoint}`, options);
    
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
    // Pull orders
    const ordersData = await cloudFetch('/orders', 'GET');
    if (ordersData && ordersData.orders) {
      const localOrders = JSON.parse(localStorage.getItem('speedyDeliveryOrders') || '{}');
      const merged = { ...localOrders, ...ordersData.orders };
      localStorage.setItem('speedyDeliveryOrders', JSON.stringify(merged));
    }
    
    // Pull drivers
    const driversData = await cloudFetch('/drivers', 'GET');
    if (driversData && driversData.drivers) {
      const localDrivers = JSON.parse(localStorage.getItem('speedyDrivers') || '[]');
      const driversMap = new Map();
      
      // Add local drivers first
      localDrivers.forEach(d => driversMap.set(d.id || d.email, d));
      
      // Merge cloud drivers (cloud takes priority for conflicts)
      driversData.drivers.forEach(d => driversMap.set(d.id || d.email, d));
      
      localStorage.setItem('speedyDrivers', JSON.stringify(Array.from(driversMap.values())));
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
    const orders = JSON.parse(localStorage.getItem('speedyDeliveryOrders') || '{}');
    const drivers = JSON.parse(localStorage.getItem('speedyDrivers') || '[]');
    
    // Push orders
    await cloudFetch('/orders/sync', 'POST', { orders });
    
    // Push drivers
    const result = await cloudFetch('/drivers/sync', 'POST', { drivers });
    
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
