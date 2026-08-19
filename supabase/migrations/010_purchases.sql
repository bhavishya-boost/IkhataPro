-- ============================================================
-- 010_purchases.sql
-- iKhataPro — Purchase Orders Table
-- Stock purchases from suppliers.
-- Reflects actual fields from state.js createPurchase() and demoData.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Supplier reference
  supplier_id     uuid          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name   text          NOT NULL,                   -- Denormalized for display/history

  -- Purchase Order number (e.g. PO-9001)
  po_number       text          NOT NULL,                   -- Human-readable reference number

  -- Date
  date            date          NOT NULL DEFAULT CURRENT_DATE,

  -- Financials — ALL NUMERIC(12,2) — NEVER float
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2)  DEFAULT 18,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  grand_total     numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount     numeric(12,2) NOT NULL DEFAULT 0,

  -- Status
  status          text          NOT NULL DEFAULT 'UNPAID'
                    CHECK (status IN ('PAID', 'PARTIAL', 'UNPAID')),

  -- Purchase type
  is_return       boolean       NOT NULL DEFAULT false,      -- True for purchase returns

  -- Notes / reference
  note            text,

  -- Soft delete
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,

  -- Actor
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE purchases IS
  'Stock purchase orders from suppliers.
   Each purchase has line items in purchase_items table.
   grand_total - paid_amount = outstanding payable.
   Soft-delete only — financial history must never be physically deleted.';

COMMENT ON COLUMN purchases.po_number IS
  'Human-readable purchase order number (e.g. PO-9001). Used in supplier_transactions refNo.';

COMMENT ON COLUMN purchases.is_return IS
  'When true, this is a purchase return. Inventory quantities in purchase_items become negative.';
