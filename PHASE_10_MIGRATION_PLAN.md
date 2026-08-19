# iKhataPro — Phase 10 Supabase Migration Plan
**Phase 10 — Step 1: Incremental Multi-Stage Migration Blueprint**
**Date:** August 19, 2026

> [!IMPORTANT]
> **AUDIT / PLANNING ONLY**: DO NOT EXECUTE THESE MIGRATION STAGES YET.
> Zero regression of Phases 1–9 features is mandatory. LocalStorage will remain the primary synchronous source of truth until all stages are validated.

---

## 1. Executive Migration Strategy

The migration strategy follows a **Dual-Layer Reactive Architecture**:
1. **Synchronous In-Memory Cache**: `window.iKhataStore.state` remains the instant, zero-latency store backing all UI renders, calculation modules (P&L, GST, Cash Flow, AI), and offline capabilities.
2. **Asynchronous Cloud Sync**: A non-blocking Supabase sync engine persists mutations to cloud PostgreSQL tables, enforces database RLS, and listens to Supabase Realtime changes to update local memory.

```
+---------------------------------------------------------------------------------+
|                                 iKhataPro UI                                    |
+---------------------------------------------------------------------------------+
                                     |  ^
                     1. Sync Read    |  |  2. Instant UI Re-render
                     & Immediate Write  |
                                     v  |
+---------------------------------------------------------------------------------+
|               Synchronous Store (window.iKhataStore / localStorage)              |
+---------------------------------------------------------------------------------+
                                     |  ^
                    3. Async Sync    |  |  4. Realtime Subscription
                     Queue Push      |  |     Data Pull
                                     v  |
+---------------------------------------------------------------------------------+
|               Supabase Cloud Platform (PostgreSQL 15 + RLS Engine)              |
+---------------------------------------------------------------------------------+
```

---

## 2. Multi-Stage Execution Roadmap

### Stage 1: Supabase Client Integration
- **Goal**: Add official `@supabase/supabase-js` bundle and establish a secure, non-breaking connection client.
- **Target Files**:
  - `index.html` (Include CDN script for Supabase JS client)
  - `js/supabaseClient.js` (**[NEW]** Helper module for initializing Supabase client and checking connection status)
  - `config/supabase.js` (**[NEW]** Environment credentials holder: `SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- **Dual-Safety Guard**: If Supabase client fails to initialize or network is offline, set `window.iKhataSupabase.isOnline = false` and fall back gracefully to pure `localStorage`.
- **Verification Checklist**:
  - [ ] Supabase client initializes without error console warnings.
  - [ ] Connection test query `supabase.from('businesses').select('count')` succeeds.
  - [ ] Local storage functionality remains 100% unaffected.

---

### Stage 2: Authentication Bridge
- **Goal**: Integrate Supabase Auth (`signUp`, `signInWithPassword`, `signOut`) while keeping existing workspace login credentials compatible.
- **Target Files**:
  - `js/state.js` (Extend `login()`, `logout()`, `registerNewBusiness()` with async Supabase Auth calls)
  - `js/app.js` (Update auth UI event handlers to handle async auth responses)
- **Actions**:
  1. On login, authenticate via `supabase.auth.signInWithPassword({ email/phone, password })`.
  2. Store returned Supabase session JWT in memory.
  3. Automatically populate `profiles` via database trigger `handle_new_user()`.
  4. Fallback to local credential match if client is offline.
- **Verification Checklist**:
  - [ ] Login with `aryan` or `rahul` authenticates against Supabase Auth.
  - [ ] `auth.uid()` is established in session state.
  - [ ] Session persists across page reloads.

---

### Stage 3: Business & Membership Tenant Scoping
- **Goal**: Sync business workspace metadata and setup `business_members` RBAC records in Supabase.
- **Target Files**:
  - `js/state.js` (Sync `state.businesses` with `businesses` table; link active user in `business_members`)
  - `supabase/migrations/004_business_members.sql`
- **Actions**:
  1. Seed/upsert business records (`BUS_LJS` -> UUID, `BUS_SHARMA` -> UUID) into `businesses`.
  2. Create owner record in `business_members` mapping `auth.uid()` -> `business_id` with `role = 'OWNER'`.
  3. Validate RLS policy helper `is_business_member(business_id)`.
- **Verification Checklist**:
  - [ ] Business records exist in Supabase `businesses` table.
  - [ ] User membership exists in `business_members`.
  - [ ] Attempting to read another business table without membership fails with RLS policy block.

---

### Stage 4: Customer Entity Migration & Cloud Sync
- **Goal**: Dual-sync customer records between local store and Supabase `customers` table.
- **Target Files**:
  - `js/state.js` (`addCustomer()`, `getCustomers()`, `softDeleteRecord('customer')`)
  - `js/modules/customers.js`
- **Actions**:
  1. Perform initial sync of local customer array to `customers` table.
  2. Maintain legacy ID -> Supabase UUID mapping.
  3. Ensure `balance_type` column auto-generates correctly in Postgres (`GET` / `GIVE` / `SETTLED`).
  4. Subscribe to Supabase Realtime changes on `customers`.
- **Verification Checklist**:
  - [ ] All 20 LJS customers & 5 Sharma customers present in Supabase `customers` table.
  - [ ] Adding customer in UI updates both local memory and Supabase table.
  - [ ] Customer balances match across local state and cloud database.

---

### Stage 5: Products, Inventory & Stock Movement Audit Trail
- **Goal**: Dual-sync product catalog and record immutable stock movement audit logs in `inventory_movements`.
- **Target Files**:
  - `js/state.js` (`addProduct()`, `restockProduct()`, `toggleProductOnlineVisibility()`)
  - `js/modules/inventory.js`
- **Actions**:
  1. Upsert product catalog into Supabase `products` table.
  2. On stock change (restock, sale, purchase), insert audit record into `inventory_movements` table.
- **Verification Checklist**:
  - [ ] Products catalog matches between local memory and cloud database.
  - [ ] Stock adjustments create corresponding rows in `inventory_movements`.
  - [ ] Low stock alerts trigger identically in UI.

---

### Stage 6: Transactions (Khata Ledger) Migration & Idempotency
- **Goal**: Sync credit/payment Khata entries to Supabase `transactions` table with idempotency guards.
- **Target Files**:
  - `js/state.js` (`addKhataTransaction()`, `receivePayment()`, `deleteTransaction()`)
  - `js/modules/khata.js`
- **Actions**:
  1. Sync transactions array to `transactions` table.
  2. Attach `txToken` to `idempotency_key` column to guarantee no duplicate double-submit entries.
  3. Validate customer balance recalculation.
- **Verification Checklist**:
  - [ ] All Khata entries synced to Supabase `transactions`.
  - [ ] Idempotency key prevents duplicate network submission.
  - [ ] Customer net balance reconciles to 0 difference.

---

### Stage 7: Suppliers, Purchases & Normalized Purchase Items
- **Goal**: Sync supplier profiles, purchase orders, purchase items, and supplier payment ledger.
- **Target Files**:
  - `js/state.js` (`addSupplier()`, `createPurchase()`, `recordSupplierPayment()`)
  - `js/modules/suppliers.js`, `js/modules/purchaseOrders.js`
- **Actions**:
  1. Upsert supplier profiles into `suppliers`.
  2. Insert purchase header into `purchases` table and unnested items into `purchase_items`.
  3. Log supplier payments into `supplier_transactions`.
- **Verification Checklist**:
  - [ ] Purchase PO-9001 and PO-9002 correctly split into `purchases` + `purchase_items`.
  - [ ] Supplier balances reconcile correctly.

---

### Stage 8: GST Invoices & Invoice Line Items
- **Goal**: Sync B2B/B2C GST tax invoices and line item tax breakdowns (`cgst`, `sgst`, `igst`).
- **Target Files**:
  - `js/state.js` (`createGSTInvoice()`, `getInvoices()`)
  - `js/modules/invoices.js`
- **Actions**:
  1. Insert invoice header into `invoices` table.
  2. Insert normalized line items into `invoice_items`.
  3. Verify interstate (`INTER`) vs intrastate (`INTRA`) tax calculation matching.
- **Verification Checklist**:
  - [ ] Invoices INV-1001, INV-1002 synced with exact CGST/SGST/IGST breakdown.
  - [ ] Taxable total and grand total match to 0 decimal places.

---

### Stage 9: Expenses & POS Bills / POS Items
- **Goal**: Sync daily operational expenses and fast retail POS bill transactions.
- **Target Files**:
  - `js/state.js` (`addExpense()`, `savePOSBill()`)
  - `js/modules/expenses.js`, `js/modules/pos.js`
- **Actions**:
  1. Sync expenses into `expenses` table.
  2. Insert POS bills into `pos_bills` table and unnest items into `pos_bill_items`.
  3. Verify stock deduction saga rolls back cleanly if network or DB fails.
- **Verification Checklist**:
  - [ ] POS Bills BILL-001 through BILL-012 synced cleanly.
  - [ ] Inventory stock reduced accurately upon POS sale.

---

### Stage 10: Reports, Financial Analytics & P&L Dual Validation
- **Goal**: Validate that all financial report calculations match identically between local state and cloud SQL queries.
- **Target Files**:
  - `js/modules/pnl.js`, `js/modules/analytics.js`
- **Actions**:
  1. Compare local `getFinancialPNL()` calculations with SQL aggregation queries.
  2. Verify Gross Sales, Net Sales, COGS, Operating Expenses, Gross Margin %, and Net Profit match 100%.
- **Verification Checklist**:
  - [ ] P&L statement numbers are identical between local calculation engine and cloud DB queries.
  - [ ] Expense categorization and revenue breakdown match.

---

### Stage 11: AI Copilot & Business Intelligence Adapter
- **Goal**: Ensure `copilot.js` and `intelligence.js` seamlessly query synced state without performance lag.
- **Target Files**:
  - `js/modules/intelligence.js`, `js/modules/copilot.js`
- **Actions**:
  1. Maintain reactive cache feeds to AI engines.
  2. Provide async cloud query fallbacks for deep historical trend analysis.
- **Verification Checklist**:
  - [ ] AI Copilot responses remain instant (<100ms).
  - [ ] RFM customer segmentation calculations match existing scores.

---

### Stage 12: Data Backup, Safe Restore & Export Alignment
- **Goal**: Update backup/restore engine to support both local JSON dumps and Supabase cloud database restoration.
- **Target Files**:
  - `js/state.js` (`exportBusinessBackup()`, `validateAndImportBackup()`)
- **Actions**:
  1. Ensure JSON backups exported from local store can be restored directly into Supabase.
  2. Implement pre-import cloud snapshot backup.
- **Verification Checklist**:
  - [ ] Backup export JSON validates against Supabase schema.
  - [ ] Import correctly populates Supabase database tables with active tenant ID.

---

### Stage 13: Final Regression Verification & Local Storage Sunset Criteria
- **Goal**: Conduct complete regression testing across all application features before considering cloud transition complete.
- **Target Files**:
  - Full application codebase (`index.html`, `js/*`, `js/modules/*`)
- **Sunset Criteria**:
  - [ ] Supabase read operations verified for 100% of entities.
  - [ ] Supabase write operations verified with offline queue fallback.
  - [ ] RLS policies verified (cross-tenant access rejected).
  - [ ] All 12 prior migration stages completed with zero regression.
  - [ ] Financial reconciliation shows 0 discrepancies across all businesses.

---

## 3. Summary of Strict Rules
1. **DO NOT MODIFY APPLICATION CODE** in this audit step.
2. **DO NOT DELETE LOCALSTORAGE** during initial migration stages.
3. **DO NOT MIGRATE DATA** until approved.
4. **STOP AFTER AUDIT CREATION.**
