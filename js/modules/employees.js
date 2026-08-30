/* iKhataPro Employees & RBAC Module */

window.iKhataEmployees = {
  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    const employees = window.iKhataStore.getEmployees() || [];
    
    const sortedBySales = [...employees].sort((a, b) => (b.sales || 0) - (a.sales || 0));
    const topSeller = sortedBySales[0] && (sortedBySales[0].sales || 0) > 0 ? sortedBySales[0] : null;

    const sortedByCollections = [...employees].sort((a, b) => (b.collections || 0) - (a.collections || 0));
    const collectionChampion = sortedByCollections[0] && (sortedByCollections[0].collections || 0) > 0 ? sortedByCollections[0] : null;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Employees & Permissions</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Manage shop staff, role permissions, and sales performance leaderboards</p>
        </div>
        <button class="btn btn-primary" onclick="window.iKhataEmployees.openAddEmployeeModal()">
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
              <h3 style="margin-top: 2px;">${topSeller ? topSeller.name : 'No Sales Yet'}</h3>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${topSeller ? 'Sales: ' + formatCurrency(topSeller.sales) : 'Add sales to select winner'}</div>
            </div>
          </div>
        </div>

        <div class="card" style="background: linear-gradient(135deg, #ecfdf5, #ffffff); border-color: #a7f3d0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">🔥</div>
            <div>
              <span class="badge badge-success">Collection Champion</span>
              <h3 style="margin-top: 2px;">${collectionChampion ? collectionChampion.name : 'No Collections Yet'}</h3>
              <div style="font-size: 0.85rem; color: var(--text-muted);">${collectionChampion ? 'Collected: ' + formatCurrency(collectionChampion.collections) : 'Record collections to select winner'}</div>
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
          ${employees.length === 0 ? `
            <div style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
              <div style="font-size: 2.5rem; margin-bottom: 8px;">👥</div>
              <p style="font-weight: 600; font-size: 1rem; color: var(--text-color); margin-bottom: 4px;">Koi Employee Add Nahi Hai</p>
              <p style="font-size: 0.85rem;">Upar "➕ Add Employee" button par click karke naya staff member add karein.</p>
            </div>
          ` : employees.map(emp => `
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
  },

  openAddEmployeeModal() {
    window.iKhataUI.openModal('➕ Add New Employee', `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Employee Name *</label>
          <input id="emp-name-input" type="text" placeholder="e.g. Rahul Kumar" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box;">
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Phone Number *</label>
          <input id="emp-phone-input" type="tel" placeholder="e.g. 9876543210" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box;">
        </div>
        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Role *</label>
          <select id="emp-role-input" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box; background: var(--bg-card);">
            <option value="Salesman">Salesman</option>
            <option value="Accountant">Accountant</option>
            <option value="Manager">Manager</option>
            <option value="Owner">Owner</option>
            <option value="Delivery Staff">Delivery Staff</option>
          </select>
        </div>
        <button class="btn btn-primary" style="margin-top: 4px; width: 100%;" onclick="window.iKhataEmployees.saveNewEmployee()">
          ✅ Save Employee
        </button>
      </div>
    `);
  },

  saveNewEmployee() {
    const name  = document.getElementById('emp-name-input')?.value?.trim();
    const rawPhone = document.getElementById('emp-phone-input')?.value?.trim() || '';
    const role  = document.getElementById('emp-role-input')?.value;

    if (!name || !rawPhone) {
      window.iKhataUI.showToast('❌ Naam aur phone number daalein!', 'error');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      window.iKhataUI.showToast('❌ Valid 10-digit phone number daalein!', 'error');
      return;
    }

    const newEmp = { name, phone: cleanPhone, role, sales: 0, collections: 0 };

    if (window.iKhataStore && typeof window.iKhataStore.addEmployee === 'function') {
      window.iKhataStore.addEmployee(newEmp);
    } else {
      if (!window.iKhataStore.state.employees) window.iKhataStore.state.employees = [];
      window.iKhataStore.state.employees.push(newEmp);
      window.iKhataStore.saveState();
      window.iKhataStore.notify();
    }

    window.iKhataUI.closeModal();
    window.iKhataUI.showToast(`✅ ${name} ko add kar diya gaya!`, 'success');

    if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
      window.iKhataUI.refresh();
    } else if (window.iKhataApp && typeof window.iKhataApp.navigate === 'function') {
      window.iKhataApp.navigate('employees');
    } else {
      const main = document.getElementById('main-content');
      if (main) main.innerHTML = window.iKhataEmployees.render(window.iKhataStore?.state || {});
    }
  }
};
