-- ============================================================
-- 016_pos_bills.sql
-- iKhataPro — POS Bills (Counter Sales) Table
-- Point-of-sale billing records.
-- Reflects actual fields from state.js savePOSBill() and demoData.js bills[].
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_bills (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Bill number (human-readable: BILL-XXXXXX)
  bill_number     text          NOT NULL,

  -- Customer (optional — walk-in customers have no customer_id)
  customer_id     uuid          REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text          NOT NULL DEFAULT 'Walk-in Customer',

  -- Financials — ALL NUMERIC(12,2)
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  discount        numeric(12,2) NOT NULL DEFAULT 0,
  grand_total     numeric(12,2) NOT NULL DEFAULT 0,

  -- Payment method
  payment_method  text          NOT NULL DEFAULT 'Cash',
  -- Cash | UPI | Credit | Cheque | Bank Transfer | Card

  -- Date & time (stored separately to match existing app pattern)
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  time_str        text,                                     -- Display: "09:30 AM"

  -- Whether this bill created a Khata (credit) entry
  -- True when payment_method = 'Credit' and customer_id is set
  is_credit       boolean       NOT NULL DEFAULT false,

  -- Soft delete
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,

  -- Actor
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE pos_bills IS
  'POS counter sale bills. Each bill has line items in pos_bill_items.
   Walk-in customers have customer_id = NULL.
   Credit sales (payment_method = Credit) automatically create a GAVE transaction in Khata.
   DO NOT physically delete — use is_deleted for soft delete.';

COMMENT ON COLUMN pos_bills.grand_total IS
  'Grand total = subtotal + tax_amount - discount. Stored as numeric(12,2).';

COMMENT ON COLUMN pos_bills.is_credit IS
  'True when this POS sale was on credit and created a corresponding Khata GAVE entry.';
