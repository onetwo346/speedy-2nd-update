// Store orders in a Map for efficient management
let orders = new Map();

// Load orders from localStorage
function loadOrders() {
    const storedOrders = localStorage.getItem("speedyDeliveryOrders");
    orders.clear(); // Reset to avoid duplicates
    if (storedOrders) {
        JSON.parse(storedOrders).forEach(order => orders.set(order.referenceNumber, order));
    }
    console.log("Orders loaded:", Array.from(orders.entries()));
}

// Save orders to localStorage
function saveOrders(referenceNumber) {
    const ordersArray = Array.from(orders.entries()).map(([ref, order]) => order);
    localStorage.setItem("speedyDeliveryOrders", JSON.stringify(ordersArray));
    console.log("Order saved:", referenceNumber, orders.get(referenceNumber));
}

// Store data for Agona Swedru
const STORES = [
    { id: "1", name: "Wiafesco", type: "Cosmetics Store", items: ["Creams", "Soaps", "Perfumes"] },
    { id: "2", name: "Geneviva Lodge", type: "Hotel", items: ["Room Booking", "Meals", "Drinks"] },
    { id: "3", name: "Maryking Super Market", type: "Market", items: ["Milk", "Bread", "Rice"] },
    { id: "4", name: "Chekin Pizza", type: "Fast Food", items: ["Pizza", "Drinks", "Sides"] }
];

// Utility to get DOM elements
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) console.error(`Element with ID "${id}" not found`);
    return element;
}

// Populate store dropdown
function populateStoreDropdown(selectElement) {
    selectElement.innerHTML = '<option value="" disabled selected>Choose a store</option>';
    STORES.forEach(store => {
        const option = document.createElement("option");
        option.value = store.id;
        option.textContent = store.name;
        selectElement.appendChild(option);
    });
}

// Simulate dispatcher alert
function sendDispatcherAlert(referenceNumber) {
    const order = orders.get(referenceNumber);
    const message = `New order! Ref: ${referenceNumber}, Store: ${order.storeName}, Items: ${order.items.join(", ")}`;
    console.log(`Alert to cosmoscoderr@gmail.com: ${message}`);
    console.log(`SMS to +233 55 635 9890: ${message}`);
    // TODO: Integrate with SendGrid or Twilio for real alerts
}

// Update order status
function updateOrderStatus(referenceNumber, newStatus, photo = null) {
    const order = orders.get(referenceNumber);
    if (!order) return;

    order.status = newStatus;
    if (photo) order.deliveryPhoto = photo;
    orders.set(referenceNumber, order);
    saveOrders(referenceNumber);
    console.log("Status updated:", referenceNumber, newStatus);
}

// Handle order submission
function handleOrderSubmission(event) {
    event.preventDefault();

    const storeSelect = getElement("store-select");
    const itemsInput = getElement("items");
    const customRequestInput = getElement("custom-request");
    const ecoFriendlyCheckbox = getElement("eco-friendly");
    const paymentStep = getElement("payment-step");

    const storeId = storeSelect.value;
    const items = itemsInput.value.split("\n").filter(item => item.trim());
    const customRequest = customRequestInput.value.trim() || "";
    const ecoFriendly = ecoFriendlyCheckbox.checked;

    if (!storeId || items.length === 0) {
        alert("Please select a store and add at least one item!");
        return;
    }

    const store = STORES.find(s => s.id === storeId);
    const referenceNumber = `SPD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const order = {
        storeId,
        storeName: store.name,
        items,
        customRequest,
        ecoFriendly,
        referenceNumber,
        status: "Order Placed and Received",
        location: "Agona Swedru, Central Region, Ghana",
        timestamp: new Date().toISOString()
    };

    orders.set(referenceNumber, order);
    saveOrders(referenceNumber);
    paymentStep.style.display = "block";
    paymentStep.dataset.ref = referenceNumber;
}

// Handle payment confirmation
function handlePaymentConfirmation() {
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
    sendDispatcherAlert(referenceNumber);
}

// Handle order tracking
function handleTrackOrder() {
    const trackInput = getElement("track-input");
    const referenceNumber = trackInput.value.trim();

    if (!orders.has(referenceNumber)) {
        getElement("track-result").innerHTML = '<div class="alert alert-danger">Order not found!</div>';
        return;
    }

    updateTrackResult(referenceNumber);

    const pollForUpdates = () => {
        const interval = setInterval(() => {
            loadOrders();
            const order = orders.get(referenceNumber);
            if (!order || order.status === "Delivered") clearInterval(interval);
            updateTrackResult(referenceNumber);
        }, 2000);
    };
    pollForUpdates();
}

// Update tracking UI
function updateTrackResult(referenceNumber) {
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
            ${order.deliveryPhoto ? `<p><strong>Delivery Photo:</strong> <img src="${order.deliveryPhoto}" alt="Delivery Proof" style="max-width: 200px;"></p>` : ""}
        </div>
    `;
    const statusElement = getElement(`status-${referenceNumber}`);
    if (statusElement) statusElement.textContent = order.status;
}

// Initialize customer page
if (document.getElementById("order-form")) {
    document.addEventListener("DOMContentLoaded", () => {
        loadOrders();
        populateStoreDropdown(getElement("store-select"));
        getElement("order-form").addEventListener("submit", handleOrderSubmission);
        getElement("confirm-payment").addEventListener("click", handlePaymentConfirmation);
        getElement("track-btn").addEventListener("click", handleTrackOrder);

        window.addEventListener("storage", (event) => {
            if (event.key === "speedyDeliveryOrders") {
                loadOrders();
                const referenceNumber = getElement("track-input")?.value.trim();
                if (referenceNumber && orders.has(referenceNumber)) updateTrackResult(referenceNumber);
                document.querySelectorAll("[id^='status-']").forEach(element => {
                    const ref = element.id.replace("status-", "");
                    if (orders.has(ref)) element.textContent = orders.get(ref).status;
                });
            }
        });
    });
}
