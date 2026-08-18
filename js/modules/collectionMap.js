/* iKhataPro Collection Route Map Planner */

window.iKhataCollectionMap = {
  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const pendingCust = state.customers.filter(c => c.balance > 0).slice(0, 5);

    return `
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 1.75rem;">Today's Collection Route Map</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Optimized physical visit sequence for collecting overdue payments</p>
      </div>

      <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #ecfdf5, #ffffff); border-color: #a7f3d0;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="badge badge-success">5 Stops Today</span>
            <h2 style="font-size: 1.5rem; margin-top: 4px;">Total Pending Collection: ${formatCurrency(pendingCust.reduce((s,c)=>s+c.balance,0))}</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Estimated Distance: 14.2 km • Estimated Time: 1 hour 45 mins</p>
          </div>
          <button class="btn btn-success" onclick="window.iKhataUI.showToast('🚀 Navigation route sent to Google Maps!', 'success')">
            📍 Start Navigation Route
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">🗺️ Stop-by-Stop Collection Sequence</div>
        </div>

        <div class="collection-route-list">
          ${pendingCust.map((c, idx) => `
            <div class="route-step">
              <div class="route-step-number">${idx + 1}</div>
              <div style="flex: 1;">
                <strong style="font-size: 0.95rem;">${c.name}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted);">📍 ${c.city} Main Market • 📱 ${c.phone}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: var(--danger);">
                  ${formatCurrency(c.balance)}
                </div>
                <button class="btn btn-outline btn-sm" style="margin-top: 4px;" onclick="window.iKhataUI.openReceivePaymentModal('${c.id}')">
                  💰 Collect
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};
