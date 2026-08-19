-- ============================================================
-- 018_employees.sql
-- iKhataPro — Employees / Staff Table
-- Shop staff with RBAC roles and performance metrics.
-- Reflects actual fields from state.js getEmployees() and demoData.js employees[].
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Staff identity
  name            text          NOT NULL,
  phone           text,
  email           text,

  -- RBAC role (must match checkPermission matrix in state.js)
  role            text          NOT NULL DEFAULT 'CASHIER'
                    CHECK (role IN ('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER')),

  -- Linked Supabase auth user (NULL until staff accepts invite and registers)
  auth_user_id    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Performance metrics (denormalized — recomputed from bills/transactions)
  sales           numeric(12,2) DEFAULT 0,
  collections     numeric(12,2) DEFAULT 0,

  -- Status
  is_active       boolean       NOT NULL DEFAULT true,

  -- Timestamps
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE employees IS
  'Shop staff / employees per business. Each employee has a role that matches
   the RBAC permission matrix in state.js checkPermission().
   auth_user_id links to Supabase auth when the employee logs in.
   Isolated strictly by business_id.';

COMMENT ON COLUMN employees.auth_user_id IS
  'The Supabase auth.users.id of this employee once they have registered.
   NULL for employees not yet invited or registered. When set, this also
   corresponds to a business_members row with matching role.';

COMMENT ON COLUMN employees.sales IS
  'Denormalized total sales attributed to this employee. Recomputed from pos_bills.';
