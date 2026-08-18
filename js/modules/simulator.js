/* iKhataPro What-If & Cash Flow Simulator */

window.iKhataSimulator = {
  priceChange: 0,
  discountChange: 0,
  newStockCost: 0,
  staffCount: 0,

  render(state) {
    const formatCurrency = (amt) => '₹' + Math.round(amt || 0).toLocaleString('en-IN');

    // Base figures
    const baseRevenue = 485000;
    const baseExpenses = 82400;

    // Simulation Math
    const priceMultiplier = 1 + (this.priceChange / 100);
    const discountFactor = 1 - (this.discountChange / 100);
    const projectedRevenue = baseRevenue * priceMultiplier * discountFactor;
    const addedExpense = (this.staffCount * 15000) + (this.newStockCost * 0.1);
    const projectedExpenses = baseExpenses + addedExpense;
    const projectedProfit = projectedRevenue - projectedExpenses;
    const netProfitChange = projectedProfit - (baseRevenue - baseExpenses);

    return `
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 1.75rem;">What-If & Cash Flow Simulator</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Simulate business decisions (price hikes, discounts, staff hires) before making real choices</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        <!-- Controls Panel -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚙️ Business Variables</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div class="form-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Change Product Prices:</span>
                <strong style="color: var(--primary);">${this.priceChange > 0 ? '+' : ''}${this.priceChange}%</strong>
              </label>
              <input type="range" min="-20" max="30" value="${this.priceChange}" class="form-input" oninput="window.iKhataSimulator.priceChange = parseInt(this.value); window.iKhataUI.refresh();">
            </div>

            <div class="form-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Offer Customer Discount:</span>
                <strong style="color: var(--warning);">${this.discountChange}%</strong>
              </label>
              <input type="range" min="0" max="15" value="${this.discountChange}" class="form-input" oninput="window.iKhataSimulator.discountChange = parseInt(this.value); window.iKhataUI.refresh();">
            </div>

            <div class="form-group">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <span>Hire Extra Helpers (₹15,000/mo each):</span>
                <strong style="color: var(--ai);">${this.staffCount} staff</strong>
              </label>
              <input type="range" min="0" max="5" value="${this.staffCount}" class="form-input" oninput="window.iKhataSimulator.staffCount = parseInt(this.value); window.iKhataUI.refresh();">
            </div>
          </div>
        </div>

        <!-- Simulation Output Results -->
        <div class="card" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white;">
          <div class="card-header" style="border-bottom-color: #334155;">
            <div class="card-title" style="color: white;">📊 Projected Monthly Outcome</div>
            <span class="badge badge-ai">Simulated Estimate</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px; margin: 16px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8;">Estimated Revenue:</span>
              <strong style="font-size: 1.2rem; color: white;">${formatCurrency(projectedRevenue)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8;">Estimated Expenses:</span>
              <strong style="font-size: 1.2rem; color: #fca5a5;">${formatCurrency(projectedExpenses)}</strong>
            </div>

            <hr style="border: none; border-top: 1px solid #334155;">

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8; font-size: 1.1rem;">Projected Net Profit:</span>
              <strong style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; color: ${netProfitChange >= 0 ? '#34d399' : '#f87171'};">
                ${formatCurrency(projectedProfit)}
              </strong>
            </div>

            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem; color: #cbd5e1;">
              💡 <strong>Impact:</strong> This scenario leads to a <strong>${netProfitChange >= 0 ? '+' : ''}${formatCurrency(netProfitChange)}</strong> change in monthly net cash.
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
