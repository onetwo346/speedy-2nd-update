// Simulated order storage
let orders = new Map();

// Load orders from localStorage
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
const saveOrders = (referenceNumber) => {
    const ordersObj = Object.fromEntries(orders);
    localStorage.setItem("speedyDeliveryOrders", JSON.stringify(ordersObj));
    // The storage event will be triggered automatically for other tabs
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

// Populate store dropdown (for customer page)
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

// Simulate sending email and SMS
const sendDispatcherAlert = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    const message = `New order placed! Ref: ${referenceNumber}, Store: ${order.storeName}, Items: ${order.items.join(", ")}`;
    console.log(`Email sent to cosmoscoderr@gmail.com: ${message}`);
    console.log(`SMS sent to +233 55 635 9890: ${message}`);
    // TODO: Replace with real email/SMS integration (e.g., SendGrid for email, Twilio for SMS)
};

// Update order status (called by driver page)
const updateOrderStatus = (referenceNumber, newStatus) => {
    const order = orders.get(referenceNumber);
    if (!order) return;

    order.status = newStatus;
    orders.set(referenceNumber, order);
    saveOrders(referenceNumber);
    // TODO: In a real app, update the status in a backend database
    // Example: db.collection("orders").doc(referenceNumber).update({ status: newStatus });
};

// Handle order submission (for customer page)
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
    saveOrders(referenceNumber);
    paymentStep.style.display = "block";
    paymentStep.dataset.ref = referenceNumber;
};

// Handle payment confirmation (for customer page)
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

    sendDispatcherAlert(referenceNumber);
};

// Handle tracking (for customer page)
const handleTrackOrder = () => {
    const trackInput = getElement("track-input");
    const referenceNumber = trackInput.value.trim();

    if (!orders.has(referenceNumber)) {
        getElement("track-result").innerHTML = '<div class="alert alert-danger">Order not found!</div>';
        return;
    }

    updateTrackResult(referenceNumber);

    // Poll for updates
    const pollForUpdates = () => {
        const interval = setInterval(() => {
            const order = orders.get(referenceNumber);
            if (!order || order.status === "Delivered") {
                clearInterval(interval);
                return;
            }
            updateTrackResult(referenceNumber);
        }, 2000); // Check every 2 seconds
    };
    pollForUpdates();
};

// Update tracking UI (for customer page)
const updateTrackResult = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    const trackResult = getElement("track-result");
    if (trackResult) {
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
    }

    const statusElement = getElement(`status-${referenceNumber}`);
    if (statusElement) {
        statusElement.textContent = order.status;
    }
};

// Initialize customer page
if (document.getElementById("order-form")) {
    document.addEventListener("DOMContentLoaded", () => {
        loadOrders();
        populateStoreDropdown(getElement("store-select"));
        getElement("order-form").addEventListener("submit", handleOrderSubmission);
        getElement("confirm-payment").addEventListener("click", handlePaymentConfirmation);
        getElement("track-btn").addEventListener("click", handleTrackOrder);

        // Listen for storage changes (cross-tab updates)
        window.addEventListener("storage", (event) => {
            if (event.key === "speedyDeliveryOrders") {
                loadOrders();
                const referenceNumber = getElement("track-input")?.value.trim();
                if (referenceNumber && orders.has(referenceNumber)) {
                    updateTrackResult(referenceNumber);
                }
                const statusElements = document.querySelectorAll("[id^='status-']");
                statusElements.forEach((element) => {
                    const ref = element.id.replace("status-", "");
                    if (orders.has(ref)) {
                        element.textContent = orders.get(ref).status;
                    }
                });
            }
        });
    });
}
