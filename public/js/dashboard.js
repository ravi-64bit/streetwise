// public/js/dashboard.js
document.addEventListener('DOMContentLoaded', () => {
  let plates = [];
  let currentPlateId = null;

  const container = document.getElementById('platesContainer');
  const newPlateBtn = document.getElementById('newPlateBtn');
  const viewMenuBtn = document.getElementById('viewMenuBtn');

  const addItemModalEl = document.getElementById('addItemModal');
  const addItemModal = addItemModalEl ? new bootstrap.Modal(addItemModalEl) : null;
  const addItemForm = document.getElementById('addItemForm');
  const menuItemSelect = document.getElementById('menuItemSelect');

  const menuItemsDataEl = document.getElementById('menuItemsData');
  let menuItems = [];
  try {
    if (menuItemsDataEl?.textContent) menuItems = JSON.parse(menuItemsDataEl.textContent);
  } catch (_) {
    menuItems = [];
  }

  const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  const formatCurrency = (v) => INR.format(Number(v) || 0);
  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (s) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[s]));

  function renderPlates() {
    if (!container) return;
    container.innerHTML = '';

    plates.forEach((plate) => {
      const total = plate.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-lg-4'; // 1 / 2 / 3 columns

      col.innerHTML = `
        <div class="card plate-card mb-3" data-plate-id="${plate.id}">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Plate #${plate.number}</span>
            <button class="btn btn-sm btn-outline-danger close-plate-btn" title="Close Plate" aria-label="Close plate ${plate.number}">&times;</button>
          </div>
          <div class="card-body d-flex flex-column">
            <div class="mb-2">
              <strong>Items:</strong>
            </div>
            <ul class="list-group list-group-flush plate-items-list mb-2">
              ${plate.items.map((item) => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <span>${escapeHtml(item.name)}</span>
                  <span>${formatCurrency(item.price)}</span>
                </li>
              `).join('')}
            </ul>
            <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
              <button class="btn btn-sm btn-primary add-item-btn" data-plate-id="${plate.id}">Add Item</button>
              <div>
                <strong>Total: </strong>
                <span class="plate-total">${formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      `;

      container.appendChild(col);
    });

    // Wire dynamic buttons
    container.querySelectorAll('.add-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentPlateId = btn.getAttribute('data-plate-id');
        if (menuItemSelect) menuItemSelect.value = '';
        addItemModal?.show();
      });
    });

    container.querySelectorAll('.close-plate-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const plateId = btn.closest('.plate-card')?.getAttribute('data-plate-id');
        plates = plates.filter((p) => String(p.id) !== String(plateId));
        renderPlates();
      });
    });
  }

  newPlateBtn?.addEventListener('click', () => {
    const nextNumber = plates.length ? Math.max(...plates.map((p) => p.number)) + 1 : 1;
    plates.push({ id: Date.now() + Math.random(), number: nextNumber, items: [] });
    renderPlates();
  });

  addItemForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const menuItemId = menuItemSelect?.value;
    if (!menuItemId || !currentPlateId) return;

    const itemObj = menuItems.find((m) => String(m._id) === String(menuItemId));
    const plate = plates.find((p) => String(p.id) === String(currentPlateId));
    if (itemObj && plate) {
      plate.items.push({ name: itemObj.name, price: Number(itemObj.price) });
      renderPlates();
      addItemModal?.hide();
    }
  });

  viewMenuBtn?.addEventListener('click', () => {
    alert('Menu page not implemented in demo.');
  });

  renderPlates();
});
