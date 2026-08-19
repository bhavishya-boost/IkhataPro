-- ============================================================
-- 017_pos_bill_items.sql
-- iKhataPro — POS Bill Line Items
-- One row per product sold in a POS bill.
-- Reflects actual fields from state.js savePOSBill() items array.
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_bill_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (denormalized for simpler RLS)
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Parent bill
  bill_id         uuid          NOT NULL REFERENCES pos_bills(id) ON DELETE CASCADE,
  -- CASCADE: bill items are meaningless without their parent bill.

  -- Product reference (set at time of sale — product may be deleted later)
  product_id      uuid          REFERENCES products(id) ON DELETE SET NULL,
  product_name    text          NOT NULL,                   -- Denormalized for historical display

  -- Quantity and pricing — NUMERIC precision
  quantity        integer       NOT NULL CHECK (quantity > 0),
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,         -- Price per unit at time of sale
  line_total      numeric(12,2) NOT NULL DEFAULT 0,         -- quantity × unit_price

  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE pos_bill_items IS
  'Line items for each POS bill. Captures price and product at the moment of sale.
   product_id may become NULL if product is later soft-deleted — product_name is preserved.
   line_total = quantity × unit_price. All monetary values are numeric(12,2).';

COMMENT ON COLUMN pos_bill_items.unit_price IS
  'Selling price per unit AT THE TIME of the sale. Preserved for historical accuracy even if
   product price changes later. NEVER float.';
