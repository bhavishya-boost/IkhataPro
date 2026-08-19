-- ============================================================
-- 008_transactions.sql
-- iKhataPro — Khata Transactions (GAVE / GOT ledger)
-- Core of the Digital Khata (credit/debit ledger).
-- Reflects actual fields from state.js addKhataTransaction() and demoData.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id   uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Customer reference
  customer_id   uuid          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name text          NOT NULL,                     -- Denormalized for display (customer may be renamed)

  -- Transaction type — the core GAVE/GOT Khata logic
  -- GAVE = Business gave goods/credit to customer (customer balance INCREASES — YOU WILL GET)
  -- GOT  = Business received payment from customer (customer balance DECREASES — YOU WILL GIVE less)
  type          text          NOT NULL CHECK (type IN ('GAVE', 'GOT')),

  -- Financial fields — NUMERIC precision required
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),

  -- Date & time (stored separately to match existing app pattern)
  date          date          NOT NULL DEFAULT CURRENT_DATE,
  time_str      text,                                       -- Display string: "10:30 AM" (for historical compat)

  -- Payment mode
  mode          text,                                       -- Cash | UPI | Credit/Khata | Bank Transfer | Cheque

  -- Note / description
  note          text,

  -- Idempotency token (prevents double-submit in state.js isDuplicateTransaction)
  -- NULL for historical records migrated from localStorage
  idempotency_key text        UNIQUE,

  -- Reference to linked documents (optional)
  -- One of these may be set if this transaction was auto-created by a POS bill or invoice
  source_bill_id    text,     -- BILL-XXXXXX reference
  source_invoice_id text,     -- INV-XXXX reference

  -- Soft delete (matches state.js softDeleteRecord/deleteTransaction)
  is_deleted    boolean       NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  deleted_by    text,                                       -- Username of deleter

  -- Audit trail
  created_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE transactions IS
  'The core Khata ledger for customer credit/debit entries.
   GAVE: business extended credit (goods given, customer balance increases — YOU WILL GET).
   GOT:  business received payment (customer balance decreases).
   Customer running balance can be fully reconstructed by:
     SUM(amount WHERE type=''GAVE'') - SUM(amount WHERE type=''GOT'') for a customer.
   DO NOT physically delete — use is_deleted soft delete.';

COMMENT ON COLUMN transactions.type IS
  'GAVE = credit extended by business (we gave goods/money to customer).
   GOT = payment received from customer.
   This is the fundamental Khata duality. DO NOT change semantics.';

COMMENT ON COLUMN transactions.amount IS
  'Always positive. Direction is determined by type (GAVE/GOT).
   Stored as numeric(12,2) — NEVER float.';

COMMENT ON COLUMN transactions.idempotency_key IS
  'Unique client-generated token to prevent double-submit.
   Maps to state.js processedTxTokens. NULL for migrated historical records.';
