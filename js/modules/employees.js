/* iKhataPro Employees & RBAC Module */

window.iKhataEmployees = {
  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Employees & Permissions</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Manage shop staff, role permissions, and sales performance leaderboards</p>
        </div>
        <button class="btn btn-primary" onclick="window.iKhataUI.showToast('Staff invite link copied!', 'success')">
          <span>➕</span> Add Employee
        </button>
      </div>

      <!-- Employee Performance Leaderboard -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="background: linear-gradient(135deg, #fffbeb, #ffffff); border-color: #fde68a;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">🏆</div>
            <div>
              <span class="badge badge-warning">Top Seller</span>
              <h3 style="margin-top: 2px;">Aryan Sharma</h3>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Sales: ${formatCurrency(485000)}</div>
            </div>
          </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #ecfdf5, #ffffff); border-color: #a7f3d0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">🔥</div>
            <div>
              <span class="badge badge-success">Collection Champion</span>
              <h3 style="margin-top: 2px;">Kamal Verma</h3>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Collected: ${formatCurrency(210000)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Staff List & Permissions Table -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">👥 Team Members & Staff Roles</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${(window.iKhataStore.getEmployees() || []).map(emp => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); flex-wrap: wrap; gap: 12px;">
              <div>
                <strong style="font-size: 1rem;">${emp.name}</strong>
                <span class="badge badge-ai" style="margin-left: 8px;">${emp.role}</span>
                <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">📱 ${emp.phone}</div>
              </div>

              <div style="display: flex; gap: 16px; align-items: center;">
                <div style="text-align: right; font-size: 0.85rem;">
                  <div>Sales: <strong>${formatCurrency(emp.sales)}</strong></div>
                  <div style="color: var(--text-muted);">Collections: ${formatCurrency(emp.collections)}</div>
                </div>

                <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.openRBACModal('${emp.name}', '${emp.role}')">
                  ⚙️ Permissions
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  openRBACModal(name, role) {
    window.iKhataUI.openModal(`Permissions: ${name} (${role})`, `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span>View Customer Balances</span>
          <input type="checkbox" checked style="width: 18px; height: 18px;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span>Add Khata & Receive Payments</span>
          <input type="checkbox" checked style="width: 18px; height: 18px;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span>Delete Transactions</span>
          <input type="checkbox" ${role === 'Owner' ? 'checked' : ''} style="width: 18px; height: 18px;">
        </label>
        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
          <span>View Profit & Reports</span>
          <input type="checkbox" ${role === 'Owner' || role === 'Accountant' ? 'checked' : ''} style="width: 18px; height: 18px;">
        </label>

        <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.iKhataUI.closeModal(); window.iKhataUI.showToast('✓ Role permissions saved!', 'success');">
          Save Permissions
        </button>
      </div>
    `);
  }
};
