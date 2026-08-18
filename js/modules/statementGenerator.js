/* iKhataPro Phase 6 Additive Module — Custom Statement & Filter Generator */

window.iKhataStatementGenerator = {
  activeDateFilter: 'ALL',
  selectedCustomerId: '',
  selectedType: 'ALL',

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();
    const customers = window.iKhataStore.getCustomers();
    const allTx = window.iKhataStore.getTransactions();

    let filteredTx = allTx;

    if (this.selectedCustomerId) {
      filteredTx = filteredTx.filter(t => t.customerId === this.selectedCustomerId);
    }

    if (this.selectedType !== 'ALL') {
      filteredTx = filteredTx.filter(t => t.type === this.selectedType);
    }

    const today = new Date();
    if (this.activeDateFilter === 'TODAY') {
      const todayStr = today.toISOString().split('T')[0];
      filteredTx = filteredTx.filter(t => t.date === todayStr);
    } else if (this.activeDateFilter === 'THIS_MONTH') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      filteredTx = filteredTx.filter(t => t.date >= startOfMonth);
    }

    const totalGave = filteredTx.filter(t => t.type === 'GAVE').reduce((s, t) => s + (t.amount || 0), 0);
    const totalGot = filteredTx.filter(t => t.type === 'GOT').reduce((s, t) => s + (t.amount || 0), 0);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Custom Statement & Filter Engine</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Generate custom date-filtered ledger statements for <strong>${bus ? bus.name : 'Store'}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="window.print()">
          🖨️ Print Custom Statement
        </button>
      </div>

      <!-- Filter Controls Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 16px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; align-items: center;">
          
          <div>
            <label class="form-label" style="font-size: 0.78rem;">Customer Filter</label>
            <select class="form-input" style="padding: 6px 10px;" onchange="window.iKhataStatementGenerator.selectedCustomerId = this.value; window.iKhataUI.refresh();">
              <option value="">All Customers (${customers.length})</option>
              ${customers.map(c => `
                <option value="${c.id}" ${this.selectedCustomerId === c.id ? 'selected' : ''}>${c.name} (${c.phone})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="form-label" style="font-size: 0.78rem;">Transaction Type</label>
            <select class="form-input" style="padding: 6px 10px;" onchange="window.iKhataStatementGenerator.selectedType = this.value; window.iKhataUI.refresh();">
              <option value="ALL" ${this.selectedType === 'ALL' ? 'selected' : ''}>All Types (GAVE + GOT)</option>
              <option value="GAVE" ${this.selectedType === 'GAVE' ? 'selected' : ''}>You Gave (Credit)</option>
              <option value="GOT" ${this.selectedType === 'GOT' ? 'selected' : ''}>You Got (Payment)</option>
            </select>
          </div>

          <div>
            <label class="form-label" style="font-size: 0.78rem;">Date Range</label>
            <select class="form-input" style="padding: 6px 10px;" onchange="window.iKhataStatementGenerator.activeDateFilter = this.value; window.iKhataUI.refresh();">
              <option value="ALL" ${this.activeDateFilter === 'ALL' ? 'selected' : ''}>All Time</option>
              <option value="THIS_MONTH" ${this.activeDateFilter === 'THIS_MONTH' ? 'selected' : ''}>This Month</option>
              <option value="TODAY" ${this.activeDateFilter === 'TODAY' ? 'selected' : ''}>Today</option>
            </select>
          </div>

        </div>
      </div>

      <!-- Statement Summary Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">TOTAL TRANSACTIONS</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800;">${filteredTx.length}</div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--danger); font-weight: 700;">TOTAL GAVE (CREDIT)</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--danger);">${formatCurrency(totalGave)}</div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--success); font-weight: 700;">TOTAL GOT (COLLECTIONS)</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--success);">${formatCurrency(totalGot)}</div>
        </div>
      </div>

      <!-- Filtered Ledger Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 Filtered Ledger Results (${filteredTx.length})</div>
          <button class="btn btn-success btn-sm" onclick="window.iKhataStatementGenerator.exportStatementCSV()">
            📥 Export Statement CSV
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
            <thead style="background: var(--bg-main); border-bottom: 1px solid var(--border-color);">
              <tr>
                <th style="padding: 8px;">Date</th>
                <th style="padding: 8px;">Customer</th>
                <th style="padding: 8px;">Type</th>
                <th style="padding: 8px;">Mode</th>
                <th style="padding: 8px;">Note</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTx.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">No transactions match selected filters.</td></tr>
              ` : filteredTx.map(t => `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 8px;">${t.date} ${t.time || ''}</td>
                  <td style="padding: 8px; font-weight: 700;">${t.customerName}</td>
                  <td style="padding: 8px;"><span class="badge ${t.type === 'GOT' ? 'badge-success' : 'badge-danger'}">${t.type === 'GOT' ? 'Got (Payment)' : 'Gave (Credit)'}</span></td>
                  <td style="padding: 8px;">${t.mode || 'Credit'}</td>
                  <td style="padding: 8px; color: var(--text-muted);">${t.note || '-'}</td>
                  <td style="padding: 8px; text-align: right; font-weight: 700; color: ${t.type === 'GOT' ? 'var(--success)' : 'var(--danger)'};">
                    ${t.type === 'GOT' ? '-' : '+'}${formatCurrency(t.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportStatementCSV() {
    const allTx = window.iKhataStore.getTransactions();
    let filteredTx = allTx;
    if (this.selectedCustomerId) filteredTx = filteredTx.filter(t => t.customerId === this.selectedCustomerId);
    if (this.selectedType !== 'ALL') filteredTx = filteredTx.filter(t => t.type === this.selectedType);

    const rows = [['Date', 'Customer Name', 'Type', 'Mode', 'Note', 'Amount (INR)']];
    filteredTx.forEach(t => {
      rows.push([t.date, t.customerName, t.type, t.mode||'', t.note||'', t.amount]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.iKhataUI.showToast('📥 Custom Statement CSV downloaded!', 'success');
  }
};
