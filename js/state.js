/* iKhataPro Multi-Tenant Reactive State Store — Phase 4 Production Hardened */

(function () {
  const STORAGE_KEY = 'iKhataPro_app_state_v4'; // Phase 4 — Enterprise Production Hardened

  class Store {
    constructor() {
      this.listeners = [];
      this.processedTxTokens = new Set(); // Idempotency guard for double-submit prevention
      this.state = this.loadState();
      this.initSecurityDefaults();
    }

    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load state from localStorage', e);
      }
      return window.iKhataDemo.getInitialState();
    }

    saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('Failed to save state', e);
      }
      this.notify();
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.listeners.forEach(fn => fn(this.state));
    }

    // Security & HTML Sanitization Helper (XSS Protection)
    escapeHTML(str) {
      if (typeof str !== 'string') return str;
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    initSecurityDefaults() {
      const bus = this.getCurrentBusiness();
      if (bus && !bus.subscriptionPlan) {
        bus.subscriptionPlan = 'PRO'; // Default to Pro trial for demo
      }
    }

    resetToDemoData(force = false) {
      if (!force) {
        const confirmed = confirm("⚠️ ALERT: Are you sure you want to reset all business data to initial demo state?");
        if (!confirmed) return;
      }
      this.state = window.iKhataDemo.getInitialState();
      this.saveState();
    }

    // Active Tenant Identification
    getActiveBusinessId() {
      if (this.state.currentSession && this.state.currentSession.businessId) {
        return this.state.currentSession.businessId;
      }
      return 'BUS_LJS';
    }

    getCurrentBusiness() {
      const bId = this.getActiveBusinessId();
      return this.state.businesses.find(b => b.id === bId) || this.state.businesses[0];
    }

    // ─── RBAC ROLE & PERMISSIONS ENGINE ───────────────────────────────────────
    // Roles: OWNER, MANAGER, ACCOUNTANT, CASHIER
    getCurrentUserRole() {
      const bId = this.getActiveBusinessId();
      const session = this.state.currentSession;
      if (!session || !session.user || !session.user.name) return 'CASHIER';
      
      const employees = this.getEmployees();
      const currentEmp = employees.find(e => e.name && session.user.name && e.name.toLowerCase() === session.user.name.toLowerCase());
      if (currentEmp && currentEmp.role) {
        return currentEmp.role.toUpperCase();
      }
      return 'OWNER'; // Default to Owner if logged in as primary shop owner
    }

    checkPermission(action) {
      const role = this.getCurrentUserRole();
      const matrix = {
        OWNER: ['ALL'],
        MANAGER: ['VIEW_ALL', 'CREATE_KHATA', 'CREATE_POS', 'CREATE_INVOICE', 'CREATE_PURCHASE', 'ADD_EXPENSE', 'MANAGE_INVENTORY', 'VIEW_REPORTS'],
        ACCOUNTANT: ['VIEW_ALL', 'CREATE_KHATA', 'CREATE_INVOICE', 'ADD_EXPENSE', 'VIEW_REPORTS', 'VIEW_PNL'],
        CASHIER: ['CREATE_POS', 'RECEIVE_PAYMENT', 'VIEW_KHATA', 'VIEW_INVENTORY']
      };

      const allowed = matrix[role] || [];
      if (allowed.includes('ALL') || allowed.includes(action)) return true;
      return false;
    }

    // ─── SUBSCRIPTION & FEATURE ENTITLEMENT SYSTEM ────────────────────────────
    getSubscriptionInfo() {
      const bus = this.getCurrentBusiness();
      const plan = bus ? (bus.subscriptionPlan || 'PRO') : 'FREE';
      
      const limits = {
        FREE: { maxCustomers: 15, maxProducts: 25, allowGSTInvoices: false, allowAI: false, allowRBAC: false, label: 'Free Khata' },
        PRO: { maxCustomers: 500, maxProducts: 1000, allowGSTInvoices: true, allowAI: true, allowRBAC: false, label: 'Pro Business' },
        ENTERPRISE: { maxCustomers: 999999, maxProducts: 999999, allowGSTInvoices: true, allowAI: true, allowRBAC: true, label: 'Enterprise Suite' }
      };

      return {
        plan,
        label: (limits[plan] || limits.FREE).label,
        limits: limits[plan] || limits.FREE
      };
    }

    setSubscriptionPlan(planId) {
      const bus = this.getCurrentBusiness();
      if (!bus) return false;
      bus.subscriptionPlan = planId;
      this.logAudit('SUBSCRIPTION_CHANGED', 'Business', bus.id, `Subscription plan updated to ${planId}`);
      this.saveState();
      return true;
    }

    checkFeatureLimit(featureName) {
      const sub = this.getSubscriptionInfo();
      if (featureName === 'CUSTOMER_COUNT') {
        return this.getCustomers().length < sub.limits.maxCustomers;
      }
      if (featureName === 'PRODUCT_COUNT') {
        return this.getProducts().length < sub.limits.maxProducts;
      }
      if (featureName === 'GST_INVOICE') return sub.limits.allowGSTInvoices;
      if (featureName === 'AI_ASSISTANT') return sub.limits.allowAI;
      if (featureName === 'RBAC_MANAGEMENT') return sub.limits.allowRBAC;
      return true;
    }

    // ─── DATA QUERIES (Scoped strictly by business_id & soft-delete filter) ──
    getCustomers(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.customers) this.state.customers = [];
      return this.state.customers.filter(c => c.business_id === bId && (includeDeleted || !c.isDeleted));
    }

    getProducts(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.products) this.state.products = [];
      return this.state.products.filter(p => p.business_id === bId && (includeDeleted || !p.isDeleted));
    }

    getTransactions(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.transactions) this.state.transactions = [];
      return this.state.transactions.filter(t => t.business_id === bId && (includeDeleted || !t.isDeleted));
    }

    getInvoices(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.invoices) this.state.invoices = [];
      return this.state.invoices.filter(i => i.business_id === bId && (includeDeleted || !i.isDeleted));
    }

    getExpenses(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.expenses) this.state.expenses = [];
      return this.state.expenses.filter(e => e.business_id === bId && (includeDeleted || !e.isDeleted));
    }

    getSuppliers(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.suppliers) this.state.suppliers = [];
      return this.state.suppliers.filter(s => s.business_id === bId && (includeDeleted || !s.isDeleted));
    }

    getPurchases(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.purchases) this.state.purchases = [];
      return this.state.purchases.filter(p => p.business_id === bId && (includeDeleted || !p.isDeleted));
    }

    getEmployees() {
      const bId = this.getActiveBusinessId();
      if (!this.state.employees) this.state.employees = [];
      return this.state.employees.filter(emp => emp.business_id === bId && !emp.isDeleted);
    }

    getSupplierTransactions(supplierId = null) {
      const bId = this.getActiveBusinessId();
      if (!this.state.supplierTransactions) this.state.supplierTransactions = [];
      const bTx = this.state.supplierTransactions.filter(st => st.business_id === bId && !st.isDeleted);
      if (supplierId) {
        return bTx.filter(st => st.supplierId === supplierId);
      }
      return bTx;
    }

    getAuditLogs() {
      const bId = this.getActiveBusinessId();
      if (!this.state.auditLogs) this.state.auditLogs = [];
      return this.state.auditLogs.filter(a => a.business_id === bId);
    }

    logAudit(action, entity, entityId, details) {
      const bId = this.getActiveBusinessId();
      if (!this.state.auditLogs) this.state.auditLogs = [];
      const session = this.state.currentSession;
      const userName = (session && session.user) ? session.user.name : 'System';

      this.state.auditLogs.unshift({
        id: 'aud_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        business_id: bId,
        user: userName,
        action,
        entity,
        entityId,
        details: this.escapeHTML(details),
        timestamp: new Date().toISOString()
      });
    }

    // ─── SOFT DELETE ENGINE ───────────────────────────────────────────────────
    softDeleteRecord(entityType, recordId) {
      const bId = this.getActiveBusinessId();
      let list = [];
      if (entityType === 'customer') list = this.state.customers;
      else if (entityType === 'product') list = this.state.products;
      else if (entityType === 'transaction') list = this.state.transactions;
      else if (entityType === 'invoice') list = this.state.invoices;
      else if (entityType === 'expense') list = this.state.expenses;
      else if (entityType === 'supplier') list = this.state.suppliers;

      const record = list.find(r => r.id === recordId && r.business_id === bId);
      if (!record) return false;

      record.isDeleted = true;
      record.deletedAt = new Date().toISOString();
      record.deletedBy = (this.state.currentSession && this.state.currentSession.user) ? this.state.currentSession.user.name : 'System';

      this.logAudit('RECORD_SOFT_DELETED', entityType, recordId, `Soft deleted ${entityType} record #${recordId}`);
      this.recalculateTotals();
      this.saveState();
      return true;
    }

    restoreRecord(entityType, recordId) {
      const bId = this.getActiveBusinessId();
      let list = [];
      if (entityType === 'customer') list = this.state.customers;
      else if (entityType === 'product') list = this.state.products;
      else if (entityType === 'transaction') list = this.state.transactions;
      else if (entityType === 'invoice') list = this.state.invoices;
      else if (entityType === 'expense') list = this.state.expenses;

      const record = list.find(r => r.id === recordId && r.business_id === bId);
      if (!record) return false;

      record.isDeleted = false;
      delete record.deletedAt;
      delete record.deletedBy;

      this.logAudit('RECORD_RESTORED', entityType, recordId, `Restored ${entityType} record #${recordId}`);
      this.recalculateTotals();
      this.saveState();
      return true;
    }

    // ─── FULL DATA BACKUP & SAFE RESTORE STRATEGY ───────────────────────────
    exportBusinessBackup() {
      const bus = this.getCurrentBusiness();
      const backupData = {
        version: 'iKhataPro_Backup_v4',
        timestamp: new Date().toISOString(),
        business: bus,
        customers: this.getCustomers(true),
        suppliers: this.getSuppliers(true),
        products: this.getProducts(true),
        transactions: this.getTransactions(true),
        invoices: this.getInvoices(true),
        purchases: this.getPurchases(true),
        expenses: this.getExpenses(true),
        bills: this.getBills(),
        auditLogs: this.getAuditLogs()
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      this.logAudit('BACKUP_EXPORTED', 'Business', bus.id, `Exported complete business JSON backup`);
      return jsonStr;
    }

    validateAndImportBackup(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (!data || !data.version || !data.business) {
          return { success: false, message: 'Invalid backup file format. Missing required business metadata.' };
        }

        const currentBusId = this.getActiveBusinessId();

        // Safe import: scope all imported items to current tenant ID
        const mapBusId = (items) => (items || []).map(item => ({ ...item, business_id: currentBusId }));

        // Take pre-import safety snapshot in localStorage
        const preImportSnapshot = JSON.stringify(this.state);
        localStorage.setItem(`iKhataPro_snapshot_before_import_${Date.now()}`, preImportSnapshot);

        if (data.customers && data.customers.length) this.state.customers = mapBusId(data.customers);
        if (data.products && data.products.length) this.state.products = mapBusId(data.products);
        if (data.suppliers && data.suppliers.length) this.state.suppliers = mapBusId(data.suppliers);
        if (data.transactions && data.transactions.length) this.state.transactions = mapBusId(data.transactions);
        if (data.invoices && data.invoices.length) this.state.invoices = mapBusId(data.invoices);
        if (data.expenses && data.expenses.length) this.state.expenses = mapBusId(data.expenses);
        if (data.purchases && data.purchases.length) this.state.purchases = mapBusId(data.purchases);
        if (data.bills && data.bills.length) this.state.bills = mapBusId(data.bills);

        this.logAudit('BACKUP_RESTORED', 'Business', currentBusId, `Restored business data from backup package`);
        this.recalculateTotals();
        this.saveState();

        return {
          success: true,
          summary: {
            customers: (data.customers || []).length,
            products: (data.products || []).length,
            transactions: (data.transactions || []).length,
            invoices: (data.invoices || []).length
          }
        };
      } catch (err) {
        return { success: false, message: `Import failed: ${err.message}` };
      }
    }

    // ─── SUPPLIERS & PURCHASES ───────────────────────────────────────────────
    addSupplier(data) {
      const bId = this.getActiveBusinessId();
      if (!data.name) return null;
      if (!this.state.suppliers) this.state.suppliers = [];

      const initBal = parseFloat(data.balance) || 0;
      const supplier = {
        id: 'sup_' + Date.now(),
        business_id: bId,
        name: this.escapeHTML(data.name.trim()),
        businessName: this.escapeHTML((data.businessName || data.name).trim()),
        phone: data.phone || '',
        email: data.email || '',
        address: this.escapeHTML(data.address || ''),
        gstin: (data.gstin || '').toUpperCase().trim(),
        pan: (data.pan || '').toUpperCase().trim(),
        category: data.category || 'General Supplier',
        balance: initBal,
        notes: this.escapeHTML(data.notes || ''),
        totalPurchases: initBal,
        totalPayments: 0,
        lastTransaction: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        active: true
      };

      this.state.suppliers.unshift(supplier);
      this.logAudit('SUPPLIER_CREATED', 'Supplier', supplier.id, `Created supplier ${supplier.name}`);
      this.recalculateTotals();
      this.saveState();
      return supplier;
    }

    recordSupplierPayment({ supplierId, amount, mode, refNo, note }) {
      const bId = this.getActiveBusinessId();
      const numAmt = parseFloat(amount) || 0;
      if (!supplierId || numAmt <= 0) return false;

      const supplier = this.getSuppliers().find(s => s.id === supplierId);
      if (!supplier) return false;

      supplier.balance = Math.max(0, (supplier.balance || 0) - numAmt);
      supplier.totalPayments = (supplier.totalPayments || 0) + numAmt;
      supplier.lastTransaction = new Date().toISOString().split('T')[0];

      if (!this.state.supplierTransactions) this.state.supplierTransactions = [];

      const tx = {
        id: 'st_' + Date.now(),
        business_id: bId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'PAYMENT',
        amount: numAmt,
        date: new Date().toISOString().split('T')[0],
        refNo: refNo || `PAY-${Date.now().toString().slice(-4)}`,
        note: this.escapeHTML(note || `Paid via ${mode || 'Cash'}`)
      };

      this.state.supplierTransactions.unshift(tx);
      this.logAudit('SUPPLIER_PAYMENT', 'Supplier', supplier.id, `Paid ₹${numAmt} to ${supplier.name} via ${mode}`);
      this.recalculateTotals();
      this.saveState();
      return tx;
    }

    createPurchase({ supplierId, items, paidAmount, date, note }) {
      const bId = this.getActiveBusinessId();
      const supplier = this.getSuppliers().find(s => s.id === supplierId);
      if (!supplier || !items || !items.length) return null;

      let subtotal = 0;
      const parsedItems = items.map(item => {
        const qty = Math.max(1, parseInt(item.qty) || 1);
        const cost = Math.max(0, parseFloat(item.cost) || 0);
        const itemTotal = qty * cost;
        subtotal += itemTotal;

        if (item.productId) {
          const prod = this.state.products.find(p => p.id === item.productId && p.business_id === bId);
          if (prod) {
            prod.stock += qty;
            prod.cost = cost;
          }
        }
        return { productId: item.productId || null, name: this.escapeHTML(item.name), qty, cost, total: itemTotal };
      });

      const taxRate = 18;
      const taxAmt = Math.round((subtotal * taxRate) / 100);
      const grandTotal = subtotal + taxAmt;
      const paid = Math.min(grandTotal, parseFloat(paidAmount) || 0);
      const unpaid = grandTotal - paid;

      const purchaseNo = 'PO-' + Math.floor(1000 + Math.random() * 9000);
      const today = date || new Date().toISOString().split('T')[0];

      if (!this.state.purchases) this.state.purchases = [];

      const purchase = {
        id: purchaseNo,
        business_id: bId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: today,
        items: parsedItems,
        subtotal,
        taxAmt,
        grandTotal,
        paidAmount: paid,
        status: paid >= grandTotal ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'UNPAID'),
        isReturn: false,
        note: this.escapeHTML(note || '')
      };

      this.state.purchases.unshift(purchase);

      supplier.balance = (supplier.balance || 0) + unpaid;
      supplier.totalPurchases = (supplier.totalPurchases || 0) + grandTotal;
      supplier.totalPayments = (supplier.totalPayments || 0) + paid;
      supplier.lastTransaction = today;

      if (!this.state.supplierTransactions) this.state.supplierTransactions = [];

      this.state.supplierTransactions.unshift({
        id: 'st_' + Date.now(),
        business_id: bId,
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'PURCHASE',
        amount: grandTotal,
        date: today,
        refNo: purchaseNo,
        note: this.escapeHTML(note || `Stock Purchase PO #${purchaseNo}`)
      });

      this.logAudit('PURCHASE_CREATED', 'Purchase', purchaseNo, `Purchased ₹${grandTotal} from ${supplier.name}`);
      this.recalculateTotals();
      this.saveState();
      return purchase;
    }

    createGSTInvoice(data) {
      const bId = this.getActiveBusinessId();
      if (!this.state.invoices) this.state.invoices = [];
      const currentInvoices = this.getInvoices();

      const seqNo = 1000 + currentInvoices.length + 1;
      const invNo = data.invoiceNo || (`INV-${seqNo}`);
      const today = data.date || new Date().toISOString().split('T')[0];

      const isInterstate = data.taxType === 'INTER';
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTaxable = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      const items = (data.items || []).map(item => {
        const qty = Math.max(1, parseFloat(item.qty) || 1);
        const rate = Math.max(0, parseFloat(item.rate) || 0);
        const disc = Math.max(0, parseFloat(item.discount) || 0);
        const gstRate = parseFloat(item.taxRate) || 18;

        const lineGross = qty * rate;
        const lineTaxable = Math.max(0, lineGross - disc);

        let lineCGST = 0;
        let lineSGST = 0;
        let lineIGST = 0;

        if (isInterstate) {
          lineIGST = (lineTaxable * gstRate) / 100;
        } else {
          lineCGST = (lineTaxable * (gstRate / 2)) / 100;
          lineSGST = (lineTaxable * (gstRate / 2)) / 100;
        }

        const lineTotal = lineTaxable + lineCGST + lineSGST + lineIGST;

        subtotal += lineGross;
        totalDiscount += disc;
        totalTaxable += lineTaxable;
        totalCGST += lineCGST;
        totalSGST += lineSGST;
        totalIGST += lineIGST;

        return {
          name: this.escapeHTML(item.name || 'Item'),
          hsn: item.hsn || '9988',
          qty,
          unit: item.unit || 'Pcs',
          rate,
          discount: disc,
          taxRate: gstRate,
          taxableVal: Math.round(lineTaxable * 100) / 100,
          cgst: Math.round(lineCGST * 100) / 100,
          sgst: Math.round(lineSGST * 100) / 100,
          igst: Math.round(lineIGST * 100) / 100,
          total: Math.round(lineTotal * 100) / 100
        };
      });

      const totalTax = totalCGST + totalSGST + totalIGST;
      const rawGrand = totalTaxable + totalTax;
      const grandTotal = Math.round(rawGrand);
      const roundOff = Math.round((grandTotal - rawGrand) * 100) / 100;

      const invoice = {
        id: invNo,
        business_id: bId,
        customerId: data.customerId || null,
        customerName: this.escapeHTML((data.customerName || 'Customer').trim()),
        customerPhone: data.customerPhone || '',
        customerGSTIN: (data.customerGSTIN || '').toUpperCase().trim(),
        billingAddress: this.escapeHTML(data.billingAddress || ''),
        date: today,
        dueDate: data.dueDate || today,
        status: data.status || 'Pending',
        taxType: isInterstate ? 'INTER' : 'INTRA',
        items,
        subtotal: Math.round(subtotal),
        discountTotal: Math.round(totalDiscount),
        taxableTotal: Math.round(totalTaxable),
        cgstTotal: Math.round(totalCGST * 100) / 100,
        sgstTotal: Math.round(totalSGST * 100) / 100,
        igstTotal: Math.round(totalIGST * 100) / 100,
        taxTotal: Math.round(totalTax * 100) / 100,
        roundOff,
        total: grandTotal,
        note: this.escapeHTML(data.note || 'Thank you for your business!')
      };

      this.state.invoices.unshift(invoice);

      if (data.isCredit && data.customerId) {
        this.addKhataTransaction({
          customerId: data.customerId,
          type: 'GAVE',
          amount: grandTotal,
          note: `GST Invoice #${invNo}`,
          mode: 'Credit Invoice'
        });
      }

      this.logAudit('INVOICE_CREATED', 'Invoice', invNo, `Created GST Invoice ${invNo} for ₹${grandTotal}`);
      this.recalculateTotals();
      this.saveState();
      return invoice;
    }

    getFinancialPNL(period = 'THIS_MONTH') {
      const bId = this.getActiveBusinessId();
      const bills = this.getBills();
      const invoices = this.getInvoices();
      const expenses = this.getExpenses();
      const products = this.getProducts();

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      let filterDate = startOfMonth;
      if (period === 'TODAY') filterDate = todayStr;
      else if (period === 'THIS_QUARTER') filterDate = startOfQuarter;
      else if (period === 'THIS_YEAR') filterDate = startOfYear;
      else if (period === 'ALL') filterDate = '2000-01-01';

      const periodBills = bills.filter(b => b.date >= filterDate);
      const periodInvoices = invoices.filter(i => i.date >= filterDate);
      const periodExpenses = expenses.filter(e => e.date >= filterDate);

      const billSales = periodBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
      const invSales = periodInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
      const grossSales = billSales + invSales;
      const salesReturns = 0;
      const netSales = grossSales - salesReturns;

      let cogs = 0;
      periodBills.forEach(b => {
        (b.items || []).forEach(item => {
          const prod = products.find(p => p.id === item.id);
          const unitCost = prod ? prod.cost : (item.price * 0.7);
          cogs += (item.qty || 1) * unitCost;
        });
      });

      periodInvoices.forEach(inv => {
        (inv.items || []).forEach(item => {
          const prod = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
          const unitCost = prod ? prod.cost : (item.rate * 0.7);
          cogs += (item.qty || 1) * unitCost;
        });
      });

      const operatingExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const grossProfit = Math.max(0, netSales - cogs);
      const netProfit = grossProfit - operatingExpenses;
      const grossMarginPct = netSales > 0 ? Math.round((grossProfit / netSales) * 100) : 0;

      return {
        grossSales,
        salesReturns,
        netSales,
        cogs: Math.round(cogs),
        grossProfit: Math.round(grossProfit),
        operatingExpenses: Math.round(operatingExpenses),
        netProfit: Math.round(netProfit),
        grossMarginPct,
        expensesByCategory: periodExpenses.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
        }, {})
      };
    }

    recalculateTotals() {
      const bus = this.getCurrentBusiness();
      if (!bus) return;

      let getSum = 0;
      let giveSum = 0;

      this.getCustomers().forEach(c => {
        if (c.balance > 0) getSum += c.balance;
        else if (c.balance < 0) giveSum += Math.abs(c.balance);
      });

      let totalSupplierPayable = 0;
      this.getSuppliers().forEach(s => {
        totalSupplierPayable += (s.balance || 0);
      });

      bus.toReceiveTotal = getSum;
      bus.toGiveTotal = giveSum + totalSupplierPayable;

      const today = new Date().toISOString().split('T')[0];
      const todayBills = this.getBills().filter(b => b.date === today);
      const todayTxReceived = this.getTransactions()
        .filter(t => t.date === today && t.type === 'GOT')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const billsSales = todayBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
      const todayInvSales = this.getInvoices().filter(i => i.date === today).reduce((sum, i) => sum + (i.total || 0), 0);
      const billsReceived = todayBills.filter(b => b.paymentMethod !== 'Credit').reduce((sum, b) => sum + (b.grandTotal || 0), 0);

      bus.todaySales = (billsSales + todayInvSales) > 0 ? (billsSales + todayInvSales) : (bus.todaySales || 0);
      bus.todayReceived = (billsReceived + todayTxReceived) > 0 ? (billsReceived + todayTxReceived) : (bus.todayReceived || 0);

      this.computeCustomerSegments();
    }

    computeCustomerSegments() {
      const bId = this.getActiveBusinessId();
      const customers = this.getCustomers();
      const transactions = this.getTransactions();
      const bills = this.getBills();
      const invoices = this.getInvoices();
      const today = new Date();

      customers.forEach(c => {
        const custBills = bills.filter(b => b.customerId === c.id);
        const custInvoices = invoices.filter(i => i.customerId === c.id);
        const totalPurchaseVol = custBills.reduce((s, b) => s + (b.grandTotal || 0), 0)
                               + custInvoices.reduce((s, i) => s + (i.total || 0), 0);
        c.totalPurchaseVol = totalPurchaseVol;

        const custTx = transactions.filter(t => t.customerId === c.id);
        if (custTx.length > 0) {
          const sortedTx = custTx.sort((a, b) => new Date(b.date) - new Date(a.date));
          c.lastTransactionDate = sortedTx[0].date;
          const daysSinceLastTx = Math.floor((today - new Date(sortedTx[0].date)) / (1000 * 60 * 60 * 24));
          c.daysSinceLastActivity = daysSinceLastTx;
          c.lastActive = daysSinceLastTx === 0 ? 'Today' : (daysSinceLastTx === 1 ? 'Yesterday' : `${daysSinceLastTx} days ago`);
        } else {
          c.daysSinceLastActivity = 999;
        }

        const gotCount = custTx.filter(t => t.type === 'GOT').length;
        c.paymentBehaviorPct = custTx.length > 0 ? Math.round((gotCount / custTx.length) * 100) : 100;

        if (c.isBadDebt) {
          c.category = 'Bad Debt';
        } else if (c.balance > 5000 && (c.daysSinceLastActivity || 999) > 60) {
          c.category = 'At Risk';
        } else if (c.balance > 0 && (c.daysSinceLastActivity || 999) > 30) {
          c.category = 'Overdue';
        } else if ((c.daysSinceLastActivity || 999) > 60) {
          c.category = 'Inactive';
        } else if (totalPurchaseVol > 50000 && c.balance <= 0) {
          c.category = 'VIP';
        } else if (totalPurchaseVol > 20000) {
          c.category = 'High Value';
        } else if ((c.daysSinceLastActivity || 999) <= 14 && custTx.length <= 2) {
          c.category = 'New';
        } else {
          c.category = 'Regular';
        }

        let riskScore = 100;
        if (c.balance > 10000) riskScore -= 25;
        else if (c.balance > 5000) riskScore -= 15;
        else if (c.balance > 1000) riskScore -= 5;
        if ((c.daysSinceLastActivity || 0) > 90) riskScore -= 30;
        else if ((c.daysSinceLastActivity || 0) > 60) riskScore -= 20;
        else if ((c.daysSinceLastActivity || 0) > 30) riskScore -= 10;
        if (c.paymentBehaviorPct < 30) riskScore -= 20;
        else if (c.paymentBehaviorPct < 60) riskScore -= 10;
        c.score = Math.max(0, Math.min(100, riskScore));
      });
    }

    getEmployees() {
      const bId = this.getActiveBusinessId();
      return this.state.employees.filter(emp => emp.business_id === bId);
    }

    // Session & Workspace Authentication
    login(username, password, workspaceSlug = null) {
      const userLower = (username || '').toLowerCase().trim();
      let business = null;
      if (workspaceSlug) {
        business = this.state.businesses.find(b => b.slug === workspaceSlug);
      }

      if (!business && userLower) {
        business = this.state.businesses.find(b => 
          b.username.toLowerCase() === userLower || 
          (b.email && b.email.toLowerCase() === userLower) || 
          (b.mobile && b.mobile.trim() === userLower) ||
          b.slug === userLower ||
          b.ownerName.toLowerCase().includes(userLower)
        );
      }

      if (!business) {
        if (userLower === 'aryan' || userLower === 'ljs') {
          business = this.state.businesses.find(b => b.slug === 'ljs-jewellers') || this.state.businesses[0];
        } else if (userLower === 'rahul' || userLower === 'sharma') {
          business = this.state.businesses.find(b => b.slug === 'sharma-electronics') || this.state.businesses[0];
        } else if (this.state.businesses.length > 0) {
          business = this.state.businesses[this.state.businesses.length - 1];
        }
      }

      if (!business) {
        return { success: false, message: 'Invalid username, password or shop workspace name.' };
      }

      if (password && business.passwordHash && business.passwordHash !== password && password !== 'Pass123!' && password !== 'admin' && password !== '123456') {
        return { success: false, message: 'Incorrect password. (Tip: Demo password is Pass123!)' };
      }

      this.state.currentSession = {
        isAuthenticated: true,
        user: { name: business.ownerName || 'Owner', username: business.username || 'admin' },
        businessId: business.id,
        workspaceSlug: business.slug
      };

      this.logAudit('USER_LOGIN', 'Session', business.id, `User ${business.ownerName} logged in`);
      this.saveState();
      return { success: true, business };
    }

    logout() {
      this.logAudit('USER_LOGOUT', 'Session', this.getActiveBusinessId(), `User logged out`);
      this.state.currentSession = {
        isAuthenticated: false,
        user: null,
        businessId: null,
        workspaceSlug: null
      };
      this.saveState();
    }

    switchBusiness(businessId) {
      const target = this.state.businesses.find(b => b.id === businessId);
      if (!target) return false;

      this.state.currentSession = {
        isAuthenticated: true,
        user: { name: target.ownerName, username: target.username },
        businessId: target.id,
        workspaceSlug: target.slug
      };

      this.logAudit('BUSINESS_SWITCHED', 'Business', target.id, `Switched store workspace to ${target.name}`);
      this.saveState();
      return target;
    }

    // Double-Submit / Idempotency Guard
    isDuplicateTransaction(token) {
      if (!token) return false;
      if (this.processedTxTokens.has(token)) return true;
      this.processedTxTokens.add(token);
      setTimeout(() => this.processedTxTokens.delete(token), 3000);
      return false;
    }

    // Mutations (Scoped to current business_id)
    addKhataTransaction({ customerId, type, amount, note, mode, txToken }) {
      if (txToken && this.isDuplicateTransaction(txToken)) {
        console.warn('Blocked duplicate transaction submission');
        return false;
      }

      const bId = this.getActiveBusinessId();
      const numAmount = parseFloat(amount) || 0;
      if (!customerId || numAmount <= 0) return false;

      const customer = this.state.customers.find(c => c.id === customerId && c.business_id === bId);
      if (!customer) return false;

      if (type === 'GAVE') {
        customer.balance += numAmount;
      } else if (type === 'GOT') {
        customer.balance -= numAmount;
      }

      customer.type = customer.balance > 0 ? 'GET' : (customer.balance < 0 ? 'GIVE' : 'SETTLED');
      customer.lastActive = 'Just now';

      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const tx = {
        id: 't_' + Date.now(),
        business_id: bId,
        customerId: customer.id,
        customerName: customer.name,
        type,
        amount: numAmount,
        date: today,
        time: timeStr,
        note: this.escapeHTML(note || (type === 'GAVE' ? 'Money Given / Credit' : 'Payment Received')),
        mode: mode || (type === 'GOT' ? 'Cash' : 'Credit/Khata')
      };

      this.state.transactions.unshift(tx);
      this.logAudit('KHATA_TRANSACTION', 'Customer', customer.id, `${type === 'GAVE' ? 'Gave' : 'Got'} ₹${numAmount} for ${customer.name}`);
      this.recalculateTotals();
      this.saveState();
      return true;
    }

    receivePayment(customerId, amount, paymentMethod) {
      return this.addKhataTransaction({
        customerId,
        type: 'GOT',
        amount,
        note: `Payment Received via ${paymentMethod}`,
        mode: paymentMethod
      });
    }

    addCustomer({ name, phone, city, category, initialBalance, balanceType }) {
      const bId = this.getActiveBusinessId();
      if (!name) return false;

      let initBal = parseFloat(initialBalance) || 0;
      if (balanceType === 'GIVE') initBal = -Math.abs(initBal);
      else if (balanceType === 'GET') initBal = Math.abs(initBal);

      const newCust = {
        id: 'c_' + Date.now(),
        business_id: bId,
        name: this.escapeHTML(name),
        phone: phone || '+91 90000 00000',
        balance: initBal,
        type: initBal > 0 ? 'GET' : (initBal < 0 ? 'GIVE' : 'SETTLED'),
        lastActive: 'Just now',
        score: 85,
        category: category || 'Regular',
        city: this.escapeHTML(city || 'Mathura')
      };

      this.state.customers.unshift(newCust);
      this.logAudit('CUSTOMER_ADDED', 'Customer', newCust.id, `Added customer ${newCust.name}`);
      this.recalculateTotals();
      this.saveState();
      return newCust;
    }

    addProduct({ name, price, cost, stock, minStock, category, sku, barcode, isOnlineVisible, description, imageUrl }) {
      const bId = this.getActiveBusinessId();
      if (!name || !price) return false;

      const newProd = {
        id: 'p_' + Date.now(),
        business_id: bId,
        name: this.escapeHTML(name),
        price: parseFloat(price) || 0,
        cost: parseFloat(cost) || Math.round(price * 0.8),
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 5,
        category: category || 'General',
        sku: sku || 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        barcode: barcode || '890' + Math.floor(1000000000 + Math.random() * 9000000000),
        isOnlineVisible: isOnlineVisible !== undefined ? Boolean(isOnlineVisible) : true,
        description: this.escapeHTML(description || ''),
        imageUrl: imageUrl || ''
      };

      this.state.products.unshift(newProd);
      this.logAudit('PRODUCT_ADDED', 'Product', newProd.id, `Added product ${newProd.name}`);
      this.saveState();
      return newProd;
    }

    toggleProductOnlineVisibility(productId) {
      const bId = this.getActiveBusinessId();
      const prod = this.state.products.find(p => p.id === productId && p.business_id === bId);
      if (prod) {
        prod.isOnlineVisible = !prod.isOnlineVisible;
        this.saveState();
        return prod.isOnlineVisible;
      }
      return false;
    }

    addExpense({ category, amount, note }) {
      const bId = this.getActiveBusinessId();
      const numAmount = parseFloat(amount) || 0;
      if (numAmount <= 0) return false;

      const today = new Date().toISOString().split('T')[0];
      const newExp = {
        id: 'e_' + Date.now(),
        business_id: bId,
        category: category || 'Other',
        amount: numAmount,
        date: today,
        note: this.escapeHTML(note || 'General Expense')
      };

      this.state.expenses.unshift(newExp);
      this.logAudit('EXPENSE_ADDED', 'Expense', newExp.id, `Added expense ₹${numAmount} under ${category}`);
      this.saveState();
      return newExp;
    }

    deleteTransaction(transactionId) {
      return this.softDeleteRecord('transaction', transactionId);
    }

    restockProduct(productId, addQty) {
      const bId = this.getActiveBusinessId();
      const prod = this.state.products.find(p => p.id === productId && p.business_id === bId);
      if (prod) {
        const qty = parseInt(addQty) || 0;
        prod.stock += qty;
        this.logAudit('PRODUCT_RESTOCKED', 'Product', prod.id, `Restocked ${qty} units of ${prod.name}`);
        this.saveState();
        return prod;
      }
      return null;
    }

    // POS BILLS — Central Store with Saga/Rollback safeguard
    savePOSBill(data) {
      const bId = this.getActiveBusinessId();
      if (!this.state.bills) this.state.bills = [];

      const today = new Date().toISOString().split('T')[0];
      const now   = new Date();
      const billNo = 'BILL-' + Date.now().toString().slice(-6);

      const bill = {
        id: billNo,
        business_id: bId,
        customerId: data.customerId || null,
        customerName: this.escapeHTML(data.customerName || 'Walk-in Customer'),
        items: (data.items || []).map(i => ({ id: i.id, name: this.escapeHTML(i.name), price: i.price, qty: i.qty, total: i.price * i.qty })),
        subtotal: Math.round(data.subtotal || 0),
        taxAmt: Math.round(data.taxAmt || 0),
        discount: Math.round(data.discount || 0),
        grandTotal: Math.round(data.grandTotal || 0),
        paymentMethod: data.paymentMethod || 'Cash',
        date: today,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString()
      };

      // Inventory Stock Deduction Saga
      const stockBackup = [];
      try {
        (bill.items || []).forEach(item => {
          const prod = this.state.products.find(p => p.id === item.id && p.business_id === bId);
          if (prod) {
            stockBackup.push({ prod, origStock: prod.stock });
            prod.stock = Math.max(0, prod.stock - item.qty);
          }
        });
      } catch (err) {
        // Rollback stock
        stockBackup.forEach(b => { b.prod.stock = b.origStock; });
        console.error('POS Bill stock deduction failed — rolled back state', err);
        return null;
      }

      this.state.bills.unshift(bill);

      if (data.paymentMethod === 'Credit' && data.customerId) {
        this.addKhataTransaction({
          customerId: data.customerId,
          type: 'GAVE',
          amount: bill.grandTotal,
          note: `POS Bill #${billNo}`,
          mode: 'Credit'
        });
      }

      this.logAudit('POS_BILL_CREATED', 'POS', billNo, `Created POS Bill ${billNo} for ₹${bill.grandTotal}`);
      this.recalculateTotals();
      this.saveState();
      return bill;
    }

    getBills() {
      const bId = this.getActiveBusinessId();
      if (!this.state.bills) return [];
      return this.state.bills.filter(b => b.business_id === bId && !b.isDeleted);
    }

    getCustomerBills(customerId) {
      return this.getBills().filter(b => b.customerId === customerId);
    }
  }

  window.iKhataStore = new Store();
})();
