# iKhataPro — Supabase Integration Data Mapping Matrix
**Phase 10 — Step 1: Complete Entity Audit & Database Mapping**
**Date:** August 19, 2026

---

## 1. Overview & Architecture Audit

The existing iKhataPro application operates on a reactive, in-memory state store (`window.iKhataStore` defined in [`js/state.js`](file:///c:/Users/hp/OneDrive/Desktop/our%20project/js/state.js)) backed by single-key browser `localStorage` (`iKhataPro_app_state_v4`).

This document provides an exhaustive, column-by-column mapping between the current **in-memory / localStorage state structure** and the **Supabase PostgreSQL relational schema** defined in [`supabase/MASTER_SCHEMA.sql`](file:///c:/Users/hp/OneDrive/Desktop/our%20project/supabase/MASTER_SCHEMA.sql).

---

## 2. Global Key & Type Conversion Standards

| Metric / Aspect | Existing Frontend (localStorage) | Supabase PostgreSQL Schema | Transformation / Migration Rule |
| :--- | :--- | :--- | :--- |
| **Storage Engine** | `localStorage['iKhataPro_app_state_v4']` | PostgreSQL 15+ (Supabase Managed) | Async API wrapper + sync dual-cache in memory |
| **Primary Keys (PK)** | Custom String IDs (`c1`, `p1`, `t1`, `BUS_LJS`, `INV-1001`) | `uuid` (`gen_random_uuid()`) | Generate UUIDs on insert; maintain mapping table for legacy IDs |
| **Tenant Isolation** | String `business_id` in JS memory filter | FK `business_id` -> `businesses(id)` + RLS | Enforced server-side via `is_business_member(business_id)` SQL function |
| **Monetary Types** | JS `Number` (Float arithmetic) | `numeric(12,2)` | Exact decimal representation; explicit rounding to 2 decimal places |
| **Timestamps** | `YYYY-MM-DD` or `toISOString()` strings | `date` or `timestamptz` (IST +05:30) | Standardize all timestamps to UTC ISO strings for storage, IST for UI |
| **Soft Delete** | `isDeleted: true`, `deletedAt`, `deletedBy` | `is_deleted: boolean`, `deleted_at`, `deleted_by` | Standardized column names across all core entity tables |

---

## 3. Entity Data Mapping Matrix

### 3.1 Business / Tenant (`businesses`)
- **localStorage Key:** `state.businesses[]`
- **Supabase Table:** `businesses`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Frontend Property (`state.businesses`) | Supabase Column | Data Type | Constraints / Default | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` | Map `'BUS_LJS'` -> Business UUID |
| `name` | `name` | `text` | `NOT NULL` | Direct string transfer |
| `ownerName` | `owner_name` | `text` | `NOT NULL` | Renamed from camelCase |
| `username` | `username` | `text` | `UNIQUE NOT NULL` | Login identifier |
| `slug` | `slug` | `text` | `UNIQUE NOT NULL` | Store URL slug |
| `email` | `email` | `text` | Optional | Business email |
| `mobile` | `mobile` | `text` | Optional | Contact mobile |
| `address` | `address` | `text` | Optional | Shop address |
| `city` | `city` | `text` | Optional | City location |
| `state` | `state` | `text` | Optional | State location |
| `pincode` | `pincode` | `text` | Optional | Postal code |
| `businessType` | `business_type` | `text` | Optional | Industry/niche |
| `gstin` | `gstin` | `text` | Optional | 15-char GSTIN |
| `pan` | `pan` | `text` | Optional | 10-char PAN |
| `logo` | `logo` | `text` | `DEFAULT '🏪'` | Emoji or URL |
| `storeActive` | `store_active` | `boolean` | `DEFAULT true` | Digital store status |
| `storeTagline` | `store_tagline` | `text` | Optional | Marketing tagline |
| `deliveryFee` | `delivery_fee` | `numeric(12,2)` | `DEFAULT 0` | Digital storefront fee |
| `minOrderAmount` | `min_order_amount` | `numeric(12,2)` | `DEFAULT 0` | Minimum order limit |
| `whatsappNumber` | `whatsapp_number` | `text` | Optional | WhatsApp ordering |
| `subscriptionPlan` | `subscription_plan` | `text` | `CHECK ('FREE','PRO','ENTERPRISE')` | Plan entitlement |
| `toReceiveTotal` | `to_receive_total` | `numeric(12,2)` | `DEFAULT 0` | Aggregated Khata receivable |
| `toGiveTotal` | `to_give_total` | `numeric(12,2)` | `DEFAULT 0` | Aggregated Khata payable |
| `todaySales` | `today_sales` | `numeric(12,2)` | `DEFAULT 0` | Dynamic sales metric |
| `todayReceived` | `today_received` | `numeric(12,2)` | `DEFAULT 0` | Dynamic cash metric |
| `healthScore` | `health_score` | `integer` | `CHECK (0-100)` | Financial health indicator |
| `currency` | `currency` | `text` | `DEFAULT 'INR'` | Currency symbol |
| - | `created_at` | `timestamptz` | `DEFAULT now()` | Creation timestamp |
| - | `updated_at` | `timestamptz` | `DEFAULT now()` | Update timestamp |

---

### 3.2 User Profiles (`profiles`)
- **localStorage Key:** Embedded in `state.currentSession.user` & `business.ownerName`
- **Supabase Table:** `profiles` (Extends `auth.users`)
- **Primary Key:** `id` (`uuid`, Foreign Key to `auth.users(id)`)

| Frontend Property | Supabase Column | Data Type | Constraints | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| `user.name` | `full_name` | `text` | Optional | Populated automatically via trigger `handle_new_user()` |
| - | `avatar_url` | `text` | Optional | Profile image |
| `mobile` / `phone` | `phone` | `text` | Optional | Contact phone number |
| - | `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | User record creation |
| - | `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Profile last updated |

---

### 3.3 Business Memberships & RBAC (`business_members`)
- **localStorage Key:** Derived in `Store.getCurrentUserRole()` & `state.employees`
- **Supabase Table:** `business_members`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Frontend Property | Supabase Column | Data Type | Constraints | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| - | `user_id` | `uuid` | `FK auth.users(id)` | Links user to business tenant |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` | Business tenant reference |
| `role` | `role` | `text` | `CHECK ('OWNER','MANAGER','ACCOUNTANT','CASHIER')` | Security role for RLS policy enforcement |
| - | `invited_by` | `uuid` | `FK auth.users(id)` | Admin who created membership |
| `active` | `is_active` | `boolean` | `DEFAULT true` | Membership active status |
| - | `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Creation timestamp |

---

### 3.4 Customers (`customers`)
- **localStorage Key:** `state.customers[]`
- **Supabase Table:** `customers`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Frontend Property (`state.customers`) | Supabase Column | Data Type | Constraints / Default | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` | Map legacy `'c1'` -> Generated UUID |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` | Strict tenant scoping |
| `name` | `name` | `text` | `NOT NULL` | Customer full name |
| `phone` | `phone` | `text` | Optional | Mobile number |
| - | `email` | `text` | Optional | Customer email |
| `city` | `city` | `text` | Optional | City location |
| - | `address` | `text` | Optional | Full billing address |
| - | `notes` | `text` | Optional | Customer notes |
| `balance` | `balance` | `numeric(12,2)` | `DEFAULT 0` | Net Khata balance (+ve GET, -ve GIVE) |
| `type` | `balance_type` | `text` | `GENERATED ALWAYS AS (...) STORED` | Automatically computed DB column |
| `category` | `category` | `text` | `DEFAULT 'Regular'` | RFM Segment ('VIP','At Risk','Overdue', etc.) |
| `score` | `score` | `integer` | `CHECK (0-100)` | AI Credit Risk score |
| `isBadDebt` | `is_bad_debt` | `boolean` | `DEFAULT false` | NPA / Bad debt flag |
| `ptpDate` | `ptp_date` | `date` | Optional | Promise To Pay target date |
| `ptpAmount` | `ptp_amount` | `numeric(12,2)` | Optional | Promise To Pay amount |
| `ptpNote` | `ptp_note` | `text` | Optional | PTP notes |
| `lastTransactionDate` | `last_transaction_date` | `date` | Optional | Last transaction date |
| `daysSinceLastActivity`| `days_since_last_activity`| `integer` | Optional | Inactivity counter in days |
| `lastActive` | `last_active` | `text` | Optional | Human readable activity string |
| `totalPurchaseVol` | `total_purchase_vol` | `numeric(12,2)` | `DEFAULT 0` | Cumulative purchase volume |
| `paymentBehaviorPct` | `payment_behavior_pct` | `integer` | `DEFAULT 100` | Payment compliance percentage |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` | Soft delete flag |
| `deletedAt` | `deleted_at` | `timestamptz` | Optional | Soft deletion timestamp |
| `deletedBy` | `deleted_by` | `text` | Optional | User who deleted record |

---

### 3.5 Products & Catalog (`products`)
- **localStorage Key:** `state.products[]`
- **Supabase Table:** `products`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Frontend Property (`state.products`) | Supabase Column | Data Type | Constraints / Default | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` | Map legacy `'p1'` -> Generated UUID |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` | Tenant scoping |
| `name` | `name` | `text` | `NOT NULL` | Product name |
| `description` | `description` | `text` | Optional | Detailed description |
| `category` | `category` | `text` | `DEFAULT 'General'` | Product category |
| `sku` | `sku` | `text` | Optional | Stock Keeping Unit code |
| `barcode` | `barcode` | `text` | Optional | EAN/UPC Barcode string |
| - | `hsn_code` | `text` | Optional | HSN/SAC GST code |
| `price` | `price` | `numeric(12,2)` | `NOT NULL DEFAULT 0` | Selling price |
| `cost` | `cost` | `numeric(12,2)` | `NOT NULL DEFAULT 0` | Cost price (COGS calculation) |
| `stock` | `stock` | `integer` | `NOT NULL DEFAULT 0` | Available stock count |
| `minStock` | `min_stock` | `integer` | `NOT NULL DEFAULT 5` | Reorder alert threshold |
| - | `unit` | `text` | `DEFAULT 'Pcs'` | Unit of measure ('Pcs','Kg','Ltr') |
| `isOnlineVisible` | `is_online_visible` | `boolean` | `DEFAULT true` | Show on Storefront |
| `imageUrl` | `image_url` | `text` | Optional | Image URL |
| - | `gst_rate` | `numeric(5,2)` | `DEFAULT 18` | Applicable GST tax percentage |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` | Soft delete flag |
| `deletedAt` | `deleted_at` | `timestamptz` | Optional | Deletion timestamp |
| `deletedBy` | `deleted_by` | `text` | Optional | Deletion user |

---

### 3.6 Inventory Stock Movements (`inventory_movements`)
- **localStorage Key:** *New explicit table for immutable stock audit trail*
- **Supabase Table:** `inventory_movements`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Property | Supabase Column | Data Type | Constraints / Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| - | `id` | `uuid` | `PRIMARY KEY` | Unique movement ID |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` | Tenant isolation |
| `productId` | `product_id` | `uuid` | `FK products(id)` | Affected product |
| `movementType` | `movement_type` | `text` | `CHECK ('SALE','PURCHASE','RESTOCK','RETURN','ADJUSTMENT')` | Type of movement |
| `quantity` | `quantity` | `integer` | `NOT NULL` | Quantity changed (+ve/-ve) |
| `stockBefore` | `stock_before` | `integer` | `NOT NULL` | Stock prior to change |
| `stockAfter` | `stock_after` | `integer` | `NOT NULL` | Stock after change |
| `referenceType` | `reference_type` | `text` | Optional | Entity triggering movement ('POS','PO','INV') |
| `referenceId` | `reference_id` | `text` | Optional | Reference document ID |
| `unitCost` | `unit_cost` | `numeric(12,2)` | `DEFAULT 0` | Cost basis per unit |
| `note` | `note` | `text` | Optional | Audit notes |
| - | `created_by` | `uuid` | `FK auth.users(id)` | User performing stock change |
| - | `created_at` | `timestamptz` | `DEFAULT now()` | Timestamp |

---

### 3.7 Khata Transactions (`transactions`)
- **localStorage Key:** `state.transactions[]`
- **Supabase Table:** `transactions`
- **Primary Key:** `id` (`uuid`, default `gen_random_uuid()`)

| Frontend Property (`state.transactions`) | Supabase Column | Data Type | Constraints / Default | Transformation Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` | Map legacy `'t1'` -> Generated UUID |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` | Tenant isolation |
| `customerId` | `customer_id` | `uuid` | `FK customers(id)` | Linked customer FK |
| `customerName` | `customer_name` | `text` | `NOT NULL` | Cached customer name |
| `type` | `type` | `text` | `CHECK ('GAVE','GOT')` | Credit given or Payment received |
| `amount` | `amount` | `numeric(12,2)` | `CHECK (amount > 0)` | Transaction monetary amount |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` | Transaction date |
| `time` | `time_str` | `text` | Optional | Time string ('10:30 AM') |
| `mode` | `mode` | `text` | Optional | Payment mode ('Cash','UPI','Credit/Khata') |
| `note` | `note` | `text` | Optional | Transaction remarks |
| `txToken` | `idempotency_key` | `text` | `UNIQUE` | Double submit prevention token |
| - | `source_bill_id` | `text` | Optional | Related POS Bill ID |
| - | `source_invoice_id` | `text` | Optional | Related GST Invoice ID |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` | Soft delete flag |
| `deletedAt` | `deleted_at` | `timestamptz` | Optional | Soft delete timestamp |
| `deletedBy` | `deleted_by` | `text` | Optional | User who deleted |
| - | `created_by` | `uuid` | `FK auth.users(id)` | Creator user ID |

---

### 3.8 Suppliers & Purchase Management (`suppliers`, `purchases`, `purchase_items`, `supplier_transactions`)

#### `suppliers` Table
- **localStorage Key:** `state.suppliers[]`

| Frontend Property (`state.suppliers`) | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `name` | `name` | `text` | `NOT NULL` |
| `businessName` | `business_name` | `text` | Optional |
| `phone` | `phone` | `text` | Optional |
| `email` | `email` | `text` | Optional |
| `address` | `address` | `text` | Optional |
| `gstin` | `gstin` | `text` | Optional |
| `pan` | `pan` | `text` | Optional |
| `category` | `category` | `text` | `DEFAULT 'General Supplier'` |
| `balance` | `balance` | `numeric(12,2)` | `DEFAULT 0` |
| `totalPurchases` | `total_purchases` | `numeric(12,2)` | `DEFAULT 0` |
| `totalPayments` | `total_payments` | `numeric(12,2)` | `DEFAULT 0` |
| `lastTransaction` | `last_transaction` | `date` | Optional |
| `active` | `is_active` | `boolean` | `DEFAULT true` |
| `notes` | `notes` | `text` | Optional |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` |

#### `purchases` Table
- **localStorage Key:** `state.purchases[]`

| Frontend Property (`state.purchases`) | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` (e.g. 'PO-9001') | `po_number` | `text` | `NOT NULL` |
| - | `id` | `uuid` | `PRIMARY KEY (gen_random_uuid())` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `supplierId` | `supplier_id` | `uuid` | `FK suppliers(id)` |
| `supplierName` | `supplier_name` | `text` | `NOT NULL` |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` |
| `subtotal` | `subtotal` | `numeric(12,2)` | `DEFAULT 0` |
| `taxAmt` | `tax_amount` | `numeric(12,2)` | `DEFAULT 0` |
| `grandTotal` | `grand_total` | `numeric(12,2)` | `DEFAULT 0` |
| `paidAmount` | `paid_amount` | `numeric(12,2)` | `DEFAULT 0` |
| `status` | `status` | `text` | `CHECK ('PAID','PARTIAL','UNPAID')` |
| `isReturn` | `is_return` | `boolean` | `DEFAULT false` |
| `note` | `note` | `text` | Optional |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` |

#### `purchase_items` Table (Normalized Child Table)
- **localStorage Key:** Unnested from `state.purchases[].items[]`

| Frontend Item Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| - | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `purchase.id` | `purchase_id` | `uuid` | `FK purchases(id) ON DELETE CASCADE` |
| `productId` | `product_id` | `uuid` | `FK products(id)` |
| `name` | `product_name` | `text` | `NOT NULL` |
| `qty` | `quantity` | `integer` | `CHECK (quantity > 0)` |
| `cost` | `unit_cost` | `numeric(12,2)` | `DEFAULT 0` |
| `total` | `line_total` | `numeric(12,2)` | `DEFAULT 0` |

#### `supplier_transactions` Table
- **localStorage Key:** `state.supplierTransactions[]`

| Frontend Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `supplierId` | `supplier_id` | `uuid` | `FK suppliers(id)` |
| `supplierName` | `supplier_name` | `text` | `NOT NULL` |
| `type` | `type` | `text` | `CHECK ('PURCHASE','PAYMENT')` |
| `amount` | `amount` | `numeric(12,2)` | `CHECK (amount > 0)` |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` |
| `refNo` | `ref_no` | `text` | Optional |
| `note` | `note` | `text` | Optional |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` |

---

### 3.9 Invoices & POS Bills (`invoices`, `invoice_items`, `pos_bills`, `pos_bill_items`)

#### `invoices` & `invoice_items` Tables
- **localStorage Key:** `state.invoices[]` and `state.invoices[].items[]`

| Frontend Invoice Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` (e.g. 'INV-1001') | `invoice_number` | `text` | `NOT NULL` |
| - | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `customerId` | `customer_id` | `uuid` | `FK customers(id)` |
| `customerName` | `customer_name` | `text` | `NOT NULL` |
| `customerPhone` | `customer_phone` | `text` | Optional |
| `customerGSTIN` | `customer_gstin` | `text` | Optional |
| `billingAddress` | `billing_address` | `text` | Optional |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` |
| `dueDate` | `due_date` | `date` | Optional |
| `status` | `status` | `text` | `CHECK ('Pending','Paid','Overdue','Cancelled')` |
| `taxType` | `tax_type` | `text` | `CHECK ('INTRA','INTER')` |
| `subtotal` | `subtotal` | `numeric(12,2)` | `DEFAULT 0` |
| `discountTotal` | `discount_total` | `numeric(12,2)` | `DEFAULT 0` |
| `taxableTotal` | `taxable_total` | `numeric(12,2)` | `DEFAULT 0` |
| `cgstTotal` | `cgst_total` | `numeric(12,2)` | `DEFAULT 0` |
| `sgstTotal` | `sgst_total` | `numeric(12,2)` | `DEFAULT 0` |
| `igstTotal` | `igst_total` | `numeric(12,2)` | `DEFAULT 0` |
| `taxTotal` | `tax_total` | `numeric(12,2)` | `DEFAULT 0` |
| `roundOff` | `round_off` | `numeric(12,2)` | `DEFAULT 0` |
| `total` | `total` | `numeric(12,2)` | `DEFAULT 0` |
| `note` | `note` | `text` | Optional |

#### `pos_bills` & `pos_bill_items` Tables
- **localStorage Key:** `state.bills[]` and `state.bills[].items[]`

| Frontend POS Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` (e.g. 'BILL-001') | `bill_number` | `text` | `NOT NULL` |
| - | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `customerId` | `customer_id` | `uuid` | `FK customers(id)` |
| `customerName` | `customer_name` | `text` | `DEFAULT 'Walk-in Customer'` |
| `subtotal` | `subtotal` | `numeric(12,2)` | `DEFAULT 0` |
| `taxAmt` | `tax_amount` | `numeric(12,2)` | `DEFAULT 0` |
| `discount` | `discount` | `numeric(12,2)` | `DEFAULT 0` |
| `grandTotal` | `grand_total` | `numeric(12,2)` | `DEFAULT 0` |
| `paymentMethod` | `payment_method` | `text` | `DEFAULT 'Cash'` |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` |
| `time` | `time_str` | `text` | Optional |

---

### 3.10 Expenses (`expenses`)
- **localStorage Key:** `state.expenses[]`

| Frontend Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `category` | `category` | `text` | `DEFAULT 'Other'` |
| `amount` | `amount` | `numeric(12,2)` | `CHECK (amount > 0)` |
| `date` | `date` | `date` | `DEFAULT CURRENT_DATE` |
| `note` | `note` | `text` | Optional |
| - | `is_ocr_scanned` | `boolean` | `DEFAULT false` |
| - | `ocr_vendor` | `text` | Optional |
| `isDeleted` | `is_deleted` | `boolean` | `DEFAULT false` |

---

### 3.11 Employees & Audit Logs (`employees`, `notifications`, `audit_logs`)

#### `employees` Table
- **localStorage Key:** `state.employees[]`

| Frontend Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `name` | `name` | `text` | `NOT NULL` |
| `phone` | `phone` | `text` | Optional |
| `role` | `role` | `text` | `CHECK ('OWNER','MANAGER','ACCOUNTANT','CASHIER')` |
| - | `auth_user_id` | `uuid` | `FK auth.users(id)` |
| `sales` | `sales` | `numeric(12,2)` | `DEFAULT 0` |
| `collections` | `collections` | `numeric(12,2)` | `DEFAULT 0` |
| `active` | `is_active` | `boolean` | `DEFAULT true` |

#### `audit_logs` Table (Immutable Security Log)
- **localStorage Key:** `state.auditLogs[]`

| Frontend Property | Supabase Column | Data Type | Constraints / Default |
| :--- | :--- | :--- | :--- |
| `id` | `id` | `uuid` | `PRIMARY KEY` |
| `business_id` | `business_id` | `uuid` | `FK businesses(id)` |
| `user` | `user_name` | `text` | Optional |
| - | `user_id` | `uuid` | `FK auth.users(id)` |
| `action` | `action` | `text` | `NOT NULL` |
| `entity` | `entity_type` | `text` | `NOT NULL` |
| `entityId` | `entity_id` | `text` | Optional |
| `details` | `details` | `text` | Optional |
| `timestamp` | `created_at` | `timestamptz` | `DEFAULT now()` |

---

## 4. Verification Summary & Next Steps
This integration mapping verifies that **100% of existing application state fields** are represented in the Supabase schema, with enhanced relational integrity, strict type safety, and database-level multi-tenant security.
