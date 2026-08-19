-- ============================================================
-- 009_suppliers.sql
-- iKhataPro — Suppliers Table
-- Wholesale/procurement suppliers per business.
-- Reflects actual fields from state.js addSupplier(), demoData.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id         uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Supplier identity
  name                text          NOT NULL,               -- Contact/person name
  business_name       text,                                 -- Company/firm name (e.g. "ABC Bullion & Wholesale Ltd")

  -- Contact info
  phone               text,
  email               text,
  address             text,

  -- Tax identifiers
  gstin               text,
  pan                 text,

  -- Category (e.g. "Gold & Bullion", "Grocery & FMCG", "Consumer Electronics")
  category            text          DEFAULT 'General Supplier',

  -- Financial balances — NUMERIC precision
  -- balance: Amount currently owed TO the supplier (outstanding payable)
  balance             numeric(12,2) NOT NULL DEFAULT 0,     -- Payable to supplier
  total_purchases     numeric(12,2) NOT NULL DEFAULT 0,     -- Lifetime purchase value
  total_payments      numeric(12,2) NOT NULL DEFAULT 0,     -- Lifetime payments made

  -- Activity
  last_transaction    date,

  -- Status
  is_active           boolean       NOT NULL DEFAULT true,

  -- Notes
  notes               text,

  -- Soft delete
  is_deleted          boolean       NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          text,

  -- Timestamps
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS
  'Wholesale/procurement suppliers per business.
   balance = outstanding amount payable to this supplier.
   Strictly isolated by business_id — Supplier A from Business A is invisible to Business B.';

COMMENT ON COLUMN suppliers.balance IS
  'Outstanding payable to this supplier. Increases on purchase, decreases on payment.
   Reconstructable from supplier_transactions.';

COMMENT ON COLUMN suppliers.total_purchases IS
  'Lifetime gross purchase total from this supplier (including tax). Denormalized for performance.';
