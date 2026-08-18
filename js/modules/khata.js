/* iKhataPro Digital Khata Module (Tenant Scoped) */

window.iKhataModule = {
  currentTab: 'ALL',
  searchQuery: '',

  render(state) {
    const formatCurrency = (amt) => '₹' + Math.abs(amt || 0).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();
    let customers = window.iKhataStore.getCustomers();

    if (this.currentTab === 'GET') {
      customers = customers.filter(c => c.balance > 0);
    } else if (this.currentTab === 'GIVE') {
      customers = customers.filter(c => c.balance < 0);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      customers = customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    const allCust = window.iKhataStore.getCustomers();

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">My Khata — ${bus.name}</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Track all customer balances, credits and payment entries</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-outline" onclick="window.iKhataVoice.startListening()">
            <span>🎙️</span> Voice Khata
          </button>
          <button class="btn btn-primary" onclick="window.iKhataUI.openAddKhataModal()">
            <span>➕</span> Add Khata Entry
          </button>
        </div>
      </div>

      <!-- Top Balances Banner -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <div style="background: var(--success-light); border: 1px solid var(--success-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--success); text-transform: uppercase;">YOU WILL GET</span>
          <span style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--success);">
            ${formatCurrency(bus.toReceiveTotal)}
          </span>
        </div>

        <div style="background: var(--danger-light); border: 1px solid var(--danger-border); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--danger); text-transform: uppercase;">YOU WILL GIVE</span>
          <span style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--danger);">
            ${formatCurrency(bus.toGiveTotal)}
          </span>
        </div>
      </div>

      <!-- Search & Tab Filter Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 16px;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <div style="flex: 1; min-width: 240px;">
            <input type="text" class="form-input" placeholder="Search customer by name or phone..." value="${this.searchQuery}" oninput="window.iKhataModule.searchQuery = this.value; window.iKhataUI.refresh();">
          </div>
          
          <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn ${this.currentTab === 'ALL' ? 'active' : ''}" onclick="window.iKhataModule.currentTab = 'ALL'; window.iKhataUI.refresh();">
              ALL (${allCust.length})
            </button>
            <button class="tab-btn ${this.currentTab === 'GET' ? 'active' : ''}" onclick="window.iKhataModule.currentTab = 'GET'; window.iKhataUI.refresh();">
              YOU WILL GET (${allCust.filter(c=>c.balance>0).length})
            </button>
            <button class="tab-btn ${this.currentTab === 'GIVE' ? 'active' : ''}" onclick="window.iKhataModule.currentTab = 'GIVE'; window.iKhataUI.refresh();">
              YOU WILL GIVE (${allCust.filter(c=>c.balance<0).length})
            </button>
          </div>
        </div>
      </div>

      <!-- Customer Cards Grid -->
      <div class="customer-card-list">
        ${customers.length === 0 ? `
          <div class="card" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">📑</div>
            <h3>No customers found for ${bus.name}</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Add your first customer to start tracking your Khata.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.iKhataUI.openAddCustomerModal()">
              <span>➕</span> Add Customer
            </button>
          </div>
        ` : customers.map(c => `
          <div class="customer-item-card">
            <div class="customer-avatar" onclick="window.iKhataUI.openCustomerProfile('${c.id}')">${c.name.charAt(0)}</div>
            <div class="customer-details" onclick="window.iKhataUI.openCustomerProfile('${c.id}')">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="customer-name">${c.name}</span>
                <span class="badge ${c.category === 'VIP' ? 'badge-ai' : (c.category === 'At Risk' ? 'badge-warning' : 'badge-neutral')}">${c.category}</span>
              </div>
              <div class="customer-meta">
                <span>📱 ${c.phone}</span>
                <span>•</span>
                <span>Last active: ${c.lastActive}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 16px;">
              <div class="customer-balance-box" onclick="window.iKhataUI.openCustomerProfile('${c.id}')">
                <div class="balance-amount ${c.balance > 0 ? 'get' : (c.balance < 0 ? 'give' : 'neutral')}">
                  ${formatCurrency(c.balance)}
                </div>
                <div class="balance-label">
                  ${c.balance > 0 ? 'YOU WILL GET' : (c.balance < 0 ? 'YOU WILL GIVE' : 'SETTLED')}
                </div>
              </div>

              <div style="display: flex; gap: 6px;">
                ${c.balance > 0 ? `
                  <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.openReminderModal('${c.id}')">💬 Remind</button>
                  <button class="btn btn-success btn-sm" onclick="window.iKhataUI.openReceivePaymentModal('${c.id}')">💰 Receive</button>
                ` : `
                  <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.openCustomerProfile('${c.id}')">👁️ View</button>
                `}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
};
