/* iKhataPro Global Command Palette & Multi-Entity Search Module — Phase 3 */

window.iKhataSearch = {
  isOpen: false,

  initKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  open() {
    this.isOpen = true;
    const modal = document.getElementById('search-palette-modal');
    if (modal) {
      modal.classList.add('open');
      const input = document.getElementById('palette-input');
      if (input) {
        input.value = '';
        input.focus();
        this.onInput('');
      }
    }
  },

  close() {
    this.isOpen = false;
    const modal = document.getElementById('search-palette-modal');
    if (modal) modal.classList.remove('open');
  },

  onInput(query) {
    const resultsContainer = document.getElementById('palette-results');
    if (!resultsContainer) return;

    if (!query || !query.trim()) {
      resultsContainer.innerHTML = `
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">QUICK COMMANDS</div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.openAddKhataModal();">
          <span>➕</span> Add Khata Entry
        </div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.openReceivePaymentModal();">
          <span>💰</span> Receive Payment
        </div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.openCreateInvoiceModal();">
          <span>📄</span> Create GST Invoice
        </div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.navigate('pos');">
          <span>🛒</span> Open POS Counter
        </div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.navigate('suppliers');">
          <span>🏭</span> Manage Suppliers & Purchases
        </div>
        <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataCopilot.toggle();">
          <span>🤖</span> Ask AI Business Copilot
        </div>
      `;
      return;
    }

    const q = query.toLowerCase();
    const customers = window.iKhataStore.getCustomers();
    const products = window.iKhataStore.getProducts();
    const suppliers = window.iKhataStore.getSuppliers();
    const invoices = window.iKhataStore.getInvoices();
    const auditLogs = window.iKhataStore.getAuditLogs();

    const matchedCust = customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.city && c.city.toLowerCase().includes(q)));
    const matchedProd = products.filter(p => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.category && p.category.toLowerCase().includes(q)));
    const matchedSup = suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.businessName && s.businessName.toLowerCase().includes(q)) || (s.gstin && s.gstin.toLowerCase().includes(q)));
    const matchedInv = invoices.filter(i => (i.id && i.id.toLowerCase().includes(q)) || (i.customerName && i.customerName.toLowerCase().includes(q)));
    const matchedLogs = auditLogs.filter(l => (l.action && l.action.toLowerCase().includes(q)) || (l.details && l.details.toLowerCase().includes(q))).slice(0, 3);

    let html = '';

    if (matchedCust.length > 0) {
      html += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0;">CUSTOMERS (${matchedCust.length})</div>`;
      matchedCust.slice(0, 4).forEach(c => {
        html += `
          <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.openCustomerProfile('${c.id}');">
            <span>👤</span> <strong>${c.name}</strong> • ${c.phone || ''} <span style="margin-left: auto; color: ${c.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">₹${(c.balance||0).toLocaleString('en-IN')}</span>
          </div>
        `;
      });
    }

    if (matchedProd.length > 0) {
      html += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0;">PRODUCTS (${matchedProd.length})</div>`;
      matchedProd.slice(0, 4).forEach(p => {
        html += `
          <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.navigate('inventory');">
            <span>📦</span> <strong>${p.name}</strong> • ₹${p.price} <span style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted);">Stock: ${p.stock}</span>
          </div>
        `;
      });
    }

    if (matchedSup.length > 0) {
      html += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0;">SUPPLIERS (${matchedSup.length})</div>`;
      matchedSup.slice(0, 3).forEach(s => {
        html += `
          <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.navigate('suppliers');">
            <span>🏭</span> <strong>${s.name}</strong> (${s.businessName || 'Supplier'}) <span style="margin-left: auto; color: var(--warning); font-weight: 700;">Payable: ₹${(s.balance||0).toLocaleString('en-IN')}</span>
          </div>
        `;
      });
    }

    if (matchedInv.length > 0) {
      html += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0;">INVOICES (${matchedInv.length})</div>`;
      matchedInv.slice(0, 3).forEach(i => {
        html += `
          <div class="nav-item" onclick="window.iKhataSearch.close(); window.iKhataUI.navigate('invoices');">
            <span>📄</span> <strong>${i.id}</strong> — ${i.customerName} <span style="margin-left: auto; font-weight: 700;">₹${(i.total||0).toLocaleString('en-IN')}</span>
          </div>
        `;
      });
    }

    if (matchedLogs.length > 0) {
      html += `<div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 8px 0;">AUDIT LOGS</div>`;
      matchedLogs.forEach(l => {
        html += `
          <div class="nav-item" style="font-size: 0.82rem; color: var(--text-muted);">
            <span>⏳</span> ${l.action}: ${l.details}
          </div>
        `;
      });
    }

    if (!html) {
      html = `<div style="padding: 16px; text-align: center; color: var(--text-muted);">No customers, products, suppliers, or invoices found for "${query}"</div>`;
    }

    resultsContainer.innerHTML = html;
  }
};
