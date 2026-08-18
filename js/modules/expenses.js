/* iKhataPro Expenses & Receipt Scanner Module — Phase 3 */

window.iKhataExpenses = {
  currentPeriod: 'THIS_MONTH',

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const allExpenses = window.iKhataStore.getExpenses();

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    let expenses = allExpenses;
    if (this.currentPeriod === 'TODAY') {
      expenses = allExpenses.filter(e => e.date === todayStr);
    } else if (this.currentPeriod === 'THIS_MONTH') {
      expenses = allExpenses.filter(e => e.date >= startOfMonth);
    }

    const totalExp = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Expenses & Bills</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Track shop operational expenses, bill receipts, and category breakdowns</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline" onclick="window.iKhataExpenses.openOCRScanner()">
            <span>📷</span> Scan Receipt (AI OCR)
          </button>
          <button class="btn btn-primary" onclick="window.iKhataUI.openAddExpenseModal()">
            <span>➕</span> Add Expense
          </button>
        </div>
      </div>

      <!-- Filters & Period Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn ${this.currentPeriod === 'THIS_MONTH' ? 'active' : ''}" onclick="window.iKhataExpenses.currentPeriod = 'THIS_MONTH'; window.iKhataUI.refresh();">This Month</button>
            <button class="tab-btn ${this.currentPeriod === 'TODAY' ? 'active' : ''}" onclick="window.iKhataExpenses.currentPeriod = 'TODAY'; window.iKhataUI.refresh();">Today</button>
            <button class="tab-btn ${this.currentPeriod === 'ALL' ? 'active' : ''}" onclick="window.iKhataExpenses.currentPeriod = 'ALL'; window.iKhataUI.refresh();">All Time</button>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Showing ${expenses.length} expense(s)
          </div>
        </div>
      </div>

      <!-- Expense Summary Card -->
      <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, #ffffff, #fffbeb); border-color: #fde68a;">
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--warning); text-transform: uppercase;">TOTAL EXPENSES (${this.currentPeriod.replace('_', ' ')})</div>
        <div style="font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 800; color: var(--text-main); margin: 4px 0;">
          ${formatCurrency(totalExp)}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">Categorized under Rent, Salary, Transport, Electricity & Marketing</div>
      </div>

      <!-- Expense Items List -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🧾</span> Logged Expenses (${expenses.length})
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${expenses.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              No expenses logged for this period.
            </div>
          ` : expenses.map(e => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-color);">
              <div>
                <strong style="font-size: 0.95rem;">${e.note || 'Expense Item'}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Category: <span class="badge badge-warning">${e.category || 'General'}</span> • ${e.date}</div>
              </div>
              <div style="font-family: 'Outfit', sans-serif; font-size: 1.15rem; font-weight: 800; color: var(--danger);">
                ${formatCurrency(e.amount)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  openOCRScanner() {
    window.iKhataUI.openModal('OCR Receipt Scanner', `
      <div style="text-align: center; padding: 20px 0;">
        <div style="border: 2px dashed var(--border-color); border-radius: var(--radius-lg); padding: 32px 16px; background: var(--bg-main); cursor: pointer;" onclick="document.getElementById('ocr-file-input').click()">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📷</div>
          <h4>Click to upload bill / receipt photo</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">AI will scan vendor, date, total amount, and category</p>
          <input type="file" id="ocr-file-input" style="display: none;" accept="image/*" onchange="window.iKhataExpenses.processSimulatedOCR(this)">
        </div>

        <div id="ocr-result-area" style="margin-top: 20px; display: none; text-align: left; background: var(--ai-light); padding: 16px; border-radius: var(--radius-md); border: 1px solid #ddd6fe;">
          <h4 style="color: var(--ai); margin-bottom: 8px;">✨ Extracted Information</h4>
          <div style="font-size: 0.9rem; line-height: 1.6;">
            <div>Vendor: <strong>HP Petrol Pump Station</strong></div>
            <div>Amount: <strong>₹2,450</strong></div>
            <div>Date: <strong>Today</strong></div>
            <div>Category: <strong>Transport / Fuel</strong></div>
          </div>
          <button class="btn btn-ai" style="width: 100%; margin-top: 12px;" onclick="window.iKhataStore.addExpense({ category: 'Transport', amount: 2450, note: 'HP Petrol Pump Station (OCR Scanned)' }); window.iKhataUI.closeModal(); window.iKhataUI.showToast('✓ Scanned expense saved!', 'success'); window.iKhataUI.refresh();">
            Confirm & Save Expense
          </button>
        </div>
      </div>
    `);
  },

  processSimulatedOCR(input) {
    if (!input.files || !input.files[0]) return;
    const resultArea = document.getElementById('ocr-result-area');
    if (resultArea) resultArea.style.display = 'block';
  }
};
