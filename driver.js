// Enhanced Driver Portal JavaScript with Real-Time Updates
let currentOrderRef = null;
let filteredOrders = new Map();
let lastOrderCount = 0;
let isInitialLoad = true;

// Essential shared variables and functions
let orders = new Map();

// Store data (shared with customer portal)
const STORES = [
    { 
        id: "1", 
        name: "Wiafesco", 
        type: "Cosmetics Store", 
        items: ["Creams", "Soaps", "Perfumes", "Makeup", "Skincare"],
        icon: "fas fa-spa",
        color: "#ff6b6b",
        rating: 4.8,
        description: "Premium cosmetics and beauty products for all your beauty needs"
    },
    { 
        id: "2", 
        name: "Geneviva Lodge", 
        type: "Hotel & Restaurant", 
        items: ["Room Booking", "Local Meals", "Drinks", "Breakfast", "Catering"],
        icon: "fas fa-hotel",
        color: "#4ecdc4",
        rating: 4.6,
        description: "Comfortable accommodation and delicious local cuisine"
    },
    { 
        id: "3", 
        name: "Maryking Super Market", 
        type: "Grocery Store", 
        items: ["Milk", "Bread", "Rice", "Fruits", "Vegetables", "Household Items"],
        icon: "fas fa-shopping-basket",
        color: "#45b7d1",
        rating: 4.7,
        description: "Fresh groceries and household essentials for your daily needs"
    },
    { 
        id: "4", 
        name: "Chekin Pizza", 
        type: "Fast Food Restaurant", 
        items: ["Pizza", "Drinks", "Sides", "Pasta", "Burgers"],
        icon: "fas fa-pizza-slice",
        color: "#96ceb4",
        rating: 4.5,
        description: "Delicious pizzas and fast food delivered fresh to your door"
    }
];

// Helper function to get elements
const getElement = (id) => {
    return document.getElementById(id);
};

// Load orders from localStorage
const loadOrders = () => {
    try {
        const ordersData = localStorage.getItem("speedyDeliveryOrders");
        if (ordersData) {
            const ordersObj = JSON.parse(ordersData);
            orders = new Map(Object.entries(ordersObj));
            console.log("📦 Loaded orders:", orders.size, "orders found");
            console.log("Orders loaded:", Array.from(orders.entries()));
        } else {
            orders = new Map();
            console.log("📦 No orders found in storage");
        }
    } catch (error) {
        console.error("Error loading orders:", error);
        orders = new Map();
    }
};

// COMPREHENSIVE DATA INTEGRITY TEST FUNCTION
const testDataIntegrity = () => {
    console.log("🔍 COMPREHENSIVE DATA INTEGRITY TEST");
    console.log("=====================================");
    
    // Test localStorage data
    const storedData = localStorage.getItem('speedyOrders');
    if (storedData) {
        console.log("✅ localStorage data found");
        try {
            const parsedData = JSON.parse(storedData);
            console.log("✅ JSON parsing successful");
            console.log("📊 Total orders in storage:", Object.keys(parsedData).length);
            
            // Test each order
            Object.entries(parsedData).forEach(([ref, order]) => {
                console.log(`\n🔍 Testing order: ${ref}`);
                console.log(`  ✓ Customer Name: ${order.customerName || 'MISSING'}`);
                console.log(`  ✓ Customer Phone: ${order.customerPhone || 'MISSING'}`);
                console.log(`  ✓ Store Name: ${order.storeName || 'MISSING'}`);
                console.log(`  ✓ Items: ${order.items ? order.items.length : 0} items`);
                console.log(`  ✓ Status: ${order.status || 'MISSING'}`);
                console.log(`  ✓ Timestamp: ${order.timestamp || 'MISSING'}`);
                
                // Check data completeness
                const isComplete = order.customerName && order.customerPhone && 
                                 order.storeName && order.items && order.status;
                console.log(`  ✓ Data Complete: ${isComplete ? '✅ YES' : '❌ NO'}`);
            });
        } catch (error) {
            console.error("❌ JSON parsing failed:", error);
        }
    } else {
        console.log("❌ No localStorage data found");
    }
    
    // Test current orders Map
    console.log("\n🔍 Testing current orders Map");
    console.log("📊 Orders in memory:", orders.size);
    
    orders.forEach((order, ref) => {
        console.log(`\n🔍 Memory order: ${ref}`);
        console.log(`  ✓ Customer Name: ${order.customerName || 'MISSING'}`);
        console.log(`  ✓ Customer Phone: ${order.customerPhone || 'MISSING'}`);
        console.log(`  ✓ Complete: ${order.customerName && order.customerPhone ? '✅ YES' : '❌ NO'}`);
    });
    
    console.log("\n🔍 DATA INTEGRITY TEST COMPLETE");
    console.log("=====================================");
};

// Enhanced data monitoring with real-time verification
const monitorDataIntegrity = () => {
    console.log("🔍 Starting data integrity monitoring...");
    
    // Monitor localStorage changes
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (key === 'speedyOrders') {
            console.log("💾 localStorage UPDATE detected");
            try {
                const data = JSON.parse(value);
                console.log("✅ Data structure valid");
                
                // Verify each order has customer data
                Object.entries(data).forEach(([ref, order]) => {
                    if (!order.customerName || !order.customerPhone) {
                        console.error(`🚨 INCOMPLETE DATA for order ${ref}:`, {
                            customerName: order.customerName,
                            customerPhone: order.customerPhone
                        });
                    }
                });
            } catch (error) {
                console.error("❌ Invalid data structure:", error);
            }
        }
        return originalSetItem.call(this, key, value);
    };
    
    console.log("✅ Data integrity monitoring active");
};

// Enhanced storage event handling with comprehensive synchronization support
const handleStorageChange = (event) => {
    console.log("📡 Storage event handler called:", event.key);
    
    // Handle main orders storage
    if (event.key === "speedyDeliveryOrders") {
        console.log("📡 Main orders storage changed");
        triggerDataRefresh();
    }
    
    // Handle all synchronization triggers
    const syncKeys = [
        'speedyDeliveryLastUpdate',
        'speedyDeliverySync',
        'speedyDeliveryPollTrigger',
        'speedyDeliveryXTab1',
        'speedyDeliveryXTab2',
        'speedyDeliveryXTab3'
    ];
    
    if (syncKeys.includes(event.key)) {
        console.log("📡 SYNC TRIGGER DETECTED:", event.key);
        triggerDataRefresh();
    }
    
    // Handle new order notifications
    if (event.key === "speedyDeliveryNewOrder") {
        try {
            const newOrderData = JSON.parse(event.newValue || "{}");
            console.log("🎯 New order flag detected:", newOrderData);
            if (newOrderData.referenceNumber) {
                updateConnectionStatus('updating');
                setTimeout(() => {
                    triggerDataRefresh();
                    showNewOrderNotification(newOrderData.referenceNumber);
                }, 200);
            }
        } catch (error) {
            console.error("Error parsing new order data:", error);
        }
    }
};

// Enhanced data refresh function
const triggerDataRefresh = () => {
    console.log("🔄 Triggering comprehensive data refresh");
    updateConnectionStatus('updating');
    
    setTimeout(() => {
        loadOrders();
        updateDataIntegrityStatus();
        renderOrders();
        updateOrderStats();
        checkForNewOrders();
        updateConnectionStatus('connected');
        console.log("✅ Data refresh completed");
    }, 100);
};

// Enhanced BroadcastChannel handling
const setupBroadcastChannel = () => {
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const channel = new BroadcastChannel('speedyDeliveryChannel');
            channel.onmessage = (event) => {
                console.log("📡 BroadcastChannel message received:", event.data);
                if (event.data.type === 'ordersUpdated') {
                    triggerDataRefresh();
                }
            };
            console.log("✅ BroadcastChannel listener setup complete");
        } catch (error) {
            console.log("BroadcastChannel not supported:", error);
        }
    }
};

// Enhanced IndexedDB monitoring
const setupIndexedDBMonitoring = () => {
    if (typeof indexedDB !== 'undefined') {
        try {
            const request = indexedDB.open('speedyDeliveryDB', 1);
            request.onsuccess = function(event) {
                const db = event.target.result;
                
                // Poll IndexedDB for changes
                setInterval(() => {
                    try {
                        const transaction = db.transaction(['orders'], 'readonly');
                        const store = transaction.objectStore('orders');
                        const getRequest = store.get('lastUpdate');
                        
                        getRequest.onsuccess = function(event) {
                            const result = event.target.result;
                            if (result && result.timestamp) {
                                const lastCheck = localStorage.getItem('lastIndexedDBCheck');
                                if (!lastCheck || result.timestamp > lastCheck) {
                                    console.log("📡 IndexedDB change detected");
                                    localStorage.setItem('lastIndexedDBCheck', result.timestamp);
                                    triggerDataRefresh();
                                }
                            }
                        };
                    } catch (error) {
                        console.log("IndexedDB polling error:", error);
                    }
                }, 3000); // Check every 3 seconds
            };
        } catch (error) {
            console.log("IndexedDB monitoring not available:", error);
        }
    }
};

// Enhanced polling system with multiple triggers
const setupEnhancedPolling = () => {
    // Primary polling - every 3 seconds
    setInterval(() => {
        const currentOrderCount = orders.size;
        loadOrders();
        
        if (orders.size !== currentOrderCount) {
            console.log("🔄 Order count changed during polling");
            triggerDataRefresh();
        }
    }, 3000);
    
    // Secondary polling - check for poll triggers
    setInterval(() => {
        const pollTrigger = localStorage.getItem('speedyDeliveryPollTrigger');
        const lastPoll = localStorage.getItem('lastPollTriggerCheck');
        
        if (pollTrigger && pollTrigger !== lastPoll) {
            console.log("🔄 Poll trigger detected");
            localStorage.setItem('lastPollTriggerCheck', pollTrigger);
            triggerDataRefresh();
        }
    }, 1000);
    
    // Emergency polling - every 10 seconds as fallback
    setInterval(() => {
        console.log("🔄 Emergency polling check");
        const beforeCount = orders.size;
        loadOrders();
        
        if (orders.size !== beforeCount) {
            console.log("🚨 Emergency polling detected changes");
            triggerDataRefresh();
        }
    }, 10000);
};

// Enhanced initialization with all sync methods
const initDriverPortal = () => {
    console.log("🚀 Initializing Enhanced Driver Portal with ALL sync methods");
    
    // Load orders and verify data
    loadOrders();
    testDataIntegrity();
    monitorDataIntegrity();
    
    // Setup all synchronization methods
    setupBroadcastChannel();
    setupIndexedDBMonitoring();
    setupEnhancedPolling();
    
    // Setup real-time monitoring
    setupRealTimeMonitoring();
    
    // Setup photo upload
    setupPhotoUpload();
    
    // Initial render
    renderOrders();
    updateOrderStats();
    updateDataIntegrityStatus();
    
    // Start automated monitoring
    startAutomatedDataIntegrityMonitoring();
    
    // Setup filter and refresh
    const statusFilter = getElement("status-filter");
    if (statusFilter) {
        statusFilter.addEventListener("change", filterOrders);
    }
    
    const refreshBtn = getElement("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", refreshOrders);
    }
    
    // Enhanced storage event listeners
    window.addEventListener("storage", handleStorageChange);
    
    // Custom event listeners
    window.addEventListener("ordersUpdated", (event) => {
        console.log("📡 Custom ordersUpdated event received:", event.detail);
        triggerDataRefresh();
    });
    
    window.addEventListener("newOrderPlaced", (event) => {
        console.log("📡 Custom newOrderPlaced event received:", event.detail);
        triggerDataRefresh();
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopAutomatedDataIntegrityMonitoring();
    });
    
    console.log("✅ Enhanced Driver Portal initialized with ALL synchronization methods");
};

// Enhanced initialization with comprehensive real-time capabilities
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚚 Initializing Enhanced Driver Portal with Real-Time Updates");
    
    // Initial load
            loadOrders();
    renderOrders(true); // Show loading on initial load
            updateOrderStats();
    
    // Setup photo upload preview
    setupPhotoUpload();
    
    // Setup comprehensive real-time monitoring
    setupRealTimeMonitoring();
    
    // Enhanced storage event listening (for cross-tab updates)
    window.addEventListener("storage", handleStorageChange);
    console.log("📡 Storage event listener attached");
    
    // Enhanced custom event listening (for same-tab updates)
    window.addEventListener("ordersUpdated", handleOrdersUpdated);
    console.log("📡 Orders updated event listener attached");
    
    // Enhanced new order event listening
    window.addEventListener("newOrderPlaced", handleNewOrderPlaced);
    console.log("📡 New order event listener attached");
    
    // Setup aggressive periodic refresh for maximum reliability
    setInterval(() => {
        loadOrders();
        renderOrders(); // No loading indicator for automatic updates
        updateOrderStats();
        checkForNewOrders();
    }, 5000); // Check every 5 seconds for maximum responsiveness
    
    // Enhanced page visibility handling
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            console.log("🔄 Page became visible - immediate refresh");
            loadOrders();
            renderOrders(); // No loading indicator for visibility changes
            updateOrderStats();
            checkForNewOrders();
        }
    });
    
    // Window focus handling for immediate updates
    window.addEventListener("focus", () => {
        console.log("🎯 Window focused - immediate refresh");
        loadOrders();
        renderOrders(); // No loading indicator for focus events
        updateOrderStats();
        checkForNewOrders();
    });
    
    // Add manual refresh button functionality
    const refreshButton = document.querySelector('[onclick="refreshOrders()"]');
    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            console.log("🔄 Manual refresh triggered");
            refreshOrders();
        });
    }
    
    isInitialLoad = false;
    console.log("✅ Enhanced driver portal initialized with comprehensive real-time monitoring");
});

// Enhanced real-time monitoring system
const setupRealTimeMonitoring = () => {
    console.log("🔧 Setting up comprehensive real-time monitoring");
    
    // Method 1: Enhanced broadcast channel setup
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('speedyDeliveryChannel');
        channel.onmessage = (event) => {
                console.log("📢 Broadcast message received:", event.data);
            
            if (event.data.type === 'newOrder') {
                setTimeout(() => {
                    loadOrders();
                    renderOrders(); // No loading indicator for broadcast updates
                    updateOrderStats();
                    showNewOrderNotification(event.data.referenceNumber);
                    playNotificationSound();
                    flashBrowserTab();
                }, 100);
            } else if (event.data.type === 'ordersUpdated') {
                setTimeout(() => {
                    loadOrders();
                    renderOrders(); // No loading indicator for broadcast updates
                    updateOrderStats();
                    checkForNewOrders();
                }, 100);
            }
        };
        
        // Store channel reference
        window.speedyDeliveryChannel = channel;
        console.log("📡 BroadcastChannel established");
    }
    
    // Method 2: Enhanced order count monitoring
    let lastUpdateTime = 0;
    setInterval(() => {
        const currentCount = orders.size;
        const lastUpdateStr = localStorage.getItem('speedyDeliveryLastUpdate');
        const currentUpdateTime = lastUpdateStr ? parseInt(lastUpdateStr) : 0;
        
        // Check if there's been an update since last check
        if (currentUpdateTime > lastUpdateTime) {
            console.log("🚨 Update timestamp changed - refreshing");
            loadOrders();
            renderOrders(); // No loading indicator for timestamp monitoring
            updateOrderStats();
            checkForNewOrders();
            lastUpdateTime = currentUpdateTime;
        }
        
        // Check for order count changes
        if (currentCount > lastOrderCount && !isInitialLoad) {
            console.log("📊 Order count increased - new orders detected");
            checkForNewOrders();
            playNotificationSound();
            flashBrowserTab();
        }
        lastOrderCount = currentCount;
    }, 2000); // Check every 2 seconds for maximum responsiveness
    
    // Method 3: Listen for window messages (for iframe communication)
    window.addEventListener('message', (event) => {
        if (event.data.type === 'speedyDeliveryUpdate') {
            console.log("📨 Window message received:", event.data);
            loadOrders();
            renderOrders(); // No loading indicator for message events
            updateOrderStats();
            checkForNewOrders();
        }
    });
    
    console.log("✅ Real-time monitoring setup complete");
};

// Check for new orders and show notifications
const checkForNewOrders = () => {
    const newOrders = Array.from(orders.values()).filter(order => {
        const orderTime = new Date(order.timestamp);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return orderTime > fiveMinutesAgo && order.status === "Order Placed and Received";
    });
    
    if (newOrders.length > 0) {
        console.log(`🎉 Found ${newOrders.length} new orders`);
        newOrders.forEach(order => {
            showNewOrderNotification(order.referenceNumber);
        });
    }
};

// Enhanced new order notification system
const showNewOrderNotification = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    if (!order) return;
    
    // COMPREHENSIVE DATA VERIFICATION FOR DRIVER PORTAL
    console.log("🔍 DRIVER PORTAL DATA VERIFICATION:");
    console.log("✓ Order Reference:", referenceNumber);
    console.log("✓ Customer Name:", order.customerName);
    console.log("✓ Customer Phone:", order.customerPhone);
    console.log("✓ Store Name:", order.storeName);
    console.log("✓ Items:", order.items);
    console.log("✓ Custom Request:", order.customRequest);
    console.log("✓ Eco-Friendly:", order.ecoFriendly);
    console.log("✓ Status:", order.status);
    console.log("✓ Timestamp:", order.timestamp);
    
    // Verify customer data integrity
    if (!order.customerName || !order.customerPhone) {
        console.error("🚨 DRIVER PORTAL ERROR: Missing customer information!");
        console.error("Customer Name:", order.customerName);
        console.error("Customer Phone:", order.customerPhone);
        showAlert("Order received but customer information is missing!", "warning");
    } else {
        console.log("✅ Customer data integrity check: PASSED");
    }
    
    // Create notification
    const notification = document.createElement("div");
    notification.className = "alert alert-success alert-dismissible fade show new-order-notification";
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 350px;
        animation: slideInRight 0.5s ease-out;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    notification.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-bell fa-2x text-success me-3"></i>
            <div class="flex-grow-1">
                <h6 class="mb-1">🎉 New Order Received!</h6>
                <p class="mb-1"><strong>Ref:</strong> ${referenceNumber}</p>
                <p class="mb-1"><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                <p class="mb-1"><strong>Phone:</strong> <a href="tel:${order.customerPhone || ''}" class="text-decoration-none text-primary">${order.customerPhone || 'N/A'}</a></p>
                <p class="mb-1"><strong>Store:</strong> ${order.storeName}</p>
                <p class="mb-0"><strong>Items:</strong> ${order.items.slice(0, 2).join(", ")}${order.items.length > 2 ? '...' : ''}</p>
            </div>
        </div>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
    
    // Play sound and flash
    playNotificationSound();
    flashBrowserTab();
    
    // Update data integrity status with new order
    updateDataIntegrityStatus();
};

// Play notification sound
const playNotificationSound = () => {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCjy+3/jIbi4HK4DN8+mHOQgcd8J02FsPDFat7/fSdCsH...');
        audio.volume = 0.3;
        audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (error) {
        console.log("Could not play notification sound:", error);
    }
};

// Flash browser tab for attention
const flashBrowserTab = () => {
    const originalTitle = document.title;
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        document.title = flashCount % 2 === 0 ? "🔴 NEW ORDER!" : "🟢 Driver Portal";
        flashCount++;
        if (flashCount >= 10) {
            clearInterval(flashInterval);
            document.title = originalTitle;
        }
    }, 500);
};

// Enhanced order rendering with smooth updates (no flickering)
const renderOrders = (showLoading = false) => {
    const orderList = getElement("order-list");
    const ordersLoading = getElement("orders-loading");
    const ordersEmpty = getElement("orders-empty");
    
    if (!orderList) return;
    
    // Only show loading on explicit refresh or initial load
    if (showLoading && ordersLoading) {
        ordersLoading.style.display = "block";
    }

    // Apply filters
    applyFilters();
    
    // Hide loading immediately (no delay)
        if (ordersLoading) {
            ordersLoading.style.display = "none";
        }
        
    // Handle empty state
        if (filteredOrders.size === 0) {
            if (ordersEmpty) {
                ordersEmpty.style.display = "block";
            }
        orderList.innerHTML = ""; // Clear only when empty
            return;
        }
        
        if (ordersEmpty) {
            ordersEmpty.style.display = "none";
        }
        
        // Sort orders by timestamp (newest first)
        const sortedOrders = Array.from(filteredOrders.entries()).sort((a, b) => {
            return new Date(b[1].timestamp) - new Date(a[1].timestamp);
        });
        
    // Smart update: only rebuild if content actually changed
    const newContent = sortedOrders.map(([referenceNumber, order]) => {
        return createOrderCard(order).outerHTML;
    }).join('');
    
    // Only update if content is different (prevents unnecessary flickering)
    if (orderList.innerHTML !== newContent) {
        orderList.innerHTML = newContent;
        console.log(`📊 Rendered ${sortedOrders.length} orders (updated)`);
    } else {
        console.log(`📊 ${sortedOrders.length} orders (no changes)`);
    }
    
    // Update data integrity status after rendering
    updateDataIntegrityStatus();
};

// Enhanced order card creation
const createOrderCard = (order) => {
    const card = document.createElement("div");
    card.className = "col-lg-6 col-md-6 mb-4";
    
    const statusClass = getStatusClass(order.status);
    const statusIcon = getStatusIcon(order.status);
    
    card.innerHTML = `
        <div class="card animate-on-scroll">
            <div class="card-body">
                <div class="card-title">
                    <h5>
                        <i class="fas fa-receipt me-2" aria-hidden="true"></i>
                        Order #${order.referenceNumber.split('-')[1]}
                    </h5>
                    <span class="order-reference">${order.referenceNumber}</span>
                </div>
                
                <div class="status-badge ${statusClass}">
                    <i class="fas fa-${statusIcon} me-2" aria-hidden="true"></i>
                    ${order.status}
                </div>
                
                <div class="order-info">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-user me-1" aria-hidden="true"></i>Customer:</strong> ${order.customerName || 'N/A'}</p>
                            <p><strong><i class="fas fa-phone me-1" aria-hidden="true"></i>Phone:</strong> <a href="tel:${order.customerPhone || ''}" class="text-decoration-none text-primary">${order.customerPhone || 'N/A'}</a></p>
                            <p><strong><i class="fas fa-store me-1" aria-hidden="true"></i>Store:</strong> ${order.storeName}</p>
                            <p><strong><i class="fas fa-clock me-1" aria-hidden="true"></i>Order Time:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong><i class="fas fa-map-marker-alt me-1" aria-hidden="true"></i>Location:</strong> ${order.location}</p>
                            ${order.estimatedDelivery ? `<p><strong><i class="fas fa-truck me-1" aria-hidden="true"></i>ETA:</strong> ${new Date(order.estimatedDelivery).toLocaleString()}</p>` : ""}
                            ${order.paymentConfirmed ? '<p><strong><i class="fas fa-check-circle me-1 text-success" aria-hidden="true"></i>Payment:</strong> Confirmed</p>' : '<p><strong><i class="fas fa-exclamation-triangle me-1 text-warning" aria-hidden="true"></i>Payment:</strong> Pending</p>'}
                            <p><strong><i class="fas fa-leaf me-1" aria-hidden="true"></i>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
                        </div>
                    </div>
                </div>
                
                <div class="order-items">
                    <h6><i class="fas fa-list me-2" aria-hidden="true"></i>Items to Collect:</h6>
                    <ul class="item-list">
                        ${order.items.map(item => `<li><i class="fas fa-chevron-right me-2 text-muted" aria-hidden="true"></i>${item}</li>`).join('')}
                    </ul>
                </div>
                
                ${order.customRequest ? `
                    <div class="order-items">
                        <h6><i class="fas fa-comment me-2" aria-hidden="true"></i>Special Instructions:</h6>
                        <p class="mb-0">${order.customRequest}</p>
                    </div>
                ` : ''}
                
                <div class="order-actions">
                    <button class="btn btn-info btn-sm" onclick="showOrderDetails('${order.referenceNumber}')">
                        <i class="fas fa-eye me-2" aria-hidden="true"></i>
                        View Details
                    </button>
                    ${renderActionButtons(order)}
                </div>
            </div>
        </div>
    `;
    
    return card;
};

// Enhanced status update buttons
const renderActionButtons = (order) => {
    const statuses = [
        "Order Placed and Received",
        "Payment Confirmed - Driver Assigned",
        "Driver on the Way to Store",
        "At the Store",
        "Shopping",
        "On the Way to Customer",
        "Delivered"
    ];
    
    const currentIndex = statuses.indexOf(order.status);

    if (currentIndex === statuses.length - 1) {
        return `
            <div class="d-flex align-items-center text-success">
                <i class="fas fa-check-double me-2" aria-hidden="true"></i>
                <strong>Order Completed</strong>
            </div>
        `;
    }
    
    if (currentIndex === -1) {
        return '<span class="text-muted">Status unknown</span>';
    }

    const nextStatus = statuses[currentIndex + 1];
    const buttonConfig = getButtonConfig(nextStatus);
    
    if (nextStatus === "Delivered") {
        return `
            <button class="btn btn-success btn-sm" onclick="initiateDelivery('${order.referenceNumber}')">
                <i class="fas fa-camera me-2" aria-hidden="true"></i>
                Complete Delivery
            </button>
        `;
    }

    return `
        <button class="btn ${buttonConfig.class} btn-sm" onclick="updateOrderStatus('${order.referenceNumber}', '${nextStatus}')">
            <i class="fas fa-${buttonConfig.icon} me-2" aria-hidden="true"></i>
            ${buttonConfig.label}
        </button>
    `;
};

// Button configuration for different statuses
const getButtonConfig = (status) => {
    const configs = {
        "Payment Confirmed - Driver Assigned": { 
            class: "btn-primary", 
            icon: "route", 
            label: "Head to Store" 
        },
        "Driver on the Way to Store": { 
            class: "btn-warning", 
            icon: "store", 
            label: "Arrived at Store" 
        },
        "At the Store": { 
            class: "btn-info", 
            icon: "shopping-cart", 
            label: "Start Shopping" 
        },
        "Shopping": { 
            class: "btn-success", 
            icon: "shipping-fast", 
            label: "Head to Customer" 
        },
        "On the Way to Customer": { 
            class: "btn-danger", 
            icon: "camera", 
            label: "Complete Delivery" 
        }
    };
    
    return configs[status] || { class: "btn-secondary", icon: "arrow-right", label: "Next Step" };
};

// Enhanced status class mapping
const getStatusClass = (status) => {
    const statusClasses = {
        "Order Placed and Received": "status-placed",
        "Payment Confirmed - Driver Assigned": "status-confirmed",
        "Driver on the Way to Store": "status-preparing",
        "At the Store": "status-preparing", 
        "Shopping": "status-shopping",
        "On the Way to Customer": "status-ready",
        "Delivered": "status-delivered"
    };
    return statusClasses[status] || "status-placed";
};

// Enhanced status icon mapping
const getStatusIcon = (status) => {
    const iconMap = {
        "Order Placed and Received": "receipt",
        "Payment Confirmed - Driver Assigned": "check-circle",
        "Driver on the Way to Store": "route",
        "At the Store": "store",
        "Shopping": "shopping-cart",
        "On the Way to Customer": "shipping-fast",
        "Delivered": "check-double"
    };
    return iconMap[status] || "info-circle";
};

// Enhanced order details modal
const showOrderDetails = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    if (!order) return;
    
    // VERIFY ORDER DETAILS DATA INTEGRITY
    console.log("🔍 ORDER DETAILS DATA VERIFICATION:");
    console.log("✓ Reference:", referenceNumber);
    console.log("✓ Customer Name:", order.customerName);
    console.log("✓ Customer Phone:", order.customerPhone);
    console.log("✓ All customer data present:", 
        order.customerName && order.customerPhone ? "✅ YES" : "❌ NO");
    
    const modalBody = getElement("orderModalBody");
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6><i class="fas fa-info-circle me-2" aria-hidden="true"></i>Order Information</h6>
                <table class="table table-sm">
                    <tbody>
                        <tr>
                            <th>Reference:</th>
                            <td><code>${order.referenceNumber}</code></td>
                        </tr>
                        <tr>
                            <th>Customer:</th>
                            <td><strong>${order.customerName || 'N/A'}</strong></td>
                        </tr>
                        <tr>
                            <th>Phone:</th>
                            <td><a href="tel:${order.customerPhone || ''}" class="text-decoration-none text-primary">${order.customerPhone || 'N/A'}</a></td>
                        </tr>
                        <tr>
                            <th>Store:</th>
                            <td>${order.storeName}</td>
                        </tr>
                        <tr>
                            <th>Order Time:</th>
                            <td>${new Date(order.timestamp).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <th>Status:</th>
                            <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
                        </tr>
                        <tr>
                            <th>Payment:</th>
                            <td>${order.paymentConfirmed ? '<span class="text-success">Confirmed</span>' : '<span class="text-warning">Pending</span>'}</td>
                        </tr>
                        <tr>
                            <th>Eco-Friendly:</th>
                            <td>${order.ecoFriendly ? 'Yes' : 'No'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="col-md-6">
                <h6><i class="fas fa-map-marker-alt me-2" aria-hidden="true"></i>Delivery Information</h6>
                <table class="table table-sm">
                    <tbody>
                        <tr>
                            <th>Location:</th>
                            <td>${order.location}</td>
                        </tr>
                        ${order.estimatedDelivery ? `
                            <tr>
                                <th>ETA:</th>
                                <td>${new Date(order.estimatedDelivery).toLocaleString()}</td>
                            </tr>
                        ` : ''}
                        ${order.lastUpdated ? `
                            <tr>
                                <th>Last Updated:</th>
                                <td>${new Date(order.lastUpdated).toLocaleString()}</td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="row mt-3">
            <div class="col-12">
                <h6><i class="fas fa-list me-2" aria-hidden="true"></i>Items to Collect</h6>
                <ul class="list-group">
                    ${order.items.map(item => `<li class="list-group-item">${item}</li>`).join('')}
                </ul>
            </div>
        </div>
        
        ${order.customRequest ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6><i class="fas fa-comment me-2" aria-hidden="true"></i>Special Instructions</h6>
                    <div class="alert alert-info">
                        ${order.customRequest}
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${order.deliveryPhoto ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6><i class="fas fa-camera me-2" aria-hidden="true"></i>Delivery Photo</h6>
                    <img src="${order.deliveryPhoto}" class="img-fluid rounded" alt="Delivery confirmation">
                </div>
            </div>
        ` : ''}
        
        <!-- DATA INTEGRITY VERIFICATION SECTION -->
        <div class="row mt-3">
            <div class="col-12">
                <div class="alert alert-info">
                    <h6><i class="fas fa-check-circle me-2" aria-hidden="true"></i>Data Integrity Check</h6>
                    <small>
                        <strong>Customer Name:</strong> ${order.customerName ? '✅ Present' : '❌ Missing'}<br>
                        <strong>Customer Phone:</strong> ${order.customerPhone ? '✅ Present' : '❌ Missing'}<br>
                        <strong>Complete Data:</strong> ${order.customerName && order.customerPhone ? '✅ All customer data verified' : '❌ Missing customer information'}
                    </small>
                </div>
            </div>
        </div>
    `;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
};

// Enhanced delivery initiation
const initiateDelivery = (referenceNumber) => {
    currentOrderRef = referenceNumber;
    const modal = new bootstrap.Modal(document.getElementById('photoModal'));
    modal.show();
};

// Enhanced photo upload setup
const setupPhotoUpload = () => {
    const photoInput = getElement("deliveryPhoto");
    const photoPreview = getElement("photoPreview");
    const previewImage = getElement("previewImage");
    const confirmBtn = getElement("confirmDeliveryBtn");
    
    if (!photoInput) return;
    
    photoInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
                if (previewImage) {
                    previewImage.src = e.target.result;
                }
                if (photoPreview) {
                    photoPreview.style.display = "block";
                }
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                }
        };
        reader.readAsDataURL(file);
        }
    });
};

// Enhanced delivery confirmation
const confirmDeliveryWithPhoto = () => {
    const photoInput = getElement("deliveryPhoto");
    const confirmBtn = getElement("confirmDeliveryBtn");
    
    if (!photoInput || !photoInput.files[0]) {
        showAlert("Please select a photo to confirm delivery!", "warning");
        return;
    }
    
    // Show loading
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    
    const file = photoInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Update order with photo
        updateOrderStatus(currentOrderRef, "Delivered", e.target.result);
        
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('photoModal'));
        modal.hide();
        
        // Reset form
        photoInput.value = '';
        document.getElementById('photoPreview').style.display = 'none';
        
        // Reset button
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check me-2"></i>Confirm Delivery';
        
        showAlert("Delivery confirmed successfully!", "success");
    };
    
    reader.readAsDataURL(file);
};

// Enhanced order filtering
const applyFilters = () => {
    const statusFilter = getElement("status-filter");
    const filterValue = statusFilter ? statusFilter.value : "";
    
    filteredOrders.clear();
    
    orders.forEach((order, referenceNumber) => {
        if (!filterValue || order.status === filterValue) {
            filteredOrders.set(referenceNumber, order);
        }
    });
};

const filterOrders = () => {
    renderOrders(); // No loading indicator for filtering
    updateOrderStats();
};

// Enhanced order statistics
const updateOrderStats = () => {
    const totalOrdersElement = getElement("total-orders");
    const activeOrders = Array.from(orders.values()).filter(order => 
        order.status !== "Delivered" && order.status !== "Cancelled"
    );
    
    if (totalOrdersElement) {
        totalOrdersElement.textContent = activeOrders.length;
    }
    
    // Update connection status
    updateConnectionStatus('connected');
    
    console.log(`📊 Stats updated: ${activeOrders.length} active orders`);
};

// Enhanced order status update function with automated data integrity monitoring
const updateOrderStatus = (referenceNumber, newStatus, photo = null) => {
    const order = orders.get(referenceNumber);
    if (!order) return;

    // Log the status update for monitoring
    console.log(`🔄 AUTOMATED STATUS UPDATE: ${referenceNumber} -> ${newStatus}`);

    order.status = newStatus;
    order.lastUpdated = new Date().toISOString();
    
    if (photo) {
        order.deliveryPhoto = photo;
        console.log(`📸 Delivery photo added for order: ${referenceNumber}`);
    }
    
    // Update estimated delivery for certain statuses
    if (newStatus === "On the Way to Customer") {
        order.estimatedDelivery = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    }
    
    // Mark as completed with timestamp for completed orders
    if (newStatus === "Delivered") {
        order.completedAt = new Date().toISOString();
        order.deliveryConfirmed = true;
        console.log(`✅ Order ${referenceNumber} marked as DELIVERED at ${order.completedAt}`);
    }
    
    orders.set(referenceNumber, order);
    saveOrders();
    
    console.log(`📊 Order ${referenceNumber} updated to: ${newStatus}`);
    
    // AUTOMATED DATA INTEGRITY UPDATE - Real-time monitoring
    console.log(`🔍 AUTOMATED: Triggering data integrity update for status change`);
    updateDataIntegrityStatus();
    
    // Refresh display
    renderOrders(); // No loading indicator for status updates
    updateOrderStats();
    
    // Additional logging for completed orders
    if (newStatus === "Delivered") {
        console.log(`🎉 DELIVERY COMPLETED: Order ${referenceNumber} successfully delivered`);
        showAlert(`Order ${referenceNumber} marked as delivered!`, "success");
    }
};

// Save orders to localStorage
const saveOrders = () => {
    try {
        const ordersObj = Object.fromEntries(orders);
        localStorage.setItem("speedyDeliveryOrders", JSON.stringify(ordersObj));
        console.log("💾 Orders saved successfully");
    } catch (error) {
        console.error("Error saving orders:", error);
        showAlert("Error saving order. Please try again.", "danger");
    }
};

// Enhanced custom event handling with automated data integrity monitoring
const handleOrdersUpdated = (event) => {
    console.log("🔔 AUTOMATED: Orders updated event handler called:", event.detail);
    updateConnectionStatus('updating');
    
    setTimeout(() => {
        loadOrders();
        
        // AUTOMATED DATA INTEGRITY UPDATE - Orders updated event
        console.log(`🔍 AUTOMATED: Triggering data integrity update for orders updated event`);
        updateDataIntegrityStatus();
        
        renderOrders(); // No loading indicator for event-driven updates
        updateOrderStats();
        checkForNewOrders();
        updateConnectionStatus('connected');
    }, 100);
};

// Enhanced new order event handling
const handleNewOrderPlaced = (event) => {
    console.log("🎯 New order event handler called:", event.detail);
    updateConnectionStatus('updating');
    
    setTimeout(() => {
        loadOrders();
        renderOrders(); // No loading indicator for new order events
        updateOrderStats();
        checkForNewOrders();
        showNewOrderNotification(event.detail.referenceNumber);
        playNotificationSound();
        flashBrowserTab();
        updateConnectionStatus('connected');
    }, 100);
};

// Enhanced refresh function with comprehensive feedback
const refreshOrders = () => {
    console.log("🔄 Starting comprehensive order refresh");
    
    // Show syncing status
    updateConnectionStatus('updating');
    
    // Show loading state
    const ordersLoading = getElement("orders-loading");
    const orderList = getElement("order-list");
    
    if (ordersLoading) {
        ordersLoading.style.display = "block";
    }
    
    // Show temporary loading notification
    showAlert("🔄 Refreshing orders from server...", "info");
    
    // Force reload from storage
    loadOrders();
    
    // Wait a moment then render everything
    setTimeout(() => {
        renderOrders(true); // Show loading indicator only for manual refresh
        updateOrderStats();
        checkForNewOrders();
        
        // AUTOMATED DATA INTEGRITY UPDATE - Manual refresh
        console.log(`🔍 AUTOMATED: Triggering data integrity update for manual refresh`);
        updateDataIntegrityStatus();
        
        // Hide loading state
        if (ordersLoading) {
            ordersLoading.style.display = "none";
        }
        
        // Update connection status back to connected
        updateConnectionStatus('connected');
        
        // Show success notification
        const currentTime = new Date().toLocaleTimeString();
        showAlert(`✅ Orders refreshed successfully at ${currentTime}`, "success");
        
        console.log("✅ Order refresh completed successfully");
    }, 500);
};

// Enhanced alert system for better user feedback
const showAlert = (message, type = "info") => {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.temp-alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show temp-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Create temporary alert at top of page
    const tempAlert = document.createElement('div');
    tempAlert.innerHTML = alertHtml;
    tempAlert.style.position = 'fixed';
    tempAlert.style.top = '80px';
    tempAlert.style.right = '20px';
    tempAlert.style.zIndex = '1050';
    tempAlert.style.minWidth = '300px';
    tempAlert.style.maxWidth = '400px';
    document.body.appendChild(tempAlert);
    
    // Auto-remove after 3 seconds for success/info, 5 seconds for others
    const timeout = ['success', 'info'].includes(type) ? 3000 : 5000;
    setTimeout(() => {
        if (tempAlert.parentNode) {
        tempAlert.remove();
        }
    }, timeout);
};

// Enhanced error handling
window.addEventListener('error', (event) => {
    console.error('Driver Portal Error:', event.error);
    showAlert("An error occurred. Please refresh the page.", "danger");
});

// Enhanced online/offline detection
window.addEventListener('online', () => {
    showAlert("Connection restored. Refreshing orders...", "success");
    refreshOrders();
});

window.addEventListener('offline', () => {
    showAlert("Connection lost. Working in offline mode.", "warning");
});

// Update connection status and last update timestamp
const updateConnectionStatus = (status = 'connected') => {
    const connectionStatus = getElement("connection-status");
    const connectionText = getElement("connection-text");
    const lastUpdateText = getElement("last-update-text");
    
    if (connectionStatus && connectionText) {
        if (status === 'connected') {
            connectionStatus.textContent = '🟢';
            connectionText.textContent = 'Live';
            connectionText.className = 'status-text text-success';
        } else if (status === 'updating') {
            connectionStatus.textContent = '🟡';
            connectionText.textContent = 'Syncing...';
            connectionText.className = 'status-text text-warning';
        } else {
            connectionStatus.textContent = '🔴';
            connectionText.textContent = 'Offline';
            connectionText.className = 'status-text text-danger';
        }
    }
    
    if (lastUpdateText) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        lastUpdateText.textContent = `Last updated: ${timeStr}`;
    }
};

// AUTOMATED BACKGROUND DATA INTEGRITY MONITORING SYSTEM
let dataIntegrityMonitorInterval = null;

const startAutomatedDataIntegrityMonitoring = () => {
    console.log("🤖 Starting automated background data integrity monitoring...");
    
    // Clear any existing interval
    if (dataIntegrityMonitorInterval) {
        clearInterval(dataIntegrityMonitorInterval);
    }
    
    // Update immediately
    updateDataIntegrityStatus();
    
    // Set up automated monitoring every 10 seconds
    dataIntegrityMonitorInterval = setInterval(() => {
        console.log("🤖 AUTOMATED: Background data integrity check running...");
        updateDataIntegrityStatus();
        
        // Also update connection status
        updateConnectionStatus('connected');
        
        // Log current status for debugging
        const totalOrders = orders.size;
        let completeData = 0;
        orders.forEach((order) => {
            if (order.customerName && order.customerPhone && order.storeName && order.items) {
                completeData++;
            }
        });
        
        console.log(`🤖 AUTOMATED MONITOR: ${completeData}/${totalOrders} orders have complete data`);
        
    }, 10000); // Every 10 seconds
    
    console.log("✅ Automated data integrity monitoring started (every 10 seconds)");
};

const stopAutomatedDataIntegrityMonitoring = () => {
    if (dataIntegrityMonitorInterval) {
        clearInterval(dataIntegrityMonitorInterval);
        dataIntegrityMonitorInterval = null;
        console.log("⏹️ Automated data integrity monitoring stopped");
    }
};

// Enhanced data integrity status with real-time delivery tracking
const updateDataIntegrityStatus = () => {
    const totalOrders = orders.size;
    let completeData = 0;
    let incompleteData = 0;
    let deliveredOrders = 0;
    let activeOrders = 0;
    
    orders.forEach((order) => {
        // Check if order has complete customer data
        if (order.customerName && order.customerPhone && order.storeName && order.items) {
            completeData++;
        } else {
            incompleteData++;
        }
        
        // Track delivery status
        if (order.status === "Delivered") {
            deliveredOrders++;
        } else {
            activeOrders++;
        }
    });
    
    // Update header status
    const dataIntegrityStatus = getElement("data-integrity-status");
    const dataIntegrityText = getElement("data-integrity-text");
    
    if (dataIntegrityStatus && dataIntegrityText) {
        if (incompleteData === 0 && totalOrders > 0) {
            dataIntegrityStatus.textContent = "✅";
            dataIntegrityText.textContent = "All Good";
        } else if (incompleteData > 0) {
            dataIntegrityStatus.textContent = "⚠️";
            dataIntegrityText.textContent = `${incompleteData} Issues`;
        } else {
            dataIntegrityStatus.textContent = "🔍";
            dataIntegrityText.textContent = "No Data";
        }
    }
    
    // Update integrity panel badges with enhanced information
    const totalOrdersTracked = getElement("total-orders-tracked");
    const completeDataCount = getElement("complete-data-count");
    const incompleteDataCount = getElement("incomplete-data-count");
    const lastIntegrityCheck = getElement("last-integrity-check");
    
    if (totalOrdersTracked) {
        totalOrdersTracked.textContent = `${totalOrders} Orders (${activeOrders} Active, ${deliveredOrders} Delivered)`;
        totalOrdersTracked.className = "badge bg-info me-2";
    }
    
    if (completeDataCount) {
        completeDataCount.textContent = `${completeData} Complete Data`;
        completeDataCount.className = `badge bg-success me-2`;
    }
    
    if (incompleteDataCount) {
        incompleteDataCount.textContent = `${incompleteData} Missing Data`;
        incompleteDataCount.className = incompleteData > 0 ? `badge bg-warning me-2` : `badge bg-success me-2`;
    }
    
    if (lastIntegrityCheck) {
        const now = new Date();
        lastIntegrityCheck.textContent = `Updated: ${now.toLocaleTimeString()}`;
        lastIntegrityCheck.className = "badge bg-secondary";
    }
    
    // Log detailed status for monitoring
    const dataIntegrityPercentage = totalOrders > 0 ? ((completeData / totalOrders) * 100).toFixed(1) : 0;
    console.log(`📊 AUTOMATED DATA INTEGRITY: ${completeData}/${totalOrders} complete (${dataIntegrityPercentage}%)`);
    
    // Alert if data integrity is poor
    if (totalOrders > 0 && dataIntegrityPercentage < 80) {
        console.warn(`⚠️ DATA INTEGRITY WARNING: Only ${dataIntegrityPercentage}% of orders have complete data!`);
    }
    
    return {
        totalOrders,
        completeData,
        incompleteData,
        deliveredOrders,
        activeOrders,
        dataIntegrityPercentage
    };
};

// Export comprehensive data report
const exportDataReport = () => {
    console.log("📋 Generating comprehensive data report...");
    
    let report = {
        timestamp: new Date().toISOString(),
        summary: {
            totalOrders: orders.size,
            completeOrders: 0,
            incompleteOrders: 0
        },
        orders: [],
        issues: []
    };
    
    orders.forEach((order, ref) => {
        const isComplete = order.customerName && order.customerPhone && 
                         order.storeName && order.items && order.status;
        
        if (isComplete) {
            report.summary.completeOrders++;
        } else {
            report.summary.incompleteOrders++;
        }
        
        const orderReport = {
            referenceNumber: ref,
            customerName: order.customerName || 'MISSING',
            customerPhone: order.customerPhone || 'MISSING',
            storeName: order.storeName || 'MISSING',
            itemsCount: order.items ? order.items.length : 0,
            status: order.status || 'MISSING',
            timestamp: order.timestamp || 'MISSING',
            isComplete: isComplete
        };
        
        report.orders.push(orderReport);
        
        // Track specific issues
        if (!order.customerName) {
            report.issues.push(`${ref}: Missing customer name`);
        }
        if (!order.customerPhone) {
            report.issues.push(`${ref}: Missing customer phone`);
        }
    });
    
    console.log("📋 Comprehensive data report generated successfully");
    return report;
};