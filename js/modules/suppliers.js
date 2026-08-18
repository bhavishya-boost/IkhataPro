/* iKhataPro Complete Supplier Management Module */

window.iKhataSuppliers = {
  currentTab: 'ALL',
  searchQuery: '',
  selectedSupplierProfileId: null,

  render(state) {
    const formatCurrency = (amt) => '₹' + Math.abs(Number(amt || 0)).toLocaleString('en-IN');
    const bus = window.iKhataStore.getCurrentBusiness();

    // If viewing a specific supplier profile
    if (this.selectedSupplierProfileId) {
      return this.renderSupplierProfile(this.selectedSupplierProfileId);
    }

    const suppliers = window.iKhataStore.getSuppliers();
    const purchases = window.iKhataStore.getPurchases();
    const supplierTransactions = window.iKhataStore.getSupplierTransactions();

    let filteredSuppliers = suppliers;
    if (this.currentTab === 'PAYABLE') {
      filteredSuppliers = filteredSuppliers.filter(s => (s.balance || 0) > 0);
    } else if (this.currentTab === 'SETTLED') {
      filteredSuppliers = filteredSuppliers.filter(s => (s.balance || 0) === 0);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredSuppliers = filteredSuppliers.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.businessName && s.businessName.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.gstin && s.gstin.toLowerCase().includes(q))
      );
    }

    const totalPayable = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
    const totalPurchasesAmt = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalPaymentsAmt = supplierTransactions.filter(t => t.type === 'PAYMENT').reduce((sum, t) => sum + (t.amount || 0), 0);

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <div>
          <h1 style="font-size: 1.75rem;">Supplier Management & Payables</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">Track wholesale suppliers, stock purchases, payables, and supplier statements</p>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline" onclick="window.iKhataSuppliers.openRecordPaymentModal()">
            <span>💰</span> Record Supplier Payment
          </button>
          <button class="btn btn-outline" onclick="window.iKhataSuppliers.openCreatePurchaseModal()">
            <span>📦</span> New Stock Purchase
          </button>
          <button class="btn btn-primary" onclick="window.iKhataSuppliers.openAddSupplierModal()">
            <span>➕</span> Add Supplier
          </button>
        </div>
      </div>

      <!-- Supplier Dashboard Summary KPIs -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">TOTAL SUPPLIERS</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin-top: 4px;">
            ${suppliers.length}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${suppliers.filter(s => (s.balance||0)>0).length} active payables</div>
        </div>

        <div class="card" style="padding: 16px; background: var(--warning-light); border-color: var(--warning-border);">
          <div style="font-size: 0.78rem; color: var(--warning); font-weight: 700; text-transform: uppercase;">YOU OWE SUPPLIERS (TOTAL PAYABLE)</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--warning); margin-top: 4px;">
            ${formatCurrency(totalPayable)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Outstanding balance to suppliers</div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--primary); font-weight: 700; text-transform: uppercase;">TOTAL PURCHASES</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 4px;">
            ${formatCurrency(totalPurchasesAmt)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${purchases.length} stock purchase orders</div>
        </div>

        <div class="card" style="padding: 16px;">
          <div style="font-size: 0.78rem; color: var(--success); font-weight: 700; text-transform: uppercase;">TOTAL PAYMENTS MADE</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--success); margin-top: 4px;">
            ${formatCurrency(totalPaymentsAmt)}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Recorded supplier payments</div>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="card" style="margin-bottom: 20px; padding: 16px;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
          <input type="text" class="form-input" style="max-width: 320px;" placeholder="Search supplier by name, business or GSTIN..." value="${this.searchQuery}" oninput="window.iKhataSuppliers.searchQuery = this.value; window.iKhataUI.refresh();">

          <div class="tab-list" style="margin-bottom: 0; border-bottom: none;">
            <button class="tab-btn ${this.currentTab === 'ALL' ? 'active' : ''}" onclick="window.iKhataSuppliers.currentTab = 'ALL'; window.iKhataUI.refresh();">
              All Suppliers (${suppliers.length})
            </button>
            <button class="tab-btn ${this.currentTab === 'PAYABLE' ? 'active' : ''}" onclick="window.iKhataSuppliers.currentTab = 'PAYABLE'; window.iKhataUI.refresh();">
              Payables Pending (${suppliers.filter(s=>(s.balance||0)>0).length})
            </button>
            <button class="tab-btn ${this.currentTab === 'SETTLED' ? 'active' : ''}" onclick="window.iKhataSuppliers.currentTab = 'SETTLED'; window.iKhataUI.refresh();">
              Settled (${suppliers.filter(s=>(s.balance||0)===0).length})
            </button>
          </div>
        </div>
      </div>

      <!-- Suppliers List Grid -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${filteredSuppliers.length === 0 ? `
          <div class="card" style="text-align: center; padding: 48px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🏭</div>
            <h3>No suppliers found</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Add wholesale suppliers to log purchases, stock entries, and payables.</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.iKhataSuppliers.openAddSupplierModal()">
              <span>➕</span> Add Supplier
            </button>
          </div>
        ` : filteredSuppliers.map(s => `
          <div class="card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; padding: 16px;">
            <div style="display: flex; align-items: center; gap: 14px; cursor: pointer;" onclick="window.iKhataSuppliers.selectedSupplierProfileId = '${s.id}'; window.iKhataUI.refresh();">
              <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: #f1f5f9; color: var(--primary); font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
                🏭
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="font-size: 1.05rem;">${s.name}</strong>
                  ${s.gstin ? `<span class="badge badge-neutral" style="font-size: 0.72rem;">GST: ${s.gstin}</span>` : ''}
                </div>
                <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 2px;">
                  ${s.businessName ? `<span>${s.businessName}</span> • ` : ''}
                  <span>📱 ${s.phone || 'N/A'}</span> • 
                  <span>Category: ${s.category || 'Wholesaler'}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 20px;">
              <div style="text-align: right; cursor: pointer;" onclick="window.iKhataSuppliers.selectedSupplierProfileId = '${s.id}'; window.iKhataUI.refresh();">
                <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">YOU OWE SUPPLIER</div>
                <div style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: ${(s.balance||0) > 0 ? 'var(--warning)' : 'var(--success)'};">
                  ${formatCurrency(s.balance)}
                </div>
              </div>

              <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="window.iKhataSuppliers.selectedSupplierProfileId = '${s.id}'; window.iKhataUI.refresh();">
                  👁️ Profile & Ledger
                </button>
                <button class="btn btn-success btn-sm" onclick="window.iKhataSuppliers.openRecordPaymentModal('${s.id}')">
                  💰 Pay Supplier
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderSupplierProfile(supplierId) {
    const formatCurrency = (amt) => '₹' + Math.abs(Number(amt || 0)).toLocaleString('en-IN');
    const supplier = window.iKhataStore.getSuppliers().find(s => s.id === supplierId);
    if (!supplier) return '<div>Supplier not found</div>';

    const transactions = window.iKhataStore.getSupplierTransactions(supplierId);
    const purchases = window.iKhataStore.getPurchases().filter(p => p.supplierId === supplierId);
    const bus = window.iKhataStore.getCurrentBusiness();

    return `
      <div style="margin-bottom: 20px;">
        <button class="btn btn-outline btn-sm" onclick="window.iKhataSuppliers.selectedSupplierProfileId = null; window.iKhataUI.refresh();">
          ← Back to Suppliers List
        </button>
      </div>

      <!-- Supplier Header Card -->
      <div class="card" style="margin-bottom: 24px; position: relative;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="width: 64px; height: 64px; border-radius: var(--radius-lg); background: var(--primary-light); color: var(--primary); font-size: 2rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
              🏭
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h1 style="font-size: 1.5rem; margin-bottom: 2px;">${supplier.name}</h1>
                <span class="badge badge-neutral">${supplier.category || 'Wholesaler'}</span>
              </div>
              <div style="display: flex; gap: 10px; font-size: 0.85rem; color: var(--text-muted); flex-wrap: wrap;">
                <span>🏢 ${supplier.businessName || supplier.name}</span> • 
                <span>📱 ${supplier.phone || 'N/A'}</span> • 
                <span>✉️ ${supplier.email || 'N/A'}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                <span>GSTIN: <strong>${supplier.gstin || 'Not Provided'}</strong></span> • 
                <span>PAN: <strong>${supplier.pan || 'N/A'}</strong></span> • 
                <span>Address: ${supplier.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">YOU OWE THIS SUPPLIER</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: ${(supplier.balance||0) > 0 ? 'var(--warning)' : 'var(--success)'};">
              ${formatCurrency(supplier.balance)}
            </div>
            <div style="font-size: 0.8rem; font-weight: 700; color: ${(supplier.balance||0) > 0 ? 'var(--warning)' : 'var(--success)'};">
              ${(supplier.balance||0) > 0 ? 'OUTSTANDING PAYABLE' : 'ACCOUNT SETTLED'}
            </div>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 20px 0;">

        <!-- 360 Stats Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">TOTAL PURCHASES</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: var(--primary); margin-top: 4px;">
              ${formatCurrency(supplier.totalPurchases || 0)}
            </div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">TOTAL PAYMENTS</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: var(--success); margin-top: 4px;">
              ${formatCurrency(supplier.totalPayments || 0)}
            </div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">PURCHASE ORDERS</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">
              ${purchases.length} Orders
            </div>
          </div>
        </div>

        <!-- Action Buttons Bar -->
        <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
          <button class="btn btn-success" onclick="window.iKhataSuppliers.openRecordPaymentModal('${supplier.id}')">
            💰 Record Payment
          </button>
          <button class="btn btn-primary" onclick="window.iKhataSuppliers.openCreatePurchaseModal('${supplier.id}')">
            📦 Create Stock Purchase
          </button>
          <button class="btn btn-warning" onclick="window.iKhataSuppliers.openPurchaseReturnModal('${supplier.id}')">
            🔄 Purchase Return
          </button>
          <button class="btn btn-outline" onclick="window.iKhataSuppliers.generateSupplierStatementPDF('${supplier.id}')">
            📄 Download Statement PDF
          </button>
        </div>
      </div>

      <!-- Supplier Ledger Timeline -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 Supplier Ledger & Transaction History</div>
        </div>

        <div id="supplier-statement-print-area">
          <div style="padding: 12px; display: flex; flex-direction: column; gap: 12px;">
            ${transactions.length === 0 ? `
              <p style="color: var(--text-muted); font-size: 0.9rem;">No transactions recorded for this supplier yet.</p>
            ` : transactions.map(t => `
              <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px; border-bottom: 1px solid var(--border-color);">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <strong style="font-size: 0.95rem;">
                      ${t.type === 'PURCHASE' ? '📦 Stock Purchase' : (t.type === 'PAYMENT' ? '💰 Payment Made' : '🔄 Purchase Return')}
                    </strong>
                    <span class="badge ${t.type === 'PAYMENT' ? 'badge-success' : (t.type === 'PURCHASE' ? 'badge-warning' : 'badge-neutral')}">${t.type}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                    Date: ${t.date} • Ref #${t.refNo || 'N/A'} • ${t.note || ''}
                  </div>
                </div>

                <div style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.15rem; color: ${t.type === 'PAYMENT' ? 'var(--success)' : (t.type === 'PURCHASE' ? 'var(--danger)' : 'var(--primary)')};">
                  ${t.type === 'PAYMENT' ? '-' : '+'}${formatCurrency(t.amount)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  openAddSupplierModal() {
    window.iKhataUI.openModal('➕ Add New Supplier', `
      <form onsubmit="event.preventDefault(); window.iKhataSuppliers.submitAddSupplier(this);">
        <div class="form-group">
          <label class="form-label">Supplier Contact Name</label>
          <input type="text" name="name" class="form-input" placeholder="e.g. Ramesh Kumar" required>
        </div>

        <div class="form-group">
          <label class="form-label">Business / Firm Name</label>
          <input type="text" name="businessName" class="form-input" placeholder="e.g. Ramesh Bullion Wholesalers">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Phone Number</label>
            <input type="tel" name="phone" class="form-input" placeholder="+91 98765 43210">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Category</label>
            <input type="text" name="category" class="form-input" placeholder="Jewellery / Kirana / Tech">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">GSTIN Number</label>
            <input type="text" name="gstin" class="form-input" placeholder="07ABCDE1234F1Z9" style="text-transform: uppercase;">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Opening Payable (₹)</label>
            <input type="number" name="balance" class="form-input" placeholder="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Address</label>
          <input type="text" name="address" class="form-input" placeholder="Market, City, State">
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Save Supplier Record
        </button>
      </form>
    `);
  },

  submitAddSupplier(form) {
    const data = new FormData(form);
    const sup = window.iKhataStore.addSupplier({
      name: data.get('name'),
      businessName: data.get('businessName'),
      phone: data.get('phone'),
      category: data.get('category'),
      gstin: data.get('gstin'),
      balance: data.get('balance'),
      address: data.get('address')
    });

    if (sup) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast(`✓ Supplier ${sup.name} added!`, 'success');
      window.iKhataUI.refresh();
    }
  },

  openRecordPaymentModal(preselectSupId = '') {
    const suppliers = window.iKhataStore.getSuppliers();
    window.iKhataUI.openModal('💰 Record Supplier Payment', `
      <form onsubmit="event.preventDefault(); window.iKhataSuppliers.submitRecordPayment(this);">
        <div class="form-group">
          <label class="form-label">Select Supplier</label>
          <select name="supplierId" class="form-select" required>
            <option value="">-- Choose Supplier --</option>
            ${suppliers.map(s => `<option value="${s.id}" ${s.id === preselectSupId ? 'selected' : ''}>${s.name} (${s.businessName || ''}) — Due: ₹${(s.balance||0).toLocaleString('en-IN')}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Amount (₹)</label>
          <input type="number" name="amount" class="form-input" style="font-size: 1.4rem; font-weight: 800;" placeholder="0" min="1" required autofocus>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Payment Method</label>
            <select name="mode" class="form-select">
              <option value="Bank Transfer">Bank Transfer / NEFT</option>
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Reference / UTR #</label>
            <input type="text" name="refNo" class="form-input" placeholder="UTR-998811">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Note / Remark</label>
          <input type="text" name="note" class="form-input" placeholder="Payment against Invoice #PO-9001">
        </div>

        <button type="submit" class="btn btn-success btn-lg" style="width: 100%; margin-top: 12px;">
          Confirm Payment to Supplier
        </button>
      </form>
    `);
  },

  submitRecordPayment(form) {
    const data = new FormData(form);
    const result = window.iKhataStore.recordSupplierPayment({
      supplierId: data.get('supplierId'),
      amount: data.get('amount'),
      mode: data.get('mode'),
      refNo: data.get('refNo'),
      note: data.get('note')
    });

    if (result) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast('✓ Payment recorded & supplier balance updated!', 'success');
      window.iKhataUI.refresh();
    }
  },

  openCreatePurchaseModal(preselectSupId = '') {
    const suppliers = window.iKhataStore.getSuppliers();
    const products = window.iKhataStore.getProducts();

    window.iKhataUI.openModal('📦 Log Stock Purchase Order', `
      <form onsubmit="event.preventDefault(); window.iKhataSuppliers.submitCreatePurchase(this);">
        <div class="form-group">
          <label class="form-label">Select Supplier</label>
          <select name="supplierId" class="form-select" required>
            <option value="">-- Choose Supplier --</option>
            ${suppliers.map(s => `<option value="${s.id}" ${s.id === preselectSupId ? 'selected' : ''}>${s.name} (${s.businessName || ''})</option>`).join('')}
          </select>
        </div>

        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; background: var(--bg-main); margin-bottom: 12px;">
          <label class="form-label">Select Product to Purchase</label>
          <select name="productId" class="form-select" onchange="const p = window.iKhataStore.getProducts().find(x=>x.id===this.value); if(p){ document.getElementById('po-item-name').value=p.name; document.getElementById('po-item-cost').value=p.cost||Math.round(p.price*0.8); }">
            <option value="">-- Choose Existing Product (Or type custom below) --</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (Current Cost: ₹${p.cost || Math.round(p.price*0.8)})</option>`).join('')}
          </select>

          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 8px; margin-top: 8px;">
            <input type="text" id="po-item-name" name="itemName" class="form-input" placeholder="Item Name" required>
            <input type="number" id="po-item-qty" name="itemQty" class="form-input" placeholder="Qty" min="1" value="1" required>
            <input type="number" id="po-item-cost" name="itemCost" class="form-input" placeholder="Unit Cost ₹" min="0" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Upfront Paid Amount (₹)</label>
            <input type="number" name="paidAmount" class="form-input" placeholder="0 (Leave 0 for full Credit)">
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Purchase Date</label>
            <input type="date" name="date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Purchase Note / Invoice Reference</label>
          <input type="text" name="note" class="form-input" placeholder="Supplier Bill #9928">
        </div>

        <button type="submit" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 12px;">
          Confirm Purchase & Update Inventory Stock
        </button>
      </form>
    `);
  },

  submitCreatePurchase(form) {
    const data = new FormData(form);
    const purchase = window.iKhataStore.createPurchase({
      supplierId: data.get('supplierId'),
      items: [{
        productId: data.get('productId'),
        name: data.get('itemName'),
        qty: data.get('itemQty'),
        cost: data.get('itemCost')
      }],
      paidAmount: data.get('paidAmount'),
      date: data.get('date'),
      note: data.get('note')
    });

    if (purchase) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast(`✓ Purchase PO #${purchase.id} logged! Stock updated.`, 'success');
      window.iKhataUI.refresh();
    }
  },

  openPurchaseReturnModal(supplierId) {
    const supplier = window.iKhataStore.getSuppliers().find(s => s.id === supplierId);
    const products = window.iKhataStore.getProducts();

    window.iKhataUI.openModal(`🔄 Purchase Return: ${supplier ? supplier.name : 'Supplier'}`, `
      <form onsubmit="event.preventDefault(); window.iKhataSuppliers.submitPurchaseReturn(this, '${supplierId}');">
        <div class="form-group">
          <label class="form-label">Select Returned Product</label>
          <select name="productId" class="form-select" required onchange="const p = window.iKhataStore.getProducts().find(x=>x.id===this.value); if(p){ document.getElementById('pret-cost').value=p.cost||0; }">
            <option value="">-- Choose Product --</option>
            ${products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock})</option>`).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Return Quantity</label>
            <input type="number" name="qty" class="form-input" placeholder="1" min="1" required>
          </div>
          <div class="form-group" style="margin: 0;">
            <label class="form-label">Unit Cost (₹)</label>
            <input type="number" id="pret-cost" name="cost" class="form-input" placeholder="0" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Return Reason / Note</label>
          <input type="text" name="note" class="form-input" placeholder="Damaged goods / wrong specification" required>
        </div>

        <button type="submit" class="btn btn-warning btn-lg" style="width: 100%; margin-top: 12px;">
          Confirm Purchase Return & Reduce Stock
        </button>
      </form>
    `);
  },

  submitPurchaseReturn(form, supplierId) {
    const data = new FormData(form);
    const success = window.iKhataStore.createPurchaseReturn({
      supplierId,
      items: [{
        productId: data.get('productId'),
        qty: data.get('qty'),
        cost: data.get('cost')
      }],
      note: data.get('note')
    });

    if (success) {
      window.iKhataUI.closeModal();
      window.iKhataUI.showToast('✓ Purchase Return processed! Stock & payable updated.', 'success');
      window.iKhataUI.refresh();
    }
  },

  generateSupplierStatementPDF(supplierId) {
    const element = document.getElementById('supplier-statement-print-area');
    const supplier = window.iKhataStore.getSuppliers().find(s => s.id === supplierId);
    if (!element || !supplier) return;

    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin:       10,
        filename:     `Supplier-Statement-${supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
      window.iKhataUI.showToast('📄 Supplier Statement PDF downloaded!', 'success');
    } else {
      window.print();
    }
  }
};
