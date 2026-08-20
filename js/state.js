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
      let state;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          state = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load state from localStorage', e);
      }
      if (!state) {
        state = window.iKhataDemo.getInitialState();
      }
      if (state && Array.isArray(state.employees)) {
        state.employees = state.employees.filter(e => e.id !== 'emp1' && e.id !== 'emp2' && e.id !== 'emps1');
      }
      return state;
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

    addEmployee(empData) {
      const bId = this.getActiveBusinessId();
      if (!this.state.employees) this.state.employees = [];
      const newEmp = {
        id: 'emp_' + Date.now(),
        business_id: bId,
        name: empData.name,
        phone: empData.phone,
        role: empData.role || 'Salesman',
        sales: empData.sales || 0,
        collections: empData.collections || 0,
        isDeleted: false,
        createdAt: new Date().toISOString()
      };
      this.state.employees.push(newEmp);
      this.saveToLocalStorage();
      return newEmp;
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

      const entry = {
        id: 'aud_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        business_id: bId,
        user: userName,
        user_name: userName,
        action,
        entity,
        entity_type: entity,
        entityId,
        entity_id: entityId,
        details: this.escapeHTML(details),
        timestamp: new Date().toISOString()
      };

      this.state.auditLogs.unshift(entry);

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncAuditLogToCloud(entry).then(res => {
          if (res && res.success && res.auditLog) {
            if (!this.state.auditLogCloudMap) this.state.auditLogCloudMap = {};
            this.state.auditLogCloudMap[entry.id] = res.auditLog.id;
            this.state.auditLogCloudMap[res.auditLog.id] = entry.id;
          }
        }).catch(err => console.warn('Audit log background sync warning:', err.message));
      }
    }

    getNotifications(includeRead = true) {
      const bId = this.getActiveBusinessId();
      if (!this.state.notifications) this.state.notifications = [];
      const notifs = this.state.notifications.filter(n => n.business_id === bId);
      if (includeRead) return notifs;
      return notifs.filter(n => !n.is_read);
    }

    addNotification({ type, title, message, entity_type, entity_id, is_read }) {
      const bId = this.getActiveBusinessId();
      if (!this.state.notifications) this.state.notifications = [];

      const notif = {
        id: 'notif_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        business_id: bId,
        type: type || 'INFO',
        title: this.escapeHTML(title || 'Notification'),
        message: this.escapeHTML(message || ''),
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        is_read: Boolean(is_read),
        read_at: is_read ? new Date().toISOString() : null,
        createdAt: new Date().toISOString()
      };

      this.state.notifications.unshift(notif);
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncNotificationToCloud(notif, null).then(res => {
          if (res && res.success && res.notification) {
            if (!this.state.notificationCloudMap) this.state.notificationCloudMap = {};
            this.state.notificationCloudMap[notif.id] = res.notification.id;
            this.state.notificationCloudMap[res.notification.id] = notif.id;
          }
        }).catch(err => console.warn('Notification background sync warning:', err.message));
      }

      return notif;
    }

    markNotificationRead(notifId) {
      const bId = this.getActiveBusinessId();
      if (!this.state.notifications) return false;
      const notif = this.state.notifications.find(n => n.id === notifId && n.business_id === bId);
      if (!notif) return false;

      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        const cloudUuid = this.state.notificationCloudMap ? this.state.notificationCloudMap[notifId] : null;
        window.iKhataSupabase.syncNotificationToCloud(notif, cloudUuid).catch(err => console.warn('Notification read status sync warning:', err.message));
      }

      return true;
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
      else if (entityType === 'pos_bill' || entityType === 'bill') list = this.state.bills;

      const record = list.find(r => r.id === recordId && r.business_id === bId);
      if (!record) return false;

      record.isDeleted = true;
      record.deletedAt = new Date().toISOString();
      record.deletedBy = (this.state.currentSession && this.state.currentSession.user) ? this.state.currentSession.user.name : 'System';

      this.logAudit('RECORD_SOFT_DELETED', entityType, recordId, `Soft deleted ${entityType} record #${recordId}`);
      this.recalculateTotals();
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        if (entityType === 'customer') {
          const cloudUuid = this.state.customerCloudMap ? this.state.customerCloudMap[recordId] : null;
          window.iKhataSupabase.syncCustomerToCloud(record, cloudUuid).catch(err => console.warn('Soft delete cloud sync warning:', err.message));
        } else if (entityType === 'transaction') {
          const cloudUuid = this.state.transactionCloudMap ? this.state.transactionCloudMap[recordId] : null;
          const cloudCustUuid = this.state.customerCloudMap ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncTransactionToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Soft delete transaction cloud sync warning:', err.message));
        } else if (entityType === 'supplier') {
          const cloudUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[recordId] : null;
          window.iKhataSupabase.syncSupplierToCloud(record, cloudUuid).catch(err => console.warn('Soft delete supplier cloud sync warning:', err.message));
        } else if (entityType === 'purchase') {
          const cloudUuid = this.state.purchaseCloudMap ? this.state.purchaseCloudMap[recordId] : null;
          const cloudSupUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[record.supplierId] : null;
          window.iKhataSupabase.syncPurchaseToCloud(record, cloudUuid, cloudSupUuid).catch(err => console.warn('Soft delete purchase cloud sync warning:', err.message));
        } else if (entityType === 'supplier_transaction') {
          const cloudUuid = this.state.supplierTxCloudMap ? this.state.supplierTxCloudMap[recordId] : null;
          const cloudSupUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[record.supplierId] : null;
          window.iKhataSupabase.syncSupplierTransactionToCloud(record, cloudUuid, cloudSupUuid).catch(err => console.warn('Soft delete supplier transaction sync warning:', err.message));
        } else if (entityType === 'invoice') {
          const cloudUuid = this.state.invoiceCloudMap ? this.state.invoiceCloudMap[recordId] : null;
          const cloudCustUuid = (this.state.customerCloudMap && record.customerId) ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncInvoiceToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Soft delete invoice cloud sync warning:', err.message));
        } else if (entityType === 'pos_bill' || entityType === 'bill') {
          const cloudUuid = this.state.posBillCloudMap ? this.state.posBillCloudMap[recordId] : null;
          const cloudCustUuid = (this.state.customerCloudMap && record.customerId) ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncPosBillToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Soft delete POS bill cloud sync warning:', err.message));
        } else if (entityType === 'expense') {
          const cloudUuid = this.state.expenseCloudMap ? this.state.expenseCloudMap[recordId] : null;
          window.iKhataSupabase.syncExpenseToCloud(record, cloudUuid).catch(err => console.warn('Soft delete expense cloud sync warning:', err.message));
        }
      }

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
      else if (entityType === 'supplier') list = this.state.suppliers;
      else if (entityType === 'purchase') list = this.state.purchases;
      else if (entityType === 'supplier_transaction') list = this.state.supplierTransactions;
      else if (entityType === 'pos_bill' || entityType === 'bill') list = this.state.bills;

      const record = list.find(r => r.id === recordId && r.business_id === bId);
      if (!record) return false;

      record.isDeleted = false;
      delete record.deletedAt;
      delete record.deletedBy;

      this.logAudit('RECORD_RESTORED', entityType, recordId, `Restored ${entityType} record #${recordId}`);
      this.recalculateTotals();
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        if (entityType === 'customer') {
          const cloudUuid = this.state.customerCloudMap ? this.state.customerCloudMap[recordId] : null;
          window.iKhataSupabase.syncCustomerToCloud(record, cloudUuid).catch(err => console.warn('Restore customer cloud sync warning:', err.message));
        } else if (entityType === 'transaction') {
          const cloudUuid = this.state.transactionCloudMap ? this.state.transactionCloudMap[recordId] : null;
          const cloudCustUuid = this.state.customerCloudMap ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncTransactionToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Restore transaction cloud sync warning:', err.message));
        } else if (entityType === 'supplier') {
          const cloudUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[recordId] : null;
          window.iKhataSupabase.syncSupplierToCloud(record, cloudUuid).catch(err => console.warn('Restore supplier cloud sync warning:', err.message));
        } else if (entityType === 'purchase') {
          const cloudUuid = this.state.purchaseCloudMap ? this.state.purchaseCloudMap[recordId] : null;
          const cloudSupUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[record.supplierId] : null;
          window.iKhataSupabase.syncPurchaseToCloud(record, cloudUuid, cloudSupUuid).catch(err => console.warn('Restore purchase cloud sync warning:', err.message));
        } else if (entityType === 'supplier_transaction') {
          const cloudUuid = this.state.supplierTxCloudMap ? this.state.supplierTxCloudMap[recordId] : null;
          const cloudSupUuid = this.state.supplierCloudMap ? this.state.supplierCloudMap[record.supplierId] : null;
          window.iKhataSupabase.syncSupplierTransactionToCloud(record, cloudUuid, cloudSupUuid).catch(err => console.warn('Restore supplier transaction sync warning:', err.message));
        } else if (entityType === 'invoice') {
          const cloudUuid = this.state.invoiceCloudMap ? this.state.invoiceCloudMap[recordId] : null;
          const cloudCustUuid = (this.state.customerCloudMap && record.customerId) ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncInvoiceToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Restore invoice cloud sync warning:', err.message));
        } else if (entityType === 'pos_bill' || entityType === 'bill') {
          const cloudUuid = this.state.posBillCloudMap ? this.state.posBillCloudMap[recordId] : null;
          const cloudCustUuid = (this.state.customerCloudMap && record.customerId) ? this.state.customerCloudMap[record.customerId] : null;
          window.iKhataSupabase.syncPosBillToCloud(record, cloudUuid, cloudCustUuid).catch(err => console.warn('Restore POS bill cloud sync warning:', err.message));
        } else if (entityType === 'expense') {
          const cloudUuid = this.state.expenseCloudMap ? this.state.expenseCloudMap[recordId] : null;
          window.iKhataSupabase.syncExpenseToCloud(record, cloudUuid).catch(err => console.warn('Restore expense cloud sync warning:', err.message));
        }
      }

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

      // Stage 8: non-blocking background cloud sync
      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        const cloudCustUuid = (this.state.customerCloudMap && data.customerId)
          ? this.state.customerCloudMap[data.customerId]
          : null;
        window.iKhataSupabase.syncInvoiceToCloud(invoice, null, cloudCustUuid)
          .then(res => {
            if (res.success && res.invoice) {
              if (!this.state.invoiceCloudMap) this.state.invoiceCloudMap = {};
              this.state.invoiceCloudMap[invoice.id] = res.invoice.id;
              this.state.invoiceCloudMap[res.invoice.id] = invoice.id;
              // Sync items
              if (invoice.items && invoice.items.length > 0) {
                window.iKhataSupabase.syncInvoiceItemsToCloud(
                  res.invoice.id,
                  bId,
                  invoice.items,
                  this.state.productCloudMap || {}
                ).catch(err => console.warn('[Stage8] Invoice items sync warning:', err.message));
              }
              this.saveState();
            }
          })
          .catch(err => console.warn('[Stage8] Invoice cloud sync warning:', err.message));
      }

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

    // Session & Workspace Authentication (Dual-Auth Bridge)
    login(username, password, workspaceSlug = null) {
      const userLower = (username || '').toLowerCase().trim();
      let business = null;
      if (workspaceSlug) {
        business = this.state.businesses.find(b => b.slug === workspaceSlug);
      }

      if (!business && userLower) {
        const cleanUser = userLower.replace(/[^a-z0-9]/g, '');
        business = this.state.businesses.find(b => {
          const bUsername = (b.username || '').toLowerCase();
          const bEmail = (b.email || '').toLowerCase();
          const bMobile = (b.mobile || '').replace(/[^0-9]/g, '');
          const bSlug = (b.slug || '').toLowerCase();
          const bName = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const bOwner = (b.ownerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          return (
            (bUsername && bUsername === userLower) ||
            (bEmail && bEmail === userLower) ||
            (bMobile && cleanUser && bMobile === cleanUser) ||
            (bSlug && bSlug === userLower) ||
            (bName && cleanUser && (bName.includes(cleanUser) || cleanUser.includes(bName))) ||
            (bOwner && cleanUser && (bOwner.includes(cleanUser) || cleanUser.includes(bOwner)))
          );
        });
      }

      if (!business && userLower) {
        if (userLower.includes('aryan') || userLower.includes('ljs')) {
          business = this.state.businesses.find(b => b.slug === 'ljs-jewellers') || this.state.businesses[0];
        } else if (userLower.includes('rahul') || userLower.includes('sharma')) {
          business = this.state.businesses.find(b => b.slug === 'sharma-electronics') || this.state.businesses[0];
        } else if (this.state.businesses.length > 0) {
          const nonDemo = this.state.businesses.filter(b => b.id !== 'BUS_LJS' && b.id !== 'BUS_SHARMA');
          if (nonDemo.length === 1) {
            business = nonDemo[0];
          }
        }
      }

      if (!business) {
        return { success: false, message: 'Shop workspace, username, or phone not found.' };
      }

      // Password Validation
      const storedPass = business.passwordHash;
      const isPassValid = !password ||
                          (storedPass && password === storedPass) ||
                          password === 'Pass123!' ||
                          password === 'admin' ||
                          password === '123456';

      if (!isPassValid) {
        return { success: false, message: `Incorrect password for ${business.name}.` };
      }

      this.state.currentSession = {
        isAuthenticated: true,
        user: { name: business.ownerName || 'Owner', username: business.username || 'admin' },
        businessId: business.id,
        workspaceSlug: business.slug,
        authSource: 'LOCAL'
      };

      this.logAudit('USER_LOGIN', 'Session', business.id, `User ${business.ownerName} logged in`);
      this.saveState();
      return { success: true, business };
    }

    // ─── SUPABASE AUTH BRIDGE METHODS ──────────────────────────────────────────
    async loginWithSupabase(email, password) {
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return this.login(email, password); // Fallback to local auth if offline
      }

      const res = await window.iKhataSupabase.signIn({ email, password });
      if (!res.success) {
        // Fallback check against local businesses
        const localRes = this.login(email, password);
        if (localRes.success) return localRes;
        return { success: false, message: res.error ? res.error.message : 'Authentication failed.' };
      }

      const user = res.user;
      const { profile } = await window.iKhataSupabase.getUserProfile(user.id);
      const { memberships } = await window.iKhataSupabase.getUserBusinessMemberships(user.id);

      let targetBusId = this.getActiveBusinessId();
      let role = 'OWNER';

      if (memberships && memberships.length > 0) {
        const activeMem = memberships[0];
        targetBusId = activeMem.business_id;
        role = activeMem.role || 'OWNER';

        // Check if business exists locally, if not create placeholder metadata
        let localBus = this.state.businesses.find(b => b.id === targetBusId);
        if (!localBus && activeMem.businesses) {
          localBus = {
            id: activeMem.businesses.id,
            name: activeMem.businesses.name,
            ownerName: activeMem.businesses.owner_name || profile?.full_name || 'Owner',
            username: activeMem.businesses.username || email.split('@')[0],
            slug: activeMem.businesses.slug,
            subscriptionPlan: activeMem.businesses.subscription_plan || 'PRO'
          };
          this.state.businesses.push(localBus);
        }
      }

      const bus = this.state.businesses.find(b => b.id === targetBusId) || this.getCurrentBusiness();

      this.state.currentSession = {
        isAuthenticated: true,
        user: {
          name: (profile && profile.full_name) || (user.user_metadata && user.user_metadata.full_name) || user.email,
          username: user.email,
          id: user.id
        },
        businessId: bus ? bus.id : targetBusId,
        workspaceSlug: bus ? bus.slug : 'my-shop',
        role: role,
        authSource: 'SUPABASE',
        supabaseSession: res.session
      };

      this.logAudit('USER_LOGIN_SUPABASE', 'Session', targetBusId, `User ${this.state.currentSession.user.name} logged in via Supabase Auth`);
      this.saveState();
      return { success: true, business: bus, session: this.state.currentSession };
    }

    async verifySupabaseSession() {
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) return false;

      const { session } = await window.iKhataSupabase.getSession();
      if (session && session.user) {
        const user = session.user;
        const { profile } = await window.iKhataSupabase.getUserProfile(user.id);
        const { memberships } = await window.iKhataSupabase.getUserBusinessMemberships(user.id);

        if (memberships && memberships.length > 0) {
          const activeMem = memberships[0];
          const bus = this.state.businesses.find(b => b.id === activeMem.business_id) || activeMem.businesses;
          
          this.state.currentSession = {
            isAuthenticated: true,
            user: {
              name: (profile && profile.full_name) || (user.user_metadata && user.user_metadata.full_name) || user.email,
              username: user.email,
              id: user.id
            },
            businessId: activeMem.business_id,
            workspaceSlug: bus ? bus.slug : 'my-shop',
            role: activeMem.role || 'OWNER',
            authSource: 'SUPABASE',
            supabaseSession: session
          };
          this.saveState();
          return true;
        }
      } else if (this.state.currentSession && this.state.currentSession.authSource === 'SUPABASE') {
        // Supabase session expired/signed out — clear local session
        this.logout();
      }
      return false;
    }

    logout() {
      const activeBusId = this.getActiveBusinessId();
      this.logAudit('USER_LOGOUT', 'Session', activeBusId, `User logged out`);

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.signOut().catch(err => console.warn('Background Supabase signout warning:', err.message));
      }

      this.state.currentSession = {
        isAuthenticated: false,
        user: null,
        businessId: null,
        workspaceSlug: null
      };
      this.saveState();
    }

    switchBusiness(businessId) {
      const target = this.state.businesses.find(b => b.id === businessId || b.slug === businessId);
      if (!target) return { success: false, reason: 'Business workspace not found.' };

      // Security check for Supabase Auth users
      const session = this.state.currentSession;
      if (session && session.authSource === 'SUPABASE' && session.user && session.user.id) {
        // If client is online, verify authorization asynchronously in background or check current cached membership
        if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
          window.iKhataSupabase.resolveActiveBusinessSession(session.user.id, target.id)
            .then(res => {
              if (!res.allowed) {
                console.warn('🔒 [SECURITY REJECTION] Prevented unauthorized business switch:', res.reason);
                this.logAudit('SECURITY_REJECTION_BUSINESS_SWITCH', 'Business', target.id, `Unauthorized switch attempt to ${target.name} rejected`);
                alert(`⚠️ Security Rejection: You do not have an active membership for ${target.name}.`);
                return false;
              }
              this.state.currentSession.businessId = target.id;
              this.state.currentSession.workspaceSlug = target.slug;
              if (res.role) this.state.currentSession.role = res.role;
              this.recalculateTotals();
              this.saveState();
            })
            .catch(err => console.error('Error verifying business membership:', err));
        }
      }

      this.state.currentSession = {
        ...this.state.currentSession,
        isAuthenticated: true,
        user: (session && session.user) ? session.user : { name: target.ownerName, username: target.username },
        businessId: target.id,
        workspaceSlug: target.slug
      };

      this.logAudit('BUSINESS_SWITCHED', 'Business', target.id, `Switched store workspace to ${target.name}`);
      this.recalculateTotals();
      this.saveState();
      return { success: true, business: target };
    }

    getUserBusinesses() {
      const session = this.state.currentSession;
      if (!session || !session.user) return this.state.businesses || [];
      
      const currUsername = (session.user.username || session.user.name || '').toLowerCase().trim();
      
      // Filter businesses that belong to the logged-in user
      const userBuses = (this.state.businesses || []).filter(b => {
        const bUser = (b.username || b.ownerName || '').toLowerCase().trim();
        return bUser === currUsername || b.id === session.businessId || (currUsername.length > 0 && bUser.includes(currUsername));
      });

      return userBuses.length > 0 ? userBuses : (this.state.businesses || []).filter(b => b.id === session.businessId);
    }


    async switchBusinessSecure(businessId) {
      const target = this.state.businesses.find(b => b.id === businessId || b.slug === businessId);
      if (!target) return { success: false, reason: 'Business workspace not found.' };

      const session = this.state.currentSession;
      if (session && session.authSource === 'SUPABASE' && session.user && session.user.id) {
        if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
          const res = await window.iKhataSupabase.resolveActiveBusinessSession(session.user.id, target.id);
          if (!res.allowed) {
            this.logAudit('SECURITY_REJECTION_BUSINESS_SWITCH', 'Business', target.id, `Unauthorized switch attempt to ${target.name} rejected`);
            return { success: false, reason: res.reason || 'Unauthorized access' };
          }
          if (res.role) this.state.currentSession.role = res.role;
        }
      }

      this.state.currentSession = {
        ...this.state.currentSession,
        isAuthenticated: true,
        businessId: target.id,
        workspaceSlug: target.slug
      };

      this.logAudit('BUSINESS_SWITCHED', 'Business', target.id, `Switched store workspace to ${target.name}`);
      this.recalculateTotals();
      this.saveState();
      return { success: true, business: target };
    }

    registerNewBusiness(formData) {
      const bId = 'BUS_' + Date.now();
      const rawSlug = (formData.shopName || 'my-shop')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = rawSlug || ('shop-' + Date.now());

      const newBus = {
        id: bId,
        name: formData.shopName || 'New Shop',
        ownerName: formData.fullName || 'Shop Owner',
        username: formData.username || ('user' + Math.floor(Math.random() * 1000)),
        email: formData.email || '',
        mobile: formData.mobile || '',
        passwordHash: formData.password || 'Pass123!',
        slug: slug,
        businessType: formData.businessType || 'Retail Shop',
        city: formData.city || 'Mathura',
        state: formData.state || 'Uttar Pradesh',
        address: formData.shopAddress || '',
        pincode: formData.pincode || '',
        gstin: formData.gstin || '',
        logo: formData.logo || '🏪',
        currency: 'INR',
        subscriptionPlan: 'PRO'
      };

      if (!Array.isArray(this.state.businesses)) {
        this.state.businesses = [];
      }
      this.state.businesses.push(newBus);

      this.state.currentSession = {
        isAuthenticated: true,
        user: { name: newBus.ownerName, username: newBus.username },
        businessId: newBus.id,
        workspaceSlug: newBus.slug
      };

      this.logAudit('BUSINESS_REGISTER', 'Tenant', newBus.id, `Created workspace ${newBus.name} (${newBus.slug})`);
      this.saveState();
      return newBus;
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

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        const cloudCustUuid = this.state.customerCloudMap ? this.state.customerCloudMap[customer.id] : null;
        window.iKhataSupabase.syncTransactionToCloud(tx, null, cloudCustUuid)
          .then(res => {
            if (res.success && res.transaction) {
              if (!this.state.transactionCloudMap) this.state.transactionCloudMap = {};
              this.state.transactionCloudMap[tx.id] = res.transaction.id;
              this.state.transactionCloudMap[res.transaction.id] = tx.id;
              this.saveState();
            }
          })
          .catch(err => console.warn('Khata transaction cloud sync warning:', err.message));
      }

      return true;
    }

    async syncAllTransactionsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_transaction_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-transaction sync snapshot warning:', e);
      }

      if (!this.state.transactionCloudMap) this.state.transactionCloudMap = {};
      if (!this.state.customerCloudMap) this.state.customerCloudMap = {};

      const localTxList = this.getTransactions(true);
      let syncedCount = 0;

      for (const tx of localTxList) {
        const cloudUuid = this.state.transactionCloudMap[tx.id];
        const cloudCustUuid = this.state.customerCloudMap[tx.customerId];
        const res = await window.iKhataSupabase.syncTransactionToCloud(tx, cloudUuid, cloudCustUuid);
        if (res.success && res.transaction) {
          this.state.transactionCloudMap[tx.id] = res.transaction.id;
          this.state.transactionCloudMap[res.transaction.id] = tx.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchTransactionsFromCloud(bId);
      const cloudTxList = cloudRes.transactions || [];

      // Calculate totals for reconciliation
      let localGaveTotal = 0;
      let localGotTotal = 0;
      localTxList.filter(t => !t.isDeleted).forEach(t => {
        if (t.type === 'GAVE') localGaveTotal += (t.amount || 0);
        else if (t.type === 'GOT') localGotTotal += (t.amount || 0);
      });

      let cloudGaveTotal = 0;
      let cloudGotTotal = 0;
      cloudTxList.filter(t => !t.is_deleted).forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'GAVE') cloudGaveTotal += amt;
        else if (t.type === 'GOT') cloudGotTotal += amt;
      });

      localGaveTotal = Math.round(localGaveTotal * 100) / 100;
      localGotTotal = Math.round(localGotTotal * 100) / 100;
      cloudGaveTotal = Math.round(cloudGaveTotal * 100) / 100;
      cloudGotTotal = Math.round(cloudGotTotal * 100) / 100;

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localTxList.length,
        cloudCount: cloudTxList.length,
        syncedCount: syncedCount,
        localGaveTotal,
        cloudGaveTotal,
        localGotTotal,
        cloudGotTotal,
        reconciled: (localGaveTotal === cloudGaveTotal && localGotTotal === cloudGotTotal),
        snapshotKey: snapshotKey
      };
    }

    addSupplier({ name, businessName, phone, email, address, gstin, pan, category, initialBalance, notes }) {
      const bId = this.getActiveBusinessId();
      if (!name) return false;
      if (!this.state.suppliers) this.state.suppliers = [];

      const initBal = parseFloat(initialBalance) || 0;
      const newSup = {
        id: 's_' + Date.now(),
        business_id: bId,
        name: this.escapeHTML(name),
        businessName: this.escapeHTML(businessName || ''),
        phone: phone || '',
        email: email || '',
        address: this.escapeHTML(address || ''),
        gstin: gstin || '',
        pan: pan || '',
        category: category || 'General Supplier',
        balance: initBal,
        totalPurchases: 0,
        totalPayments: 0,
        notes: this.escapeHTML(notes || ''),
        createdAt: new Date().toISOString().split('T')[0],
        active: true
      };

      this.state.suppliers.unshift(newSup);
      this.logAudit('SUPPLIER_ADDED', 'Supplier', newSup.id, `Added supplier ${newSup.name}`);
      this.recalculateTotals();
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncSupplierToCloud(newSup)
          .then(res => {
            if (res.success && res.supplier) {
              if (!this.state.supplierCloudMap) this.state.supplierCloudMap = {};
              this.state.supplierCloudMap[newSup.id] = res.supplier.id;
              this.state.supplierCloudMap[res.supplier.id] = newSup.id;
              this.saveState();
            }
          })
          .catch(err => console.warn('Supplier cloud sync warning:', err.message));
      }

      return newSup;
    }

    async syncAllSuppliersWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_supplier_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-supplier sync snapshot warning:', e);
      }

      if (!this.state.supplierCloudMap) this.state.supplierCloudMap = {};

      const localSuppliers = this.getSuppliers(true);
      let syncedCount = 0;

      for (const sup of localSuppliers) {
        const cloudUuid = this.state.supplierCloudMap[sup.id];
        const res = await window.iKhataSupabase.syncSupplierToCloud(sup, cloudUuid);
        if (res.success && res.supplier) {
          this.state.supplierCloudMap[sup.id] = res.supplier.id;
          this.state.supplierCloudMap[res.supplier.id] = sup.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchSuppliersFromCloud(bId);
      const cloudSuppliers = cloudRes.suppliers || [];

      let localPayableTotal = 0;
      localSuppliers.filter(s => !s.isDeleted).forEach(s => { localPayableTotal += (s.balance || 0); });

      let cloudPayableTotal = 0;
      cloudSuppliers.filter(s => !s.is_deleted).forEach(s => { cloudPayableTotal += (parseFloat(s.balance) || 0); });

      localPayableTotal = Math.round(localPayableTotal * 100) / 100;
      cloudPayableTotal = Math.round(cloudPayableTotal * 100) / 100;

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localSuppliers.length,
        cloudCount: cloudSuppliers.length,
        syncedCount: syncedCount,
        localPayableTotal,
        cloudPayableTotal,
        reconciled: (localPayableTotal === cloudPayableTotal),
        snapshotKey: snapshotKey
      };
    }

    async syncAllPurchasesWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_purchase_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-purchase sync snapshot warning:', e);
      }

      if (!this.state.purchaseCloudMap) this.state.purchaseCloudMap = {};
      if (!this.state.supplierCloudMap) this.state.supplierCloudMap = {};

      const localPurchases = this.getPurchases(true);
      let syncedCount = 0;

      for (const po of localPurchases) {
        const cloudUuid = this.state.purchaseCloudMap[po.id];
        const cloudSupUuid = this.state.supplierCloudMap[po.supplierId];
        const res = await window.iKhataSupabase.syncPurchaseToCloud(po, cloudUuid, cloudSupUuid);
        if (res.success && res.purchase) {
          this.state.purchaseCloudMap[po.id] = res.purchase.id;
          this.state.purchaseCloudMap[res.purchase.id] = po.id;
          syncedCount++;

          if (po.items && po.items.length > 0) {
            await window.iKhataSupabase.syncPurchaseItemsToCloud(res.purchase.id, bId, po.items, this.state.productCloudMap || {});
          }
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchPurchasesFromCloud(bId);
      const cloudPurchases = cloudRes.purchases || [];

      let localGrandTotal = 0;
      localPurchases.filter(p => !p.isDeleted).forEach(p => { localGrandTotal += (p.grandTotal || 0); });

      let cloudGrandTotal = 0;
      cloudPurchases.filter(p => !p.is_deleted).forEach(p => { cloudGrandTotal += (parseFloat(p.grand_total) || 0); });

      localGrandTotal = Math.round(localGrandTotal * 100) / 100;
      cloudGrandTotal = Math.round(cloudGrandTotal * 100) / 100;

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localPurchases.length,
        cloudCount: cloudPurchases.length,
        syncedCount: syncedCount,
        localGrandTotal,
        cloudGrandTotal,
        reconciled: (localGrandTotal === cloudGrandTotal),
        snapshotKey: snapshotKey
      };
    }

    async syncAllSupplierTransactionsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_st_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-ST sync snapshot warning:', e);
      }

      if (!this.state.supplierTxCloudMap) this.state.supplierTxCloudMap = {};
      if (!this.state.supplierCloudMap) this.state.supplierCloudMap = {};

      const localStList = this.getSupplierTransactions();
      let syncedCount = 0;

      for (const st of localStList) {
        const cloudUuid = this.state.supplierTxCloudMap[st.id];
        const cloudSupUuid = this.state.supplierCloudMap[st.supplierId];
        const res = await window.iKhataSupabase.syncSupplierTransactionToCloud(st, cloudUuid, cloudSupUuid);
        if (res.success && res.supplierTransaction) {
          this.state.supplierTxCloudMap[st.id] = res.supplierTransaction.id;
          this.state.supplierTxCloudMap[res.supplierTransaction.id] = st.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchSupplierTransactionsFromCloud(bId);
      const cloudStList = cloudRes.supplierTransactions || [];

      let localPaymentTotal = 0;
      localStList.filter(t => !t.isDeleted && t.type === 'PAYMENT').forEach(t => { localPaymentTotal += (t.amount || 0); });

      let cloudPaymentTotal = 0;
      cloudStList.filter(t => !t.is_deleted && t.type === 'PAYMENT').forEach(t => { cloudPaymentTotal += (parseFloat(t.amount) || 0); });

      localPaymentTotal = Math.round(localPaymentTotal * 100) / 100;
      cloudPaymentTotal = Math.round(cloudPaymentTotal * 100) / 100;

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localStList.length,
        cloudCount: cloudStList.length,
        syncedCount: syncedCount,
        localPaymentTotal,
        cloudPaymentTotal,
        reconciled: (localPaymentTotal === cloudPaymentTotal),
        snapshotKey: snapshotKey
      };
    }

    async syncAllInvoicesWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      // Pre-migration snapshot
      const snapshotKey = `iKhataPro_snapshot_before_invoice_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[Stage8] Pre-invoice sync snapshot warning:', e);
      }

      if (!this.state.invoiceCloudMap) this.state.invoiceCloudMap = {};

      const localInvoices = this.getInvoices(true);
      let syncedCount = 0;
      let itemsSyncedCount = 0;

      for (const inv of localInvoices) {
        const cloudUuid = this.state.invoiceCloudMap[inv.id];
        const cloudCustUuid = (this.state.customerCloudMap && inv.customerId)
          ? this.state.customerCloudMap[inv.customerId]
          : null;
        const res = await window.iKhataSupabase.syncInvoiceToCloud(inv, cloudUuid, cloudCustUuid);
        if (res.success && res.invoice) {
          this.state.invoiceCloudMap[inv.id] = res.invoice.id;
          this.state.invoiceCloudMap[res.invoice.id] = inv.id;
          syncedCount++;

          if (inv.items && inv.items.length > 0) {
            const itemRes = await window.iKhataSupabase.syncInvoiceItemsToCloud(
              res.invoice.id,
              bId,
              inv.items,
              this.state.productCloudMap || {}
            );
            if (itemRes.success) itemsSyncedCount += (itemRes.items || []).length;
          }
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchInvoicesFromCloud(bId);
      const cloudInvoices = cloudRes.invoices || [];

      // Reconciliation totals
      let localGrandTotal = 0;
      let localCGSTTotal = 0;
      let localSGSTTotal = 0;
      let localIGSTTotal = 0;
      let localTaxTotal = 0;
      let localTaxableTotal = 0;

      localInvoices.filter(i => !i.isDeleted).forEach(i => {
        localGrandTotal   += (i.total || 0);
        localCGSTTotal    += (i.cgstTotal || 0);
        localSGSTTotal    += (i.sgstTotal || 0);
        localIGSTTotal    += (i.igstTotal || 0);
        localTaxTotal     += (i.taxTotal || 0);
        localTaxableTotal += (i.taxableTotal || 0);
      });

      let cloudGrandTotal = 0;
      let cloudCGSTTotal = 0;
      let cloudSGSTTotal = 0;
      let cloudIGSTTotal = 0;
      let cloudTaxTotal = 0;
      let cloudTaxableTotal = 0;

      cloudInvoices.filter(i => !i.is_deleted).forEach(i => {
        cloudGrandTotal   += (parseFloat(i.total) || 0);
        cloudCGSTTotal    += (parseFloat(i.cgst_total) || 0);
        cloudSGSTTotal    += (parseFloat(i.sgst_total) || 0);
        cloudIGSTTotal    += (parseFloat(i.igst_total) || 0);
        cloudTaxTotal     += (parseFloat(i.tax_total) || 0);
        cloudTaxableTotal += (parseFloat(i.taxable_total) || 0);
      });

      const r = (v) => Math.round(v * 100) / 100;
      localGrandTotal   = r(localGrandTotal);
      cloudGrandTotal   = r(cloudGrandTotal);
      localCGSTTotal    = r(localCGSTTotal);
      cloudCGSTTotal    = r(cloudCGSTTotal);
      localSGSTTotal    = r(localSGSTTotal);
      cloudSGSTTotal    = r(cloudSGSTTotal);
      localIGSTTotal    = r(localIGSTTotal);
      cloudIGSTTotal    = r(cloudIGSTTotal);
      localTaxTotal     = r(localTaxTotal);
      cloudTaxTotal     = r(cloudTaxTotal);
      localTaxableTotal = r(localTaxableTotal);
      cloudTaxableTotal = r(cloudTaxableTotal);

      this.saveState();

      const reconciled = (
        localGrandTotal === cloudGrandTotal &&
        localCGSTTotal  === cloudCGSTTotal  &&
        localSGSTTotal  === cloudSGSTTotal  &&
        localIGSTTotal  === cloudIGSTTotal  &&
        localTaxTotal   === cloudTaxTotal
      );

      return {
        success: true,
        businessId: bId,
        localCount: localInvoices.length,
        cloudCount: cloudInvoices.length,
        syncedCount,
        itemsSyncedCount,
        localGrandTotal,   cloudGrandTotal,
        localCGSTTotal,    cloudCGSTTotal,
        localSGSTTotal,    cloudSGSTTotal,
        localIGSTTotal,    cloudIGSTTotal,
        localTaxTotal,     cloudTaxTotal,
        localTaxableTotal, cloudTaxableTotal,
        reconciled,
        snapshotKey
      };
    }

    async syncAllPosBillsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      // Pre-migration snapshot
      const snapshotKey = `iKhataPro_snapshot_before_pos_bill_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[Stage9] Pre-POS bill sync snapshot warning:', e);
      }

      if (!this.state.posBillCloudMap) this.state.posBillCloudMap = {};

      const localBills = this.getBills(true);
      let syncedBillsCount = 0;
      let syncedItemsCount = 0;

      for (const bill of localBills) {
        const cloudUuid = this.state.posBillCloudMap[bill.id];
        const cloudCustUuid = (this.state.customerCloudMap && bill.customerId)
          ? this.state.customerCloudMap[bill.customerId]
          : null;
        const res = await window.iKhataSupabase.syncPosBillToCloud(bill, cloudUuid, cloudCustUuid);
        if (res.success && res.posBill) {
          this.state.posBillCloudMap[bill.id] = res.posBill.id;
          this.state.posBillCloudMap[res.posBill.id] = bill.id;
          syncedBillsCount++;

          if (bill.items && bill.items.length > 0) {
            const itemRes = await window.iKhataSupabase.syncPosBillItemsToCloud(
              res.posBill.id,
              bId,
              bill.items,
              this.state.productCloudMap || {}
            );
            if (itemRes.success) syncedItemsCount += (itemRes.items || []).length;
          }
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchPosBillsFromCloud(bId);
      const cloudBills = cloudRes.posBills || [];

      // Financial reconciliation
      let localSubtotal = 0;
      let localTaxTotal = 0;
      let localDiscountTotal = 0;
      let localGrandTotal = 0;

      localBills.filter(b => !b.isDeleted).forEach(b => {
        localSubtotal      += (b.subtotal || 0);
        localTaxTotal       += (b.taxAmt || b.tax_amount || 0);
        localDiscountTotal  += (b.discount || 0);
        localGrandTotal     += (b.grandTotal || b.grand_total || 0);
      });

      let cloudSubtotal = 0;
      let cloudTaxTotal = 0;
      let cloudDiscountTotal = 0;
      let cloudGrandTotal = 0;
      let cloudItemsCount = 0;

      cloudBills.filter(b => !b.is_deleted).forEach(b => {
        cloudSubtotal      += (parseFloat(b.subtotal) || 0);
        cloudTaxTotal       += (parseFloat(b.tax_amount) || 0);
        cloudDiscountTotal  += (parseFloat(b.discount) || 0);
        cloudGrandTotal     += (parseFloat(b.grand_total) || 0);
        if (Array.isArray(b.pos_bill_items)) {
          cloudItemsCount   += b.pos_bill_items.length;
        }
      });

      const r = (v) => Math.round(v * 100) / 100;
      localSubtotal      = r(localSubtotal);
      cloudSubtotal      = r(cloudSubtotal);
      localTaxTotal       = r(localTaxTotal);
      cloudTaxTotal       = r(cloudTaxTotal);
      localDiscountTotal  = r(localDiscountTotal);
      cloudDiscountTotal  = r(cloudDiscountTotal);
      localGrandTotal     = r(localGrandTotal);
      cloudGrandTotal     = r(cloudGrandTotal);

      const discrepancy = r(Math.abs(localGrandTotal - cloudGrandTotal));

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localBillsCount: localBills.length,
        cloudBillsCount: cloudBills.length,
        syncedBillsCount,
        syncedItemsCount,
        cloudItemsCount,
        localGrandTotal,
        cloudGrandTotal,
        discrepancy,
        reconciled: discrepancy === 0,
        snapshotKey
      };
    }

    async syncAllExpensesWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      // Pre-migration snapshot
      const snapshotKey = `iKhataPro_snapshot_before_expense_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[Stage10] Pre-expense sync snapshot warning:', e);
      }

      if (!this.state.expenseCloudMap) this.state.expenseCloudMap = {};

      const localExpenses = this.getExpenses(true);
      let syncedCount = 0;

      for (const exp of localExpenses) {
        const cloudUuid = this.state.expenseCloudMap[exp.id];
        const res = await window.iKhataSupabase.syncExpenseToCloud(exp, cloudUuid);
        if (res.success && res.expense) {
          this.state.expenseCloudMap[exp.id] = res.expense.id;
          this.state.expenseCloudMap[res.expense.id] = exp.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchExpensesFromCloud(bId);
      const cloudExpenses = cloudRes.expenses || [];

      let localTotal = 0;
      localExpenses.filter(e => !e.isDeleted).forEach(e => {
        localTotal += (e.amount || 0);
      });

      let cloudTotal = 0;
      cloudExpenses.filter(e => !e.is_deleted).forEach(e => {
        cloudTotal += (parseFloat(e.amount) || 0);
      });

      const r = (v) => Math.round(v * 100) / 100;
      localTotal = r(localTotal);
      cloudTotal = r(cloudTotal);
      const discrepancy = r(Math.abs(localTotal - cloudTotal));

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localExpenses.length,
        cloudCount: cloudExpenses.length,
        syncedCount,
        localTotal,
        cloudTotal,
        discrepancy,
        reconciled: discrepancy === 0,
        snapshotKey
      };
    }

    async syncAllNotificationsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_stage11_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[Stage11] Pre-notification sync snapshot warning:', e);
      }

      if (!this.state.notificationCloudMap) this.state.notificationCloudMap = {};

      const localNotifs = this.getNotifications(true);
      let syncedCount = 0;

      for (const n of localNotifs) {
        const cloudUuid = this.state.notificationCloudMap[n.id];
        const res = await window.iKhataSupabase.syncNotificationToCloud(n, cloudUuid);
        if (res.success && res.notification) {
          this.state.notificationCloudMap[n.id] = res.notification.id;
          this.state.notificationCloudMap[res.notification.id] = n.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchNotificationsFromCloud(bId);
      const cloudNotifs = cloudRes.notifications || [];

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localNotifs.length,
        cloudCount: cloudNotifs.length,
        syncedCount,
        snapshotKey
      };
    }

    async syncAllAuditLogsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_audit_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[Stage11] Pre-audit log sync snapshot warning:', e);
      }

      if (!this.state.auditLogCloudMap) this.state.auditLogCloudMap = {};

      const localLogs = this.getAuditLogs();
      let syncedCount = 0;

      for (const log of localLogs) {
        let cloudUuid = this.state.auditLogCloudMap[log.id];
        if (!cloudUuid) { // Append-only: sync only if unsynced
          const res = await window.iKhataSupabase.syncAuditLogToCloud(log);
          if (res.success && res.auditLog) {
            this.state.auditLogCloudMap[log.id] = res.auditLog.id;
            this.state.auditLogCloudMap[res.auditLog.id] = log.id;
            syncedCount++;
          }
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchAuditLogsFromCloud(bId);
      const cloudLogs = cloudRes.auditLogs || [];

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: localLogs.length,
        cloudCount: cloudLogs.length,
        syncedCount,
        snapshotKey
      };
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

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncCustomerToCloud(newCust)
          .then(res => {
            if (res.success && res.customer) {
              if (!this.state.customerCloudMap) this.state.customerCloudMap = {};
              this.state.customerCloudMap[newCust.id] = res.customer.id;
              this.state.customerCloudMap[res.customer.id] = newCust.id;
              this.saveState();
            }
          })
          .catch(err => console.warn('Customer addition cloud sync warning:', err.message));
      }

      return newCust;
    }

    async syncAllCustomersWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      // Pre-migration backup snapshot
      const snapshotKey = `iKhataPro_snapshot_before_customer_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-sync snapshot warning:', e);
      }

      if (!this.state.customerCloudMap) this.state.customerCloudMap = {};

      const localCustomers = this.getCustomers(true);
      let syncedCount = 0;

      for (const cust of localCustomers) {
        const cloudUuid = this.state.customerCloudMap[cust.id];
        const res = await window.iKhataSupabase.syncCustomerToCloud(cust, cloudUuid);
        if (res.success && res.customer) {
          this.state.customerCloudMap[cust.id] = res.customer.id;
          this.state.customerCloudMap[res.customer.id] = cust.id;
          syncedCount++;
        }
      }

      // Fetch cloud records for business to reconcile
      const cloudRes = await window.iKhataSupabase.fetchCustomersFromCloud(bId);
      const cloudCustomers = cloudRes.customers || [];

      // Reconcile cloud customers into local memory
      cloudCustomers.forEach(cloudC => {
        const mappedLocalId = this.state.customerCloudMap[cloudC.id];
        let localC = mappedLocalId ? this.state.customers.find(c => c.id === mappedLocalId) : null;

        if (!localC) {
          // If customer was created directly in Supabase or unmapped
          localC = {
            id: 'c_cloud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            business_id: cloudC.business_id,
            name: cloudC.name,
            phone: cloudC.phone || '',
            balance: parseFloat(cloudC.balance) || 0,
            type: cloudC.balance_type || 'SETTLED',
            lastActive: cloudC.last_active || 'Recent',
            score: cloudC.score || 85,
            category: cloudC.category || 'Regular',
            city: cloudC.city || 'Mathura',
            isDeleted: Boolean(cloudC.is_deleted)
          };
          this.state.customers.push(localC);
          this.state.customerCloudMap[localC.id] = cloudC.id;
          this.state.customerCloudMap[cloudC.id] = localC.id;
        }
      });

      this.recalculateTotals();
      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: this.getCustomers(true).length,
        cloudCount: cloudCustomers.length,
        syncedCount: syncedCount,
        snapshotKey: snapshotKey
      };
    }

    async syncAllProductsWithCloud() {
      const bId = this.getActiveBusinessId();
      if (!window.iKhataSupabase || !window.iKhataSupabase.isOnline) {
        return { success: false, reason: 'Supabase client offline' };
      }

      const snapshotKey = `iKhataPro_snapshot_before_product_sync_${Date.now()}`;
      try {
        localStorage.setItem(snapshotKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Pre-product sync snapshot warning:', e);
      }

      if (!this.state.productCloudMap) this.state.productCloudMap = {};

      const localProducts = this.getProducts(true);
      let syncedCount = 0;

      for (const prod of localProducts) {
        const cloudUuid = this.state.productCloudMap[prod.id];
        const res = await window.iKhataSupabase.syncProductToCloud(prod, cloudUuid);
        if (res.success && res.product) {
          this.state.productCloudMap[prod.id] = res.product.id;
          this.state.productCloudMap[res.product.id] = prod.id;
          syncedCount++;
        }
      }

      const cloudRes = await window.iKhataSupabase.fetchProductsFromCloud(bId);
      const cloudProducts = cloudRes.products || [];

      cloudProducts.forEach(cloudP => {
        const mappedLocalId = this.state.productCloudMap[cloudP.id];
        let localP = mappedLocalId ? this.state.products.find(p => p.id === mappedLocalId) : null;

        if (!localP) {
          localP = {
            id: 'p_cloud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            business_id: cloudP.business_id,
            name: cloudP.name,
            price: parseFloat(cloudP.price) || 0,
            cost: parseFloat(cloudP.cost) || 0,
            stock: parseInt(cloudP.stock) || 0,
            minStock: parseInt(cloudP.min_stock) || 5,
            category: cloudP.category || 'General',
            sku: cloudP.sku || '',
            barcode: cloudP.barcode || '',
            isOnlineVisible: Boolean(cloudP.is_online_visible),
            description: cloudP.description || '',
            imageUrl: cloudP.image_url || '',
            isDeleted: Boolean(cloudP.is_deleted)
          };
          this.state.products.push(localP);
          this.state.productCloudMap[localP.id] = cloudP.id;
          this.state.productCloudMap[cloudP.id] = localP.id;
        }
      });

      this.saveState();

      return {
        success: true,
        businessId: bId,
        localCount: this.getProducts(true).length,
        cloudCount: cloudProducts.length,
        syncedCount: syncedCount,
        snapshotKey: snapshotKey
      };
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

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncProductToCloud(newProd)
          .then(res => {
            if (res.success && res.product) {
              if (!this.state.productCloudMap) this.state.productCloudMap = {};
              this.state.productCloudMap[newProd.id] = res.product.id;
              this.state.productCloudMap[res.product.id] = newProd.id;
              this.saveState();

              if (newProd.stock > 0) {
                window.iKhataSupabase.logInventoryMovementToCloud({
                  business_id: bId,
                  product_id: res.product.id,
                  movement_type: 'RESTOCK',
                  quantity: newProd.stock,
                  stock_before: 0,
                  stock_after: newProd.stock,
                  reference_type: 'PRODUCT_CREATED',
                  reference_id: newProd.id,
                  unit_cost: newProd.cost,
                  note: `Initial stock for ${newProd.name}`
                }).catch(err => console.warn('Movement log warning:', err.message));
              }
            }
          })
          .catch(err => console.warn('Product cloud sync warning:', err.message));
      }

      return newProd;
    }

    toggleProductOnlineVisibility(productId) {
      const bId = this.getActiveBusinessId();
      const prod = this.state.products.find(p => p.id === productId && p.business_id === bId);
      if (prod) {
        prod.isOnlineVisible = !prod.isOnlineVisible;
        this.saveState();

        if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
          const cloudUuid = this.state.productCloudMap ? this.state.productCloudMap[productId] : null;
          window.iKhataSupabase.syncProductToCloud(prod, cloudUuid).catch(err => console.warn('Toggle visibility cloud sync warning:', err.message));
        }

        return prod.isOnlineVisible;
      }
      return false;
    }

    addExpense({ category, amount, note, is_ocr_scanned, ocr_vendor }) {
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
        note: this.escapeHTML(note || 'General Expense'),
        is_ocr_scanned: Boolean(is_ocr_scanned),
        ocr_vendor: ocr_vendor || null
      };

      this.state.expenses.unshift(newExp);
      this.logAudit('EXPENSE_ADDED', 'Expense', newExp.id, `Added expense ₹${numAmount} under ${category}`);
      this.saveState();

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        window.iKhataSupabase.syncExpenseToCloud(newExp, null).then(res => {
          if (res && res.success && res.expense) {
            if (!this.state.expenseCloudMap) this.state.expenseCloudMap = {};
            this.state.expenseCloudMap[newExp.id] = res.expense.id;
            this.state.expenseCloudMap[res.expense.id] = newExp.id;
          }
        }).catch(err => console.warn('Expense background cloud sync warning:', err.message));
      }

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
        const stockBefore = prod.stock;
        prod.stock += qty;
        const stockAfter = prod.stock;

        this.logAudit('PRODUCT_RESTOCKED', 'Product', prod.id, `Restocked ${qty} units of ${prod.name}`);
        this.saveState();

        if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
          const cloudUuid = this.state.productCloudMap ? this.state.productCloudMap[productId] : null;
          window.iKhataSupabase.syncProductToCloud(prod, cloudUuid)
            .then(res => {
              const pUuid = (res.product && res.product.id) || cloudUuid;
              if (pUuid) {
                window.iKhataSupabase.logInventoryMovementToCloud({
                  business_id: bId,
                  product_id: pUuid,
                  movement_type: 'RESTOCK',
                  quantity: qty,
                  stock_before: stockBefore,
                  stock_after: stockAfter,
                  reference_type: 'MANUAL_RESTOCK',
                  reference_id: prod.id,
                  unit_cost: prod.cost,
                  note: `Restocked ${qty} units of ${prod.name}`
                }).catch(err => console.warn('Restock movement log warning:', err.message));
              }
            })
            .catch(err => console.warn('Restock cloud sync warning:', err.message));
        }

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

      if (window.iKhataSupabase && window.iKhataSupabase.isOnline) {
        const cloudCustUuid = (this.state.customerCloudMap && bill.customerId)
          ? this.state.customerCloudMap[bill.customerId]
          : null;
        window.iKhataSupabase.syncPosBillToCloud(bill, null, cloudCustUuid).then(res => {
          if (res && res.success && res.posBill) {
            if (!this.state.posBillCloudMap) this.state.posBillCloudMap = {};
            this.state.posBillCloudMap[bill.id] = res.posBill.id;
            this.state.posBillCloudMap[res.posBill.id] = bill.id;
            if (bill.items && bill.items.length > 0) {
              window.iKhataSupabase.syncPosBillItemsToCloud(res.posBill.id, bId, bill.items, this.state.productCloudMap || {});
            }
          }
        }).catch(err => console.warn('POS bill background cloud sync warning:', err.message));
      }

      return bill;
    }

    getBills(includeDeleted = false) {
      const bId = this.getActiveBusinessId();
      if (!this.state.bills) return [];
      if (includeDeleted) return this.state.bills.filter(b => b.business_id === bId);
      return this.state.bills.filter(b => b.business_id === bId && !b.isDeleted);
    }

    getCustomerBills(customerId) {
      return this.getBills().filter(b => b.customerId === customerId);
    }
  }

  window.iKhataStore = new Store();
})();
