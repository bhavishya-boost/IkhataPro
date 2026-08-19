-- ============================================================
-- 011_purchase_items.sql
-- iKhataPro — Purchase Order Line Items
-- One row per product line within a purchase order.
-- Reflects actual fields from state.js createPurchase() parsedItems.
-- ============================================================

CREATE TABLE IF NOT EXISTS purchase_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (denormalized for simpler RLS)
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Parent purchase
  purchase_id     uuid          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  -- CASCADE is safe here: purchase_items are NOT independent financial records.
  -- If a purchase is (soft) deleted, its items are meaningless alone.
  -- Physical delete of purchase_items is acceptable if the purchase is also removed.
  -- Note: we soft-delete purchases; purchase_items cascade to maintain referential consistency.

  -- Product reference (nullable: item might be ad-hoc without a product catalog entry)
  product_id      uuid          REFERENCES products(id) ON DELETE SET NULL,
  product_name    text          NOT NULL,                   -- Denormalized for historical display

  -- Line quantities and pricing — ALL NUMERIC
  quantity        integer       NOT NULL CHECK (quantity > 0),
  unit_cost       numeric(12,2) NOT NULL DEFAULT 0,         -- Cost per unit at time of purchase
  line_total      numeric(12,2) NOT NULL DEFAULT 0,         -- quantity × unit_cost

  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE purchase_items IS
  'Line items for each purchase order. One row = one product line.
   unit_cost records the actual cost at purchase time for COGS accuracy.
   product_id may be NULL for ad-hoc items without a catalog product.';

COMMENT ON COLUMN purchase_items.unit_cost IS
  'Cost price per unit at time of purchase. Used to update products.cost and for inventory COGS.
   Stored as numeric(12,2) — NEVER float.';
