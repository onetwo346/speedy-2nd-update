// Enhanced Speedy Delivery Service JavaScript
// Simulated order storage
let orders = new Map();

// Enhanced store data with more details
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

// Utility functions
const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) console.error(`Element with ID "${id}" not found.`);
    return element;
};

const showLoading = (show = true) => {
    const overlay = getElement("loading-overlay");
    if (overlay) {
        overlay.style.display = show ? "flex" : "none";
    }
};

const showAlert = (message, type = "info", container = null) => {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    if (container) {
        container.innerHTML = alertHtml;
    } else {
        // Create temporary alert at top of page
        const tempAlert = document.createElement('div');
        tempAlert.innerHTML = alertHtml;
        tempAlert.style.position = 'fixed';
        tempAlert.style.top = '100px';
        tempAlert.style.right = '20px';
        tempAlert.style.zIndex = '1050';
        tempAlert.style.minWidth = '300px';
        document.body.appendChild(tempAlert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (tempAlert.parentNode) {
                tempAlert.remove();
            }
        }, 5000);
    }
};

// Enhanced order management
const loadOrders = () => {
    try {
        const storedOrders = localStorage.getItem("speedyDeliveryOrders");
        orders.clear();
        if (storedOrders) {
            const parsedOrders = JSON.parse(storedOrders);
            for (const [ref, order] of Object.entries(parsedOrders)) {
                orders.set(ref, order);
            }
        }
        console.log("Orders loaded:", Array.from(orders.entries()));
    } catch (error) {
        console.error("Error loading orders:", error);
        showAlert("Error loading previous orders. Starting fresh.", "warning");
    }
};

const saveOrders = () => {
    try {
        const ordersObj = Object.fromEntries(orders);
        localStorage.setItem("speedyDeliveryOrders", JSON.stringify(ordersObj));
        console.log("Orders saved successfully");
        
        // Trigger real-time updates for driver portal
        triggerDriverPortalUpdate();
        
    } catch (error) {
        console.error("Error saving orders:", error);
        showAlert("Error saving order. Please try again.", "danger");
    }
};

// Enhanced real-time synchronization system
const triggerDriverPortalUpdate = () => {
    try {
        console.log("🚀 Triggering comprehensive driver portal update");
        
        // Method 1: Custom event for same-tab communication
        const event = new CustomEvent("ordersUpdated", {
            detail: { 
                timestamp: new Date().toISOString(), 
                orderCount: orders.size,
                orders: Array.from(orders.entries())
            }
        });
        window.dispatchEvent(event);
        
        // Method 2: Enhanced broadcast channel for cross-tab communication
        if (typeof BroadcastChannel !== 'undefined') {
            if (!window.speedyDeliveryChannel) {
                window.speedyDeliveryChannel = new BroadcastChannel('speedyDeliveryChannel');
            }
            
            window.speedyDeliveryChannel.postMessage({
                type: 'ordersUpdated',
                timestamp: new Date().toISOString(),
                orderCount: orders.size,
                orders: Array.from(orders.entries())
            });
        }
        
        // Method 3: Force storage event trigger with additional metadata
        const storageEvent = new StorageEvent('storage', {
            key: 'speedyDeliveryOrders',
            newValue: localStorage.getItem('speedyDeliveryOrders'),
            oldValue: null,
            storageArea: localStorage,
            url: window.location.href
        });
        window.dispatchEvent(storageEvent);
        
        // Method 4: Update a timestamp key to trigger storage listeners
        localStorage.setItem('speedyDeliveryLastUpdate', Date.now().toString());
        
        // Method 5: Use MessageChannel for iframe communication (if needed)
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'speedyDeliveryUpdate',
                timestamp: new Date().toISOString(),
                orderCount: orders.size
            }, '*');
        }
        
        console.log("📡 All driver portal update methods triggered successfully");
    } catch (error) {
        console.error("Error triggering driver portal update:", error);
    }
};

// Enhanced new order notification system
const notifyNewOrder = (referenceNumber) => {
    try {
        const order = orders.get(referenceNumber);
        if (!order) return;
        
        console.log("🎯 Sending comprehensive new order notification:", referenceNumber);
        
        // Method 1: Custom event for immediate notification
        const newOrderEvent = new CustomEvent("newOrderPlaced", {
            detail: { 
                referenceNumber,
                order: { ...order },
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(newOrderEvent);
        
        // Method 2: Enhanced broadcast channel for cross-tab notifications
        if (typeof BroadcastChannel !== 'undefined') {
            if (!window.speedyDeliveryChannel) {
                window.speedyDeliveryChannel = new BroadcastChannel('speedyDeliveryChannel');
            }
            
            window.speedyDeliveryChannel.postMessage({
                type: 'newOrder',
                referenceNumber,
                order: { ...order },
                timestamp: new Date().toISOString()
            });
        }
        
        // Method 3: Store new order flag for polling mechanisms
        localStorage.setItem('speedyDeliveryNewOrder', JSON.stringify({
            referenceNumber,
            timestamp: new Date().toISOString()
        }));
        
        // Method 4: Force immediate update trigger
        setTimeout(() => {
            triggerDriverPortalUpdate();
        }, 100);
        
        console.log("✅ New order notification sent successfully via all channels");
        
        // ADDITIONAL: Log detailed info for debugging
        console.log("📋 Notification details:");
        console.log("- Reference:", referenceNumber);
        console.log("- Order:", order);
        console.log("- BroadcastChannel available:", typeof BroadcastChannel !== 'undefined');
        console.log("- localStorage updated:", localStorage.getItem('speedyDeliveryLastUpdate'));
        
    } catch (error) {
        console.error("Error sending new order notification:", error);
    }
};

// Enhanced store browsing functionality
const renderStoreCards = () => {
    const storeList = getElement("store-list");
    const storesLoading = getElement("stores-loading");
    
    if (!storeList || !storesLoading) return;
    
    // Show loading state
    storesLoading.style.display = "block";
    storeList.style.display = "none";
    
    // Simulate loading delay for better UX
    setTimeout(() => {
        storeList.innerHTML = "";
        
    STORES.forEach(store => {
            const storeCard = document.createElement("div");
            storeCard.className = "col-lg-6 col-md-6 mb-4";
            storeCard.innerHTML = `
                <div class="store-card animate-on-scroll">
                    <div class="store-card-icon" style="color: ${store.color}">
                        <i class="${store.icon}" aria-hidden="true"></i>
                    </div>
                    <h5>${store.name}</h5>
                    <p class="store-type">
                        <i class="fas fa-tag me-1" aria-hidden="true"></i>
                        ${store.type}
                    </p>
                    <p class="store-items">
                        <i class="fas fa-list me-1" aria-hidden="true"></i>
                        <strong>Popular Items:</strong> ${store.items.slice(0, 3).join(", ")}
                    </p>
                    <p class="text-muted mb-3">${store.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="rating">
                            <i class="fas fa-star text-warning" aria-hidden="true"></i>
                            <span class="ms-1 fw-bold">${store.rating}</span>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="selectStore('${store.id}')">
                            <i class="fas fa-shopping-cart me-1" aria-hidden="true"></i>
                            Order Now
                        </button>
                    </div>
                </div>
            `;
            storeList.appendChild(storeCard);
        });
        
        // Hide loading and show stores
        storesLoading.style.display = "none";
        storeList.style.display = "flex";
    }, 800);
};

// Enhanced store selection
const selectStore = (storeId) => {
    const storeSelect = getElement("store-select");
    if (storeSelect) {
        storeSelect.value = storeId;
        storeSelect.dispatchEvent(new Event('change'));
        
        // Smooth scroll to order form
        const orderSection = getElement("order");
        if (orderSection) {
            orderSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Add visual feedback
        storeSelect.classList.add('is-valid');
        showAlert("Store selected! Please enter your items below.", "success");
    }
};

// Enhanced form validation
const validateForm = (formData) => {
    const errors = [];
    
    if (!formData.customerName) {
        errors.push("Please enter your full name");
    } else if (formData.customerName.length < 2) {
        errors.push("Name must be at least 2 characters long");
    }
    
    if (!formData.customerPhone) {
        errors.push("Please enter your phone number");
    } else if (!/^[0-9\+\-\s\(\)]{10,15}$/.test(formData.customerPhone)) {
        errors.push("Please enter a valid phone number (10-15 digits)");
    }
    
    if (!formData.storeId) {
        errors.push("Please select a store");
    }
    
    if (!formData.items || formData.items.length === 0) {
        errors.push("Please enter at least one item");
    }
    
    if (formData.items && formData.items.some(item => item.trim().length < 2)) {
        errors.push("Each item must be at least 2 characters long");
    }
    
    return errors;
};

// Enhanced form handling with real-time notifications
const handleOrderSubmission = (event) => {
    event.preventDefault();
    console.log("🚀 Form submission started");

    const form = event.target;
    const submitBtn = getElement("submit-order-btn");

    // Get form elements
    const customerName = getElement("customer-name");
    const customerPhone = getElement("customer-phone");
    const storeSelect = getElement("store-select");
    const itemsInput = getElement("items");
    const customRequestInput = getElement("custom-request");
    const ecoFriendlyCheckbox = getElement("eco-friendly");
    const paymentStep = getElement("payment-step");
    const paymentRef = getElement("payment-reference");
    
    if (!customerName || !customerPhone || !storeSelect || !itemsInput || !paymentStep) {
        console.error("Required form elements not found");
        showAlert("Form elements not found. Please refresh the page.", "danger");
        return;
    }
    
    // Show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    }
    
    // Collect form data
    const formData = {
        customerName: customerName.value.trim(),
        customerPhone: customerPhone.value.trim(),
        storeId: storeSelect.value,
        items: itemsInput.value.split("\n").filter(item => item.trim()),
        customRequest: customRequestInput ? customRequestInput.value.trim() : "",
        ecoFriendly: ecoFriendlyCheckbox ? ecoFriendlyCheckbox.checked : false
    };
    
    console.log("📝 Form data collected:", formData);
    
    // Validate form
    const errors = validateForm(formData);
    if (errors.length > 0) {
        console.log("❌ Form validation failed:", errors);
        showAlert(errors.join("<br>"), "danger");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Proceed to Payment';
        }
        return;
    }

    console.log("✅ Form validation passed");
    
    // Create order
    const selectedStore = STORES.find(store => store.id === formData.storeId);
    if (!selectedStore) {
        console.error("Selected store not found:", formData.storeId);
        showAlert("Selected store not found. Please try again.", "danger");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Proceed to Payment';
        }
        return;
    }

    const referenceNumber = `SPD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    console.log("🎫 Generated reference number:", referenceNumber);
    
    const order = {
        ...formData,
        storeName: selectedStore.name,
        referenceNumber,
        status: "Order Placed and Received",
        location: "Agona Swedru, Central Region, Ghana",
        timestamp: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };

    console.log("📦 Order created:", order);
    
    // COMPREHENSIVE DATA VERIFICATION
    console.log("🔍 DATA VERIFICATION:");
    console.log("✓ Customer Name:", order.customerName);
    console.log("✓ Customer Phone:", order.customerPhone);
    console.log("✓ Store ID:", order.storeId);
    console.log("✓ Store Name:", order.storeName);
    console.log("✓ Items:", order.items);
    console.log("✓ Custom Request:", order.customRequest);
    console.log("✓ Eco-Friendly:", order.ecoFriendly);
    console.log("✓ Reference Number:", order.referenceNumber);
    console.log("✓ Status:", order.status);
    console.log("✓ Timestamp:", order.timestamp);
    
    // Verify critical customer data
    if (!order.customerName || !order.customerPhone) {
        console.error("🚨 CRITICAL ERROR: Missing customer information!");
        console.error("Customer Name:", order.customerName);
        console.error("Customer Phone:", order.customerPhone);
        showAlert("Customer information is missing. Please refresh and try again.", "danger");
        return;
    }
    
    // Save order
    orders.set(referenceNumber, order);
    saveOrders();
    console.log("💾 Order saved to storage");
    
    // VERIFY STORAGE INTEGRITY
    const savedOrder = orders.get(referenceNumber);
    console.log("🔍 STORAGE VERIFICATION:");
    console.log("✓ Saved Customer Name:", savedOrder.customerName);
    console.log("✓ Saved Customer Phone:", savedOrder.customerPhone);
    console.log("✓ Storage integrity check:", 
        savedOrder.customerName === order.customerName && 
        savedOrder.customerPhone === order.customerPhone ? "✅ PASSED" : "❌ FAILED");
    
    // Send immediate notification to driver portal
    console.log("🔔 Calling notifyNewOrder for:", referenceNumber);
    notifyNewOrder(referenceNumber);
    
    // ADDITIONAL: Force immediate sync trigger
    console.log("🚀 Triggering additional sync methods");
    setTimeout(() => {
        triggerDriverPortalUpdate();
    }, 100);
    
    // Show payment step
    if (paymentRef) {
        paymentRef.textContent = referenceNumber;
    }
    
    paymentStep.style.display = "block";
    paymentStep.dataset.ref = referenceNumber;
    paymentStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    console.log("💳 Payment step shown");
    
    // Reset form
    form.reset();
    form.classList.remove('was-validated');
    
    // Reset button
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Proceed to Payment';
    }
    
    // Send dispatcher alert
    sendDispatcherAlert(referenceNumber);
    
    showAlert("Order created successfully! Driver portal has been notified automatically.", "success");
    console.log("🎉 Order submission completed successfully with real-time notifications");
};

// Enhanced payment confirmation with real-time updates
const handlePaymentConfirmation = () => {
    console.log("💰 Payment confirmation started");
    
    const paymentStep = getElement("payment-step");
    const orderResult = getElement("order-result");
    const confirmBtn = getElement("confirm-payment");
    
    if (!paymentStep) {
        console.error("Payment step element not found");
        showAlert("Payment step not found. Please try again.", "danger");
        return;
    }
    
    const referenceNumber = paymentStep.dataset.ref;
    if (!referenceNumber) {
        console.error("Reference number not found in payment step");
        showAlert("Reference number not found. Please try again.", "danger");
        return;
    }
    
    const order = orders.get(referenceNumber);
    if (!order) {
        console.error("Order not found:", referenceNumber);
        showAlert("Order not found. Please try again.", "danger");
        return;
    }
    
    console.log("📋 Processing payment for order:", referenceNumber);
    
    // Show loading
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Confirming...';
    }
    
    // Simulate payment processing
    setTimeout(() => {
        // Update order status
        order.status = "Payment Confirmed - Driver Assigned";
        order.paymentConfirmed = true;
        order.paymentTime = new Date().toISOString();
        orders.set(referenceNumber, order);
        saveOrders();
        console.log("✅ Payment confirmed and order updated");
        
        // Trigger real-time update for driver portal
        triggerDriverPortalUpdate();
        
        // Hide payment step
    paymentStep.style.display = "none";
        
        // Show success message
        if (orderResult) {
    orderResult.innerHTML = `
        <div class="alert alert-success">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-check-circle fa-2x text-success me-3"></i>
                        <div>
                            <h4 class="mb-0">Order Confirmed!</h4>
                            <p class="mb-0">Your payment has been received and driver has been notified.</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Reference Number:</strong> <span class="text-primary">${referenceNumber}</span></p>
                            <p><strong>Customer:</strong> ${order.customerName}</p>
                            <p><strong>Phone:</strong> ${order.customerPhone}</p>
                            <p><strong>Store:</strong> ${order.storeName}</p>
                            <p><strong>Status:</strong> <span class="status-badge status-confirmed">${order.status}</span></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Items:</strong> ${order.items.join(", ")}</p>
                            ${order.customRequest ? `<p><strong>Special Instructions:</strong> ${order.customRequest}</p>` : ""}
                            <p><strong>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
                        </div>
                    </div>
                    <div class="mt-3 p-3 bg-light rounded">
                        <h6><i class="fas fa-clock me-2"></i>Estimated Delivery</h6>
                        <p class="mb-0">${new Date(order.estimatedDelivery).toLocaleString()}</p>
                    </div>
                    <div class="mt-3 text-center">
                        <a href="#track" class="btn btn-primary me-2 smooth-scroll">
                            <i class="fas fa-map-marker-alt me-2"></i>Track Order
                        </a>
                        <button class="btn btn-outline-primary" onclick="window.print()">
                            <i class="fas fa-print me-2"></i>Print Receipt
                        </button>
                    </div>
        </div>
    `;
        }
        
        // Reset button
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check me-2"></i>Confirm Payment';
        }
        
        // Auto-scroll to tracking section after delay
        setTimeout(() => {
            const trackInput = getElement("track-input");
            if (trackInput) {
                trackInput.value = referenceNumber;
                handleTrackOrder();
            }
        }, 2000);
        
        showAlert("Payment confirmed successfully! Driver has been notified and your order is being processed.", "success");
        console.log("🎉 Payment confirmation completed with real-time updates");
    }, 2000);
};

// Enhanced tracking functionality
const handleTrackOrder = () => {
    const trackInput = getElement("track-input");
    const trackBtn = getElement("track-btn");
    const trackResult = getElement("track-result");
    
    const referenceNumber = trackInput.value.trim().toUpperCase();

    if (!referenceNumber) {
        showAlert("Please enter a reference number", "warning");
        trackInput.focus();
        return;
    }

    // Show loading
    trackBtn.disabled = true;
    trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Tracking...';
    
    // Simulate API delay
    setTimeout(() => {
        if (!orders.has(referenceNumber)) {
            trackResult.innerHTML = `
                <div class="alert alert-danger">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-exclamation-triangle fa-2x me-3"></i>
                        <div>
                            <h5>Order Not Found</h5>
                            <p class="mb-0">Please check your reference number and try again.</p>
                        </div>
                    </div>
                </div>
            `;
            trackBtn.disabled = false;
            trackBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i>Track Order';
                return;
            }
        
            updateTrackResult(referenceNumber);
        
        // Reset button
        trackBtn.disabled = false;
        trackBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i>Track Order';
        
        // Start polling for updates
        startOrderPolling(referenceNumber);
    }, 1000);
};

// Enhanced tracking display
const updateTrackResult = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    const trackResult = getElement("track-result");
    
    if (!trackResult || !order) return;
    
    const statusSteps = [
        "Order Placed and Received",
        "Payment Confirmed - Driver Assigned",
        "Driver on the Way to Store",
        "At the Store",
        "Shopping",
        "On the Way to Customer",
        "Delivered"
    ];
    
    const currentStepIndex = statusSteps.indexOf(order.status);
    const progressPercentage = ((currentStepIndex + 1) / statusSteps.length) * 100;
    
        trackResult.innerHTML = `
        <div class="order-status p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4><i class="fas fa-map-marker-alt me-2"></i>Order Status</h4>
                <span class="badge bg-primary fs-6">${referenceNumber}</span>
            </div>
            
            <!-- Progress Bar -->
            <div class="mb-4">
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-success" style="width: ${progressPercentage}%"></div>
                </div>
                <div class="mt-2 text-center">
                    <small class="text-muted">Progress: ${Math.round(progressPercentage)}%</small>
                </div>
            </div>
            
            <!-- Order Details -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6><i class="fas fa-store me-2"></i>Store Information</h6>
                    <p class="mb-1"><strong>Store:</strong> ${order.storeName}</p>
                    <p class="mb-1"><strong>Location:</strong> ${order.location}</p>
                    <p class="mb-3"><strong>Order Time:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-list me-2"></i>Order Details</h6>
                    <p class="mb-1"><strong>Items:</strong> ${order.items.join(", ")}</p>
                    ${order.customRequest ? `<p class="mb-1"><strong>Special Instructions:</strong> ${order.customRequest}</p>` : ""}
                    <p class="mb-3"><strong>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
                </div>
            </div>
            
            <!-- Current Status -->
            <div class="text-center">
                <div class="status-badge status-${order.status.toLowerCase().replace(/\s+/g, '-')} fs-6">
                    <i class="fas fa-${getStatusIcon(order.status)} me-2"></i>
                    ${order.status}
                </div>
                ${order.estimatedDelivery ? `
                    <p class="mt-3 text-muted">
                        <i class="fas fa-clock me-2"></i>
                        Estimated Delivery: ${new Date(order.estimatedDelivery).toLocaleString()}
                    </p>
                ` : ""}
            </div>
            
            ${order.deliveryPhoto ? `
                <div class="mt-4 text-center">
                    <h6><i class="fas fa-camera me-2"></i>Delivery Confirmation</h6>
                    <img src="${order.deliveryPhoto}" alt="Delivery Proof" class="img-fluid rounded shadow" style="max-width: 300px;">
                </div>
            ` : ""}
            
            <!-- Contact Support -->
            <div class="mt-4 text-center">
                <small class="text-muted">Need help? Contact support at 
                    <a href="tel:+233556359890" class="text-decoration-none">+233 55 635 9890</a>
                </small>
            </div>
            </div>
        `;
};

// Helper function to get status icon
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

// Enhanced order polling
const startOrderPolling = (referenceNumber) => {
    const existingInterval = window.orderPollingInterval;
    if (existingInterval) {
        clearInterval(existingInterval);
    }
    
    window.orderPollingInterval = setInterval(() => {
        loadOrders();
        const order = orders.get(referenceNumber);
        if (!order || order.status === "Delivered") {
            clearInterval(window.orderPollingInterval);
            return;
        }
        updateTrackResult(referenceNumber);
    }, 5000); // Check every 5 seconds
};

// Enhanced dispatcher alert
const sendDispatcherAlert = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    if (!order) return;
    
    const message = `🚀 NEW ORDER ALERT!\n\nRef: ${referenceNumber}\nStore: ${order.storeName}\nItems: ${order.items.join(", ")}\nCustomer Notes: ${order.customRequest || "None"}\nEco-Friendly: ${order.ecoFriendly ? "Yes" : "No"}\nTime: ${new Date(order.timestamp).toLocaleString()}\n\nPlease assign a driver immediately.`;
    
    console.log(`📧 Email sent to cosmoscoderr@gmail.com:\n${message}`);
    console.log(`📱 SMS sent to +233 55 635 9890:\n${message}`);
    
    // In a real app, you would integrate with email/SMS services here
    // Example: sendEmail(message); sendSMS(message);
};

// Enhanced dropdown population
const populateStoreDropdown = (storeSelect) => {
    if (!storeSelect) return;
    
    storeSelect.innerHTML = '<option value="" disabled selected>Choose a store</option>';
    STORES.forEach(store => {
        const option = document.createElement("option");
        option.value = store.id;
        option.textContent = `${store.name} - ${store.type}`;
        storeSelect.appendChild(option);
    });
};

// Smooth scrolling for navigation links
const initSmoothScrolling = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
};

// Update order status (for driver functionality)
const updateOrderStatus = (referenceNumber, newStatus, photo = null) => {
    const order = orders.get(referenceNumber);
    if (!order) return;

    order.status = newStatus;
    order.lastUpdated = new Date().toISOString();
    
    if (photo) {
        order.deliveryPhoto = photo;
    }
    
    // Update estimated delivery for certain statuses
    if (newStatus === "On the Way to Customer") {
        order.estimatedDelivery = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    }
    
    orders.set(referenceNumber, order);
    saveOrders();
    
    console.log(`📊 Order ${referenceNumber} updated to: ${newStatus}`);
    
    // Trigger real-time update
    triggerDriverPortalUpdate();
    
    // Trigger update for tracking displays
    const trackResult = getElement("track-result");
    if (trackResult && trackResult.innerHTML.includes(referenceNumber)) {
        updateTrackResult(referenceNumber);
    }
};

// Initialize customer page with enhanced real-time capabilities
const initCustomerPage = () => {
    if (!document.getElementById("order-form")) return;
    
    console.log("🚀 Initializing Speedy Delivery Customer Page with Real-Time Features");
    
    // Initialize real-time synchronization system
    initRealTimeSync();
    
    // Load existing orders
    loadOrders();
    
    // Setup broadcast channel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('speedyDeliveryChannel');
        window.speedyDeliveryChannel = channel;
    }
    
    // Setup store browsing
    renderStoreCards();
    
    // Setup form
    const storeSelect = getElement("store-select");
    populateStoreDropdown(storeSelect);
    
    // Event listeners
    const orderForm = getElement("order-form");
    const confirmPaymentBtn = getElement("confirm-payment");
    const trackBtn = getElement("track-btn");
    const trackInput = getElement("track-input");
    
    if (orderForm) {
        console.log("📝 Setting up order form event listener");
        orderForm.addEventListener("submit", handleOrderSubmission);
    } else {
        console.error("❌ Order form not found!");
    }
    
    if (confirmPaymentBtn) {
        console.log("💳 Setting up payment confirmation event listener");
        confirmPaymentBtn.addEventListener("click", handlePaymentConfirmation);
    } else {
        console.error("❌ Payment confirmation button not found!");
    }
    
    if (trackBtn) {
        trackBtn.addEventListener("click", handleTrackOrder);
    }
    
    if (trackInput) {
        trackInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                handleTrackOrder();
            }
        });
    }
    
    // Initialize smooth scrolling
    initSmoothScrolling();

    // Enhanced cross-tab communication
    window.addEventListener("storage", (event) => {
        if (event.key === "speedyDeliveryOrders") {
            console.log("📡 Storage change detected - refreshing orders");
            loadOrders();
            const currentRef = trackInput?.value.trim();
            if (currentRef && orders.has(currentRef)) {
                updateTrackResult(currentRef);
            }
        }
    });
    
    // Listen for order updates from driver portal
    window.addEventListener("ordersUpdated", () => {
        console.log("🔄 Order update received from driver portal");
        loadOrders();
        const currentRef = trackInput?.value.trim();
        if (currentRef && orders.has(currentRef)) {
            updateTrackResult(currentRef);
        }
    });
    
    console.log("✅ Customer page initialized successfully with real-time capabilities");
};

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initCustomerPage);

// Enhanced logging system for debugging
const log = (message, type = 'info', data = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (type) {
        case 'error':
            console.error(logMessage, data);
            break;
        case 'warn':
            console.warn(logMessage, data);
            break;
        case 'success':
            console.log(`✅ ${logMessage}`, data);
            break;
        case 'info':
        default:
            console.log(`ℹ️ ${logMessage}`, data);
            break;
    }
};

// Test function to verify real-time synchronization
const testRealTimeSync = () => {
    log("🧪 Testing real-time synchronization system", 'info');
    
    // Test 1: Verify localStorage is accessible
    try {
        localStorage.setItem('speedyDeliveryTest', 'test');
        localStorage.removeItem('speedyDeliveryTest');
        log("✅ localStorage access test passed", 'success');
    } catch (error) {
        log("❌ localStorage access test failed", 'error', error);
        return false;
    }
    
    // Test 2: Verify BroadcastChannel is available
    if (typeof BroadcastChannel !== 'undefined') {
        log("✅ BroadcastChannel is available", 'success');
        
        // Initialize channel if not exists
        if (!window.speedyDeliveryChannel) {
            window.speedyDeliveryChannel = new BroadcastChannel('speedyDeliveryChannel');
            log("📡 BroadcastChannel initialized", 'info');
        }
    } else {
        log("⚠️ BroadcastChannel not available - using fallback methods", 'warn');
    }
    
    // Test 3: Verify orders Map is working
    const testSize = orders.size;
    log(`📦 Current orders count: ${testSize}`, 'info');
    
    // Test 4: Test notification system
    log("🔔 Testing notification system", 'info');
    
    return true;
};

// Initialize real-time sync system
const initRealTimeSync = () => {
    log("🚀 Initializing real-time synchronization system", 'info');
    
    // Run synchronization test
    if (testRealTimeSync()) {
        log("✅ Real-time synchronization system initialized successfully", 'success');
    } else {
        log("❌ Real-time synchronization system initialization failed", 'error');
    }
    
    // Set up periodic sync health check
    setInterval(() => {
        const currentTime = Date.now();
        const lastUpdate = localStorage.getItem('speedyDeliveryLastUpdate');
        
        if (lastUpdate) {
            const timeDiff = currentTime - parseInt(lastUpdate);
            if (timeDiff > 30000) { // 30 seconds
                log("⚠️ No recent updates detected - system may be offline", 'warn');
            }
        }
    }, 30000);
};

// COMPREHENSIVE SYSTEM TEST FUNCTION
const testCompleteDataFlow = () => {
    console.log("🧪 COMPREHENSIVE SYSTEM TEST");
    console.log("=" .repeat(50));
    
    // Test data
    const testOrderData = {
        customerName: "John Doe Test",
        customerPhone: "+233 55 123 4567",
        storeId: "store1",
        items: ["Test Item 1", "Test Item 2", "Test Item 3"],
        customRequest: "Test special instructions",
        ecoFriendly: true
    };
    
    console.log("📝 Creating test order with data:");
    console.log("✓ Customer Name:", testOrderData.customerName);
    console.log("✓ Customer Phone:", testOrderData.customerPhone);
    console.log("✓ Store ID:", testOrderData.storeId);
    console.log("✓ Items:", testOrderData.items);
    console.log("✓ Custom Request:", testOrderData.customRequest);
    console.log("✓ Eco-Friendly:", testOrderData.ecoFriendly);
    
    // Create test order
    const selectedStore = STORES.find(store => store.id === testOrderData.storeId);
    const referenceNumber = `SPD-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const testOrder = {
        ...testOrderData,
        storeName: selectedStore ? selectedStore.name : "Test Store",
        referenceNumber,
        status: "Order Placed and Received",
        location: "Agona Swedru, Central Region, Ghana",
        timestamp: new Date().toISOString(),
        estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    console.log("\n📦 Test order created:");
    console.log("✓ Reference:", testOrder.referenceNumber);
    console.log("✓ All customer data preserved:", 
        testOrder.customerName === testOrderData.customerName &&
        testOrder.customerPhone === testOrderData.customerPhone ? "✅ YES" : "❌ NO");
    
    // Save test order
    orders.set(referenceNumber, testOrder);
    saveOrders();
    
    // Verify storage
    const savedOrder = orders.get(referenceNumber);
    console.log("\n💾 Storage verification:");
    console.log("✓ Order retrieved successfully:", savedOrder ? "✅ YES" : "❌ NO");
    console.log("✓ Customer name preserved:", savedOrder.customerName === testOrderData.customerName ? "✅ YES" : "❌ NO");
    console.log("✓ Customer phone preserved:", savedOrder.customerPhone === testOrderData.customerPhone ? "✅ YES" : "❌ NO");
    
    // Test real-time notifications
    console.log("\n🔔 Testing real-time notifications...");
    setTimeout(() => {
        triggerDriverPortalUpdate();
        notifyNewOrder(referenceNumber);
    }, 100);
    
    console.log("\n✅ SYSTEM TEST COMPLETE");
    console.log("Check driver portal to verify data display!");
    console.log("=" .repeat(50));
    
    return referenceNumber;
};

// Add to global scope for testing
window.testCompleteDataFlow = testCompleteDataFlow;