/* iKhataPro Unified Report Center & Data Export Module — Phase 4 */

window.iKhataAnalytics = {
  activeReport: 'SALES', // 'SALES', 'GST', 'CUSTOMERS', 'SUPPLIERS', 'EXPENSES'

  render(state) {
    if (window.iKhataStore && typeof window.iKhataStore.checkPermission === 'function' && !window.iKhataStore.checkPermission('VIEW_REPORTS')) {
      return `
        <div class="card" style="text-align: center; padding: 48px 24px; max-width: 600px; margin: 40px auto;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🔒</div>
          <h2 style="font-size: 1.5rem; margin-bottom: 8px;">Access Restricted (RBAC)</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 20px;">
            Unified Report Center viewing requires Manager, Accountant or Owner permissions.
          </p>
          <button class="btn btn-primary" onclick="window.iKhataPIN.requirePIN(() => window.iKhataUI.refresh(), 'Unlock Unified Reports')">
            🔑 Unlock with Owner PIN
          </button>
        </div>
      `;
    }

    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();
    const customers = window.iKhataStore.getCustomers();
    const suppliers = window.iKhataStore.getSuppliers();
    const bills = window.iKhataStore.getBills();
    const invoices = window.iKhataStore.getInvoices();
    const expenses = window.iKhataStore.getExpenses();

    // Data-Grounded Forecast calculation (real 30-day velocity average + active receivables)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const recentSales = bills.filter(b => b.date >= thirtyDaysAgo).reduce((s,b) => s + (b.grandTotal || 0), 0)
                      + invoices.filter(i => i.date >= thirtyDaysAgo).reduce((s,i) => s + (i.total || 0), 0);
    
    const forecastAmt = Math.round(recentSales + (bus ? bus.toReceiveTotal : 0) * 0.65);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Unified Report Center & Exports</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Generate, print, and export CSV/Excel reports for <strong>${bus ? bus.name : 'Store'}</strong></p>
        </div>
      </div>

      <!-- AI Sales Forecast Banner -->
      <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, #1e1b4b, #312e81); color: white;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="badge badge-ai" style="margin-bottom: 8px;">🤖 Data-Grounded AI Sales Forecast (Next 30 Days)</span>
            <h2 style="color: white; font-size: 2rem; margin-bottom: 4px;">Expected Revenue: ${formatCurrency(forecastAmt)}</h2>
            <p style="color: #c7d2fe; font-size: 0.88rem; margin: 0;">Computed from 30-day sales velocity (${formatCurrency(recentSales)}) + expected collection velocity (${formatCurrency(Math.round(bus.toReceiveTotal * 0.65))}).</p>
          </div>
          <button class="btn btn-ai" onclick="window.print()">
            🖨️ Print Summary Report
          </button>
        </div>
      </div>

      <!-- Report Tabs & Export Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn ${this.activeReport === 'SALES' ? 'active' : ''}" onclick="window.iKhataAnalytics.activeReport = 'SALES'; window.iKhataUI.refresh();">🛒 Sales Register</button>
            <button class="tab-btn ${this.activeReport === 'GST' ? 'active' : ''}" onclick="window.iKhataAnalytics.activeReport = 'GST'; window.iKhataUI.refresh();">📄 GST Returns</button>
            <button class="tab-btn ${this.activeReport === 'CUSTOMERS' ? 'active' : ''}" onclick="window.iKhataAnalytics.activeReport = 'CUSTOMERS'; window.iKhataUI.refresh();">📖 Customer Ledger</button>
            <button class="tab-btn ${this.activeReport === 'SUPPLIERS' ? 'active' : ''}" onclick="window.iKhataAnalytics.activeReport = 'SUPPLIERS'; window.iKhataUI.refresh();">🏭 Supplier Payables</button>
            <button class="tab-btn ${this.activeReport === 'EXPENSES' ? 'active' : ''}" onclick="window.iKhataAnalytics.activeReport = 'EXPENSES'; window.iKhataUI.refresh();">🧾 Expenses</button>
          </div>

          <button class="btn btn-success btn-sm" onclick="window.iKhataAnalytics.exportCSV('${this.activeReport}')">
            📥 Export ${this.activeReport} CSV
          </button>
        </div>
      </div>

      <!-- Active Report View -->
      <div class="card">
        ${this.activeReport === 'SALES' ? `
          <div class="card-header"><div class="card-title">🛒 Sales Register (${bills.length} POS bills + ${invoices.length} Invoices)</div></div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                <tr>
                  <th style="padding: 8px;">Date</th>
                  <th style="padding: 8px;">Doc #</th>
                  <th style="padding: 8px;">Customer</th>
                  <th style="padding: 8px;">Payment Mode</th>
                  <th style="padding: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${[...bills, ...invoices].slice(0, 15).map(item => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px;">${item.date}</td>
                    <td style="padding: 8px; font-weight: 700;">${item.id}</td>
                    <td style="padding: 8px;">${item.customerName}</td>
                    <td style="padding: 8px;">${item.paymentMethod || 'Credit'}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700;">${formatCurrency(item.grandTotal || item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : this.activeReport === 'GST' ? `
          <div class="card-header"><div class="card-title">📄 GST Sales Tax Returns Register (${invoices.length} invoices)</div></div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                <tr>
                  <th style="padding: 8px;">Invoice #</th>
                  <th style="padding: 8px;">Customer GSTIN</th>
                  <th style="padding: 8px;">Tax Type</th>
                  <th style="padding: 8px; text-align: right;">Taxable Val</th>
                  <th style="padding: 8px; text-align: right;">CGST</th>
                  <th style="padding: 8px; text-align: right;">SGST</th>
                  <th style="padding: 8px; text-align: right;">IGST</th>
                  <th style="padding: 8px; text-align: right;">Invoice Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map(inv => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; font-weight: 700;">${inv.id}</td>
                    <td style="padding: 8px;">${inv.customerGSTIN || 'N/A'}</td>
                    <td style="padding: 8px;">${inv.taxType}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(inv.taxableTotal)}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(inv.cgstTotal || 0)}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(inv.sgstTotal || 0)}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(inv.igstTotal || 0)}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700;">${formatCurrency(inv.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : this.activeReport === 'CUSTOMERS' ? `
          <div class="card-header"><div class="card-title">📖 Customer Ledger Receivables (${customers.length} customers)</div></div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                <tr>
                  <th style="padding: 8px;">Customer Name</th>
                  <th style="padding: 8px;">Phone</th>
                  <th style="padding: 8px;">Segment</th>
                  <th style="padding: 8px;">Trust Score</th>
                  <th style="padding: 8px; text-align: right;">Balance Due</th>
                </tr>
              </thead>
              <tbody>
                ${customers.map(c => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; font-weight: 700;">${c.name}</td>
                    <td style="padding: 8px;">${c.phone}</td>
                    <td style="padding: 8px;"><span class="badge badge-neutral">${c.category}</span></td>
                    <td style="padding: 8px;">${c.score}/100</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700; color: ${c.balance > 0 ? 'var(--danger)' : 'var(--success)'};">${formatCurrency(c.balance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="card-header"><div class="card-title">🏭 Supplier Payables Ledger (${suppliers.length} suppliers)</div></div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
                <tr>
                  <th style="padding: 8px;">Supplier Name</th>
                  <th style="padding: 8px;">Business Name</th>
                  <th style="padding: 8px;">GSTIN</th>
                  <th style="padding: 8px; text-align: right;">Purchases</th>
                  <th style="padding: 8px; text-align: right;">Payable Balance</th>
                </tr>
              </thead>
              <tbody>
                ${suppliers.map(s => `
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 8px; font-weight: 700;">${s.name}</td>
                    <td style="padding: 8px;">${s.businessName}</td>
                    <td style="padding: 8px;">${s.gstin || 'N/A'}</td>
                    <td style="padding: 8px; text-align: right;">${formatCurrency(s.totalPurchases)}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 700; color: var(--warning);">${formatCurrency(s.balance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  exportCSV(reportType) {
    let rows = [];
    let filename = `Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'SALES') {
      rows.push(['Date', 'Document ID', 'Customer Name', 'Payment Method', 'Amount (INR)']);
      const bills = window.iKhataStore.getBills();
      const invoices = window.iKhataStore.getInvoices();
      [...bills, ...invoices].forEach(i => {
        rows.push([i.date, i.id, i.customerName, i.paymentMethod || 'Credit', i.grandTotal || i.total]);
      });
    } else if (reportType === 'GST') {
      rows.push(['Invoice Number', 'Customer Name', 'Customer GSTIN', 'Tax Type', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total Invoice Amount']);
      window.iKhataStore.getInvoices().forEach(i => {
        rows.push([i.id, i.customerName, i.customerGSTIN || '', i.taxType, i.taxableTotal, i.cgstTotal||0, i.sgstTotal||0, i.igstTotal||0, i.total]);
      });
    } else if (reportType === 'CUSTOMERS') {
      rows.push(['Customer Name', 'Phone', 'City', 'Category', 'Trust Score', 'Balance Due']);
      window.iKhataStore.getCustomers().forEach(c => {
        rows.push([c.name, c.phone, c.city||'', c.category||'', c.score||80, c.balance]);
      });
    } else if (reportType === 'SUPPLIERS') {
      rows.push(['Supplier Name', 'Business Name', 'Phone', 'GSTIN', 'Total Purchases', 'Payable Balance']);
      window.iKhataStore.getSuppliers().forEach(s => {
        rows.push([s.name, s.businessName, s.phone, s.gstin||'', s.totalPurchases||0, s.balance||0]);
      });
    } else {
      rows.push(['Date', 'Category', 'Note', 'Amount']);
      window.iKhataStore.getExpenses().forEach(e => {
        rows.push([e.date, e.category, e.note, e.amount]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.iKhataUI.showToast(`📥 Exported ${filename}`, 'success');
  }
};
