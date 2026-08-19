-- ============================================================
-- 007_inventory_movements.sql
-- iKhataPro — Inventory Movement Log
-- Tracks every stock change event for auditability.
-- POS sales, purchases, manual restocks, and returns.
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Product reference
  product_id      uuid          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Movement type
  movement_type   text          NOT NULL
                    CHECK (movement_type IN (
                      'SALE',         -- Stock deducted on POS bill
                      'PURCHASE',     -- Stock added on purchase order
                      'RESTOCK',      -- Manual restock by owner
                      'RETURN',       -- Purchase return (negative movement)
                      'ADJUSTMENT'    -- Manual stock correction
                    )),

  -- Quantity change (positive = stock increase, negative = stock decrease)
  quantity        integer       NOT NULL,

  -- Stock level snapshot after this movement
  stock_before    integer       NOT NULL,
  stock_after     integer       NOT NULL,

  -- Source references (one of these will be set depending on movement type)
  reference_type  text,                                     -- 'POS_BILL' | 'PURCHASE' | 'RESTOCK' | 'MANUAL'
  reference_id    text,                                     -- The bill_id, purchase_id, or PO number

  -- Unit cost at time of movement (for COGS tracking)
  unit_cost       numeric(12,2) DEFAULT 0,

  -- Notes
  note            text,

  -- Actor
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory_movements IS
  'Immutable ledger of all inventory stock changes per product per business.
   DO NOT DELETE rows — this is the audit trail for stock integrity.
   Stock can be reconstructed by replaying all movements for a product.';

COMMENT ON COLUMN inventory_movements.quantity IS
  'Signed quantity delta. Negative for sales/returns. Positive for purchases/restocks.';

COMMENT ON COLUMN inventory_movements.unit_cost IS
  'Purchase cost at time of movement. Used for COGS calculation in P&L.';
