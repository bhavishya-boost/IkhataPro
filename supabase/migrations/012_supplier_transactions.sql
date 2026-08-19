-- ============================================================
-- 012_supplier_transactions.sql
-- iKhataPro — Supplier Transaction Ledger
-- Records each PURCHASE and PAYMENT against a supplier.
-- Reflects actual fields from state.js createPurchase() and
-- recordSupplierPayment(), and demoData.js supplierTransactions.
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_transactions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Supplier reference
  supplier_id     uuid          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name   text          NOT NULL,                   -- Denormalized for display/history

  -- Transaction type
  type            text          NOT NULL
                    CHECK (type IN (
                      'PURCHASE',   -- Stock purchased from supplier (balance increases)
                      'PAYMENT'     -- Payment made to supplier (balance decreases)
                    )),

  -- Financial — NUMERIC precision
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),

  -- Date
  date            date          NOT NULL DEFAULT CURRENT_DATE,

  -- Reference
  ref_no          text,                                     -- PO number, UPI ref, NEFT/RTGS ref, etc.
  note            text,

  -- Links to source documents
  purchase_id     uuid          REFERENCES purchases(id) ON DELETE SET NULL,
  -- NULL for payment transactions

  -- Soft delete
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,

  -- Actor
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE supplier_transactions IS
  'Ledger of all financial events with each supplier.
   PURCHASE transactions increase supplier balance (we owe more).
   PAYMENT transactions decrease supplier balance (we paid).
   Supplier balance can be reconstructed:
     SUM(amount WHERE type=''PURCHASE'') - SUM(amount WHERE type=''PAYMENT'').
   DO NOT physically delete — financial history must be preserved.';
