# iKhataPro — Database Schema Reference

> **Version:** Phase 10 — Supabase PostgreSQL Schema  
> **Status:** Generated from inspection of Phases 1–9 application code  
> **Architecture:** Multi-tenant, Row Level Security, financial-grade precision

---

## Architecture Overview

```
Browser (iKhataPro Frontend)
         ↓
Supabase Auth (auth.uid())
         ↓
PostgreSQL + RLS
         ↓
Row Level Security → verifies business_members
         ↓
Business-scoped data
```

---

## Tenant Isolation Model

```
auth.users
    ↓ (1:1)
profiles

auth.users
    ↓ (many-to-many via)
business_members
    ↓ (scopes access to)
businesses
    ↓ (owns)
customers / products / transactions / invoices / expenses / ...
```

**ABSOLUTE RULE:** A user can ONLY access data for businesses where they have an active row in `business_members`.

---

## Table Reference

### `businesses`
Top-level tenant table. Every data row in the system belongs to one business.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Auto-generated UUID |
| `name` | text | Business display name |
| `owner_name` | text | Primary owner name |
| `username` | text UNIQUE | Login username |
| `slug` | text UNIQUE | URL-safe identifier (e.g. `ljs-jewellers`) |
| `email` | text | Business email |
| `mobile` | text | Mobile number |
| `gstin` | text | GST Identification Number |
| `pan` | text | PAN card number |
| `subscription_plan` | text | FREE \| PRO \| ENTERPRISE |
| `to_receive_total` | numeric(12,2) | Denormalized: sum of positive customer balances |
| `to_give_total` | numeric(12,2) | Denormalized: sum of negative balances + supplier payables |
| `today_sales` | numeric(12,2) | Denormalized today's sales KPI |
| `store_active` | boolean | Is digital storefront live? |

---

### `profiles`
Extends `auth.users` (1:1 relationship).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK → auth.users | Must match auth user ID |
| `full_name` | text | Display name |
| `avatar_url` | text | Profile image URL |
| `phone` | text | User phone |

---

### `business_members`
Maps users to businesses with RBAC roles. **The security boundary table.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `user_id` | uuid → auth.users | The authenticated user |
| `business_id` | uuid → businesses | The business they belong to |
| `role` | text | OWNER \| MANAGER \| ACCOUNTANT \| CASHIER |
| `is_active` | boolean | Whether membership is active |
| `invited_by` | uuid → auth.users | Who invited this member |

**RBAC Permission Matrix:**

| Permission | OWNER | MANAGER | ACCOUNTANT | CASHIER |
|-----------|-------|---------|------------|---------|
| VIEW_ALL | ✅ | ✅ | ✅ | ❌ |
| CREATE_KHATA | ✅ | ✅ | ✅ | ❌ |
| CREATE_POS | ✅ | ✅ | ❌ | ✅ |
| CREATE_INVOICE | ✅ | ✅ | ✅ | ❌ |
| CREATE_PURCHASE | ✅ | ✅ | ❌ | ❌ |
| ADD_EXPENSE | ✅ | ✅ | ✅ | ❌ |
| MANAGE_INVENTORY | ✅ | ✅ | ❌ | ❌ |
| VIEW_REPORTS / PNL | ✅ | ✅ | ✅ | ❌ |
| RECEIVE_PAYMENT | ✅ | ✅ | ✅ | ✅ |
| VIEW_INVENTORY | ✅ | ✅ | ✅ | ✅ |

---

### `customers`
Customer ledger accounts per business.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | **Tenant key** |
| `name` | text | Customer name |
| `phone` | text | Contact number |
| `balance` | numeric(12,2) | Running balance. + = YOU WILL GET, − = YOU WILL GIVE |
| `balance_type` | text GENERATED | GET \| GIVE \| SETTLED (computed from balance) |
| `category` | text | VIP \| High Value \| Regular \| New \| Overdue \| At Risk \| Inactive \| Bad Debt |
| `score` | integer 0-100 | Trust/credit score |
| `is_bad_debt` | boolean | Credit frozen flag |
| `ptp_date` | date | Promise-To-Pay date |
| `ptp_amount` | numeric(12,2) | Promised payment amount |
| `is_deleted` | boolean | Soft delete flag |

---

### `products`
Product catalog per business.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | **Tenant key** |
| `name` | text | Product name |
| `sku` | text | Stock Keeping Unit code |
| `barcode` | text | Barcode for POS scanning |
| `hsn_code` | text | HSN code for GST |
| `price` | numeric(12,2) | Selling price |
| `cost` | numeric(12,2) | Purchase/cost price (COGS) |
| `stock` | integer | Current quantity in stock |
| `min_stock` | integer | Low stock threshold |
| `is_online_visible` | boolean | Visible on digital storefront |
| `gst_rate` | numeric(5,2) | Default GST % for this product |
| `is_deleted` | boolean | Soft delete |

---

### `inventory_movements`
Immutable stock movement log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | |
| `product_id` | uuid → products | |
| `movement_type` | text | SALE \| PURCHASE \| RESTOCK \| RETURN \| ADJUSTMENT |
| `quantity` | integer | Signed delta (negative for deductions) |
| `stock_before` | integer | Stock level before movement |
| `stock_after` | integer | Stock level after movement |
| `unit_cost` | numeric(12,2) | Cost at time of movement (COGS) |
| `reference_id` | text | Bill/PO reference number |

---

### `transactions`
The core Khata (credit/debit) ledger.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | **Tenant key** |
| `customer_id` | uuid → customers | |
| `type` | text | **GAVE** (credit given) \| **GOT** (payment received) |
| `amount` | numeric(12,2) | Always positive. Direction = type |
| `date` | date | Transaction date |
| `mode` | text | Cash \| UPI \| Bank Transfer \| Cheque \| Credit/Khata |
| `idempotency_key` | text UNIQUE | Double-submit prevention token |
| `is_deleted` | boolean | Soft delete |

**Balance Formula:**  
`customer.balance = SUM(amount WHERE type='GAVE') - SUM(amount WHERE type='GOT')`

---

### `suppliers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | **Tenant key** |
| `name` | text | Contact name |
| `business_name` | text | Company/firm name |
| `gstin` | text | Supplier GSTIN |
| `balance` | numeric(12,2) | Outstanding payable to this supplier |
| `total_purchases` | numeric(12,2) | Lifetime purchase total |
| `total_payments` | numeric(12,2) | Lifetime payments made |

---

### `purchases`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | |
| `supplier_id` | uuid → suppliers | |
| `po_number` | text | Human-readable PO number (e.g. PO-9001) |
| `grand_total` | numeric(12,2) | Total including tax |
| `paid_amount` | numeric(12,2) | Amount paid |
| `status` | text | PAID \| PARTIAL \| UNPAID |
| `is_return` | boolean | Purchase return flag |

### `purchase_items`

| Column | Type | Description |
|--------|------|-------------|
| `purchase_id` | uuid → purchases CASCADE | |
| `product_id` | uuid → products SET NULL | Nullable for ad-hoc items |
| `quantity` | integer | |
| `unit_cost` | numeric(12,2) | Cost at purchase time |

---

### `supplier_transactions`

| Column | Type | Description |
|--------|------|-------------|
| `supplier_id` | uuid → suppliers | |
| `type` | text | PURCHASE \| PAYMENT |
| `amount` | numeric(12,2) | Always positive |
| `ref_no` | text | PO no., UPI/NEFT ref |

---

### `invoices`
GST tax invoices (B2B and B2C).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `business_id` | uuid → businesses | |
| `invoice_number` | text | e.g. INV-1001 |
| `customer_gstin` | text | Customer's GSTIN |
| `tax_type` | text | INTRA (CGST+SGST) \| INTER (IGST) |
| `taxable_total` | numeric(12,2) | Base for GST calculation |
| `cgst_total` | numeric(12,2) | Central GST |
| `sgst_total` | numeric(12,2) | State GST |
| `igst_total` | numeric(12,2) | Integrated GST (interstate) |
| `round_off` | numeric(12,2) | Rounding adjustment |
| `total` | numeric(12,2) | Grand total |
| `status` | text | Pending \| Paid \| Overdue \| Cancelled |

### `invoice_items`

| Column | Type | Description |
|--------|------|-------------|
| `invoice_id` | uuid → invoices CASCADE | |
| `hsn_code` | text | HSN/SAC code |
| `quantity` | numeric(10,3) | Decimal quantity |
| `rate` | numeric(12,2) | Unit selling rate |
| `taxable_val` | numeric(12,2) | (qty × rate) - discount |
| `tax_rate` | numeric(5,2) | GST % applied |
| `cgst / sgst / igst` | numeric(12,2) | Tax component amounts |

---

### `expenses`

| Column | Type | Description |
|--------|------|-------------|
| `business_id` | uuid → businesses | |
| `category` | text | Rent \| Salary \| Electricity \| Transport \| Marketing \| Maintenance \| Packaging \| Other |
| `amount` | numeric(12,2) | |
| `date` | date | |
| `is_ocr_scanned` | boolean | Created via AI OCR scanner |

---

### `pos_bills`
POS counter sales.

| Column | Type | Description |
|--------|------|-------------|
| `business_id` | uuid → businesses | |
| `bill_number` | text | e.g. BILL-001 |
| `customer_id` | uuid → customers SET NULL | NULL for walk-in |
| `payment_method` | text | Cash \| UPI \| Credit \| Cheque \| Bank Transfer |
| `grand_total` | numeric(12,2) | |
| `is_credit` | boolean | Auto-created Khata GAVE entry |

### `pos_bill_items`

| Column | Type | Description |
|--------|------|-------------|
| `bill_id` | uuid → pos_bills CASCADE | |
| `product_id` | uuid → products SET NULL | Preserved even if product deleted |
| `unit_price` | numeric(12,2) | Price AT TIME OF SALE |

---

### `employees`

| Column | Type | Description |
|--------|------|-------------|
| `business_id` | uuid → businesses | |
| `role` | text | OWNER \| MANAGER \| ACCOUNTANT \| CASHIER |
| `auth_user_id` | uuid → auth.users SET NULL | Linked when staff registers |
| `sales` | numeric(12,2) | Attributed sales (denormalized) |
| `collections` | numeric(12,2) | Collections (denormalized) |

---

### `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `business_id` | uuid → businesses | |
| `user_id` | uuid → auth.users | NULL = broadcast to all business members |
| `type` | text | LOW_STOCK \| OVERDUE_PAYMENT \| PTP_DUE \| etc. |
| `is_read` | boolean | Read status |

---

### `audit_logs`
**IMMUTABLE** — no UPDATE or DELETE allowed via RLS.

| Column | Type | Description |
|--------|------|-------------|
| `business_id` | uuid → businesses | |
| `user_id` | uuid → auth.users | Actor |
| `action` | text | CUSTOMER_ADDED \| KHATA_TRANSACTION \| POS_BILL_CREATED \| etc. |
| `entity_type` | text | Customer \| Invoice \| POS \| etc. |
| `entity_id` | text | ID of affected entity |
| `details` | text | Human-readable description |

---

## Key Relationships

```
businesses
  ├── business_members (many)     → auth.users (many)
  ├── customers (many)
  │     └── transactions (many)
  ├── products (many)
  │     └── inventory_movements (many)
  ├── suppliers (many)
  │     ├── purchases (many)
  │     │     └── purchase_items (many)
  │     └── supplier_transactions (many)
  ├── invoices (many)
  │     └── invoice_items (many)
  ├── pos_bills (many)
  │     └── pos_bill_items (many)
  ├── expenses (many)
  ├── employees (many)
  ├── notifications (many)
  └── audit_logs (many)
```

---

## Foreign Key ON DELETE Rules

| Relationship | Rule | Rationale |
|---|---|---|
| `profiles` → `auth.users` | CASCADE | Profile deleted when user deleted |
| `business_members` → `auth.users` | CASCADE | Membership removed when user deleted |
| `business_members` → `businesses` | CASCADE | Remove memberships when business deleted |
| `customers` → `businesses` | **RESTRICT** | Cannot delete business with customers |
| `transactions` → `customers` | **RESTRICT** | Cannot delete customer with transactions |
| `purchases` → `suppliers` | **RESTRICT** | Cannot delete supplier with purchases |
| `purchase_items` → `purchases` | CASCADE | Items deleted with parent purchase |
| `invoice_items` → `invoices` | CASCADE | Items deleted with parent invoice |
| `pos_bill_items` → `pos_bills` | CASCADE | Items deleted with parent bill |
| `pos_bills.product_id` → `products` | SET NULL | Bill preserved if product deleted |
| `invoices.customer_id` → `customers` | SET NULL | Invoice preserved if customer deleted |

> **RESTRICT** on financial tables protects data integrity. Physical deletion of parents with financial history is blocked.

---

## RLS Security Model

Every business-owned table has:
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Policies that verify `is_business_member(business_id)` from `business_members`

The `is_business_member(bid)` helper function:
```sql
SELECT EXISTS (
  SELECT 1 FROM business_members
  WHERE user_id = auth.uid()
    AND business_id = bid
    AND is_active = true
);
```

**Security Proof:** Even if a user knows another business's UUID, knowing it a record's UUID, or manipulating the URL/frontend — PostgreSQL RLS will return zero rows for unauthorized access at the database level.

---

## Financial Precision

All monetary columns use `numeric(12,2)`. **NEVER float or real.**

This covers:
- `amount`, `balance`, `price`, `cost`, `grand_total`, `subtotal`
- `cgst`, `sgst`, `igst`, `tax_total`, `round_off`, `total`
- `paid_amount`, `unit_cost`, `line_total`, `taxable_val`
- All KPI denormalized fields in `businesses`
