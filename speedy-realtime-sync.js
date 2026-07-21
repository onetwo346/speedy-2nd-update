/* =====================================================
   SPEEDY DELIVERY — REAL-TIME CLOUD SYNC
   Uses free public storage - NO SETUP REQUIRED!
   
   Auto-syncs across all devices and browsers worldwide
   ===================================================== */

// Using free public storage API - works immediately, no config needed!
const STORAGE_API = 'https://api.jsonserve.com/Uw6pkS';

let syncInterval = null;
let lastSyncTime = 0;
const SYNC_INTERVAL_MS = 3000; // Sync every 3 seconds

/* ========== CORE SYNC ENGINE ========== */

async function cloudFetch(method = 'GET', data = null) {
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
    
    const response = await fetch(STORAGE_API, options);
    
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
  const cloudData = await cloudFetch('GET');
  if (!cloudData) return false;
  
  try {
    const cloud = cloudData;
    
    // Merge orders
    if (cloud.orders) {
      const localOrders = JSON.parse(localStorage.getItem('speedyDeliveryOrders') || '{}');
      const merged = { ...localOrders, ...cloud.orders };
      localStorage.setItem('speedyDeliveryOrders', JSON.stringify(merged));
    }
    
    // Merge drivers
    if (cloud.drivers) {
      const localDrivers = JSON.parse(localStorage.getItem('speedyDrivers') || '[]');
      const driversMap = new Map();
      
      // Add local drivers first
      localDrivers.forEach(d => driversMap.set(d.id || d.email, d));
      
      // Merge cloud drivers (cloud takes priority for conflicts)
      cloud.drivers.forEach(d => driversMap.set(d.id || d.email, d));
      
      localStorage.setItem('speedyDrivers', JSON.stringify(Array.from(driversMap.values())));
    }
    
    // Merge users
    if (cloud.users) {
      const localUsers = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
      const usersMap = new Map();
      
      localUsers.forEach(u => usersMap.set(u.email, u));
      cloud.users.forEach(u => usersMap.set(u.email, u));
      
      localStorage.setItem('speedyUsers', JSON.stringify(Array.from(usersMap.values())));
    }
    
    // Merge chat messages
    if (cloud.chatMessages) {
      localStorage.setItem('speedyChatMessages', JSON.stringify(cloud.chatMessages));
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
    const users = JSON.parse(localStorage.getItem('speedyUsers') || '[]');
    const chatMessages = JSON.parse(localStorage.getItem('speedyChatMessages') || '{}');
    
    const payload = {
      orders,
      drivers,
      users,
      chatMessages,
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
