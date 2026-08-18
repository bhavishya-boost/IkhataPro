/* iKhataPro GST Invoices Module */

window.iKhataInvoices = {
  currentTab: 'ALL',

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const allInvoices = window.iKhataStore.getInvoices();

    let invoices = allInvoices;
    if (this.currentTab === 'Pending') invoices = invoices.filter(i => i.status === 'Pending');
    if (this.currentTab === 'Paid') invoices = invoices.filter(i => i.status === 'Paid');
    if (this.currentTab === 'Overdue') invoices = invoices.filter(i => i.status === 'Overdue');

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Invoices & GST Billing</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Create, track, and share professional GST tax invoices with A4 PDF export</p>
        </div>
        <button class="btn btn-primary" onclick="window.iKhataUI.openCreateInvoiceModal()">
          <span>📄</span> Create GST Invoice
        </button>
      </div>

      <!-- Invoice Tabs -->
      <div class="tab-list">
        <button class="tab-btn ${this.currentTab === 'ALL' ? 'active' : ''}" onclick="window.iKhataInvoices.currentTab = 'ALL'; window.iKhataUI.refresh();">All (${allInvoices.length})</button>
        <button class="tab-btn ${this.currentTab === 'Pending' ? 'active' : ''}" onclick="window.iKhataInvoices.currentTab = 'Pending'; window.iKhataUI.refresh();">Pending (${allInvoices.filter(i=>i.status==='Pending').length})</button>
        <button class="tab-btn ${this.currentTab === 'Paid' ? 'active' : ''}" onclick="window.iKhataInvoices.currentTab = 'Paid'; window.iKhataUI.refresh();">Paid (${allInvoices.filter(i=>i.status==='Paid').length})</button>
        <button class="tab-btn ${this.currentTab === 'Overdue' ? 'active' : ''}" onclick="window.iKhataInvoices.currentTab = 'Overdue'; window.iKhataUI.refresh();">Overdue (${allInvoices.filter(i=>i.status==='Overdue').length})</button>
      </div>

      <!-- Invoices List Grid -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${invoices.length === 0 ? `
          <div class="card" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">📄</div>
            <h3>No invoices found</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Create your first GST tax invoice with automatic tax calculations.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.iKhataUI.openCreateInvoiceModal()">
              <span>📄</span> Create GST Invoice
            </button>
          </div>
        ` : invoices.map(inv => `
          <div class="card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <strong style="font-size: 1.05rem;">${inv.id}</strong>
                <span class="badge ${inv.status === 'Paid' ? 'badge-success' : (inv.status === 'Overdue' ? 'badge-danger' : 'badge-warning')}">${inv.status}</span>
                <span class="badge badge-neutral">${inv.taxType === 'INTER' ? 'IGST' : 'CGST+SGST'}</span>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                Customer: <strong>${inv.customerName}</strong> • Date: ${inv.date} • Due: ${inv.dueDate}
                ${inv.customerGSTIN ? `• GSTIN: ${inv.customerGSTIN}` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 800; color: var(--text-main);">
                ${formatCurrency(inv.total)}
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.previewInvoice('${inv.id}')">View GST Invoice</button>
                <button class="btn btn-primary btn-sm" onclick="window.iKhataUI.downloadInvoicePDF('${inv.id}')">PDF</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
