/* iKhataPro Dashboard Module (Tenant Scoped & Data-Grounded) — Phase 3 */

window.iKhataDashboard = {
  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();
    const transactions = window.iKhataStore.getTransactions();
    const suppliers = window.iKhataStore.getSuppliers();
    const bills = window.iKhataStore.getBills();

    // Intelligence computed dynamically
    const health = window.iKhataIntelligence ? window.iKhataIntelligence.computeBusinessHealth() : { score: bus.healthScore || 80, label: 'Healthy', color: '#059669', positives: [], risks: [], improvements: [] };
    const alerts = window.iKhataIntelligence ? window.iKhataIntelligence.generateAlerts() : [];

    // Calculate supplier payables
    const totalSupplierPayable = suppliers.reduce((sum, sup) => sum + (sup.balance || 0), 0);

    // Build 7-Day Sales Trend (Pure CSS/SVG Bars)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const daySales = bills.filter(b => b.date === dateStr).reduce((s, b) => s + (b.grandTotal || 0), 0);
      const dayName = new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { weekday: 'short' });
      last7Days.push({ date: dateStr, dayName, sales: daySales });
    }
    const maxSales = Math.max(...last7Days.map(d => d.sales), 1000);

    return `
      <div class="dashboard-header" style="margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1 style="font-size: 1.75rem; margin-bottom: 4px;">Good Day, ${bus.ownerName} 👋</h1>
            <p style="color: var(--text-muted); font-size: 0.95rem;">Here is live business intelligence for <strong>${bus.name}</strong> (${bus.city}).</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-ai" onclick="window.iKhataCopilot.toggle()">
              <span>🤖</span> AI Assistant
            </button>
          </div>
        </div>
      </div>

      <!-- Smart Alert Banner Carousel / Cards -->
      ${alerts.length > 0 ? `
        <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--primary-color); background: #f8fafc; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
              <span>⚡</span> Smart Alert Center (${alerts.length})
            </div>
            <span class="badge badge-neutral" style="font-size: 0.75rem;">Live</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${alerts.slice(0, 3).map(a => `
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 10px; font-size: 0.88rem;">
                  <span style="font-size: 1.1rem;">${a.icon}</span>
                  <span>${a.text}</span>
                </div>
                ${a.actionLabel ? `
                  <button class="btn btn-outline btn-sm" style="font-size: 0.78rem; padding: 4px 10px;" onclick="window.iKhataUI.navigate('${a.route}')">
                    ${a.actionLabel} →
                  </button>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- KPI Summary Grid -->
      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-label">TODAY'S SALES</div>
          <div class="stat-value">${formatCurrency(bus.todaySales)}</div>
          <div class="stat-subtext up"><span>↑ Live</span> POS & Invoices</div>
        </div>

        <div class="stat-card success">
          <div class="stat-label">RECEIVED TODAY</div>
          <div class="stat-value" style="color: var(--success);">${formatCurrency(bus.todayReceived)}</div>
          <div class="stat-subtext">Collections settled</div>
        </div>

        <div class="stat-card danger">
          <div class="stat-label">CUSTOMER RECEIVABLES</div>
          <div class="stat-value" style="color: var(--danger);">${formatCurrency(bus.toReceiveTotal)}</div>
          <div class="stat-subtext" style="color: var(--danger);">You Will Get</div>
        </div>

        <div class="stat-card warning">
          <div class="stat-label">SUPPLIER PAYABLES</div>
          <div class="stat-value" style="color: var(--warning);">${formatCurrency(totalSupplierPayable)}</div>
          <div class="stat-subtext" style="color: var(--warning);">You Will Give</div>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Quick Actions</h3>
        <div class="quick-actions-grid">
          <div class="quick-action-btn get" onclick="window.iKhataUI.openAddKhataModal('GAVE')">
            <div class="quick-action-icon">➕</div>
            <div class="quick-action-label">Add Khata</div>
          </div>

          <div class="quick-action-btn get" onclick="window.iKhataUI.openReceivePaymentModal()">
            <div class="quick-action-icon">💰</div>
            <div class="quick-action-label">Receive Payment</div>
          </div>

          <div class="quick-action-btn invoice" onclick="window.iKhataUI.openCreateInvoiceModal()">
            <div class="quick-action-icon">📄</div>
            <div class="quick-action-label">GST Invoice</div>
          </div>

          <div class="quick-action-btn pos" onclick="window.iKhataUI.navigate('pos')">
            <div class="quick-action-icon">🛒</div>
            <div class="quick-action-label">Open POS</div>
          </div>

          <div class="quick-action-btn expense" onclick="window.iKhataUI.navigate('suppliers')">
            <div class="quick-action-icon">🏭</div>
            <div class="quick-action-label">Suppliers & PO</div>
          </div>

          <div class="quick-action-btn pos" onclick="window.iKhataUI.navigate('pnl')">
            <div class="quick-action-icon">📈</div>
            <div class="quick-action-label">P&L & Cash Flow</div>
          </div>
        </div>
      </div>

      <!-- Business Health & 7-Day Sales Trend Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 24px;">
        
        <!-- Business Health Score Gauge Card -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card-header">
            <div class="card-title">
              <span>📊</span> Business Health Score
            </div>
            <span class="badge" style="background: ${health.color}; color: white;">${health.label}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 20px; margin: 16px 0;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(${health.color} ${health.score * 3.6}deg, #e2e8f0 0deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.4rem; color: ${health.color};">
                ${health.score}
              </div>
            </div>

            <div>
              <div style="font-weight: 700; font-size: 1.1rem;">${health.label} Condition</div>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                ${health.risks.length > 0 ? health.risks[0] : 'All key metrics are operating smoothly.'}
              </p>
            </div>
          </div>

          <div style="font-size: 0.85rem; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
            <strong style="color: var(--success);">Positive Factor:</strong> ${health.positives[0] || 'Good customer activity.'}
          </div>
        </div>

        <!-- 7-Day Sales Bar Chart (Pure CSS) -->
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div class="card-header">
            <div class="card-title">
              <span>📉</span> 7-Day POS Sales Trend
            </div>
            <span class="badge badge-neutral">Weekly</span>
          </div>

          <div style="display: flex; align-items: flex-end; gap: 12px; height: 110px; padding: 10px 0; margin-top: 10px;">
            ${last7Days.map(d => {
              const heightPct = Math.max(10, Math.round((d.sales / maxSales) * 100));
              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%;">
                  <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); font-family: monospace;">
                    ${d.sales > 0 ? (d.sales >= 1000 ? (d.sales/1000).toFixed(1)+'k' : d.sales) : '0'}
                  </div>
                  <div style="width: 100%; max-width: 28px; background: linear-gradient(180deg, var(--primary-color), #818cf8); height: ${heightPct}%; border-radius: 4px 4px 0 0; margin-top: auto;"></div>
                  <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${d.dayName}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

      <!-- Recent Khata Activity Section -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>⏳</span> Latest Khata Activity
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.navigate('khata')">View All Khata</button>
        </div>

        <div class="customer-card-list">
          ${transactions.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
              No transactions recorded for ${bus.name} yet.
            </div>
          ` : transactions.slice(0, 5).map(tx => `
            <div class="customer-item-card" onclick="window.iKhataUI.openCustomerProfile('${tx.customerId}')">
              <div class="customer-avatar">${tx.customerName.charAt(0)}</div>
              <div class="customer-details">
                <div class="customer-name">${tx.customerName}</div>
                <div class="customer-meta">
                  <span>${tx.date} ${tx.time ? 'at ' + tx.time : ''}</span>
                  <span>•</span>
                  <span>${tx.note || 'No note'}</span>
                </div>
              </div>
              <div class="customer-balance-box">
                <div class="balance-amount ${tx.type === 'GAVE' ? 'give' : 'get'}">
                  ${tx.type === 'GAVE' ? 'You Gave' : 'You Got'} ${formatCurrency(tx.amount)}
                </div>
                <div class="balance-label">${tx.mode || 'Credit'}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};
