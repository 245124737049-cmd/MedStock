
// ======================================
// MEDSTOCK - PHARMACY MANAGEMENT SYSTEM
// ======================================

// DATABASE USING LOCAL STORAGE

let medicines = JSON.parse(localStorage.getItem("medstock_medicines")) || [];
let suppliers = JSON.parse(localStorage.getItem("medstock_suppliers")) || [];
let sales = JSON.parse(localStorage.getItem("medstock_sales")) || [];
let cart = [];
let salesChart = null;

function saveData() {
    localStorage.setItem("medstock_medicines", JSON.stringify(medicines));
    localStorage.setItem("medstock_suppliers", JSON.stringify(suppliers));
    localStorage.setItem("medstock_sales", JSON.stringify(sales));
}

// DATE

const today = new Date();
const todayString = getLocalDate(today);

document.getElementById("todayDate").textContent =
    today.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

function getLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// NAVIGATION

function showPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active-page");
    });

    document.getElementById(page).classList.add("active-page");

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });

    const titles = {
        dashboard: "Dashboard",
        inventory: "Medicine Inventory",
        expiry: "Expiry Management",
        sales: "Sales & Billing",
        suppliers: "Suppliers",
        reports: "Reports & Analytics"
    };

    document.getElementById("pageTitle").textContent = titles[page];

    refreshAll();
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        showPage(link.dataset.page);
    });
});

// MEDICINE STATUS

function getExpiryDays(medicine) {
    const expiry = new Date(medicine.expiry + "T00:00:00");
    const current = new Date(todayString + "T00:00:00");

    return Math.ceil((expiry - current) / 86400000);
}

function getMedicineStatus(medicine) {
    const days = getExpiryDays(medicine);

    if (days < 0) return "Expired";
    if (medicine.quantity <= medicine.minimum) return "Low Stock";
    if (days <= 30) return "Expiring Soon";

    return "Available";
}

function getStatusBadge(status) {
    if (status === "Expired") {
        return '<span class="status danger">Expired</span>';
    }

    if (status === "Low Stock") {
        return '<span class="status warning">Low Stock</span>';
    }

    if (status === "Expiring Soon") {
        return '<span class="status warning">Expiring Soon</span>';
    }

    return '<span class="status safe">Available</span>';
}

// DASHBOARD

function updateDashboard() {
    const total = medicines.length;

    const totalStock = medicines.reduce(
        (sum, item) => sum + Number(item.quantity), 0
    );

    const low = medicines.filter(
        item => item.quantity <= item.minimum &&
        getExpiryDays(item) >= 0
    ).length;

    const expiring = medicines.filter(
        item => getExpiryDays(item) <= 30
    ).length;

    const todaySales = sales
        .filter(item => item.date === todayString)
        .reduce((sum, item) => sum + item.total, 0);

    const todayTransactions = sales.filter(
        item => item.date === todayString
    ).length;

    document.getElementById("totalMedicines").textContent = total;
    document.getElementById("totalStock").textContent =
        totalStock.toLocaleString("en-IN");
    document.getElementById("lowStock").textContent = low;
    document.getElementById("expiring").textContent = expiring;
    document.getElementById("todaySales").textContent = money(todaySales);
    document.getElementById("transactions").textContent = todayTransactions;

    document.getElementById("alertCount").textContent = low + expiring;

    // Recent medicines

    const recent = medicines.slice(-5).reverse();

    document.getElementById("recentTable").innerHTML =
        recent.length
            ? recent.map(item => `
                <tr>
                    <td><strong>${escapeHTML(item.name)}</strong></td>
                    <td>${escapeHTML(item.batch)}</td>
                    <td>${item.quantity}</td>
                    <td>${escapeHTML(item.expiry)}</td>
                    <td>${getStatusBadge(getMedicineStatus(item))}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="5">No medicines added yet.</td></tr>`;

    // Stock summary

    const categories = ["Tablet", "Capsule", "Syrup", "Injection", "Other"];

    document.getElementById("stockSummary").innerHTML =
        categories.map(category => {
            const count = medicines.filter(
                item => item.category === category
            ).length;

            return `
                <div class="summary-row">
                    <span>${category}</span>
                    <span>${count} batches</span>
                </div>
            `;
        }).join("");

    updateChart();
}

// INVENTORY

function renderInventory() {
    const search = document.getElementById("medicineSearch")
        .value.toLowerCase();

    const category = document.getElementById("categoryFilter").value;

    const filtered = medicines.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(search) ||
            item.batch.toLowerCase().includes(search);

        const matchesCategory =
            !category || item.category === category;

        return matchesSearch && matchesCategory;
    });

    document.getElementById("inventoryTable").innerHTML =
        filtered.length
            ? filtered.map(item => `
                <tr>
                    <td><strong>${escapeHTML(item.name)}</strong></td>
                    <td>${escapeHTML(item.category)}</td>
                    <td>${escapeHTML(item.batch)}</td>
                    <td>${money(item.price)}</td>
                    <td>${item.quantity}</td>
                    <td>${escapeHTML(item.expiry)}</td>
                    <td>${getStatusBadge(getMedicineStatus(item))}</td>
                    <td>
                        <button class="action-btn edit-btn"
                            onclick="editMedicine('${item.id}')">Edit</button>
                        <button class="action-btn delete-btn"
                            onclick="deleteMedicine('${item.id}')">Delete</button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="8">No matching medicines found.</td></tr>`;
}

function openMedicineForm(id = "") {
    document.getElementById("medicineForm").reset();
    document.getElementById("medicineId").value = id;

    document.getElementById("medicineFormTitle").textContent =
        id ? "Edit Medicine" : "Add Medicine";

    if (id) {
        const item = medicines.find(m => m.id === id);

        if (!item) return;

        document.getElementById("medName").value = item.name;
        document.getElementById("medCategory").value = item.category;
        document.getElementById("medBatch").value = item.batch;
        document.getElementById("medManufacturer").value = item.manufacturer;
        document.getElementById("medPurchase").value = item.purchase;
        document.getElementById("medPrice").value = item.price;
        document.getElementById("medQuantity").value = item.quantity;
        document.getElementById("medMinimum").value = item.minimum;
        document.getElementById("medManufacture").value = item.manufacture;
        document.getElementById("medExpiry").value = item.expiry;
    }

    document.getElementById("medicineModal").classList.add("show");
}

function editMedicine(id) {
    openMedicineForm(id);
}

function deleteMedicine(id) {
    if (!confirm("Are you sure you want to delete this medicine?")) {
        return;
    }

    medicines = medicines.filter(item => item.id !== id);

    saveData();
    refreshAll();
    showToast("Medicine deleted successfully!");
}

document.getElementById("medicineForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const id = document.getElementById("medicineId").value;

    const name = document.getElementById("medName").value.trim();
    const batch = document.getElementById("medBatch").value.trim();
    const category = document.getElementById("medCategory").value;

    const quantity = Number(document.getElementById("medQuantity").value);
    const minimum = Number(document.getElementById("medMinimum").value);

    const purchase = Number(document.getElementById("medPurchase").value);
    const price = Number(document.getElementById("medPrice").value);

    const expiry = document.getElementById("medExpiry").value;
    const manufacture = document.getElementById("medManufacture").value;

    if (quantity < 0 || minimum < 0 || purchase < 0 || price < 0) {
        showToast("Please enter valid positive values.");
        return;
    }

    if (expiry < todayString) {
        if (!confirm("This batch is already expired. Save it for record keeping?")) {
            return;
        }
    }

    const duplicate = medicines.find(item =>
        item.name.toLowerCase() === name.toLowerCase() &&
        item.batch.toLowerCase() === batch.toLowerCase() &&
        item.id !== id
    );

    if (duplicate) {
        showToast("This medicine batch already exists.");
        return;
    }

    const medicine = {
        id: id || Date.now().toString(),
        name,
        category,
        batch,
        manufacturer: document.getElementById("medManufacturer").value.trim(),
        purchase,
        price,
        quantity,
        minimum,
        manufacture,
        expiry
    };

    if (id) {
        medicines = medicines.map(item =>
            item.id === id ? medicine : item
        );
    } else {
        medicines.push(medicine);
    }

    saveData();
    closeModal("medicineModal");
    refreshAll();

    showToast(id ? "Medicine updated!" : "Medicine added successfully!");
});

// EXPIRY MANAGEMENT

function renderExpiry() {
    const items = medicines
        .filter(item => getExpiryDays(item) <= 30)
        .sort((a, b) => getExpiryDays(a) - getExpiryDays(b));

    document.getElementById("expiryTable").innerHTML =
        items.length
            ? items.map(item => {
                const days = getExpiryDays(item);

                return `
                    <tr>
                        <td><strong>${escapeHTML(item.name)}</strong></td>
                        <td>${escapeHTML(item.batch)}</td>
                        <td>${item.quantity}</td>
                        <td>${escapeHTML(item.expiry)}</td>
                        <td>${days < 0 ? Math.abs(days) + " days ago" : days + " days"}</td>
                        <td>${getStatusBadge(getMedicineStatus(item))}</td>
                    </tr>
                `;
            }).join("")
            : `<tr><td colspan="6">No expiry alerts. Great job!</td></tr>`;
}

// SALES AND BILLING

function renderSaleOptions() {
    const select = document.getElementById("saleMedicine");

    const available = medicines.filter(item =>
        item.quantity > 0 && getExpiryDays(item) >= 0
    );

    select.innerHTML = available.length
        ? `<option value="">Select medicine</option>` +
          available.map(item => `
            <option value="${item.id}">
                ${escapeHTML(item.name)} - ${money(item.price)} (${item.quantity} available)
            </option>
          `).join("")
        : `<option value="">No available medicines</option>`;
}

function addToCart() {
    const id = document.getElementById("saleMedicine").value;
    const quantity = Number(document.getElementById("saleQuantity").value);

    const item = medicines.find(m => m.id === id);

    if (!item) {
        showToast("Please select a medicine.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        showToast("Enter a valid quantity.");
        return;
    }

    if (quantity > item.quantity) {
        showToast("Not enough stock available!");
        return;
    }

    const existing = cart.find(c => c.id === id);
    const currentQuantity = existing ? existing.quantity : 0;

    if (currentQuantity + quantity > item.quantity) {
        showToast("Cart quantity exceeds available stock!");
        return;
    }

    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity
        });
    }

    document.getElementById("saleQuantity").value = 1;

    renderCart();
    showToast("Added to cart!");
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    renderCart();
}

function renderCart() {
    const container = document.getElementById("cartItems");

    if (!cart.length) {
        container.textContent = "No items added yet.";
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <span>
                    <strong>${escapeHTML(item.name)}</strong><br>
                    ${item.quantity} × ${money(item.price)}
                </span>
                <span>
                    ${money(item.price * item.quantity)}
                    <button class="remove-cart"
                        onclick="removeFromCart('${item.id}')">✕</button>
                </span>
            </div>
        `).join("");
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    document.getElementById("cartTotal").textContent = money(total);
}

function completeSale() {
    if (!cart.length) {
        showToast("Add medicines to the cart first.");
        return;
    }

    // Verify all stock again before completing the bill.

    for (const cartItem of cart) {
        const medicine = medicines.find(m => m.id === cartItem.id);

        if (!medicine ||
            medicine.quantity < cartItem.quantity ||
            getExpiryDays(medicine) < 0) {
            showToast("Stock changed or batch expired. Check your cart.");
            renderSaleOptions();
            return;
        }
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const invoice = {
        id: "INV-" + Date.now(),
        customer: document.getElementById("customerName").value.trim() || "Walk-in Customer",
        date: todayString,
        items: cart.map(item => ({ ...item })),
        total
    };

    cart.forEach(cartItem => {
        const medicine = medicines.find(m => m.id === cartItem.id);
        medicine.quantity -= cartItem.quantity;
    });

    sales.push(invoice);

    saveData();

    cart = [];
    document.getElementById("customerName").value = "";

    renderCart();
    refreshAll();

    showToast("Invoice " + invoice.id + " generated successfully!");

    printInvoice(invoice);
}

function printInvoice(invoice) {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        showToast("Allow pop-ups to print your invoice.");
        return;
    }

    const rows = invoice.items.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${item.quantity}</td>
            <td>${money(item.price)}</td>
            <td>${money(item.price * item.quantity)}</td>
        </tr>
    `).join("");

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHTML(invoice.id)}</title>
            <style>
                body {font-family:Arial;padding:30px;color:#222}
                h1 {color:#1769aa}
                table {width:100%;border-collapse:collapse;margin-top:25px}
                th,td {padding:12px;border-bottom:1px solid #ddd;text-align:left}
                .total {text-align:right;margin-top:25px;font-size:20px}
            </style>
        </head>
        <body>
            <h1>MedStock Pharmacy</h1>
            <p>Medicine Sales Invoice</p>
            <hr>
            <p>Invoice: ${escapeHTML(invoice.id)}</p>
            <p>Customer: ${escapeHTML(invoice.customer)}</p>
            <p>Date: ${escapeHTML(invoice.date)}</p>
            <table>
                <thead>
                    <tr><th>Medicine</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="total">
                <strong>Total: ${money(invoice.total)}</strong>
            </div>
            <p>Thank you for visiting!</p>
            <script>window.onload = () => window.print();<\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function renderSales() {
    document.getElementById("salesTable").innerHTML =
        sales.length
            ? [...sales].reverse().slice(0, 20).map(item => `
                <tr>
                    <td>${escapeHTML(item.id)}</td>
                    <td>${escapeHTML(item.customer)}</td>
                    <td>${escapeHTML(item.date)}</td>
                    <td>${money(item.total)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="4">No sales recorded yet.</td></tr>`;
}

// SUPPLIERS

function openSupplierForm() {
    document.getElementById("supplierForm").reset();
    document.getElementById("supplierModal").classList.add("show");
}

document.getElementById("supplierForm").addEventListener("submit", function(e) {
    e.preventDefault();

    suppliers.push({
        id: Date.now().toString(),
        name: document.getElementById("supplierName").value.trim(),
        company: document.getElementById("supplierCompany").value.trim(),
        phone: document.getElementById("supplierPhone").value.trim(),
        email: document.getElementById("supplierEmail").value.trim()
    });

    saveData();
    closeModal("supplierModal");
    renderSuppliers();

    showToast("Supplier added successfully!");
});

function deleteSupplier(id) {
    if (!confirm("Delete this supplier?")) return;

    suppliers = suppliers.filter(item => item.id !== id);

    saveData();
    renderSuppliers();
    showToast("Supplier deleted.");
}

function renderSuppliers() {
    document.getElementById("supplierTable").innerHTML =
        suppliers.length
            ? suppliers.map(item => `
                <tr>
                    <td><strong>${escapeHTML(item.name)}</strong></td>
                    <td>${escapeHTML(item.company)}</td>
                    <td>${escapeHTML(item.phone)}</td>
                    <td>${escapeHTML(item.email)}</td>
                    <td>
                        <button class="action-btn delete-btn"
                            onclick="deleteSupplier('${item.id}')">Delete</button>
                    </td>
                </tr>
            `).join("")
            : `<tr><td colspan="5">No suppliers added yet.</td></tr>`;
}

// REPORTS

function updateReports() {
    const revenue = sales.reduce((sum, item) => sum + item.total, 0);

    const value = medicines.reduce(
        (sum, item) => sum + item.quantity * item.purchase, 0
    );

    const low = medicines.filter(
        item => item.quantity <= item.minimum &&
        getExpiryDays(item) >= 0
    ).length;

    document.getElementById("reportRevenue").textContent = money(revenue);
    document.getElementById("reportInvoices").textContent = sales.length;
    document.getElementById("inventoryValue").textContent = money(value);
    document.getElementById("reportLow").textContent = low;

    document.getElementById("reportTable").innerHTML =
        sales.length
            ? [...sales].reverse().map(item => `
                <tr>
                    <td>${escapeHTML(item.id)}</td>
                    <td>${escapeHTML(item.customer)}</td>
                    <td>${escapeHTML(item.date)}</td>
                    <td>${item.items.length}</td>
                    <td>${money(item.total)}</td>
                </tr>
            `).join("")
            : `<tr><td colspan="5">No reports available yet.</td></tr>`;
}

function exportReport() {
    const rows = [
        ["Invoice", "Customer", "Date", "Total"],
        ...sales.map(item => [
            item.id,
            item.customer,
            item.date,
            item.total
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            '"' + String(value).replace(/"/g, '""') + '"'
        ).join(",")
    ).join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "MedStock-Sales-Report.csv";
    link.click();

    URL.revokeObjectURL(url);
    showToast("Sales report downloaded!");
}

// SALES CHART

function updateChart() {
    const canvas = document.getElementById("salesChart");

    if (!canvas || typeof Chart === "undefined") return;

    const labels = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const dateString = getLocalDate(date);

        labels.push(date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short"
        }));

        const total = sales
            .filter(item => item.date === dateString)
            .reduce((sum, item) => sum + item.total, 0);

        values.push(total);
    }

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Sales (₹)",
                data: values,
                backgroundColor: "#3d91d3",
                borderRadius: 6,
                maxBarThickness: 35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => "₹" + value
                    }
                }
            }
        }
    });
}

// MODAL

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

// CLICK OUTSIDE MODAL TO CLOSE

document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", function(e) {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });
});

// REFRESH ALL SECTIONS

function refreshAll() {
    updateDashboard();
    renderInventory();
    renderExpiry();
    renderSaleOptions();
    renderCart();
    renderSales();
    renderSuppliers();
    updateReports();
}

// INITIALIZE WEBSITE

saveData();
refreshAll();
