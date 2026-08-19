# iKhataPro — Migration Risk Assessment Report
**Phase 10 — Step 1: Pre-Migration Risk Audit & Mitigation Framework**
**Date:** August 19, 2026

---

## 1. Executive Summary

Transitioning iKhataPro from a synchronous `localStorage`-based single-page web app to an enterprise Supabase cloud database carries specific technical, security, and financial integrity risks. 

Because **ZERO REGRESSION** is mandatory for Phases 1–9 features, this report details every potential failure point, risk impact level, and explicit mitigation strategy required before any code execution.

---

## 2. Risk Matrix & Detailed Breakdown

| Risk ID | Category | Risk Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Data Integrity** | **ID Format Discrepancies**: Legacy IDs are simple strings (`c1`, `p1`, `BUS_LJS`, `INV-1001`), whereas Supabase primary keys are `uuid` (`gen_random_uuid()`). | **HIGH** | **HIGH** | Maintain an in-memory & local key-value ID translation map during sync (`legacyId -> uuid`). Store human-readable numbers (`PO-9001`, `INV-1001`, `BILL-001`) in dedicated text columns (`po_number`, `invoice_number`, `bill_number`). |
| **RSK-02** | **Financial Accounting** | **Numeric Precision & Paisa Rounding**: JS uses IEEE 754 floating-point numbers which suffer from precision drift (e.g. `0.1 + 0.2 = 0.30000000000000004`), whereas Supabase uses Postgres `numeric(12,2)`. | **CRITICAL** | **HIGH** | Explicitly parse and round all monetary inputs using `Math.round(val * 100) / 100` before writing to Supabase, and enforce `numeric(12,2)` types in all SQL queries. Perform financial reconciliation checks. |
| **RSK-03** | **Data Integrity** | **Unnested Relational Arrays**: Local state stores line items inside parent JSON arrays (`invoices.items[]`, `purchases.items[]`, `bills.items[]`), whereas Supabase requires normalized child tables (`invoice_items`, `purchase_items`, `pos_bill_items`). | **HIGH** | **HIGH** | Implement atomic multi-table inserts via Supabase RPC or multi-query transactions. Guarantee parent FK creation before child item insertion. |
| **RSK-04** | **Security / Multi-Tenancy** | **Business & User ID Mapping**: Tampering with `business_id` in localStorage could bypass frontend tenant filters. | **CRITICAL** | **MEDIUM** | Enforce database-level Row Level Security (RLS) using `is_business_member(business_id)`. Changing `business_id` client-side will immediately return `403 Forbidden` / 0 rows from PostgreSQL. |
| **RSK-05** | **Authentication** | **Auth Model Mismatch**: Current auth uses plain text/hash checks in `Store.login()`. Supabase Auth relies on JWT tokens with `auth.uid()`. | **HIGH** | **HIGH** | Build a dual-auth bridge: Supabase Auth handles actual tokens and session state, while falling back gracefully to offline state if network is unavailable. |
| **RSK-06** | **Performance & UX** | **Async vs Sync Call Site Breakage**: Local state methods (`getCustomers()`, `addKhataTransaction()`) are currently 100% synchronous. Supabase network calls are asynchronous Promises. | **HIGH** | **HIGH** | Maintain a dual-layer state architecture: `window.iKhataStore.state` acts as a synchronous read/write cache in browser memory, while an background sync queue syncs writes asynchronously to Supabase. |
| **RSK-07** | **AI & Analytics** | **AI Copilot Query Latency**: `intelligence.js` and `copilot.js` iterate directly over in-memory arrays to calculate instant insights, P&L, and RFM scores. | **MEDIUM** | **MEDIUM** | Keep in-memory reactive state updated via Supabase Realtime subscriptions. AI logic will continue to run at zero latency against the synced reactive store. |
| **RSK-08** | **Data Loss** | **Demo Data Overwrite / Corruption**: Existing demo datasets for `BUS_LJS` (LJS Jewellers) and `BUS_SHARMA` (Sharma Electronics) might be overwritten during cloud sync. | **HIGH** | **MEDIUM** | Use idempotent UPSERT logic (`ON CONFLICT (id) DO NOTHING` or slug matching) during demo data seeding. Always snapshot `localStorage` before any import/sync attempt. |
| **RSK-09** | **Compliance** | **Soft-Delete Sync**: Records deleted locally use `isDeleted: true`. If Supabase physical rows are deleted instead of soft-deleted, historical audit logs will break. | **MEDIUM** | **LOW** | Enforce `is_deleted = true`, `deleted_at`, and `deleted_by` across all Supabase tables. Do not issue SQL `DELETE` statements on business entities. |
| **RSK-10** | **Offline / PWA** | **Network Disconnection During Transaction**: Submitting a POS bill or Khata transaction while offline could result in duplicate records or missing sync. | **HIGH** | **MEDIUM** | Enforce client-side UUID generation (`crypto.randomUUID()`) and `idempotency_key` column on `transactions` to prevent duplicate submissions on retry. |

---

## 3. Detailed Technical Analysis of Primary Vulnerabilities

### 3.1 Synchronous vs. Asynchronous Code Execution Risk
Currently, over **150 UI handler functions** in [`js/app.js`](file:///c:/Users/hp/OneDrive/Desktop/our%20project/js/app.js) and module files invoke store methods directly:
```javascript
// Current direct sync call:
const result = window.iKhataStore.addKhataTransaction({ ... });
if (result) { updateUI(); }
```
If `addKhataTransaction` is immediately rewritten to be an `async` function returning a `Promise` without a local cache layer, UI calls without `await` will fail silently, leading to broken UI states and unhandled promise rejections.

**Mandatory Architecture Guard:** `Store` methods must update local reactive state **synchronously first**, and enqueue asynchronous Supabase synchronization in the background.

---

### 3.2 Security & Tenant Isolation Risk Conceptual Test

#### Test Scenario A: Legitimate User Access
1. User logs in as `aryan` (Owner of `BUS_LJS`).
2. Supabase Auth returns JWT with `auth.uid() = "usr_123"`.
3. `business_members` table contains `(user_id: "usr_123", business_id: "bus_ljs_uuid", role: "OWNER")`.
4. SQL Query: `SELECT * FROM customers WHERE business_id = 'bus_ljs_uuid';`
5. RLS Policy: `is_business_member('bus_ljs_uuid')` evaluates to `true`.
6. **RESULT:** **ALLOWED** — Returns 20 LJS Jewellers customers.

#### Test Scenario B: Malicious Tenant Switch Attempt
1. Attacker opens browser console and manually edits local state: `window.iKhataStore.state.currentSession.businessId = 'bus_sharma_uuid'`.
2. Attacker executes query: `SELECT * FROM customers WHERE business_id = 'bus_sharma_uuid';`
3. RLS Policy: `is_business_member('bus_sharma_uuid')` checks `business_members` for `(user_id: "usr_123", business_id: "bus_sharma_uuid")`.
4. Result: No matching active membership found -> `is_business_member` returns `false`.
5. **RESULT:** **DENIED** — PostgreSQL returns 0 rows (403 Forbidden). Client-side modification is completely nullified by the database engine!

---

## 4. Verification & Fallback Criteria

Before any stage of the Supabase integration can be considered complete, the following **Dual-Safety Verification Steps** must pass:

1. **Local State Preservation**: `localStorage.getItem('iKhataPro_app_state_v4')` remains populated and updated.
2. **Financial Reconciliation**: Sum of customer balances in local state must match `SUM(balance)` in Supabase `customers` table to 0 decimal places.
3. **Audit Log Continuity**: Audit logs generated during Supabase operations must sync to `audit_logs` table without losing existing log history.
4. **Offline Mode Validation**: App functionality must remain 100% operational when network is disconnected (DevTools offline mode).
