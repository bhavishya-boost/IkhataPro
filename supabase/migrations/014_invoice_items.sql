-- ============================================================
-- 014_invoice_items.sql
-- iKhataPro — GST Invoice Line Items
-- One row per product line within a GST invoice.
-- Reflects actual fields from state.js createGSTInvoice() items array.
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (denormalized for simpler RLS)
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Parent invoice
  invoice_id      uuid          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  -- CASCADE: invoice_items are meaningless without their parent invoice.
  -- Physical deletion of items is acceptable when parent invoice is removed.

  -- Item details
  item_name       text          NOT NULL,
  hsn_code        text,                                     -- HSN/SAC code for GST compliance
  unit            text          DEFAULT 'Pcs',              -- Pcs, Kg, Set, Litre, etc.

  -- Pricing & quantity — ALL NUMERIC(12,2)
  quantity        numeric(10,3) NOT NULL DEFAULT 1,         -- Decimal qty (e.g. 1.5 Kg)
  rate            numeric(12,2) NOT NULL DEFAULT 0,         -- Unit selling rate

  -- Discount
  discount        numeric(12,2) NOT NULL DEFAULT 0,         -- Discount per line in rupees

  -- Taxable value
  taxable_val     numeric(12,2) NOT NULL DEFAULT 0,         -- (qty × rate) - discount

  -- GST rate applied on this line item
  tax_rate        numeric(5,2)  NOT NULL DEFAULT 18,

  -- GST breakdown — ALL NUMERIC(12,2)
  cgst            numeric(12,2) NOT NULL DEFAULT 0,
  sgst            numeric(12,2) NOT NULL DEFAULT 0,
  igst            numeric(12,2) NOT NULL DEFAULT 0,

  -- Line total = taxable_val + cgst + sgst + igst
  total           numeric(12,2) NOT NULL DEFAULT 0,

  -- Position / sort order
  sort_order      integer       DEFAULT 0,

  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE invoice_items IS
  'Line items for each GST invoice. Supports both INTRA (CGST+SGST) and INTER (IGST) tax modes.
   All monetary values are numeric(12,2). NEVER use float.
   Line total = taxable_val + cgst + sgst + igst.';

COMMENT ON COLUMN invoice_items.taxable_val IS
  'Taxable base for this line = (quantity × rate) - discount. GST is calculated on this value.';

COMMENT ON COLUMN invoice_items.hsn_code IS
  'HSN (Harmonized System of Nomenclature) or SAC code. Required for B2B GST compliance.
   Example: 7113 for jewellery, 8528 for TVs, 0901 for groceries.';
