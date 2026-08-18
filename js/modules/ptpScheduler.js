/* iKhataPro Feature 6: Promise-To-Pay (PTP) Date Tracker & Udhar Recovery Scheduler */

window.iKhataPTP = {
  openPTPModal(customerId) {
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0];

    window.iKhataUI.openModal(`📅 Set Promise-To-Pay (PTP) Date: ${customer.name}`, `
      <form onsubmit="event.preventDefault(); window.iKhataPTP.savePTP('${customer.id}', this);">
        <div style="background: var(--warning-light); border: 1px solid var(--warning-border); padding: 12px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 16px;">
          Pending Khata Dues: <strong style="color: var(--danger);">₹${customer.balance.toLocaleString('en-IN')}</strong>
        </div>

        <div class="form-group">
          <label class="form-label">Promised Payment Date (PTP)</label>
          <input type="date" name="ptpDate" class="form-input" value="${nextWeek}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Promised Payment Amount (₹)</label>
          <input type="number" name="ptpAmount" class="form-input" value="${customer.balance}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Customer Remark / Note</label>
          <input type="text" name="ptpNote" class="form-input" placeholder="e.g. Promised to pay after wheat harvest sales">
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Save Promise Date & Schedule Alert
        </button>
      </form>
    `);
  },

  savePTP(customerId, form) {
    const data = new FormData(form);
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (customer) {
      customer.ptpDate = data.get('ptpDate');
      customer.ptpAmount = parseFloat(data.get('ptpAmount'));
      customer.ptpNote = data.get('ptpNote');
      window.iKhataStore.saveState();

      window.iKhataUI.closeModal();
      window.iKhataUI.showToast(`📅 PTP set for ${customer.name} on ${customer.ptpDate}`, 'success');
    }
  }
};
