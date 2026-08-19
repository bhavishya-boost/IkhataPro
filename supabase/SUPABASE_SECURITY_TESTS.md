# iKhataPro — Supabase Security Tests
## Multi-Tenant Isolation Verification

> Run these tests after executing `MASTER_SCHEMA.sql` in Supabase.  
> All tests must produce the expected result before going live.

---

## Test Setup

Create two separate business users:

```sql
-- User A belongs to Business A (LJS Jewellers)
-- User B belongs to Business B (Sharma Electronics)

-- In Supabase Auth, register:
--   User A: usera@test.com / Password123!
--   User B: userb@test.com / Password123!

-- Then insert businesses and memberships:
INSERT INTO businesses (id, name, owner_name, username, slug, subscription_plan)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'LJS Jewellers', 'Aryan Soni', 'aryan', 'ljs-jewellers', 'PRO'),
  ('00000000-0000-0000-0000-000000000002', 'Sharma Electronics', 'Rahul Sharma', 'rahul', 'sharma-electronics', 'PRO');

-- Add User A as OWNER of Business A
INSERT INTO business_members (user_id, business_id, role)
VALUES ('{user_a_auth_uid}', '00000000-0000-0000-0000-000000000001', 'OWNER');

-- Add User B as OWNER of Business B
INSERT INTO business_members (user_id, business_id, role)
VALUES ('{user_b_auth_uid}', '00000000-0000-0000-0000-000000000002', 'OWNER');

-- Insert test customers for each business
INSERT INTO customers (id, business_id, name, phone, balance)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Test Customer A', '+91 99999 00001', 5000),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Test Customer B', '+91 99999 00002', 3000);
```

---

## Test Cases

---

### TEST 1: User A reads User B's customers → DENIED

**As User A (authenticated):**

```sql
SELECT * FROM customers
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows returned`  
**Reason:** RLS `is_business_member()` returns false for User A on Business B.

**Verification:**
```sql
-- This should also return 0 rows (RLS applies automatically):
SELECT * FROM customers;
-- Returns only Business A customers for User A
```

---

### TEST 2: User A reads User B's transactions → DENIED

**As User A:**
```sql
SELECT * FROM transactions
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows returned`

**Also test direct record access by UUID:**
```sql
SELECT * FROM transactions
WHERE id = '{any_transaction_id_belonging_to_business_b}';
```

**Expected Result:** `0 rows returned`  
**Reason:** UUID knowledge does NOT bypass RLS.

---

### TEST 3: User A reads User B's invoices → DENIED

**As User A:**
```sql
SELECT * FROM invoices
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows returned`

```sql
-- Aggregate test — User A's total cannot include Business B's data
SELECT SUM(total) AS total_invoice_revenue FROM invoices;
-- Must only return Business A's invoice totals
```

---

### TEST 4: User A updates User B's product → DENIED

**As User A:**
```sql
UPDATE products
SET price = 999
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows affected` (RLS silently blocks)

```sql
UPDATE products
SET price = 999
WHERE id = '{product_uuid_from_business_b}';
```

**Expected Result:** `0 rows affected`

---

### TEST 5: User A deletes User B's record → DENIED

**As User A:**
```sql
DELETE FROM customers
WHERE id = '10000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows affected`

```sql
DELETE FROM expenses
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows affected`

---

### TEST 6: User A inserts with User B's business_id → DENIED

**As User A:**
```sql
INSERT INTO customers (business_id, name, phone, balance)
VALUES (
  '00000000-0000-0000-0000-000000000002',  -- Business B's ID
  'Injected Customer',
  '+91 00000 00000',
  0
);
```

**Expected Result:** `ERROR: new row violates row-level security policy`  
**Reason:** `WITH CHECK (is_business_member(business_id))` fails for Business B.

**Also test for transactions:**
```sql
INSERT INTO transactions (business_id, customer_id, customer_name, type, amount)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'Injected Transaction',
  'GAVE',
  99999.00
);
```

**Expected Result:** `ERROR: new row violates row-level security policy`

---

### TEST 7: URL/hash manipulation doesn't bypass security → DENIED

This is a frontend test. The attacker changes the URL:

```
# Normal URL (User A's business):
https://yourapp.com/#dashboard

# Attacker manually changes to Business B's slug:
https://yourapp.com/#shop/sharma-electronics
```

**Test:** When the frontend loads Business B data, it calls Supabase with Business B's UUID.

```javascript
// Frontend attacker code:
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('business_id', 'BUSINESS_B_UUID');
```

**Expected Result:** `data = []` (empty array, 0 rows)  
**Reason:** RLS filters at database level regardless of what business_id the frontend sends.

---

### TEST 8: Direct business_id query returns zero unauthorized rows → CONFIRMED

**As User A, query ANY business_id that is NOT in their membership:**

```sql
-- Try Business B
SELECT COUNT(*) FROM customers WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM transactions WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM invoices WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM expenses WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM pos_bills WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM suppliers WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM purchases WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0

SELECT COUNT(*) FROM audit_logs WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0
```

---

### TEST 9: User A reads User B's audit logs → DENIED

**As User A:**
```sql
SELECT * FROM audit_logs
WHERE business_id = '00000000-0000-0000-0000-000000000002';
```

**Expected Result:** `0 rows returned`

**Also verify audit logs are append-only:**
```sql
-- As any non-service-role user:
UPDATE audit_logs SET action = 'TAMPERED' WHERE id = '{any_audit_log_id}';
-- Expected: ERROR (no UPDATE policy exists on audit_logs)

DELETE FROM audit_logs WHERE id = '{any_audit_log_id}';
-- Expected: ERROR (no DELETE policy exists on audit_logs)
```

---

### TEST 10: User A accesses User B's financial reports → DENIED

P&L data is derived from:
- `pos_bills` (sales)
- `invoices` (GST sales)
- `expenses` (operating expenses)
- `transactions` (collections)

**As User A, query all P&L source tables:**
```sql
-- User A's P&L should NOT include any Business B data
SELECT 
  (SELECT COALESCE(SUM(grand_total), 0) FROM pos_bills) AS pos_sales,
  (SELECT COALESCE(SUM(total), 0) FROM invoices) AS invoice_sales,
  (SELECT COALESCE(SUM(amount), 0) FROM expenses) AS total_expenses;

-- All three values should match ONLY Business A's data.
-- Business B's sales, invoices, and expenses must NOT appear.
```

---

### TEST 11: Business switching doesn't expose unauthorized data

**Setup:** Create User C who belongs to BOTH Business A and Business C.

```sql
INSERT INTO business_members (user_id, business_id, role)
VALUES 
  ('{user_c_uid}', '{business_a_uuid}', 'MANAGER'),
  ('{user_c_uuid}', '{business_c_uuid}', 'OWNER');
```

**Test:** When User C switches to Business A context:
```sql
SELECT * FROM customers WHERE business_id = '{business_a_uuid}';
-- Expected: Business A customers ✅

SELECT * FROM customers WHERE business_id = '{business_b_uuid}';
-- Expected: 0 rows (User C is NOT a member of Business B) ✅
```

**Conclusion:** Business switching is safe — users can only access businesses they are explicitly members of.

---

### TEST 12: Supplier isolation → DENIED

**As User A, attempt to read Business B's suppliers:**
```sql
SELECT * FROM suppliers WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0 rows

SELECT * FROM supplier_transactions WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0 rows

SELECT * FROM purchases WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0 rows
```

---

### TEST 13: Notification isolation → DENIED

```sql
-- As User A:
SELECT * FROM notifications WHERE business_id = '00000000-0000-0000-0000-000000000002';
-- Expected: 0 rows
```

---

## Verification Query — Full Isolation Audit

Run this as User A to confirm zero cross-business leakage across ALL tables:

```sql
SELECT 'customers' AS tbl, COUNT(*) AS unauthorized_rows FROM customers WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'pos_bills', COUNT(*) FROM pos_bills WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'products', COUNT(*) FROM products WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true)
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs WHERE business_id NOT IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND is_active = true);

-- ALL rows in the unauthorized_rows column MUST be 0.
-- Any non-zero value indicates an RLS policy gap.
```

---

## PASS Criteria

| Test | Expected | Status |
|------|----------|--------|
| TEST 1: Read other's customers | 0 rows | ☐ |
| TEST 2: Read other's transactions | 0 rows | ☐ |
| TEST 3: Read other's invoices | 0 rows | ☐ |
| TEST 4: Update other's product | 0 rows affected | ☐ |
| TEST 5: Delete other's record | 0 rows affected | ☐ |
| TEST 6: Insert with other's business_id | RLS ERROR | ☐ |
| TEST 7: URL manipulation | 0 rows | ☐ |
| TEST 8: Direct UUID query | 0 rows | ☐ |
| TEST 9: Read other's audit logs | 0 rows | ☐ |
| TEST 10: Access other's financials | Isolated data only | ☐ |
| TEST 11: Business switch safety | Only authorized data | ☐ |
| TEST 12: Supplier isolation | 0 rows | ☐ |
| TEST 13: Notification isolation | 0 rows | ☐ |
| Full isolation audit query | All zeros | ☐ |

**All tests must PASS before production deployment.**
