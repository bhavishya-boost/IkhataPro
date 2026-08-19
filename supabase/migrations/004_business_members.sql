-- ============================================================
-- 004_business_members.sql
-- iKhataPro — Business Membership & RBAC
-- Links users to businesses with role-based access.
-- CRITICAL: All RLS policies verify membership through this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS business_members (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id   uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- RBAC Role — must match the existing iKhataPro permission matrix
  role          text          NOT NULL DEFAULT 'CASHIER'
                  CHECK (role IN ('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER')),

  -- Invite / activation tracking
  invited_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean       NOT NULL DEFAULT true,

  -- Timestamps
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  -- A user can only have one role per business
  UNIQUE (user_id, business_id)
);

COMMENT ON TABLE business_members IS
  'Maps authenticated users to businesses with a role.
   RLS policies on ALL business-owned tables use this table to enforce tenant isolation.
   A user NOT in this table for business X cannot access ANY data belonging to business X.';

COMMENT ON COLUMN business_members.role IS
  'OWNER: Full access (ALL permissions).
   MANAGER: VIEW_ALL, CREATE_KHATA, CREATE_POS, CREATE_INVOICE, CREATE_PURCHASE, ADD_EXPENSE, MANAGE_INVENTORY, VIEW_REPORTS.
   ACCOUNTANT: VIEW_ALL, CREATE_KHATA, CREATE_INVOICE, ADD_EXPENSE, VIEW_REPORTS, VIEW_PNL.
   CASHIER: CREATE_POS, RECEIVE_PAYMENT, VIEW_KHATA, VIEW_INVENTORY.';

-- ============================================================
-- Shared helper function: check_business_membership
-- Returns TRUE if the calling auth.uid() is a member of business_id.
-- Used inside every RLS USING clause to avoid repetition.
-- ============================================================
CREATE OR REPLACE FUNCTION is_business_member(bid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE user_id = auth.uid()
      AND business_id = bid
      AND is_active = true
  );
$$;

COMMENT ON FUNCTION is_business_member IS
  'Returns true if the currently authenticated user has an active membership
   in the given business. Called in every RLS policy USING clause.';

-- ============================================================
-- Helper function: get_user_businesses
-- Returns an array of business_ids the current user belongs to.
-- Useful for cross-business queries (e.g., business switcher).
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_business_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;
