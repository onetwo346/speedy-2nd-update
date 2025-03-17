// Simulated order storage (replacing Firebase for now)
const orders = new Map();

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
    
    // Simulated alert (console log)
    console.log(`Email sent to cosmoscoderr@gmail.com: ${message}`);
    console.log(`SMS sent to +233 55 635 9890: ${message}`);

    // TODO: Replace with real integration
    // For email: Use Nodemailer (Node.js) or Firebase Functions with an email service (e.g., SendGrid)
    // For SMS: Use Twilio API with your account credentials
    // Example (pseudo-code):
    // const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', body: emailData });
    // const smsResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json', { method: 'POST', body: smsData });
};

// Simulate order status updates
const updateOrderStatus = (referenceNumber) => {
    const order = orders.get(referenceNumber);
    if (!order) return;

    const statuses = ["Order Received", "Shopping in Progress", "Out for Delivery", "Delivered"];
    let currentIndex = statuses.indexOf(order.status);
    
    if (currentIndex < statuses.length - 1) {
        setTimeout(() => {
            order.status = statuses[currentIndex + 1];
            orders.set(referenceNumber, order);
            console.log(`Order ${referenceNumber} updated to: ${order.status}`);
            updateTrackResult(referenceNumber); // Update tracking UI if active
        }, 5000); // Simulate 5-second delay
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
        status: "Order Received",
        location: "Agona Swedru, Central Region, Ghana"
    };

    orders.set(referenceNumber, order);
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
            <p><strong>Status:</strong> ${order.status}</p>
        </div>
    `;
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    populateStoreDropdown(getElement("store-select"));
    getElement("order-form").addEventListener("submit", handleOrderSubmission);
    getElement("confirm-payment").addEventListener("click", handlePaymentConfirmation);
    getElement("track-btn").addEventListener("click", handleTrackOrder);
});
