/* iKhataPro Business Financials, P&L & Cash Flow Module — Phase 3 */

window.iKhataPNL = {
  currentPeriod: 'THIS_MONTH',
  activeTab: 'PNL', // 'PNL' or 'CASHFLOW'

  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();
    const pnl = window.iKhataStore.getFinancialPNL(this.currentPeriod);
    const cf = window.iKhataIntelligence ? window.iKhataIntelligence.computeCashFlow(this.currentPeriod) : { totalIn: 0, totalOut: 0, netMovement: 0, breakdown: { in: {}, out: {} } };

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Financial Statement & Cash Flow</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Accrual P&L revenue breakdown and real Cash Flow movements for <strong>${bus ? bus.name : 'Store'}</strong></p>
        </div>

        <!-- Period Filters -->
        <div class="tab-list" style="margin-bottom: 0;">
          <button class="tab-btn ${this.currentPeriod === 'TODAY' ? 'active' : ''}" onclick="window.iKhataPNL.currentPeriod = 'TODAY'; window.iKhataUI.refresh();">Today</button>
          <button class="tab-btn ${this.currentPeriod === 'THIS_MONTH' ? 'active' : ''}" onclick="window.iKhataPNL.currentPeriod = 'THIS_MONTH'; window.iKhataUI.refresh();">This Month</button>
          <button class="tab-btn ${this.currentPeriod === 'THIS_QUARTER' ? 'active' : ''}" onclick="window.iKhataPNL.currentPeriod = 'THIS_QUARTER'; window.iKhataUI.refresh();">Quarter</button>
          <button class="tab-btn ${this.currentPeriod === 'THIS_YEAR' ? 'active' : ''}" onclick="window.iKhataPNL.currentPeriod = 'THIS_YEAR'; window.iKhataUI.refresh();">This Year</button>
          <button class="tab-btn ${this.currentPeriod === 'ALL' ? 'active' : ''}" onclick="window.iKhataPNL.currentPeriod = 'ALL'; window.iKhataUI.refresh();">All Time</button>
        </div>
      </div>

      <!-- Tab Switcher: P&L vs Cash Flow -->
      <div class="card" style="margin-bottom: 20px; padding: 12px 16px;">
        <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
          <button class="tab-btn ${this.activeTab === 'PNL' ? 'active' : ''}" onclick="window.iKhataPNL.activeTab = 'PNL'; window.iKhataUI.refresh();">
            📈 Profit & Loss Statement (Accrual)
          </button>
          <button class="tab-btn ${this.activeTab === 'CASHFLOW' ? 'active' : ''}" onclick="window.iKhataPNL.activeTab = 'CASHFLOW'; window.iKhataUI.refresh();">
            💵 Cash Flow Analysis (Money In vs Out)
          </button>
        </div>
      </div>

      ${this.activeTab === 'PNL' ? `
        <!-- Net Profit Banner -->
        <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, #065f46, #047857); color: white;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
            <div>
              <span class="badge badge-success" style="background: rgba(255,255,255,0.2); color: white; margin-bottom: 8px;">📊 NET PROFIT (${this.currentPeriod.replace('_', ' ')})</span>
              <h2 style="color: white; font-size: 2.2rem; margin-bottom: 4px;">${formatCurrency(pnl.netProfit)}</h2>
              <p style="color: #a7f3d0; font-size: 0.9rem;">Gross Margin: <strong>${pnl.grossMarginPct}%</strong> • Net Sales: <strong>${formatCurrency(pnl.netSales)}</strong></p>
            </div>
            <button class="btn btn-outline" style="color: white; border-color: white;" onclick="window.print()">
              🖨️ Print P&L Report
            </button>
          </div>
        </div>

        <!-- Financial Metrics Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div class="card" style="padding: 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">1. GROSS REVENUE / SALES</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">
              ${formatCurrency(pnl.grossSales)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">From POS counter bills & GST invoices</div>
          </div>

          <div class="card" style="padding: 16px;">
            <div style="font-size: 0.78rem; color: var(--danger); font-weight: 700;">2. COST OF GOODS SOLD (COGS)</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--danger); margin-top: 4px;">
              - ${formatCurrency(pnl.cogs)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Unit purchase cost of items sold</div>
          </div>

          <div class="card" style="padding: 16px; background: var(--primary-light); border-color: var(--border-focus);">
            <div style="font-size: 0.78rem; color: var(--primary); font-weight: 700;">3. GROSS PROFIT</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--primary); margin-top: 4px;">
              ${formatCurrency(pnl.grossProfit)}
            </div>
            <div style="font-size: 0.8rem; color: var(--primary);">Net Sales minus COGS</div>
          </div>

          <div class="card" style="padding: 16px;">
            <div style="font-size: 0.78rem; color: var(--warning); font-weight: 700;">4. OPERATING EXPENSES</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--warning); margin-top: 4px;">
              - ${formatCurrency(pnl.operatingExpenses)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Rent, Salary, Utilities, Delivery</div>
          </div>
        </div>

        <!-- Detailed Breakdown Tables -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- P&L Statement Summary Card -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">🧾 Income & Cost Breakdown</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.92rem;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                <span>Gross Sales Revenue</span>
                <strong>${formatCurrency(pnl.grossSales)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                <span>Less: Sales Returns</span>
                <span>- ${formatCurrency(pnl.salesReturns)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 700; background: var(--bg-main); padding: 8px; border-radius: 6px;">
                <span>Net Revenue</span>
                <span>${formatCurrency(pnl.netSales)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; color: var(--danger);">
                <span>Less: Cost of Goods Sold (COGS)</span>
                <span>- ${formatCurrency(pnl.cogs)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--primary); background: var(--primary-light); padding: 8px; border-radius: 6px;">
                <span>Gross Profit</span>
                <span>${formatCurrency(pnl.grossProfit)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px; color: var(--warning);">
                <span>Less: Operating Expenses</span>
                <span>- ${formatCurrency(pnl.operatingExpenses)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; color: var(--success); background: var(--success-light); padding: 10px; border-radius: 8px; border: 1px solid var(--success-border);">
                <span>NET PROFIT BEFORE TAX</span>
                <span>${formatCurrency(pnl.netProfit)}</span>
              </div>
            </div>
          </div>

          <!-- Expenses Categorized Breakdown -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">📊 Operating Expense Categories</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${Object.keys(pnl.expensesByCategory || {}).length === 0 ? `
                <p style="color: var(--text-muted); font-size: 0.9rem;">No expenses logged for this period.</p>
              ` : Object.entries(pnl.expensesByCategory).map(([cat, amt]) => {
                const pct = pnl.operatingExpenses > 0 ? Math.round((amt / pnl.operatingExpenses) * 100) : 0;
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 4px;">
                      <strong>${cat}</strong>
                      <span>${formatCurrency(amt)} (${pct}%)</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: var(--warning);"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : `
        <!-- Cash Flow View -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 24px;">
          <div class="card" style="border-top: 4px solid var(--success);">
            <div style="font-size: 0.8rem; color: var(--success); font-weight: 700;">TOTAL MONEY IN (CASH RECEIVED)</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: var(--success); margin-top: 4px;">
              + ${formatCurrency(cf.totalIn)}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
              • Cash Sales: ${formatCurrency(cf.breakdown.in.cashSales)}<br>
              • Credit Collections: ${formatCurrency(cf.breakdown.in.creditCollections)}
            </div>
          </div>

          <div class="card" style="border-top: 4px solid var(--danger);">
            <div style="font-size: 0.8rem; color: var(--danger); font-weight: 700;">TOTAL MONEY OUT (CASH PAID)</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: var(--danger); margin-top: 4px;">
              - ${formatCurrency(cf.totalOut)}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
              • Operating Expenses: ${formatCurrency(cf.breakdown.out.totalExpenses)}<br>
              • Supplier Payments: ${formatCurrency(cf.breakdown.out.supplierPayments)}
            </div>
          </div>

          <div class="card" style="border-top: 4px solid ${cf.netMovement >= 0 ? 'var(--success)' : 'var(--danger)'}; background: ${cf.netMovement >= 0 ? '#f0fdf4' : '#fef2f2'};">
            <div style="font-size: 0.8rem; color: ${cf.netMovement >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 700;">NET CASH MOVEMENT</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: ${cf.netMovement >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-top: 4px;">
              ${cf.netMovement >= 0 ? '+' : ''}${formatCurrency(cf.netMovement)}
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
              ${cf.netMovement >= 0 ? '✅ Positive cash flow for this period.' : '🔴 Cash outflows exceeded collections.'}
            </div>
          </div>
        </div>
      `}
    `;
  }
};
