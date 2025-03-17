// Simulated order storage (replacing Firebase for now)
let orders = new Map();

// Load orders from localStorage on page load
const loadOrders = () => {
    const storedOrders = localStorage.getItem("speedyDeliveryOrders");
    if (storedOrders) {
        const parsedOrders = JSON.parse(storedOrders);
        for (const [ref, order] of Object.entries(parsedOrders)) {
            orders.set(ref, order);
        }
    }
};

// Save orders to localStorage
const saveOrders = () => {
    const ordersObj = Object.fromEntries(orders);
    localStorage.setItem("speedyDeliveryOrders", JSON.stringify(ordersObj));
};

// Store data for Agona Swedru
const STORES = [
    { id: "1", name: "Wiafesco", type: "Cosmetics Store", items: ["Creams", "Soaps", "Perfumes"] },
    { id: "2", name: "Geneviva Lodge", type: "Hotel", items: ["Room Booking", "Meals", "Drinks"] },
    { id: "3", name: "Maryking Super Market", type: "Market", items: ["Milk", "Bread", "Rice"] },
    { id: "4", name: "Chekin Pizza", type: "Fast Food", items: ["Pizza", "Drinks", "Sides"] }
];

// Utility function to get DOM elements
const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) console.error(`Element with ID "${id}" not found.`);
    return element;
};

// Populate store dropdown
const populateStoreDropdown = (storeSelect) => {
    if (!storeSelect) return;
    storeSelect.innerHTML = '<option value="" disabled selected>Choose a store</option>';
    STORES.forEach(store => {
        const option = document.createElement("option");
        option.value = store.id;
        option.textContent = store.name;
        storeSelect.appendChild(option);
    });
};

// Simulate sending email and SMS (replace with real API calls)
const sendDispatcherAlert = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    const message = `New order placed! Ref: ${referenceNumber}, Store: ${order.storeName}, Items: ${order.items.join(", ")}`;
    
    console.log(`Email sent to cosmoscoderr@gmail.com: ${message}`);
    console.log(`SMS sent to +233 55 635 9890: ${message}`);
};

// Simulate order status updates with more accurate flow
const updateOrderStatus = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    if (!order) return;

    const statuses = [
        "Order Placed and Received",
        "Driver on the Way to Store",
        "Shopping in Progress",
        "Order on the Way to You",
        "Delivered"
    ];
    let currentIndex = statuses.indexOf(order.status);
    
    if (currentIndex < statuses.length - 1) {
        // Simulate realistic delays for each step
        const delay = currentIndex === 0 ? 10000 : currentIndex === 1 ? 15000 : 10000; // 10s, 15s, 10s
        setTimeout(() => {
            order.status = statuses[currentIndex + 1];
            orders.set(referenceNumber, order);
            saveOrders(); // Save to localStorage after status update
            console.log(`Order ${referenceNumber} updated to: ${order.status}`);
            updateTrackResult(referenceNumber); // Update tracking UI if active
            updateOrderResult(referenceNumber); // Update order result UI if visible
            // TODO: In a real app, the driver would update the status via a backend API
            // Example: await fetch('/updateStatus', { method: 'POST', body: { ref: referenceNumber, status: order.status } });
        }, delay);
    }
};

// Update the order result UI (if still visible)
const updateOrderResult = (referenceNumber) => {
    const statusElement = getElement(`status-${referenceNumber}`);
    if (statusElement) {
        const order = orders.get(referenceNumber);
        statusElement.textContent = order.status;
    }
};

// Handle order submission
const handleOrderSubmission = (event) => {
    event.preventDefault();

    const storeSelect = getElement("store-select");
    const itemsInput = getElement("items");
    const customRequestInput = getElement("custom-request");
    const ecoFriendlyCheckbox = getElement("eco-friendly");
    const paymentStep = getElement("payment-step");

    const storeId = storeSelect.value;
    const items = itemsInput.value.split("\n").filter(item => item.trim());
    const customRequest = customRequestInput ? customRequestInput.value : "";
    const ecoFriendly = ecoFriendlyCheckbox ? ecoFriendlyCheckbox.checked : false;

    if (!storeId || items.length === 0) {
        alert("Please select a store and enter at least one item!");
        return;
    }

    const selectedStore = STORES.find(store => store.id === storeId);
    const referenceNumber = `SPD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const order = {
        storeId,
        storeName: selectedStore.name,
        items,
        customRequest,
        ecoFriendly,
        referenceNumber,
        status: "Order Placed and Received",
        location: "Agona Swedru, Central Region, Ghana"
    };

    orders.set(referenceNumber, order);
    saveOrders(); // Save to localStorage
    paymentStep.style.display = "block";
    paymentStep.dataset.ref = referenceNumber; // Store ref for payment confirmation
};

// Handle payment confirmation
const handlePaymentConfirmation = () => {
    const paymentStep = getElement("payment-step");
    const orderResult = getElement("order-result");
    const referenceNumber = paymentStep.dataset.ref;
    const order = orders.get(referenceNumber);

    paymentStep.style.display = "none";
    orderResult.innerHTML = `
        <div class="alert alert-success">
            <h4>Order Placed!</h4>
            <p><strong>Reference Number:</strong> ${referenceNumber}</p>
            <p><strong>Store:</strong> ${order.storeName}</p>
            <p><strong>Items:</strong> ${order.items.join(", ")}</p>
            ${order.customRequest ? `<p><strong>Custom Request:</strong> ${order.customRequest}</p>` : ""}
            <p><strong>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
            <p><strong>Status:</strong> <span id="status-${referenceNumber}">${order.status}</span></p>
        </div>
    `;

    // Send dispatcher alert
    sendDispatcherAlert(referenceNumber);
    
    // Start status updates
    updateOrderStatus(referenceNumber);
};

// Handle tracking
const handleTrackOrder = () => {
    const trackInput = getElement("track-input");
    const referenceNumber = trackInput.value.trim();

    if (!orders.has(referenceNumber)) {
        getElement("track-result").innerHTML = '<div class="alert alert-danger">Order not found!</div>';
        return;
    }

    updateTrackResult(referenceNumber);
};

// Update tracking UI with items
const updateTrackResult = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    const trackResult = getElement("track-result");
    trackResult.innerHTML = `
        <div class="alert alert-info">
            <h4>Order Status</h4>
            <p><strong>Reference Number:</strong> ${referenceNumber}</p>
            <p><strong>Store:</strong> ${order.storeName}</p>
            <p><strong>Items:</strong> ${order.items.join(", ")}</p>
            ${order.customRequest ? `<p><strong>Custom Request:</strong> ${order.customRequest}</p>` : ""}
            <p><strong>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
            <p><strong>Status:</strong> ${order.status}</p>
        </div>
    `;
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadOrders(); // Load orders from localStorage
    populateStoreDropdown(getElement("store-select"));
    getElement("order-form").addEventListener("submit", handleOrderSubmission);
    getElement("confirm-payment").addEventListener("click", handlePaymentConfirmation);
    getElement("track-btn").addEventListener("click", handleTrackOrder);
});
