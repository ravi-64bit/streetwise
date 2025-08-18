document.addEventListener("DOMContentLoaded", () => {
  const ordersContainer = document.getElementById("ordersContainer");
  const viewMenuBtn = document.getElementById("viewMenuBtn");
  const addItemModalEl = document.getElementById("addItemModal");
  const addItemForm = document.getElementById("addItemForm");
  const menuItemSelect = document.getElementById("menuItemSelect");
  const selectedItemPrice = document.getElementById("selectedItemPrice");
  const menuItemsData = document.getElementById("menuItemsData");

  const modal = addItemModalEl ? new bootstrap.Modal(addItemModalEl) : null;
  let selectedOrderId = null;
  let menuItems = [];

  try {
    if (menuItemsData?.textContent) {
      menuItems = JSON.parse(menuItemsData.textContent);
    }
  } catch (err) {
    console.error("Failed to parse menu items:", err);
  }

  const formatPrice = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(val) || 0);

  // Show modal and populate dropdown
  document.querySelectorAll(".add-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedOrderId = btn.getAttribute("data-order-id");
      menuItemSelect.innerHTML =
        '<option value="">Select an item</option>' +
        menuItems
          .map(
            (item) =>
              `<option value="${item._id}" data-price="${item.price}">${item.name} - ₹${item.price}</option>`
          )
          .join("");
      selectedItemPrice.textContent = "";
      menuItemSelect.value = "";
      modal?.show();
    });
  });

  // Show price on select
  menuItemSelect?.addEventListener("change", function () {
    const selected = menuItems.find(
      (item) => String(item._id) === String(this.value)
    );
    selectedItemPrice.textContent = selected
      ? `Price: ₹${selected.price}`
      : "";
  });

  // Submit item to server
  addItemForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemId = menuItemSelect?.value;
    if (!itemId || !selectedOrderId) return;

    try {
      await fetch(`/api/orders/${selectedOrderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      location.reload(); // Refresh to show updated order
    } catch (err) {
      console.error("Failed to add item:", err);
    } finally {
      modal?.hide();
    }
  });

  // View menu
  viewMenuBtn?.addEventListener("click", () => {
    location.href = "/add-menu";
  });
});
