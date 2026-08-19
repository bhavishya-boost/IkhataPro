/* iKhataPro Supabase Client Wrapper — Phase 10 Stage 1 */
/* Public Client Configuration & Safe Offline Fallback Wrapper */

(function (global) {
  // Public Client Credentials (Safe for Browser Context)
  const SUPABASE_URL = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_URL)
    ? process.env.SUPABASE_URL
    : 'https://szloarrfsqdqfygsogpt.supabase.co';

  const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_ANON_KEY)
    ? process.env.SUPABASE_ANON_KEY
    : 'sb_publishable_hnpappQ8ReNiUtKuiBx7tg_kkSgG24H';

  class SupabaseClientWrapper {
    constructor() {
      this.client = null;
      this.isOnline = false;
      this.initError = null;
      this.init();
    }

    init() {
      try {
        let supabaseLib = null;

        if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
          supabaseLib = window.supabase;
        } else if (typeof require === 'function') {
          try {
            supabaseLib = require('@supabase/supabase-js');
          } catch (e) {
            // Fallback if require not available in browser
          }
        }

        if (supabaseLib && typeof supabaseLib.createClient === 'function') {
          this.client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          });
          this.isOnline = true;
          console.log('⚡ [iKhataPro] Supabase client initialized successfully.');
        } else {
          this.initError = 'Supabase SDK library not found in global runtime environment.';
          console.warn('⚠️ [iKhataPro] Supabase SDK missing — Operating in local fallback mode.');
        }
      } catch (err) {
        this.initError = err.message;
        this.isOnline = false;
        console.warn('⚠️ [iKhataPro] Supabase client init warning (offline mode active):', err.message);
      }
    }

    // 1. Connection Check Utility (Development & Health Safe)
    async testConnection() {
      if (!this.client) {
        return {
          success: false,
          isOnline: false,
          message: 'Supabase client is not initialized (Operating in Local Storage Mode)',
          details: this.initError || 'Library unavailable'
        };
      }

      try {
        // Query businesses table count to verify database connection
        const { data, error, status } = await this.client
          .from('businesses')
          .select('id', { count: 'exact', head: true });

        if (error && error.code !== 'PGRST116') {
          // Even if RLS returns 0 rows or custom error, reaching PostgREST proves DB connectivity!
          return {
            success: true,
            isOnline: true,
            status,
            message: 'Connected to Supabase project & PostgreSQL engine ✅',
            engineStatus: 'PostgreSQL engine reachable'
          };
        }

        return {
          success: true,
          isOnline: true,
          status: status || 200,
          message: 'Connected to Supabase project & PostgreSQL engine ✅'
        };
      } catch (err) {
        return {
          success: false,
          isOnline: false,
          message: 'Network / Supabase connection attempt failed.',
          error: err.message
        };
      }
    }

    // 2. Authenticated Session & User Lookup
    async getSession() {
      if (!this.client) return { session: null, error: 'Offline mode' };
      try {
        const { data, error } = await this.client.auth.getSession();
        if (error) return { session: null, error: this.normalizeError(error) };
        return { session: data.session, error: null };
      } catch (err) {
        return { session: null, error: this.normalizeError(err) };
      }
    }

    async getCurrentUser() {
      if (!this.client) return { user: null, error: 'Offline mode' };
      try {
        const { data, error } = await this.client.auth.getUser();
        if (error) return { user: null, error: this.normalizeError(error) };
        return { user: data.user, error: null };
      } catch (err) {
        return { user: null, error: this.normalizeError(err) };
      }
    }

    // 3. Supabase Auth Core Utilities (signUp, signIn, signOut, state listener)
    async signUp({ email, password, fullName }) {
      if (!this.client) return { success: false, error: 'Supabase client is offline.' };
      try {
        const { data, error } = await this.client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'Shop Owner'
            }
          }
        });
        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, user: data.user, session: data.session };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async signIn({ email, password }) {
      if (!this.client) return { success: false, error: 'Supabase client is offline.' };
      try {
        const { data, error } = await this.client.auth.signInWithPassword({
          email,
          password
        });
        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, user: data.user, session: data.session };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async signOut() {
      if (!this.client) return { success: true };
      try {
        const { error } = await this.client.auth.signOut();
        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    onAuthStateChange(callback) {
      if (!this.client) return { unsubscribe: () => {} };
      try {
        const { data } = this.client.auth.onAuthStateChange((event, session) => {
          if (typeof callback === 'function') {
            callback(event, session);
          }
        });
        return data.subscription || { unsubscribe: () => {} };
      } catch (err) {
        console.warn('Failed to subscribe to auth state changes:', err.message);
        return { unsubscribe: () => {} };
      }
    }

    // 4. User Profile Resolution (auth.users -> profiles)
    async getUserProfile(userId) {
      if (!this.client || !userId) return { profile: null, error: 'Client offline or missing userId' };
      try {
        const { data, error } = await this.client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          return { profile: null, error: this.normalizeError(error) };
        }
        return { profile: data || null, error: null };
      } catch (err) {
        return { profile: null, error: this.normalizeError(err) };
      }
    }

    // 5. User -> Authorized Businesses Resolution (multi-business support)
    async getUserAuthorizedBusinesses(userId) {
      if (!this.client || !userId) return { userId, businesses: [], error: 'Client offline or missing userId' };
      try {
        const { data, error } = await this.client
          .from('business_members')
          .select('role, is_active, business_id, businesses(*)')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (error) {
          return { userId, businesses: [], error: this.normalizeError(error) };
        }

        const authorizedBusinesses = (data || []).map(m => ({
          businessId: m.business_id,
          businessName: m.businesses ? m.businesses.name : 'Unknown Shop',
          slug: m.businesses ? m.businesses.slug : '',
          role: m.role || 'CASHIER',
          isActive: m.is_active,
          rawBusiness: m.businesses
        }));

        return {
          userId,
          businesses: authorizedBusinesses,
          error: null
        };
      } catch (err) {
        return { userId, businesses: [], error: this.normalizeError(err) };
      }
    }

    // 6. Business Membership Resolution (auth.uid -> business_members -> businesses)
    async getUserBusinessMemberships(userId) {
      if (!this.client || !userId) return { memberships: [], error: 'Client offline or missing userId' };
      try {
        const { data, error } = await this.client
          .from('business_members')
          .select('*, businesses(*)')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (error) {
          return { memberships: [], error: this.normalizeError(error) };
        }
        return { memberships: data || [], error: null };
      } catch (err) {
        return { memberships: [], error: this.normalizeError(err) };
      }
    }

    // 7. Customer Entity Cloud Sync Methods (Stage 4)
    async syncCustomerToCloud(customerPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const payload = {
          name: customerPayload.name,
          phone: customerPayload.phone || null,
          email: customerPayload.email || null,
          city: customerPayload.city || null,
          address: customerPayload.address || null,
          notes: customerPayload.notes || null,
          balance: Math.round((parseFloat(customerPayload.balance) || 0) * 100) / 100,
          category: customerPayload.category || 'Regular',
          score: parseInt(customerPayload.score) || 85,
          is_bad_debt: Boolean(customerPayload.isBadDebt),
          ptp_date: customerPayload.ptpDate || null,
          ptp_amount: customerPayload.ptpAmount ? parseFloat(customerPayload.ptpAmount) : null,
          ptp_note: customerPayload.ptpNote || null,
          last_transaction_date: customerPayload.lastTransactionDate || null,
          days_since_last_activity: customerPayload.daysSinceLastActivity ? parseInt(customerPayload.daysSinceLastActivity) : null,
          last_active: customerPayload.lastActive || null,
          total_purchase_vol: Math.round((parseFloat(customerPayload.totalPurchaseVol) || 0) * 100) / 100,
          payment_behavior_pct: parseInt(customerPayload.paymentBehaviorPct) || 100,
          is_deleted: Boolean(customerPayload.isDeleted),
          deleted_at: customerPayload.deletedAt || null,
          deleted_by: customerPayload.deletedBy || null
        };

        if (customerPayload.business_id) {
          payload.business_id = customerPayload.business_id;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          // Perform update
          response = await this.client
            .from('customers')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          // Perform insert
          response = await this.client
            .from('customers')
            .insert(payload)
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, customer: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchCustomersFromCloud(businessId) {
      if (!this.client || !businessId) return { customers: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('customers')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) return { customers: [], error: this.normalizeError(error) };
        return { customers: data || [], error: null };
      } catch (err) {
        return { customers: [], error: this.normalizeError(err) };
      }
    }

    // 8. Product & Inventory Movement Cloud Sync Methods (Stage 5)
    async syncProductToCloud(productPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const payload = {
          name: productPayload.name,
          description: productPayload.description || null,
          category: productPayload.category || 'General',
          sku: productPayload.sku || null,
          barcode: productPayload.barcode || null,
          hsn_code: productPayload.hsnCode || productPayload.hsn_code || null,
          price: Math.round((parseFloat(productPayload.price) || 0) * 100) / 100,
          cost: Math.round((parseFloat(productPayload.cost) || 0) * 100) / 100,
          stock: parseInt(productPayload.stock) || 0,
          min_stock: parseInt(productPayload.minStock || productPayload.min_stock) || 5,
          unit: productPayload.unit || 'Pcs',
          is_online_visible: productPayload.isOnlineVisible !== undefined ? Boolean(productPayload.isOnlineVisible) : true,
          image_url: productPayload.imageUrl || productPayload.image_url || null,
          gst_rate: parseFloat(productPayload.gstRate || productPayload.gst_rate) || 18,
          is_deleted: Boolean(productPayload.isDeleted),
          deleted_at: productPayload.deletedAt || null,
          deleted_by: productPayload.deletedBy || null
        };

        if (productPayload.business_id) {
          payload.business_id = productPayload.business_id;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('products')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          response = await this.client
            .from('products')
            .insert(payload)
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, product: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchProductsFromCloud(businessId) {
      if (!this.client || !businessId) return { products: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('products')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) return { products: [], error: this.normalizeError(error) };
        return { products: data || [], error: null };
      } catch (err) {
        return { products: [], error: this.normalizeError(err) };
      }
    }

    async logInventoryMovementToCloud(movementPayload) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const validTypes = ['SALE', 'PURCHASE', 'RESTOCK', 'RETURN', 'ADJUSTMENT'];
        const mType = (movementPayload.movementType || movementPayload.movement_type || 'ADJUSTMENT').toUpperCase();

        const payload = {
          business_id: movementPayload.business_id,
          product_id: movementPayload.product_id,
          movement_type: validTypes.includes(mType) ? mType : 'ADJUSTMENT',
          quantity: parseInt(movementPayload.quantity) || 0,
          stock_before: parseInt(movementPayload.stock_before || movementPayload.stockBefore) || 0,
          stock_after: parseInt(movementPayload.stock_after || movementPayload.stockAfter) || 0,
          reference_type: movementPayload.reference_type || movementPayload.referenceType || null,
          reference_id: movementPayload.reference_id || movementPayload.referenceId || null,
          unit_cost: Math.round((parseFloat(movementPayload.unit_cost || movementPayload.unitCost) || 0) * 100) / 100,
          note: movementPayload.note || null
        };

        const { data, error } = await this.client
          .from('inventory_movements')
          .insert(payload)
          .select()
          .single();

        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, movement: data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    // 9. Transaction / Khata Entity Cloud Sync Methods (Stage 6)
    async syncTransactionToCloud(txPayload, cloudUuid = null, mappedCustomerId = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const typeStr = (txPayload.type || 'GAVE').toUpperCase();
        const validTypes = ['GAVE', 'GOT'];
        const numAmount = Math.round((parseFloat(txPayload.amount) || 0) * 100) / 100;

        if (numAmount <= 0) {
          return { success: false, error: { message: 'Invalid transaction amount: must be > 0' } };
        }

        const payload = {
          customer_name: txPayload.customerName || 'Customer',
          type: validTypes.includes(typeStr) ? typeStr : 'GAVE',
          amount: numAmount,
          date: txPayload.date || new Date().toISOString().split('T')[0],
          time_str: txPayload.time || txPayload.time_str || null,
          mode: txPayload.mode || null,
          note: txPayload.note || null,
          idempotency_key: txPayload.idempotency_key || txPayload.txToken || txPayload.id,
          source_bill_id: txPayload.source_bill_id || txPayload.sourceBillId || null,
          source_invoice_id: txPayload.source_invoice_id || txPayload.sourceInvoiceId || null,
          is_deleted: Boolean(txPayload.isDeleted),
          deleted_at: txPayload.deletedAt || null,
          deleted_by: txPayload.deletedBy || null
        };

        if (txPayload.business_id) {
          payload.business_id = txPayload.business_id;
        }

        if (mappedCustomerId) {
          payload.customer_id = mappedCustomerId;
        } else if (txPayload.customerId && txPayload.customerId.length === 36 && txPayload.customerId.includes('-')) {
          payload.customer_id = txPayload.customerId;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('transactions')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          // Idempotent upsert based on idempotency_key
          response = await this.client
            .from('transactions')
            .upsert(payload, { onConflict: 'idempotency_key' })
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, transaction: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchTransactionsFromCloud(businessId) {
      if (!this.client || !businessId) return { transactions: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('transactions')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: false });

        if (error) return { transactions: [], error: this.normalizeError(error) };
        return { transactions: data || [], error: null };
      } catch (err) {
        return { transactions: [], error: this.normalizeError(err) };
      }
    }

    // 10. Supplier & Purchase Cloud Sync Methods (Stage 7)
    async syncSupplierToCloud(supplierPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const payload = {
          name: supplierPayload.name,
          business_name: supplierPayload.businessName || supplierPayload.business_name || null,
          phone: supplierPayload.phone || null,
          email: supplierPayload.email || null,
          address: supplierPayload.address || null,
          gstin: supplierPayload.gstin || null,
          pan: supplierPayload.pan || null,
          category: supplierPayload.category || 'General Supplier',
          balance: Math.round((parseFloat(supplierPayload.balance) || 0) * 100) / 100,
          total_purchases: Math.round((parseFloat(supplierPayload.totalPurchases) || 0) * 100) / 100,
          total_payments: Math.round((parseFloat(supplierPayload.totalPayments) || 0) * 100) / 100,
          last_transaction: supplierPayload.lastTransaction || null,
          is_active: supplierPayload.active !== undefined ? Boolean(supplierPayload.active) : true,
          notes: supplierPayload.notes || null,
          is_deleted: Boolean(supplierPayload.isDeleted),
          deleted_at: supplierPayload.deletedAt || null,
          deleted_by: supplierPayload.deletedBy || null
        };

        if (supplierPayload.business_id) {
          payload.business_id = supplierPayload.business_id;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('suppliers')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          response = await this.client
            .from('suppliers')
            .insert(payload)
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, supplier: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchSuppliersFromCloud(businessId) {
      if (!this.client || !businessId) return { suppliers: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('suppliers')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) return { suppliers: [], error: this.normalizeError(error) };
        return { suppliers: data || [], error: null };
      } catch (err) {
        return { suppliers: [], error: this.normalizeError(err) };
      }
    }

    async syncPurchaseToCloud(purchasePayload, cloudUuid = null, mappedSupplierId = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const payload = {
          supplier_name: purchasePayload.supplierName || 'Supplier',
          po_number: purchasePayload.id || purchasePayload.po_number || 'PO-' + Date.now(),
          date: purchasePayload.date || new Date().toISOString().split('T')[0],
          subtotal: Math.round((parseFloat(purchasePayload.subtotal) || 0) * 100) / 100,
          tax_rate: parseFloat(purchasePayload.taxRate || purchasePayload.tax_rate) || 18,
          tax_amount: Math.round((parseFloat(purchasePayload.taxAmt || purchasePayload.tax_amount) || 0) * 100) / 100,
          grand_total: Math.round((parseFloat(purchasePayload.grandTotal || purchasePayload.grand_total) || 0) * 100) / 100,
          paid_amount: Math.round((parseFloat(purchasePayload.paidAmount || purchasePayload.paid_amount) || 0) * 100) / 100,
          status: (purchasePayload.status || 'UNPAID').toUpperCase(),
          is_return: Boolean(purchasePayload.isReturn),
          note: purchasePayload.note || null,
          is_deleted: Boolean(purchasePayload.isDeleted),
          deleted_at: purchasePayload.deletedAt || null,
          deleted_by: purchasePayload.deletedBy || null
        };

        if (purchasePayload.business_id) {
          payload.business_id = purchasePayload.business_id;
        }

        if (mappedSupplierId) {
          payload.supplier_id = mappedSupplierId;
        } else if (purchasePayload.supplierId && purchasePayload.supplierId.length === 36 && purchasePayload.supplierId.includes('-')) {
          payload.supplier_id = purchasePayload.supplierId;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('purchases')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          response = await this.client
            .from('purchases')
            .insert(payload)
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, purchase: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async syncPurchaseItemsToCloud(purchaseUuid, businessId, itemsPayload, productCloudMap = {}) {
      if (!this.client || !purchaseUuid || !Array.isArray(itemsPayload)) {
        return { success: false, error: 'Offline mode or invalid params' };
      }
      try {
        const rows = itemsPayload.map(item => {
          const prodUuid = productCloudMap[item.productId] || (item.productId && item.productId.length === 36 ? item.productId : null);
          return {
            business_id: businessId,
            purchase_id: purchaseUuid,
            product_id: prodUuid,
            product_name: item.name || 'Product',
            quantity: parseInt(item.qty) || 1,
            unit_cost: Math.round((parseFloat(item.cost) || 0) * 100) / 100,
            line_total: Math.round((parseFloat(item.total) || (item.qty * item.cost) || 0) * 100) / 100
          };
        });

        const { data, error } = await this.client
          .from('purchase_items')
          .insert(rows)
          .select();

        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, items: data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchPurchasesFromCloud(businessId) {
      if (!this.client || !businessId) return { purchases: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('purchases')
          .select('*, purchase_items(*)')
          .eq('business_id', businessId)
          .order('date', { ascending: false });

        if (error) return { purchases: [], error: this.normalizeError(error) };
        return { purchases: data || [], error: null };
      } catch (err) {
        return { purchases: [], error: this.normalizeError(err) };
      }
    }

    async syncSupplierTransactionToCloud(stPayload, cloudUuid = null, mappedSupplierId = null, mappedPurchaseId = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const typeStr = (stPayload.type || 'PURCHASE').toUpperCase();
        const validTypes = ['PURCHASE', 'PAYMENT'];
        const numAmount = Math.round((parseFloat(stPayload.amount) || 0) * 100) / 100;

        if (numAmount <= 0) {
          return { success: false, error: { message: 'Invalid amount: must be > 0' } };
        }

        const payload = {
          supplier_name: stPayload.supplierName || 'Supplier',
          type: validTypes.includes(typeStr) ? typeStr : 'PURCHASE',
          amount: numAmount,
          date: stPayload.date || new Date().toISOString().split('T')[0],
          ref_no: stPayload.refNo || stPayload.ref_no || null,
          note: stPayload.note || null,
          is_deleted: Boolean(stPayload.isDeleted),
          deleted_at: stPayload.deletedAt || null,
          deleted_by: stPayload.deletedBy || null
        };

        if (stPayload.business_id) {
          payload.business_id = stPayload.business_id;
        }

        if (mappedSupplierId) {
          payload.supplier_id = mappedSupplierId;
        } else if (stPayload.supplierId && stPayload.supplierId.length === 36 && stPayload.supplierId.includes('-')) {
          payload.supplier_id = stPayload.supplierId;
        }

        if (mappedPurchaseId) {
          payload.purchase_id = mappedPurchaseId;
        } else if (stPayload.purchaseId && stPayload.purchaseId.length === 36 && stPayload.purchaseId.includes('-')) {
          payload.purchase_id = stPayload.purchaseId;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('supplier_transactions')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          response = await this.client
            .from('supplier_transactions')
            .insert(payload)
            .select()
            .single();
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, supplierTransaction: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchSupplierTransactionsFromCloud(businessId) {
      if (!this.client || !businessId) return { supplierTransactions: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('supplier_transactions')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: false });
        if (error) return { supplierTransactions: [], error: this.normalizeError(error) };
        return { supplierTransactions: data || [], error: null };
      } catch (err) {
        return { supplierTransactions: [], error: this.normalizeError(err) };
      }
    }

    // Stage 8: Invoices & Invoice Items

    async syncInvoiceToCloud(invPayload, cloudUuid, mappedCustomerId) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      try {
        const payload = {
          invoice_number:  invPayload.id || invPayload.invoice_number || invPayload.invoiceNumber,
          customer_name:   invPayload.customerName || 'Customer',
          customer_phone:  invPayload.customerPhone || null,
          customer_gstin:  invPayload.customerGSTIN || null,
          billing_address: invPayload.billingAddress || null,
          date:            invPayload.date || new Date().toISOString().split('T')[0],
          due_date:        invPayload.dueDate || null,
          status:          invPayload.status || 'Pending',
          tax_type:        invPayload.taxType || 'INTRA',
          subtotal:        Math.round((invPayload.subtotal || 0) * 100) / 100,
          discount_total:  Math.round((invPayload.discountTotal || 0) * 100) / 100,
          taxable_total:   Math.round((invPayload.taxableTotal || 0) * 100) / 100,
          cgst_total:      Math.round((invPayload.cgstTotal || 0) * 100) / 100,
          sgst_total:      Math.round((invPayload.sgstTotal || 0) * 100) / 100,
          igst_total:      Math.round((invPayload.igstTotal || 0) * 100) / 100,
          tax_total:       Math.round((invPayload.taxTotal || 0) * 100) / 100,
          round_off:       Math.round((invPayload.roundOff || 0) * 100) / 100,
          total:           Math.round((invPayload.total || 0) * 100) / 100,
          note:            invPayload.note || null,
          is_credit:       invPayload.isCredit || false,
          is_deleted:      invPayload.isDeleted || false,
          deleted_at:      invPayload.deletedAt || null,
          deleted_by:      invPayload.deletedBy || null
        };

        if (invPayload.business_id) payload.business_id = invPayload.business_id;

        if (mappedCustomerId && mappedCustomerId.length === 36 && mappedCustomerId.includes('-')) {
          payload.customer_id = mappedCustomerId;
        } else if (invPayload.customerId && invPayload.customerId.length === 36 && invPayload.customerId.includes('-')) {
          payload.customer_id = invPayload.customerId;
        } else {
          payload.customer_id = null;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client.from('invoices').update(payload).eq('id', cloudUuid).select().single();
        } else {
          response = await this.client.from('invoices').insert(payload).select().single();
        }

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, invoice: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async syncInvoiceItemsToCloud(cloudInvoiceId, businessId, items, productCloudMap) {
      if (!this.client || !cloudInvoiceId) return { success: false, error: 'Offline or missing invoice UUID' };
      try {
        const { error: delError } = await this.client.from('invoice_items').delete().eq('invoice_id', cloudInvoiceId);
        if (delError && delError.code !== 'PGRST116') {
          console.warn('[Stage8] Invoice items delete warning:', delError.message);
        }
        if (!items || items.length === 0) return { success: true, items: [] };

        const rows = items.map((item, idx) => {
          const row = {
            business_id:  businessId,
            invoice_id:   cloudInvoiceId,
            item_name:    item.name || 'Item',
            hsn_code:     item.hsn || null,
            unit:         item.unit || 'Pcs',
            quantity:     Math.max(0, parseFloat(item.qty) || 1),
            rate:         Math.round((parseFloat(item.rate) || 0) * 100) / 100,
            discount:     Math.round((parseFloat(item.discount) || 0) * 100) / 100,
            taxable_val:  Math.round((parseFloat(item.taxableVal) || 0) * 100) / 100,
            tax_rate:     Math.round((parseFloat(item.taxRate) || 18) * 100) / 100,
            cgst:         Math.round((parseFloat(item.cgst) || 0) * 100) / 100,
            sgst:         Math.round((parseFloat(item.sgst) || 0) * 100) / 100,
            igst:         Math.round((parseFloat(item.igst) || 0) * 100) / 100,
            total:        Math.round((parseFloat(item.total) || 0) * 100) / 100,
            sort_order:   idx
          };
          if (item.productId && productCloudMap && productCloudMap[item.productId]) {
            row.product_id = productCloudMap[item.productId];
          } else if (item.productId && item.productId.length === 36 && item.productId.includes('-')) {
            row.product_id = item.productId;
          }
          return row;
        });

        const { data, error } = await this.client.from('invoice_items').insert(rows).select();
        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, items: data || [] };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchInvoicesFromCloud(businessId) {
      if (!this.client || !businessId) return { invoices: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('invoices')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: false });
        if (error) return { invoices: [], error: this.normalizeError(error) };
        return { invoices: data || [], error: null };
      } catch (err) {
        return { invoices: [], error: this.normalizeError(err) };
      }
    }
    // 10. Safe Database Request Handling Utility
    async request(table, queryFn = null) {
      if (!this.client) {
        return { data: null, error: { message: 'Supabase client offline — using local store fallback' } };
      }

      try {
        let builder = this.client.from(table);
        if (queryFn && typeof queryFn === 'function') {
          builder = queryFn(builder);
        }
        const response = await builder;
        if (response.error) {
          return { data: null, error: this.normalizeError(response.error) };
        }
        return { data: response.data, error: null, count: response.count };
      } catch (err) {
        return { data: null, error: this.normalizeError(err) };
      }
    }

    // 8. Error Normalization Helper
    normalizeError(err) {
      if (!err) return null;
      return {
        message: err.message || 'An unexpected database error occurred',
        code: err.code || 'UNKNOWN_ERROR',
        details: err.details || null,
        hint: err.hint || null
      };
    }
  }

  const instance = new SupabaseClientWrapper();

  if (typeof window !== 'undefined') {
    window.iKhataSupabase = instance;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  }
})(typeof window !== 'undefined' ? window : global);
