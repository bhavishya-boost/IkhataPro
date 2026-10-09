/* iKhataPro Employees & RBAC Module */

window.iKhataEmployees = {
  render(state) {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');

    const employees = window.iKhataStore ? (window.iKhataStore.getEmployees() || []) : [];
    const currentRole = window.iKhataStore ? window.iKhataStore.getCurrentUserRole() : 'OWNER';
    const currentEmp = window.iKhataStore ? window.iKhataStore.getCurrentEmployee() : null;
    const sessionName = currentEmp ? currentEmp.name : 'Primary Owner';

    const sortedBySales = [...employees].sort((a, b) => (b.sales || 0) - (a.sales || 0));
    const topSeller = sortedBySales[0] && (sortedBySales[0].sales || 0) > 0 ? sortedBySales[0] : null;

    const sortedByCollections = [...employees].sort((a, b) => (b.collections || 0) - (a.collections || 0));
    const collectionChampion = sortedByCollections[0] && (sortedByCollections[0].collections || 0) > 0 ? sortedByCollections[0] : null;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Employees & Permissions</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Manage shop staff, role permissions, and active staff sessions</p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button class="btn btn-outline" onclick="window.iKhataEmployees.openStaffSwitchModal()">
            🔄 Switch Staff Session (${sessionName})
          </button>
          <button class="btn btn-primary" onclick="window.iKhataEmployees.openAddEmployeeModal()">
            <span>➕</span> Add Employee
          </button>
        </div>
      </div>

      <!-- Active Session Status Card -->
      <div class="card" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(99, 102, 241, 0.02)); border-color: rgba(99, 102, 241, 0.3); margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 2rem;">🔑</div>
            <div>
              <div style="font-size: 0.82rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Active Staff Session</div>
              <h3 style="margin-top: 2px; font-size: 1.15rem;">
                ${sessionName} <span class="badge badge-ai" style="margin-left: 6px;">${currentRole}</span>
              </h3>
            </div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="window.iKhataEmployees.switchStaff('OWNER')">
            👑 Reset to Primary Owner
          </button>
        </div>
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
          ` : employees.map(emp => {
            const hasCustom = emp.permissions && Object.keys(emp.permissions).length > 0;
            const empId = emp.id || emp.name;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); flex-wrap: wrap; gap: 12px; background: var(--bg-card); transition: all 0.2s ease;">
                <div style="cursor: pointer; flex: 1; min-width: 200px;" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}')" title="Click to view detailed sales & transactions">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 1.05rem; color: var(--primary); text-decoration: underline dotted;">${emp.name}</strong>
                    <span class="badge badge-ai">${emp.role}</span>
                    ${hasCustom ? `<span class="badge badge-warning" style="font-size: 0.75rem;">Custom RBAC</span>` : ''}
                  </div>
                  <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
                    <span>📱 ${emp.phone}</span> • <span style="color: var(--primary); font-weight: 600;">👁️ Click for Daily Sales Details</span>
                  </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <div style="text-align: right; font-size: 0.85rem; margin-right: 8px; cursor: pointer;" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}')">
                    <div>Total Sales: <strong style="color: #16a34a;">${formatCurrency(emp.sales)}</strong></div>
                    <div style="color: var(--text-muted);">Collections: <strong style="color: #4f46e5;">${formatCurrency(emp.collections)}</strong></div>
                  </div>

                  <button class="btn btn-primary btn-sm" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}')" title="View Detailed Sales & Filter by Date">
                    📊 Sales Details
                  </button>

                  <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.switchStaff('${empId}')">
                    👤 Login As
                  </button>

                  <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.openRBACModal('${empId}')">
                    ⚙️ Permissions
                  </button>

                  <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.openResetPasswordModal('${empId}', '${emp.name}')">
                    🔑 Reset Passcode
                  </button>

                  <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: var(--danger);" onclick="window.iKhataEmployees.confirmDeleteEmployee('${empId}')" title="Delete Staff Member">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  openStaffSwitchModal() {
    const employees = window.iKhataStore ? (window.iKhataStore.getEmployees() || []) : [];
    window.iKhataUI.openModal('🔄 Switch Active Staff Session', `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <p style="font-size: 0.9rem; color: var(--text-muted);">Kis staff member ke role/session me switch karna chahte hain?</p>
        
        <button class="btn btn-outline" style="justify-content: flex-start; padding: 12px;" onclick="window.iKhataEmployees.switchStaff('OWNER')">
          👑 <strong>Primary Shop Owner</strong> (Full Access)
        </button>

        ${employees.map(emp => `
          <button class="btn btn-outline" style="justify-content: flex-start; padding: 12px;" onclick="window.iKhataEmployees.switchStaff('${emp.id || emp.name}')">
            👤 <strong>${emp.name}</strong> — ${emp.role} (📱 ${emp.phone})
          </button>
        `).join('')}
      </div>
    `);
  },

  switchStaff(empIdOrName) {
    if (window.iKhataUI && typeof window.iKhataUI.openOwnerAuthModal === 'function') {
      window.iKhataUI.closeModal();
      const targetRole = (empIdOrName === 'OWNER' || empIdOrName === 'owner') ? 'OWNER' : 'STAFF';
      window.iKhataUI.openOwnerAuthModal(targetRole);
    } else if (window.iKhataStore && typeof window.iKhataStore.switchStaffSession === 'function') {
      window.iKhataStore.switchStaffSession(empIdOrName);
      window.iKhataUI.closeModal();
      window.iKhataUI.refresh();
    }
  },

  openRBACModal(empIdOrName) {
    const employees = window.iKhataStore ? (window.iKhataStore.getEmployees() || []) : [];
    const emp = employees.find(e => e.id === empIdOrName || (e.name && e.name.toLowerCase() === String(empIdOrName).toLowerCase())) || { name: empIdOrName, role: 'Salesman' };

    const role = emp.role || 'Salesman';
    const perms = emp.permissions || {};

    const viewBalances = perms.viewBalances !== undefined ? perms.viewBalances : true;
    const receivePayments = perms.receivePayments !== undefined ? perms.receivePayments : true;
    const deleteTransactions = perms.deleteTransactions !== undefined ? perms.deleteTransactions : (role === 'Owner' || role === 'Manager');
    const viewProfit = perms.viewProfit !== undefined ? perms.viewProfit : (role === 'Owner' || role === 'Accountant');

    window.iKhataUI.openModal(`Permissions: ${emp.name} (${role})`, `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <strong>View Customer Balances</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Allow viewing customer khata balances</div>
          </div>
          <input type="checkbox" id="rbac-perm-view-balances" ${viewBalances ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </label>

        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <strong>Add Khata & Receive Payments</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Allow adding transactions & accepting cash</div>
          </div>
          <input type="checkbox" id="rbac-perm-receive-payments" ${receivePayments ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </label>

        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <div>
            <strong>Delete Transactions & Records</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Allow soft deleting khata, invoices & expenses</div>
          </div>
          <input type="checkbox" id="rbac-perm-delete-tx" ${deleteTransactions ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </label>

        <label style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; padding: 6px 0;">
          <div>
            <strong>View Profit & Financial Reports</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Allow viewing P&L statements & net margins</div>
          </div>
          <input type="checkbox" id="rbac-perm-view-profit" ${viewProfit ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
        </label>

        <div style="display: flex; gap: 10px; margin-top: 14px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="window.iKhataEmployees.resetPermissions('${emp.id || emp.name}')">
            ↺ Reset Defaults
          </button>
          <button class="btn btn-primary" style="flex: 2;" onclick="window.iKhataEmployees.savePermissions('${emp.id || emp.name}')">
            💾 Save Permissions
          </button>
        </div>
      </div>
    `);
  },

  confirmDeleteEmployee(empId) {
    if (confirm('Kya aap is staff member ko delete karna chahte hain?')) {
      if (window.iKhataStore && typeof window.iKhataStore.deleteEmployee === 'function') {
        window.iKhataStore.deleteEmployee(empId);
        window.iKhataUI.showToast('✓ Employee deleted successfully!', 'info');
        if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
          window.iKhataUI.refresh();
        }
      }
    }
  },

  resetPermissions(empId) {
    if (window.iKhataStore && typeof window.iKhataStore.resetEmployeePermissions === 'function') {
      window.iKhataStore.resetEmployeePermissions(empId);
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast('✓ Permissions reset to role defaults!', 'success');
      if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
        window.iKhataUI.refresh();
      }
    }
  },

  savePermissions(empIdOrName) {
    const viewBalances = Boolean(document.getElementById('rbac-perm-view-balances')?.checked);
    const receivePayments = Boolean(document.getElementById('rbac-perm-receive-payments')?.checked);
    const deleteTransactions = Boolean(document.getElementById('rbac-perm-delete-tx')?.checked);
    const viewProfit = Boolean(document.getElementById('rbac-perm-view-profit')?.checked);

    const permissions = { viewBalances, receivePayments, deleteTransactions, viewProfit };

    if (window.iKhataStore && typeof window.iKhataStore.updateEmployeePermissions === 'function') {
      window.iKhataStore.updateEmployeePermissions(empIdOrName, permissions);
    }

    window.iKhataUI.closeModal();
    window.iKhataUI.showToast('✓ Role permissions saved successfully!', 'success');
    if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
      window.iKhataUI.refresh();
    }
  },

  openAddEmployeeModal() {
    const shopId = window.iKhataStore ? window.iKhataStore.getShopId() : 'SHOP-90812';
    window.iKhataUI.openModal('➕ Add New Staff Member', `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: rgba(79,70,229,0.08); padding: 12px; border-radius: 10px; border: 1px solid rgba(79,70,229,0.2);">
          <span style="font-size: 0.8rem; color: var(--text-muted);">Assigned Business Shop ID</span>
          <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary); font-family: monospace;">${shopId}</div>
        </div>

        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Staff Name *</label>
          <input id="emp-name-input" type="text" placeholder="e.g. Ramesh Kumar" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Phone Number *</label>
          <input id="emp-phone-input" type="tel" placeholder="e.g. 9876543210" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box;">
        </div>

        <div>
          <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Role / Designation *</label>
          <select id="emp-role-input" style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.95rem; outline: none; box-sizing: border-box; background: var(--bg-card);">
            <option value="Billing Staff">Billing Staff</option>
            <option value="Sales Executive">Sales Executive</option>
            <option value="Store Manager">Store Manager</option>
            <option value="Accountant">Accountant</option>
          </select>
        </div>

        <button class="btn btn-primary" style="margin-top: 4px; width: 100%;" onclick="window.iKhataEmployees.saveNewEmployee()">
          ⚡ Create Staff & Generate Credentials
        </button>
      </div>
    `);
  },

  saveNewEmployee() {
    const name  = document.getElementById('emp-name-input')?.value?.trim();
    const rawPhone = document.getElementById('emp-phone-input')?.value?.trim() || '';
    const role  = document.getElementById('emp-role-input')?.value;

    if (!name || !rawPhone) {
      window.iKhataUI.showToast('❌ Please enter Staff Name and Phone Number!', 'error');
      return;
    }
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      window.iKhataUI.showToast('❌ Enter a valid 10-digit phone number!', 'error');
      return;
    }

    const createdStaff = window.iKhataStore.createStaffAccount({ name, phone: cleanPhone, role });

    window.iKhataUI.closeModal();
    this.openStaffCredentialsModal(createdStaff);
    if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
      window.iKhataUI.refresh();
    }
  },

  openStaffCredentialsModal(staff) {
    const credText = `iKhataPro Staff Credentials:\nShop ID: ${staff.shopId}\nStaff User ID: ${staff.username || staff.id}\nPasscode: ${staff.passcode}\nStaff Name: ${staff.name}\nRole: ${staff.role}`;

    window.iKhataUI.openModal('🎉 Staff Credentials Generated', `
      <div style="text-align: center; margin-bottom: 12px;">
        <div style="font-size: 2.5rem; margin-bottom: 4px;">🪪</div>
        <h3 style="margin: 0; font-size: 1.25rem;">Staff Account Ready</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">Share these login credentials with ${staff.name}</p>
      </div>

      <div class="credentials-display-card">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">Shop ID</div>
            <div class="cred-chip">${staff.shopId}</div>
          </div>

          <div>
            <div style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">Staff User ID</div>
            <div class="cred-chip">${staff.username || staff.id}</div>
          </div>

          <div style="grid-column: span 2;">
            <div style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">Passcode / Password</div>
            <div class="cred-chip" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; width: 100%; text-align: center; box-sizing: border-box;">${staff.passcode}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 16px;">
        <button class="btn btn-outline" style="flex: 1;" onclick="navigator.clipboard.writeText(\`${credText}\`); window.iKhataUI.showToast('📋 Credentials copied to clipboard!', 'success');">
          📋 Copy Credentials
        </button>

        <button class="btn btn-primary" style="flex: 1;" onclick="window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(\`${credText}\`), '_blank');">
          💬 Share Credentials
        </button>
      </div>
    `);
  },

  openResetPasswordModal(staffId, staffName) {
    window.iKhataUI.openModal(`🔑 Reset Passcode: ${staffName}`, `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <p style="font-size: 0.88rem; color: var(--text-muted);">Enter new 6-digit passcode or password for ${staffName}:</p>
        <input id="new-staff-passcode-input" type="text" placeholder="Enter new passcode (e.g. 654321)" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 1rem; outline: none; box-sizing: border-box;">

        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="window.iKhataUI.closeModal();">Cancel</button>
          <button class="btn btn-primary" style="flex: 1;" onclick="window.iKhataEmployees.submitPasscodeReset('${staffId}')">Save New Passcode</button>
        </div>
      </div>
    `);
  },

  submitPasscodeReset(staffId) {
    const input = document.getElementById('new-staff-passcode-input');
    const newPass = input ? input.value.trim() : '';

    if (!newPass || newPass.length < 4) {
      window.iKhataUI.showToast('❌ Please enter a valid passcode (at least 4 digits)!', 'error');
      return;
    }

    const success = window.iKhataStore.resetStaffPasscode(staffId, newPass);
    if (success) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast('✅ Staff passcode updated successfully!', 'success');
      if (window.iKhataUI && typeof window.iKhataUI.refresh === 'function') {
        window.iKhataUI.refresh();
      }
    } else {
      window.iKhataUI.showToast('❌ Failed to update passcode.', 'error');
    }
  },

  openStaffDetailsModal(staffId, activeFilter = 'TODAY', customStartDate = '', customEndDate = '') {
    const formatCurrency = (amt) => '₹' + Number(amt || 0).toLocaleString('en-IN');
    const employees = window.iKhataStore ? (window.iKhataStore.getEmployees() || []) : [];
    const staff = employees.find(e => e.id === staffId || (e.name && e.name.toLowerCase() === String(staffId).toLowerCase()) || (e.username && e.username.toLowerCase() === String(staffId).toLowerCase())) || { name: staffId, role: 'Staff Member', phone: 'N/A' };

    const empId = staff.id || staffId;
    const empName = (staff.name || '').toLowerCase().trim();
    const empUsername = (staff.username || '').toLowerCase().trim();

    const allBills = (window.iKhataStore && window.iKhataStore.getBills) ? window.iKhataStore.getBills() : [];
    const allTx = (window.iKhataStore && window.iKhataStore.getTransactions) ? window.iKhataStore.getTransactions() : [];
    const allInvs = (window.iKhataStore && window.iKhataStore.getInvoices) ? window.iKhataStore.getInvoices() : [];

    // Helper to match records belonging to this staff member
    const matchStaff = (item) => {
      if (!item) return false;
      if (item.staffId && (item.staffId === empId || (empUsername && item.staffId.toLowerCase() === empUsername))) return true;
      if (item.staffName && item.staffName.toLowerCase().trim() === empName) return true;
      if (item.createdBy && item.createdBy.toLowerCase().trim() === empName) return true;
      // If there's only 1 staff member and createdBy is not set to another staff member
      if (employees.length === 1 && item.createdByRole !== 'Owner' && !item.createdBy) return true;
      return false;
    };

    const staffBills = allBills.filter(b => matchStaff(b));
    const staffTx = allTx.filter(t => matchStaff(t));
    const staffInvs = allInvs.filter(i => matchStaff(i));

    // Calculate Date Bounds based on activeFilter
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLocal = new Date().toLocaleDateString('en-CA');
    
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = yestDate.toISOString().split('T')[0];

    const weekDate = new Date();
    weekDate.setDate(weekDate.getDate() - 7);
    const weekStartStr = weekDate.toISOString().split('T')[0];

    const currentMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'

    let dateLabel = 'Today';
    let filterCondition = (dStr) => dStr === todayStr || dStr === todayLocal || (typeof dStr === 'string' && (dStr.startsWith(todayStr) || dStr.startsWith(todayLocal)));

    if (activeFilter === 'YESTERDAY') {
      dateLabel = 'Yesterday (' + yesterdayStr + ')';
      filterCondition = (dStr) => dStr === yesterdayStr || (typeof dStr === 'string' && dStr.startsWith(yesterdayStr));
    } else if (activeFilter === 'WEEK') {
      dateLabel = 'Last 7 Days (Since ' + weekStartStr + ')';
      filterCondition = (dStr) => dStr && dStr >= weekStartStr && dStr <= todayStr;
    } else if (activeFilter === 'MONTH') {
      dateLabel = 'This Month (' + currentMonthStr + ')';
      filterCondition = (dStr) => dStr && dStr.startsWith(currentMonthStr);
    } else if (activeFilter === 'ALL') {
      dateLabel = 'All Time History';
      filterCondition = () => true;
    } else if (activeFilter === 'CUSTOM') {
      dateLabel = `Custom: ${customStartDate || 'Start'} to ${customEndDate || 'End'}`;
      filterCondition = (dStr) => {
        if (!dStr) return false;
        const d = dStr.split('T')[0];
        if (customStartDate && d < customStartDate) return false;
        if (customEndDate && d > customEndDate) return false;
        return true;
      };
    }

    const filteredBills = staffBills.filter(b => filterCondition(b.date));
    const filteredTx = staffTx.filter(t => filterCondition(t.date));
    const filteredInvs = staffInvs.filter(i => filterCondition(i.date));

    // Computations for the selected range
    const periodBillsSales = filteredBills.reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0);
    const periodInvSales = filteredInvs.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const periodManualGave = filteredTx.filter(t => t.type === 'GAVE' && (!t.note || !t.note.includes('POS Bill'))).reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalPeriodSales = Math.round((periodBillsSales + periodInvSales + periodManualGave) * 100) / 100;

    const periodBillsCashUpi = filteredBills.filter(b => !b.paymentMethod || !b.paymentMethod.includes('Credit')).reduce((s, b) => s + (parseFloat(b.grandTotal) || 0), 0);
    const periodGotCollected = filteredTx.filter(t => t.type === 'GOT').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const totalPeriodCollections = Math.round((periodBillsCashUpi + periodGotCollected) * 100) / 100;

    const totalOrdersCount = filteredBills.length + filteredInvs.length;
    const aov = totalOrdersCount > 0 ? Math.round(totalPeriodSales / totalOrdersCount) : 0;

    window.iKhataUI.openModal(`📊 Staff Sales Report: ${staff.name}`, `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Staff Header Profile Card -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(99,102,241,0.02)); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid rgba(99,102,241,0.25); flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--primary); color: #fff; font-size: 1.4rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
              ${staff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 1.25rem;">${staff.name}</h3>
                <span class="badge badge-ai">${staff.role || 'Billing Staff'}</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                <span>📱 ${staff.phone || 'N/A'}</span> • 
                <span>User ID: <strong>${staff.username || staff.id || 'N/A'}</strong></span> • 
                <span>Shop: <strong>${staff.shopId || window.iKhataStore.getShopId()}</strong></span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.switchStaff('${empId}')">
              👤 Login As
            </button>
            <button class="btn btn-outline btn-sm" onclick="window.iKhataEmployees.openResetPasswordModal('${empId}', '${staff.name}')">
              🔑 Reset Passcode
            </button>
          </div>
        </div>

        <!-- Interactive Date Filter Toolbar -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 12px 14px; border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              📅 Date Filter: <span style="color: var(--primary);">${dateLabel}</span>
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-sm ${activeFilter === 'TODAY' ? 'btn-primary' : 'btn-outline'}" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}', 'TODAY')">
                Aaj (Today)
              </button>
              <button class="btn btn-sm ${activeFilter === 'YESTERDAY' ? 'btn-primary' : 'btn-outline'}" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}', 'YESTERDAY')">
                Kal (Yesterday)
              </button>
              <button class="btn btn-sm ${activeFilter === 'WEEK' ? 'btn-primary' : 'btn-outline'}" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}', 'WEEK')">
                Last 7 Days
              </button>
              <button class="btn btn-sm ${activeFilter === 'MONTH' ? 'btn-primary' : 'btn-outline'}" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}', 'MONTH')">
                This Month
              </button>
              <button class="btn btn-sm ${activeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}" onclick="window.iKhataEmployees.openStaffDetailsModal('${empId}', 'ALL')">
                All Time
              </button>
            </div>
          </div>

          <!-- Custom Date Range Form -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; pt: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <span style="font-size: 0.82rem; color: var(--text-muted);">Custom Date Range:</span>
            <input type="date" id="staff-filter-from" class="form-input" style="padding: 4px 8px; font-size: 0.82rem; width: auto;" value="${customStartDate || todayStr}">
            <span style="font-size: 0.82rem; color: var(--text-muted);">to</span>
            <input type="date" id="staff-filter-to" class="form-input" style="padding: 4px 8px; font-size: 0.82rem; width: auto;" value="${customEndDate || todayStr}">
            <button class="btn btn-outline btn-sm" onclick="const f=document.getElementById('staff-filter-from').value; const t=document.getElementById('staff-filter-to').value; window.iKhataEmployees.openStaffDetailsModal('${empId}', 'CUSTOM', f, t);">
              🔍 Filter Date
            </button>
          </div>
        </div>

        <!-- Period Summary Metrics Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          <div class="card" style="padding: 14px; background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02)); border-color: rgba(34,197,94,0.3);">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Sales in Period</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #16a34a; margin-top: 2px;">${formatCurrency(totalPeriodSales)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${filteredBills.length} POS bills + ${filteredInvs.length} invoices</div>
          </div>

          <div class="card" style="padding: 14px; background: linear-gradient(135deg, rgba(79,70,229,0.08), rgba(79,70,229,0.02)); border-color: rgba(79,70,229,0.3);">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Collections Settled</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #4f46e5; margin-top: 2px;">${formatCurrency(totalPeriodCollections)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${filteredTx.filter(t=>t.type==='GOT').length} cash/jama payments</div>
          </div>

          <div class="card" style="padding: 14px; background: var(--bg-card);">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Orders Generated</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">${totalOrdersCount}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Avg Order: ${formatCurrency(aov)}</div>
          </div>

          <div class="card" style="padding: 14px; background: var(--bg-card);">
            <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">Ledger Udhar Entries</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--danger); margin-top: 2px;">${formatCurrency(periodManualGave)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${filteredTx.filter(t=>t.type==='GAVE').length} Udhar entries</div>
          </div>
        </div>

        <!-- Section 1: Detailed POS Bills Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="card-header" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
            <div class="card-title" style="font-size: 1rem;">🧾 POS & Sales Bills Generated (${filteredBills.length})</div>
            <span class="badge badge-primary">Total: ${formatCurrency(periodBillsSales)}</span>
          </div>

          ${filteredBills.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.88rem;">
              Iss date range me koi POS bill generate nahi hua.
            </div>
          ` : `
            <div style="max-height: 240px; overflow-y: auto;">
              <table class="table" style="width: 100%; font-size: 0.86rem;">
                <thead>
                  <tr style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                    <th>Bill No</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Pay Mode</th>
                    <th style="text-align: right;">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredBills.map(b => `
                    <tr>
                      <td><strong>${b.id}</strong></td>
                      <td>${b.date || ''} <span style="font-size: 0.78rem; color: var(--text-muted);">${b.time || ''}</span></td>
                      <td>${b.customerName || 'Walk-in Customer'}</td>
                      <td>${(b.items || []).map(i => `${i.name} (x${i.qty})`).join(', ') || 'Items'}</td>
                      <td>
                        <span class="badge ${b.paymentMethod === 'Cash' ? 'badge-success' : (b.paymentMethod && b.paymentMethod.includes('Credit') ? 'badge-warning' : 'badge-primary')}">
                          ${b.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td style="text-align: right; font-weight: 800; color: var(--primary);">${formatCurrency(b.grandTotal)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Section 2: Detailed Khata Transactions Table -->
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="card-header" style="padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
            <div class="card-title" style="font-size: 1rem;">📋 Khata / Ledger Entries (${filteredTx.length})</div>
            <span class="badge badge-neutral">${filteredTx.filter(t=>t.type==='GAVE').length} Udhar • ${filteredTx.filter(t=>t.type==='GOT').length} Jama</span>
          </div>

          ${filteredTx.length === 0 ? `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.88rem;">
              Iss date range me koi ledger entry add nahi hui.
            </div>
          ` : `
            <div style="max-height: 240px; overflow-y: auto;">
              <table class="table" style="width: 100%; font-size: 0.86rem;">
                <thead>
                  <tr style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Note / Mode</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredTx.map(t => `
                    <tr>
                      <td>${t.date || ''} <span style="font-size: 0.78rem; color: var(--text-muted);">${t.time || ''}</span></td>
                      <td><strong>${t.customerName || 'Customer'}</strong></td>
                      <td>
                        <span class="badge ${t.type === 'GAVE' ? 'badge-danger' : 'badge-success'}">
                          ${t.type === 'GAVE' ? '🔴 GAVE (Udhar)' : '🟢 GOT (Jama)'}
                        </span>
                      </td>
                      <td>${t.note || t.mode || 'Cash'}</td>
                      <td style="text-align: right; font-weight: 800; color: ${t.type === 'GAVE' ? 'var(--danger)' : 'var(--success)'};">
                        ${t.type === 'GAVE' ? '+' : '-'}${formatCurrency(t.amount)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
          <button class="btn btn-outline" onclick="window.print();">
            🖨️ Print Report
          </button>
          <button class="btn btn-primary" onclick="window.iKhataUI.closeModal();">
            Close
          </button>
        </div>
      </div>
    `);
  }
};
