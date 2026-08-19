-- ============================================================
-- 015_expenses.sql
-- iKhataPro — Business Expenses Table
-- Operational expenses per business.
-- Reflects actual fields from state.js addExpense() and demoData.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id   uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Category — matches existing iKhataPro expense categories
  -- Rent | Salary | Electricity | Transport | Marketing | Maintenance | Packaging | Other
  category      text          NOT NULL DEFAULT 'Other',

  -- Financial — NUMERIC precision
  amount        numeric(12,2) NOT NULL CHECK (amount > 0),

  -- Date
  date          date          NOT NULL DEFAULT CURRENT_DATE,

  -- Notes / description
  note          text,

  -- OCR source flag (from expenses.js AI OCR scanner)
  is_ocr_scanned  boolean     NOT NULL DEFAULT false,
  ocr_vendor      text,                                     -- Vendor name extracted by OCR

  -- Soft delete
  is_deleted    boolean       NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  deleted_by    text,

  -- Actor
  created_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE expenses IS
  'Operational expenses for a business. Used in P&L calculation as operating expenses.
   Categories: Rent, Salary, Electricity, Transport, Marketing, Maintenance, Packaging, Other.
   is_deleted = soft delete — financial history preserved.';

COMMENT ON COLUMN expenses.amount IS
  'Expense amount in rupees. Always positive. Stored as numeric(12,2) — NEVER float.';

COMMENT ON COLUMN expenses.is_ocr_scanned IS
  'True when this expense was auto-created by the AI OCR receipt scanner in expenses.js.';
