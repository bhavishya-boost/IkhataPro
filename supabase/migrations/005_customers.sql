-- ============================================================
-- 005_customers.sql
-- iKhataPro — Customers Table
-- Customers belong strictly to one business.
-- Reflects the actual fields used in state.js, demoData.js,
-- customers.js, and ptpScheduler.js.
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation — MANDATORY on every business-owned table
  business_id           uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Core identity
  name                  text          NOT NULL,
  phone                 text,
  email                 text,
  city                  text,
  address               text,
  notes                 text,

  -- Khata balance (denormalized for performance; reconstructable from transactions)
  -- Positive = Business is owed money (YOU WILL GET)
  -- Negative = Business owes customer (YOU WILL GIVE)
  balance               numeric(12,2) NOT NULL DEFAULT 0,

  -- Khata type derived from balance: GET | GIVE | SETTLED
  balance_type          text          GENERATED ALWAYS AS (
                          CASE
                            WHEN balance > 0  THEN 'GET'
                            WHEN balance < 0  THEN 'GIVE'
                            ELSE 'SETTLED'
                          END
                        ) STORED,

  -- CRM segmentation (computed by recalculateTotals/computeCustomerSegments in state.js)
  category              text          DEFAULT 'Regular',
                          -- VIP | High Value | Regular | New | Overdue | At Risk | Inactive | Bad Debt
  score                 integer       DEFAULT 85 CHECK (score BETWEEN 0 AND 100),

  -- Credit risk flags (from customers.js toggleBadDebt)
  is_bad_debt           boolean       NOT NULL DEFAULT false,

  -- PTP — Promise-To-Pay fields (from ptpScheduler.js)
  ptp_date              date,
  ptp_amount            numeric(12,2),
  ptp_note              text,

  -- Activity tracking (used in segmentation)
  last_transaction_date date,
  days_since_last_activity integer,
  last_active           text,                               -- Display string: "Today", "Yesterday", "5 days ago"

  -- Lifetime stats (recomputed from bills + invoices + transactions)
  total_purchase_vol    numeric(12,2) DEFAULT 0,
  payment_behavior_pct  integer       DEFAULT 100,          -- % of transactions that were GOT (payment received)

  -- Soft delete (matches iKhataPro softDeleteRecord/restoreRecord)
  is_deleted            boolean       NOT NULL DEFAULT false,
  deleted_at            timestamptz,
  deleted_by            text,                               -- Username of deleter (pre-migration: text; post-migration: uuid)

  -- Timestamps
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE customers IS
  'Customer ledger accounts. business_id enforces tenant isolation.
   balance is a denormalized running total reconstructable from transactions.
   One customer belongs to exactly one business.';

COMMENT ON COLUMN customers.balance IS
  'Denormalized running balance. Positive = customer owes the business (YOU WILL GET).
   Negative = business owes customer (YOU WILL GIVE). Updated on every Khata transaction.';

COMMENT ON COLUMN customers.is_bad_debt IS
  'When true, new credit (GAVE) transactions are blocked. Matches customers.js toggleBadDebt logic.';

COMMENT ON COLUMN customers.ptp_date IS
  'Promise-To-Pay date set by the merchant. From ptpScheduler.js. NULL if no PTP set.';
