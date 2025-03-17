// Load orders (shared with script.js)
document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
    renderOrders();

    // Listen for new orders
    window.addEventListener("orderUpdated", () => {
        loadOrders();
        renderOrders();
    });
});

// Render orders for driver
const renderOrders = () => {
    const orderList = getElement("order-list");
    orderList.innerHTML = "";

    orders.forEach((order) => {
        const card = document.createElement("div");
        card.className = "col-md-6 mb-4";
        card.innerHTML = `
            <div class="card p-3">
                <h5>Order: ${order.referenceNumber}</h5>
                <p><strong>Store:</strong> ${order.storeName}</p>
                <p><strong>Items:</strong> ${order.items.join(", ")}</p>
                ${order.customRequest ? `<p><strong>Custom Request:</strong> ${order.customRequest}</p>` : ""}
                <p><strong>Status:</strong> ${order.status}</p>
                <div class="btn-group">
                    ${renderStatusButtons(order)}
                </div>
            </div>
        `;
        orderList.appendChild(card);
    });
};

// Render status update buttons based on current status
const renderStatusButtons = (order) => {
    const statuses = [
        "Order Placed and Received",
        "Driver on the Way to Store",
        "Shopping in Progress",
        "Order on the Way to You",
        "Delivered"
    ];
    const currentIndex = statuses.indexOf(order.status);

    if (currentIndex === statuses.length - 1) {
        return '<span class="text-success">Order Completed</span>';
    }

    const nextStatus = statuses[currentIndex + 1];
    let buttonLabel;
    switch (nextStatus) {
        case "Driver on the Way to Store":
            buttonLabel = "Confirm Order Received";
            break;
        case "Shopping in Progress":
            buttonLabel = "On the Way to Store";
            break;
        case "Order on the Way to You":
            buttonLabel = "Finished Shopping";
            break;
        case "Delivered":
            buttonLabel = "Order Delivered";
            break;
        default:
            return "";
    }

    return `
        <button class="btn btn-primary" onclick="updateOrderStatus('${order.referenceNumber}', '${nextStatus}')">
            ${buttonLabel}
        </button>
    `;
};
