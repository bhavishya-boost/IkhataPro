-- ============================================================
-- 013_invoices.sql
-- iKhataPro — GST Invoices Table
-- Professional GST tax invoices (B2B and B2C).
-- Reflects actual fields from state.js createGSTInvoice() and demoData.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Invoice number (human-readable: INV-1001)
  invoice_number  text          NOT NULL,

  -- Customer reference
  customer_id     uuid          REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text          NOT NULL,
  customer_phone  text,
  customer_gstin  text,
  billing_address text,

  -- Dates
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  due_date        date,

  -- Status
  status          text          NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),

  -- GST Type
  tax_type        text          NOT NULL DEFAULT 'INTRA'
                    CHECK (tax_type IN ('INTRA', 'INTER')),
  -- INTRA = same state (CGST + SGST split)
  -- INTER = interstate (IGST only)

  -- Financials — ALL NUMERIC(12,2) — NEVER float
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,         -- Sum of (qty × rate) before discounts
  discount_total  numeric(12,2) NOT NULL DEFAULT 0,         -- Total discount across all items
  taxable_total   numeric(12,2) NOT NULL DEFAULT 0,         -- Subtotal - discounts (taxable base)
  cgst_total      numeric(12,2) NOT NULL DEFAULT 0,
  sgst_total      numeric(12,2) NOT NULL DEFAULT 0,
  igst_total      numeric(12,2) NOT NULL DEFAULT 0,
  tax_total       numeric(12,2) NOT NULL DEFAULT 0,         -- cgst + sgst + igst
  round_off       numeric(12,2) NOT NULL DEFAULT 0,         -- Rounding adjustment
  total           numeric(12,2) NOT NULL DEFAULT 0,         -- Grand total (taxable + tax + round_off)

  -- Notes / payment terms
  note            text,

  -- Whether this invoice created a Khata (credit) entry
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

COMMENT ON TABLE invoices IS
  'GST tax invoices. Supports INTRA (CGST+SGST) and INTER (IGST) tax types.
   Line items are stored in invoice_items table.
   Financial amounts use numeric(12,2) — NEVER float.
   DO NOT physically delete — use is_deleted.';

COMMENT ON COLUMN invoices.taxable_total IS
  'The amount on which GST is calculated. = subtotal - discount_total.';

COMMENT ON COLUMN invoices.round_off IS
  'Rounding adjustment to reach a whole rupee grand total. May be positive or negative.';

COMMENT ON COLUMN invoices.is_credit IS
  'When true, this invoice automatically created a GAVE Khata transaction for the customer.';
