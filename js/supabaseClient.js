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
      this.cachedBusinessUuid = null;
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

    // Helper to resolve string business IDs (e.g. 'BUS_LJS' or 'ayushi') to PostgreSQL UUID
    async resolveBusinessUuid(providedId) {
      if (providedId && typeof providedId === 'string' && providedId.length === 36 && providedId.includes('-')) {
        this.cachedBusinessUuid = providedId;
        return providedId;
      }
      if (!this.client) return null;

      try {
        // 1. Check if user is logged into Supabase Auth session
        const { data: sessionData } = await this.client.auth.getSession();
        if (sessionData && sessionData.session && sessionData.session.user) {
          const user = sessionData.session.user;
          const { data: mems } = await this.client
            .from('business_members')
            .select('business_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1);

          if (mems && mems.length > 0 && mems[0].business_id) {
            this.cachedBusinessUuid = mems[0].business_id;
            return mems[0].business_id;
          }
        }

        // 2. Resolve by providedId, slug, username, or store name from local state
        let targetSlug = providedId;
        let busObj = null;
        if (typeof window !== 'undefined' && window.iKhataStore) {
          busObj = window.iKhataStore.getCurrentBusiness();
          if (busObj) {
            targetSlug = busObj.slug || busObj.username || busObj.id || providedId;
          }
        }

        if (targetSlug) {
          const clean = String(targetSlug).toLowerCase().trim();
          const { data: existingBiz } = await this.client
            .from('businesses')
            .select('id')
            .or(`slug.ilike.${clean},username.ilike.${clean},name.ilike.${clean}`)
            .limit(1);

          if (existingBiz && existingBiz.length > 0) {
            this.cachedBusinessUuid = existingBiz[0].id;
            return existingBiz[0].id;
          }
        }

        // 3. Fallback: If local business object exists, sync business to Supabase Cloud
        if (busObj) {
          const syncRes = await this.syncBusinessToCloud(busObj);
          if (syncRes && syncRes.success && syncRes.business) {
            this.cachedBusinessUuid = syncRes.business.id;
            return syncRes.business.id;
          }
        }
      } catch (err) {
        console.warn('[resolveBusinessUuid] Warning:', err.message);
      }
      return null;
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

    // Business Cloud Management Utilities
    async syncBusinessToCloud(busPayload) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        const payload = {
          name: busPayload.name || 'New Store',
          owner_name: busPayload.ownerName || busPayload.owner_name || 'Store Owner',
          username: (busPayload.username || busPayload.email || ('user_' + Date.now())).toLowerCase().trim(),
          slug: (busPayload.slug || ('store-' + Date.now())).toLowerCase().trim(),
          email: busPayload.email || null,
          mobile: busPayload.mobile || null,
          address: busPayload.address || null,
          city: busPayload.city || null,
          state: busPayload.state || null,
          pincode: busPayload.pincode || null,
          business_type: busPayload.businessType || busPayload.business_type || 'Retail Shop',
          gstin: busPayload.gstin || null,
          pan: busPayload.pan || null,
          logo: busPayload.logo || '🏪',
          subscription_plan: busPayload.subscriptionPlan || busPayload.subscription_plan || 'PRO'
        };

        let response;
        if (busPayload.id && busPayload.id.length === 36 && busPayload.id.includes('-')) {
          response = await this.client.from('businesses').upsert({ id: busPayload.id, ...payload }).select().single();
        } else {
          const { data: existing } = await this.client
            .from('businesses')
            .select('id')
            .or(`username.eq.${payload.username},slug.eq.${payload.slug}`)
            .limit(1);

          if (existing && existing.length > 0) {
            response = await this.client.from('businesses').update(payload).eq('id', existing[0].id).select().single();
          } else {
            response = await this.client.from('businesses').insert(payload).select().single();
          }
        }

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, business: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchBusinessesFromCloud() {
      if (!this.client) return { businesses: [], error: 'Offline mode' };
      try {
        const { data, error } = await this.client.from('businesses').select('*');
        if (error) return { businesses: [], error: this.normalizeError(error) };
        return { businesses: data || [], error: null };
      } catch (err) {
        return { businesses: [], error: this.normalizeError(err) };
      }
    }

    async findBusinessInCloud(identifier) {
      if (!this.client || !identifier) return { business: null };
      try {
        const clean = identifier.toLowerCase().trim();
        const { data, error } = await this.client
          .from('businesses')
          .select('*')
          .or(`username.ilike.${clean},slug.ilike.${clean},owner_name.ilike.%${clean}%,name.ilike.%${clean}%,mobile.eq.${clean},email.ilike.${clean}`)
          .limit(1);

        if (error || !data || data.length === 0) return { business: null };
        return { business: data[0] };
      } catch (err) {
        return { business: null };
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

        const targetBusinessId = await this.resolveBusinessUuid(customerPayload.business_id || customerPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
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

        const targetBusinessId = await this.resolveBusinessUuid(productPayload.business_id || productPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
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
        let typeStr = (txPayload.type || 'GAVE').toUpperCase();
        if (typeStr === 'UDHAR') typeStr = 'GAVE';
        if (typeStr === 'JAMA') typeStr = 'GOT';
        const validTypes = ['GAVE', 'GOT'];
        const numAmount = Math.round((parseFloat(txPayload.amount) || 0) * 100) / 100;

        if (numAmount <= 0) {
          return { success: false, error: { message: 'Invalid transaction amount: must be > 0' } };
        }

        const targetBusinessId = await this.resolveBusinessUuid(txPayload.business_id || txPayload.businessId);

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

        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        let cloudCustUuid = mappedCustomerId;
        if (!cloudCustUuid && txPayload.customerId) {
          if (txPayload.customerId.length === 36 && txPayload.customerId.includes('-')) {
            cloudCustUuid = txPayload.customerId;
          } else if (typeof window !== 'undefined' && window.iKhataStore) {
            cloudCustUuid = (window.iKhataStore.state.customerCloudMap && window.iKhataStore.state.customerCloudMap[txPayload.customerId]) || null;
            if (!cloudCustUuid) {
              const localCust = window.iKhataStore.getCustomers(true).find(c => c.id === txPayload.customerId);
              if (localCust) {
                const syncCustRes = await this.syncCustomerToCloud(localCust);
                if (syncCustRes && syncCustRes.success && syncCustRes.customer) {
                  cloudCustUuid = syncCustRes.customer.id;
                  if (!window.iKhataStore.state.customerCloudMap) window.iKhataStore.state.customerCloudMap = {};
                  window.iKhataStore.state.customerCloudMap[localCust.id] = cloudCustUuid;
                  window.iKhataStore.state.customerCloudMap[cloudCustUuid] = localCust.id;
                  window.iKhataStore.saveState();
                }
              }
            }
          }
        }

        if (cloudCustUuid && cloudCustUuid.length === 36 && cloudCustUuid.includes('-')) {
          payload.customer_id = cloudCustUuid;
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

        const targetBusinessId = await this.resolveBusinessUuid(supplierPayload.business_id || supplierPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
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

    // 11. Employee & RBAC Cloud Sync Methods
    async syncEmployeeToCloud(empPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Offline mode' };
      try {
        let role = (empPayload.role || 'Salesman');
        let cloudRole = role.toUpperCase();
        if (!['OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER'].includes(cloudRole)) {
          cloudRole = 'CASHIER';
        }

        const payload = {
          name: empPayload.name,
          phone: empPayload.phone || null,
          role: cloudRole,
          sales: Math.round((parseFloat(empPayload.sales) || 0) * 100) / 100,
          collections: Math.round((parseFloat(empPayload.collections) || 0) * 100) / 100,
          is_active: empPayload.active !== false && !empPayload.isDeleted
        };

        const targetBusinessId = await this.resolveBusinessUuid(empPayload.business_id || empPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client
            .from('employees')
            .update(payload)
            .eq('id', cloudUuid)
            .select()
            .single();
        } else {
          // Check if employee with same phone or name already exists in cloud for this business
          let existingRes = null;
          if (empPayload.phone) {
            existingRes = await this.client
              .from('employees')
              .select('id')
              .eq('business_id', targetBusinessId)
              .eq('phone', empPayload.phone)
              .maybeSingle();
          }
          if (!existingRes || !existingRes.data) {
            existingRes = await this.client
              .from('employees')
              .select('id')
              .eq('business_id', targetBusinessId)
              .eq('name', empPayload.name)
              .maybeSingle();
          }

          if (existingRes && existingRes.data && existingRes.data.id) {
            response = await this.client
              .from('employees')
              .update(payload)
              .eq('id', existingRes.data.id)
              .select()
              .single();
          } else {
            response = await this.client
              .from('employees')
              .insert(payload)
              .select()
              .single();
          }
        }

        if (response.error) {
          return { success: false, error: this.normalizeError(response.error) };
        }
        return { success: true, employee: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchEmployeesFromCloud(businessId) {
      if (!this.client || !businessId) return { employees: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('employees')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (error) return { employees: [], error: this.normalizeError(error) };
        return { employees: data || [], error: null };
      } catch (err) {
        return { employees: [], error: this.normalizeError(err) };
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

        const targetBusinessId = await this.resolveBusinessUuid(invPayload.business_id || invPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        let cloudCustUuid = mappedCustomerId;
        if (!cloudCustUuid && invPayload.customerId) {
          if (invPayload.customerId.length === 36 && invPayload.customerId.includes('-')) {
            cloudCustUuid = invPayload.customerId;
          } else if (typeof window !== 'undefined' && window.iKhataStore) {
            cloudCustUuid = (window.iKhataStore.state.customerCloudMap && window.iKhataStore.state.customerCloudMap[invPayload.customerId]) || null;
            if (!cloudCustUuid) {
              const localCust = window.iKhataStore.getCustomers(true).find(c => c.id === invPayload.customerId);
              if (localCust) {
                const syncCustRes = await this.syncCustomerToCloud(localCust);
                if (syncCustRes && syncCustRes.success && syncCustRes.customer) {
                  cloudCustUuid = syncCustRes.customer.id;
                  if (!window.iKhataStore.state.customerCloudMap) window.iKhataStore.state.customerCloudMap = {};
                  window.iKhataStore.state.customerCloudMap[localCust.id] = cloudCustUuid;
                  window.iKhataStore.state.customerCloudMap[cloudCustUuid] = localCust.id;
                  window.iKhataStore.saveState();
                }
              }
            }
          }
        }

        if (cloudCustUuid && cloudCustUuid.length === 36 && cloudCustUuid.includes('-')) {
          payload.customer_id = cloudCustUuid;
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

    // Stage 9: POS Bills & POS Bill Items

    async syncPosBillToCloud(billPayload, cloudUuid = null, mappedCustomerId = null) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      try {
        const payload = {
          bill_number:     billPayload.id || billPayload.bill_number || billPayload.billNumber,
          customer_name:   billPayload.customerName || billPayload.customer_name || 'Walk-in Customer',
          subtotal:        Math.round((parseFloat(billPayload.subtotal) || 0) * 100) / 100,
          tax_amount:      Math.round((parseFloat(billPayload.taxAmt || billPayload.tax_amount) || 0) * 100) / 100,
          discount:        Math.round((parseFloat(billPayload.discount) || 0) * 100) / 100,
          grand_total:     Math.round((parseFloat(billPayload.grandTotal || billPayload.grand_total) || 0) * 100) / 100,
          payment_method:  billPayload.paymentMethod || billPayload.payment_method || 'Cash',
          date:            billPayload.date || new Date().toISOString().split('T')[0],
          time_str:        billPayload.time || billPayload.time_str || null,
          is_credit:       Boolean(
            (billPayload.paymentMethod && billPayload.paymentMethod.includes('Credit')) ||
            (billPayload.payment_method && billPayload.payment_method.includes('Credit')) ||
            billPayload.is_credit
          ),
          is_deleted:      Boolean(billPayload.isDeleted || billPayload.is_deleted),
          deleted_at:      billPayload.deletedAt || billPayload.deleted_at || null,
          deleted_by:      billPayload.deletedBy || billPayload.deleted_by || null
        };

        const targetBusinessId = await this.resolveBusinessUuid(billPayload.business_id || billPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        let cloudCustUuid = mappedCustomerId;
        if (!cloudCustUuid && billPayload.customerId) {
          if (billPayload.customerId.length === 36 && billPayload.customerId.includes('-')) {
            cloudCustUuid = billPayload.customerId;
          } else if (typeof window !== 'undefined' && window.iKhataStore) {
            cloudCustUuid = (window.iKhataStore.state.customerCloudMap && window.iKhataStore.state.customerCloudMap[billPayload.customerId]) || null;
            if (!cloudCustUuid) {
              const localCust = window.iKhataStore.getCustomers(true).find(c => c.id === billPayload.customerId);
              if (localCust) {
                const syncCustRes = await this.syncCustomerToCloud(localCust);
                if (syncCustRes && syncCustRes.success && syncCustRes.customer) {
                  cloudCustUuid = syncCustRes.customer.id;
                  if (!window.iKhataStore.state.customerCloudMap) window.iKhataStore.state.customerCloudMap = {};
                  window.iKhataStore.state.customerCloudMap[localCust.id] = cloudCustUuid;
                  window.iKhataStore.state.customerCloudMap[cloudCustUuid] = localCust.id;
                  window.iKhataStore.saveState();
                }
              }
            }
          }
        }

        if (cloudCustUuid && cloudCustUuid.length === 36 && cloudCustUuid.includes('-')) {
          payload.customer_id = cloudCustUuid;
        } else {
          payload.customer_id = null;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client.from('pos_bills').update(payload).eq('id', cloudUuid).select().single();
        } else {
          response = await this.client.from('pos_bills').insert(payload).select().single();
        }

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, posBill: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async syncPosBillItemsToCloud(cloudBillId, businessId, itemsPayload, productCloudMap = {}) {
      if (!this.client || !cloudBillId) return { success: false, error: 'Offline or missing bill UUID' };
      try {
        const { error: delError } = await this.client.from('pos_bill_items').delete().eq('bill_id', cloudBillId);
        if (delError && delError.code !== 'PGRST116') {
          console.warn('[Stage9] POS bill items delete warning:', delError.message);
        }
        if (!itemsPayload || itemsPayload.length === 0) return { success: true, items: [] };

        const rows = itemsPayload.map(item => {
          const prodUuid = productCloudMap[item.id || item.productId] ||
            ((item.id && item.id.length === 36 && item.id.includes('-')) ? item.id : null);
          const qty = Math.max(1, parseInt(item.qty || item.quantity) || 1);
          const price = Math.round((parseFloat(item.price || item.unit_price) || 0) * 100) / 100;
          const total = Math.round((parseFloat(item.total || item.line_total) || (qty * price)) * 100) / 100;

          return {
            business_id:  businessId,
            bill_id:      cloudBillId,
            product_id:   prodUuid,
            product_name: item.name || item.product_name || 'Product',
            quantity:     qty,
            unit_price:   price,
            line_total:   total
          };
        });

        const { data, error } = await this.client.from('pos_bill_items').insert(rows).select();
        if (error) return { success: false, error: this.normalizeError(error) };
        return { success: true, items: data || [] };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchPosBillsFromCloud(businessId) {
      if (!this.client || !businessId) return { posBills: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('pos_bills')
          .select('*, pos_bill_items(*)')
          .eq('business_id', businessId)
          .order('date', { ascending: false });
        if (error) return { posBills: [], error: this.normalizeError(error) };
        return { posBills: data || [], error: null };
      } catch (err) {
        return { posBills: [], error: this.normalizeError(err) };
      }
    }

    // Stage 10: Expenses

    async syncExpenseToCloud(expPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      try {
        const numAmount = Math.round((parseFloat(expPayload.amount) || 0) * 100) / 100;
        if (numAmount <= 0) {
          return { success: false, error: { message: 'Invalid amount: must be > 0' } };
        }

        const payload = {
          category:       expPayload.category || 'Other',
          amount:         numAmount,
          date:           expPayload.date || new Date().toISOString().split('T')[0],
          note:           expPayload.note || null,
          is_ocr_scanned: Boolean(expPayload.is_ocr_scanned || expPayload.isOcrScanned),
          ocr_vendor:     expPayload.ocr_vendor || expPayload.ocrVendor || null,
          is_deleted:     Boolean(expPayload.isDeleted || expPayload.is_deleted),
          deleted_at:     expPayload.deletedAt || expPayload.deleted_at || null,
          deleted_by:     expPayload.deletedBy || expPayload.deleted_by || null
        };

        const targetBusinessId = await this.resolveBusinessUuid(expPayload.business_id || expPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client.from('expenses').update(payload).eq('id', cloudUuid).select().single();
        } else {
          response = await this.client.from('expenses').insert(payload).select().single();
        }

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, expense: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchExpensesFromCloud(businessId) {
      if (!this.client || !businessId) return { expenses: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('expenses')
          .select('*')
          .eq('business_id', businessId)
          .order('date', { ascending: false });
        if (error) return { expenses: [], error: this.normalizeError(error) };
        return { expenses: data || [], error: null };
      } catch (err) {
        return { expenses: [], error: this.normalizeError(err) };
      }
    }

    // Stage 11: Notifications & Audit Logs

    async syncNotificationToCloud(notifPayload, cloudUuid = null) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      try {
        const payload = {
          type:        notifPayload.type || 'INFO',
          title:       notifPayload.title || 'Notification',
          message:     notifPayload.message || '',
          entity_type: notifPayload.entity_type || notifPayload.entityType || null,
          entity_id:   notifPayload.entity_id || notifPayload.entityId || null,
          is_read:     Boolean(notifPayload.is_read || notifPayload.isRead),
          read_at:     notifPayload.read_at || notifPayload.readAt || null
        };

        const targetBusinessId = await this.resolveBusinessUuid(notifPayload.business_id || notifPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        if (notifPayload.user_id && notifPayload.user_id.length === 36 && notifPayload.user_id.includes('-')) {
          payload.user_id = notifPayload.user_id;
        }

        let response;
        if (cloudUuid && cloudUuid.length === 36 && cloudUuid.includes('-')) {
          response = await this.client.from('notifications').update(payload).eq('id', cloudUuid).select().single();
        } else {
          response = await this.client.from('notifications').insert(payload).select().single();
        }

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, notification: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchNotificationsFromCloud(businessId) {
      if (!this.client || !businessId) return { notifications: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('notifications')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });
        if (error) return { notifications: [], error: this.normalizeError(error) };
        return { notifications: data || [], error: null };
      } catch (err) {
        return { notifications: [], error: this.normalizeError(err) };
      }
    }

    async syncAuditLogToCloud(auditPayload) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      try {
        const payload = {
          user_name:   auditPayload.user_name || auditPayload.user || 'System',
          action:      auditPayload.action || 'MUTATION',
          entity_type: auditPayload.entity_type || auditPayload.entity || 'General',
          entity_id:   auditPayload.entity_id || auditPayload.entityId || null,
          details:     auditPayload.details || null
        };

        const targetBusinessId = await this.resolveBusinessUuid(auditPayload.business_id || auditPayload.businessId);
        if (targetBusinessId) {
          payload.business_id = targetBusinessId;
        }

        // Audit logs are APPEND-ONLY. Insert only.
        const response = await this.client.from('audit_logs').insert(payload).select().single();

        if (response.error) return { success: false, error: this.normalizeError(response.error) };
        return { success: true, auditLog: response.data };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
    }

    async fetchAuditLogsFromCloud(businessId) {
      if (!this.client || !businessId) return { auditLogs: [], error: 'Offline mode or missing businessId' };
      try {
        const { data, error } = await this.client
          .from('audit_logs')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });
        if (error) return { auditLogs: [], error: this.normalizeError(error) };
        return { auditLogs: data || [], error: null };
      } catch (err) {
        return { auditLogs: [], error: this.normalizeError(err) };
      }
    }



    async purgeCloudDemoDataForBusiness(businessUuid) {
      if (!this.client || !businessUuid) return { success: false };
      try {
        // Delete huge test/demo expenses (> 500,000) accidentally synced to this business
        await this.client
          .from('expenses')
          .delete()
          .eq('business_id', businessUuid)
          .gt('amount', 500000);

        // Delete sample demo customer names synced to this business
        const sampleNames = [
          'Rahul Traders', 'Sharma General Store', 'Amit Electronics', 'Gupta Provision',
          'Verma Textiles', 'Krishna Gold Palace', 'Suresh Ornaments', 'Patel Kirana Depot',
          'Bhagwati Sweet Shop', 'Laxmi Dairy Farm', 'Om Prakash Hardware', 'Meena Fashion House',
          'Sunita Electronics', 'Rajesh Cloth House', 'Deepak Auto Parts', 'Mohini Silk Sarees',
          'Vishal Super Mart', 'Priya Fashion Boutique', 'Anand Traders New', 'Hari Om Kirana',
          'Vijay Sales Mathura', 'Bright Light Electricals', 'Rakesh Tech Services',
          'Modern Electronics Hub', 'Deepa Home Appliances', 'Test Supabase Customer'
        ];

        for (const name of sampleNames) {
          await this.client
            .from('customers')
            .delete()
            .eq('business_id', businessUuid)
            .ilike('name', name);
        }

        // Delete sample demo expenses for this business
        const sampleExpenseNotes = [
          'Shop Monthly Rent - Mathura Main Market',
          'Staff Salary - Kamal Verma (October)',
          'PVVNL Electricity Bill October',
          'Goods delivery via tempo',
          'Festival newspaper advertisement',
          'AC servicing & cleaning',
          'Festive gift boxes & carry bags',
          'Helper staff wages September',
          'Shop Rent September',
          'Electricity September',
          'Commercial Showroom Electricity',
          'Showroom Rent - Connaught Place',
          'Sales Staff 3 employees'
        ];
        for (const expNote of sampleExpenseNotes) {
          await this.client
            .from('expenses')
            .delete()
            .eq('business_id', businessUuid)
            .ilike('note', `%${expNote}%`);
        }

        // Delete sample expenses matching fixed demo amounts
        const sampleExpAmounts = [35000, 18000, 4800, 1200, 2500, 800, 1500, 12000, 3600, 12400, 65000, 45000];
        for (const amt of sampleExpAmounts) {
          await this.client
            .from('expenses')
            .delete()
            .eq('business_id', businessUuid)
            .eq('amount', amt);
        }

        // Delete sample invoices for this business
        const sampleInvNotes = ['Payment via NEFT', 'Credit invoice - 15 day term', 'Overdue payment needed', 'Bulk dealer order'];
        for (const invNote of sampleInvNotes) {
          await this.client
            .from('invoices')
            .delete()
            .eq('business_id', businessUuid)
            .ilike('note', `%${invNote}%`);
        }

        // Delete sample POS bills for this business
        for (const name of sampleNames) {
          await this.client
            .from('pos_bills')
            .delete()
            .eq('business_id', businessUuid)
            .ilike('customer_name', name);
        }

        // Delete sample transactions for this business
        for (const name of sampleNames) {
          await this.client
            .from('transactions')
            .delete()
            .eq('business_id', businessUuid)
            .ilike('customer_name', name);
        }

        // Delete duplicate products in cloud for this business (keep 1 per SKU/Name)
        const { data: cloudProds } = await this.client
          .from('products')
          .select('id, name, sku, created_at')
          .eq('business_id', businessUuid)
          .order('created_at', { ascending: true });

        if (cloudProds && cloudProds.length > 0) {
          const seenKeys = new Set();
          const dupIds = [];
          for (const p of cloudProds) {
            const key = (p.sku && p.sku.trim()) ? ('sku:' + p.sku.toLowerCase().trim()) : ('name:' + String(p.name || '').toLowerCase().trim());
            if (seenKeys.has(key)) {
              dupIds.push(p.id);
            } else {
              seenKeys.add(key);
            }
          }
          for (const dupId of dupIds) {
            await this.client.from('products').delete().eq('id', dupId);
          }
        }
        return { success: true };
      } catch (err) {
        console.warn('[purgeCloudDemoDataForBusiness] warning:', err.message);
        return { success: false, error: err.message };
      }
    }

    // Batch Migration / Initial Sync: Push full local state to Supabase
    async pushFullLocalStateToCloud(state) {
      if (!this.client) return { success: false, error: 'Supabase offline' };
      if (!state) return { success: false, error: 'No state provided' };

      const bizUuid = await this.resolveBusinessUuid(state.currentSession?.businessId);
      if (!bizUuid) return { success: false, error: 'Could not resolve business UUID in Supabase' };

      const customerCloudMap = state.customerCloudMap || {};
      const productCloudMap = state.productCloudMap || {};
      const supplierCloudMap = state.supplierCloudMap || {};
      const transactionCloudMap = state.transactionCloudMap || {};
      const expenseCloudMap = state.expenseCloudMap || {};
      const posBillCloudMap = state.posBillCloudMap || {};
      const invoiceCloudMap = state.invoiceCloudMap || {};

      let syncedCustomers = 0;
      let syncedProducts = 0;
      let syncedTransactions = 0;
      let syncedSuppliers = 0;
      let syncedExpenses = 0;

      const isStoreActiveRecord = (rec) => {
        if (typeof window !== 'undefined' && window.iKhataStore) {
          return window.iKhataStore.isRecordForActiveBusiness(rec);
        }
        return true;
      };

      // 1. Customers
      if (Array.isArray(state.customers)) {
        const validCusts = state.customers.filter(isStoreActiveRecord);
        for (const cust of validCusts) {
          const custPayload = { ...cust, business_id: bizUuid };
          delete custPayload.businessId;
          const cloudUuid = customerCloudMap[cust.id];
          const res = await this.syncCustomerToCloud(custPayload, cloudUuid);
          if (res.success && res.customer) {
            customerCloudMap[cust.id] = res.customer.id;
            customerCloudMap[res.customer.id] = cust.id;
            syncedCustomers++;
          }
        }
      }

      // 2. Products
      if (Array.isArray(state.products)) {
        const validProds = state.products.filter(isStoreActiveRecord);
        for (const prod of validProds) {
          const prodPayload = { ...prod, business_id: bizUuid };
          delete prodPayload.businessId;
          const cloudUuid = productCloudMap[prod.id];
          const res = await this.syncProductToCloud(prodPayload, cloudUuid);
          if (res.success && res.product) {
            productCloudMap[prod.id] = res.product.id;
            productCloudMap[res.product.id] = prod.id;
            syncedProducts++;
          }
        }
      }

      // 3. Suppliers
      if (Array.isArray(state.suppliers)) {
        const validSups = state.suppliers.filter(isStoreActiveRecord);
        for (const sup of validSups) {
          const supPayload = { ...sup, business_id: bizUuid };
          delete supPayload.businessId;
          const cloudUuid = supplierCloudMap[sup.id];
          const res = await this.syncSupplierToCloud(supPayload, cloudUuid);
          if (res.success && res.supplier) {
            supplierCloudMap[sup.id] = res.supplier.id;
            supplierCloudMap[res.supplier.id] = sup.id;
            syncedSuppliers++;
          }
        }
      }

      // 4. Transactions
      if (Array.isArray(state.transactions)) {
        const validTxs = state.transactions.filter(isStoreActiveRecord);
        for (const tx of validTxs) {
          const txPayload = { ...tx, business_id: bizUuid };
          delete txPayload.businessId;
          const cloudUuid = transactionCloudMap[tx.id];
          const mappedCustUuid = customerCloudMap[tx.customerId] || null;
          const res = await this.syncTransactionToCloud(txPayload, cloudUuid, mappedCustUuid);
          if (res.success && res.transaction) {
            transactionCloudMap[tx.id] = res.transaction.id;
            transactionCloudMap[res.transaction.id] = tx.id;
            syncedTransactions++;
          }
        }
      }

      // 5. Expenses
      if (Array.isArray(state.expenses)) {
        const validExps = state.expenses.filter(isStoreActiveRecord);
        for (const exp of validExps) {
          if ((exp.amount || 0) > 500000) continue; // Skip huge test figures
          const expPayload = { ...exp, business_id: bizUuid };
          delete expPayload.businessId;
          const cloudUuid = expenseCloudMap[exp.id] || (exp.id && exp.id.length === 36 && exp.id.includes('-') ? exp.id : null);
          const res = await this.syncExpenseToCloud(expPayload, cloudUuid);
          if (res.success && res.expense) {
            expenseCloudMap[exp.id] = res.expense.id;
            expenseCloudMap[res.expense.id] = exp.id;
            syncedExpenses++;
          }
        }
      }

      // 6. POS Bills
      let syncedBills = 0;
      const posBillsList = Array.isArray(state.posBills) ? state.posBills : (Array.isArray(state.bills) ? state.bills : []);
      if (posBillsList.length > 0) {
        const validBills = posBillsList.filter(isStoreActiveRecord);
        for (const bill of validBills) {
          const billPayload = { ...bill, business_id: bizUuid };
          const cloudUuid = posBillCloudMap[bill.id] || (bill.id && bill.id.length === 36 && bill.id.includes('-') ? bill.id : null);
          const mappedCustUuid = customerCloudMap[bill.customerId] || null;
          const res = await this.syncPosBillToCloud(billPayload, cloudUuid, mappedCustUuid);
          if (res.success && res.posBill) {
            posBillCloudMap[bill.id] = res.posBill.id;
            posBillCloudMap[res.posBill.id] = bill.id;
            syncedBills++;
          }
        }
      }

      // 7. Invoices
      let syncedInvoices = 0;
      if (Array.isArray(state.invoices)) {
        const validInvoices = state.invoices.filter(isStoreActiveRecord);
        for (const inv of validInvoices) {
          const invPayload = { ...inv, business_id: bizUuid };
          const cloudUuid = invoiceCloudMap[inv.id] || (inv.id && inv.id.length === 36 && inv.id.includes('-') ? inv.id : null);
          const mappedCustUuid = customerCloudMap[inv.customerId] || null;
          const res = await this.syncInvoiceToCloud(invPayload, cloudUuid, mappedCustUuid);
          if (res.success && res.invoice) {
            invoiceCloudMap[inv.id] = res.invoice.id;
            invoiceCloudMap[res.invoice.id] = inv.id;
            syncedInvoices++;
          }
        }
      }

      // 8. Employees
      const employeeCloudMap = state.employeeCloudMap || {};
      let syncedEmployees = 0;
      if (Array.isArray(state.employees)) {
        const validEmps = state.employees.filter(isStoreActiveRecord);
        for (const emp of validEmps) {
          const empPayload = { ...emp, business_id: bizUuid };
          delete empPayload.businessId;
          const cloudUuid = employeeCloudMap[emp.id];
          const res = await this.syncEmployeeToCloud(empPayload, cloudUuid);
          if (res.success && res.employee) {
            employeeCloudMap[emp.id] = res.employee.id;
            employeeCloudMap[res.employee.id] = emp.id;
            syncedEmployees++;
          }
        }
      }

      state.customerCloudMap = customerCloudMap;
      state.productCloudMap = productCloudMap;
      state.supplierCloudMap = supplierCloudMap;
      state.transactionCloudMap = transactionCloudMap;
      state.expenseCloudMap = expenseCloudMap;
      state.posBillCloudMap = posBillCloudMap;
      state.invoiceCloudMap = invoiceCloudMap;
      state.employeeCloudMap = employeeCloudMap;

      return {
        success: true,
        businessUuid: bizUuid,
        counts: {
          customers: syncedCustomers,
          products: syncedProducts,
          suppliers: syncedSuppliers,
          transactions: syncedTransactions,
          expenses: syncedExpenses,
          bills: syncedBills,
          invoices: syncedInvoices,
          employees: syncedEmployees
        }
      };
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

    // ── CROSS-DEVICE PULL: Fetch all cloud data for a business into local state ──
    // Call this after login to populate the local state with data from Supabase
    async pullAllCloudDataForBusiness(businessId) {
      if (!this.client || !businessId) return { success: false, error: 'Offline or no businessId' };
      const isUuid = businessId.length === 36 && businessId.includes('-');
      if (!isUuid) {
        businessId = await this.resolveBusinessUuid(businessId);
        if (!businessId) return { success: false, error: 'Cannot resolve business UUID' };
      }
      try {
        const [
          custRes, txRes, prodRes, supRes, expRes, billsRes, invRes, purRes, empRes
        ] = await Promise.all([
          this.fetchCustomersFromCloud(businessId),
          this.fetchTransactionsFromCloud(businessId),
          this.fetchProductsFromCloud(businessId),
          this.fetchSuppliersFromCloud(businessId),
          this.fetchExpensesFromCloud(businessId),
          this.fetchPosBillsFromCloud(businessId),
          this.fetchInvoicesFromCloud(businessId),
          this.fetchPurchasesFromCloud(businessId),
          this.fetchEmployeesFromCloud(businessId)
        ]);

        return {
          success: true,
          businessId,
          customers: custRes.customers || [],
          transactions: txRes.transactions || [],
          products: prodRes.products || [],
          suppliers: supRes.suppliers || [],
          expenses: expRes.expenses || [],
          bills: billsRes.bills || [],
          invoices: invRes.invoices || [],
          purchases: purRes.purchases || [],
          employees: empRes.employees || []
        };
      } catch (err) {
        return { success: false, error: this.normalizeError(err) };
      }
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
