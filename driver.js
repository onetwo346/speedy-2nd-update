document.addEventListener("DOMContentLoaded", () => {
    loadOrders();
    renderOrders();

    // Listen for storage changes (cross-tab updates)
    window.addEventListener("storage", (event) => {
        if (event.key === "speedyDeliveryOrders") {
            loadOrders();
            renderOrders();
        }
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
                <p><strong>Eco-Friendly:</strong> ${order.ecoFriendly ? "Yes" : "No"}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Timestamp:</strong> ${order.timestamp}</p>
                <div class="btn-group">
                    ${renderStatusButtons(order)}
                </div>
            </div>
        `;
        orderList.appendChild(card);
    });
};

// Render status update buttons with photo option for delivery
const renderStatusButtons = (order) => {
    const statuses = [
        "Order Placed and Received",
        "Driver on the Way to Store",
        "At the Store",
        "Shopping",
        "On the Way to Customer",
        "Delivered"
    ];
    const currentIndex = statuses.indexOf(order.status);

    if (currentIndex === statuses.length - 1) {
        return '<span class="text-success">Order Completed</span>';
    }

    const nextStatus = statuses[currentIndex + 1];
    let buttonLabel, photoInput = "";
    switch (nextStatus) {
        case "Driver on the Way to Store":
            buttonLabel = "Confirm Order Received";
            break;
        case "At the Store":
            buttonLabel = "On the Way to Store";
            break;
        case "Shopping":
            buttonLabel = "Arrived at Store";
            break;
        case "On the Way to Customer":
            buttonLabel = "Finished Shopping";
            break;
        case "Delivered":
            buttonLabel = "Deliver Order";
            photoInput = `
                <input type="file" class="form-control mt-2" id="photo-${order.referenceNumber}" accept="image/*">
                <button class="btn btn-success mt-2" onclick="confirmDelivery('${order.referenceNumber}')">Confirm Delivery</button>
            `;
            break;
        default:
            return "";
    }

    return `
        <button class="btn btn-primary" onclick="updateOrderStatus('${order.referenceNumber}', '${nextStatus}')">
            ${buttonLabel}
        </button>
        ${photoInput}
    `;
};

// Confirm delivery with photo
const confirmDelivery = (referenceNumber) => {
    const photoInput = getElement(`photo-${referenceNumber}`);
    const file = photoInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            updateOrderStatus(referenceNumber, "Delivered", e.target.result); // Store base64 image
        };
        reader.readAsDataURL(file);
    } else {
        alert("Please select a photo to confirm delivery!");
    }
};
