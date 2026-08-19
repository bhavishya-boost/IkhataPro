-- ============================================================
-- 023_rls_policies.sql
-- iKhataPro — Row Level Security Policies
-- The ABSOLUTE SECURITY BOUNDARY for all business data.
-- 
-- RULE: User A MUST NEVER see User B's data.
-- Every policy uses is_business_member(business_id) from 004_business_members.sql
-- 
-- Policy naming convention:
--   [table]_[operation]_own_business
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- PROFILES — Users can only read/update their own profile
-- ════════════════════════════════════════════════════════════

CREATE POLICY profiles_select_own
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- BUSINESSES — Users can only see businesses they are members of
-- ════════════════════════════════════════════════════════════

CREATE POLICY businesses_select_member
  ON businesses FOR SELECT
  USING (is_business_member(id));

CREATE POLICY businesses_insert_authenticated
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- After insert, the creating user MUST be immediately added to business_members as OWNER.

CREATE POLICY businesses_update_owner
  ON businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_members
      WHERE business_members.user_id = auth.uid()
        AND business_members.business_id = businesses.id
        AND business_members.role = 'OWNER'
        AND business_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members
      WHERE business_members.user_id = auth.uid()
        AND business_members.business_id = businesses.id
        AND business_members.role = 'OWNER'
        AND business_members.is_active = true
    )
  );

-- NO DELETE policy on businesses — use is_active or account closure workflow instead.


-- ════════════════════════════════════════════════════════════
-- BUSINESS_MEMBERS — Users can see their own memberships.
-- Owners can manage their team.
-- ════════════════════════════════════════════════════════════

CREATE POLICY bm_select_own
  ON business_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_business_member(business_id)
  );

CREATE POLICY bm_insert_owner
  ON business_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members bm2
      WHERE bm2.user_id = auth.uid()
        AND bm2.business_id = business_members.business_id
        AND bm2.role = 'OWNER'
        AND bm2.is_active = true
    )
  );

CREATE POLICY bm_update_owner
  ON business_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM business_members bm2
      WHERE bm2.user_id = auth.uid()
        AND bm2.business_id = business_members.business_id
        AND bm2.role = 'OWNER'
        AND bm2.is_active = true
    )
  );

-- Owners can remove team members (but not themselves without a safeguard)
CREATE POLICY bm_delete_owner
  ON business_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM business_members bm2
      WHERE bm2.user_id = auth.uid()
        AND bm2.business_id = business_members.business_id
        AND bm2.role = 'OWNER'
        AND bm2.is_active = true
    )
    AND business_members.user_id <> auth.uid() -- Cannot remove yourself
  );


-- ════════════════════════════════════════════════════════════
-- CUSTOMERS — Strictly scoped to authorized business members
-- ════════════════════════════════════════════════════════════

CREATE POLICY customers_select_own_business
  ON customers FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY customers_insert_own_business
  ON customers FOR INSERT
  WITH CHECK (is_business_member(business_id));
-- The business_id in the INSERT must be one the user is a member of.

CREATE POLICY customers_update_own_business
  ON customers FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));
-- WITH CHECK prevents changing business_id to another business.

CREATE POLICY customers_delete_own_business
  ON customers FOR DELETE
  USING (is_business_member(business_id));
-- Only soft delete is expected, but physical delete also gated.


-- ════════════════════════════════════════════════════════════
-- PRODUCTS
-- ════════════════════════════════════════════════════════════

CREATE POLICY products_select_own_business
  ON products FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY products_insert_own_business
  ON products FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY products_update_own_business
  ON products FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY products_delete_own_business
  ON products FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- INVENTORY_MOVEMENTS
-- ════════════════════════════════════════════════════════════

CREATE POLICY inv_movements_select_own_business
  ON inventory_movements FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY inv_movements_insert_own_business
  ON inventory_movements FOR INSERT
  WITH CHECK (is_business_member(business_id));

-- NO UPDATE / DELETE on inventory_movements — it is an immutable audit log.
-- If correction needed, insert a compensating movement (ADJUSTMENT type).


-- ════════════════════════════════════════════════════════════
-- TRANSACTIONS (KHATA)
-- ════════════════════════════════════════════════════════════

CREATE POLICY transactions_select_own_business
  ON transactions FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY transactions_insert_own_business
  ON transactions FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY transactions_update_own_business
  ON transactions FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));
-- Allows soft-delete (updating is_deleted flag)

-- Physical delete is gated (only soft-delete expected in application)
CREATE POLICY transactions_delete_own_business
  ON transactions FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- SUPPLIERS
-- ════════════════════════════════════════════════════════════

CREATE POLICY suppliers_select_own_business
  ON suppliers FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY suppliers_insert_own_business
  ON suppliers FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY suppliers_update_own_business
  ON suppliers FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY suppliers_delete_own_business
  ON suppliers FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- PURCHASES
-- ════════════════════════════════════════════════════════════

CREATE POLICY purchases_select_own_business
  ON purchases FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY purchases_insert_own_business
  ON purchases FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY purchases_update_own_business
  ON purchases FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY purchases_delete_own_business
  ON purchases FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- PURCHASE_ITEMS
-- ════════════════════════════════════════════════════════════

CREATE POLICY purchase_items_select_own_business
  ON purchase_items FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY purchase_items_insert_own_business
  ON purchase_items FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY purchase_items_delete_own_business
  ON purchase_items FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- SUPPLIER_TRANSACTIONS
-- ════════════════════════════════════════════════════════════

CREATE POLICY supplier_tx_select_own_business
  ON supplier_transactions FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY supplier_tx_insert_own_business
  ON supplier_transactions FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY supplier_tx_update_own_business
  ON supplier_transactions FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- INVOICES
-- ════════════════════════════════════════════════════════════

CREATE POLICY invoices_select_own_business
  ON invoices FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY invoices_insert_own_business
  ON invoices FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY invoices_update_own_business
  ON invoices FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY invoices_delete_own_business
  ON invoices FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- INVOICE_ITEMS
-- ════════════════════════════════════════════════════════════

CREATE POLICY invoice_items_select_own_business
  ON invoice_items FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY invoice_items_insert_own_business
  ON invoice_items FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY invoice_items_delete_own_business
  ON invoice_items FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- EXPENSES
-- ════════════════════════════════════════════════════════════

CREATE POLICY expenses_select_own_business
  ON expenses FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY expenses_insert_own_business
  ON expenses FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY expenses_update_own_business
  ON expenses FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY expenses_delete_own_business
  ON expenses FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- POS_BILLS
-- ════════════════════════════════════════════════════════════

CREATE POLICY pos_bills_select_own_business
  ON pos_bills FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY pos_bills_insert_own_business
  ON pos_bills FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY pos_bills_update_own_business
  ON pos_bills FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY pos_bills_delete_own_business
  ON pos_bills FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- POS_BILL_ITEMS
-- ════════════════════════════════════════════════════════════

CREATE POLICY pos_bill_items_select_own_business
  ON pos_bill_items FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY pos_bill_items_insert_own_business
  ON pos_bill_items FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY pos_bill_items_delete_own_business
  ON pos_bill_items FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- EMPLOYEES
-- ════════════════════════════════════════════════════════════

CREATE POLICY employees_select_own_business
  ON employees FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY employees_insert_own_business
  ON employees FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY employees_update_own_business
  ON employees FOR UPDATE
  USING (is_business_member(business_id))
  WITH CHECK (is_business_member(business_id));

CREATE POLICY employees_delete_own_business
  ON employees FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- User sees notifications where:
--   (a) user_id = their uid AND business is theirs, OR
--   (b) user_id IS NULL (broadcast) AND business is theirs
-- ════════════════════════════════════════════════════════════

CREATE POLICY notifications_select_own
  ON notifications FOR SELECT
  USING (
    is_business_member(business_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY notifications_insert_own_business
  ON notifications FOR INSERT
  WITH CHECK (is_business_member(business_id));

CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  USING (
    is_business_member(business_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY notifications_delete_own_business
  ON notifications FOR DELETE
  USING (is_business_member(business_id));


-- ════════════════════════════════════════════════════════════
-- AUDIT_LOGS
-- SELECT: Members of the business can read their own audit logs.
-- INSERT: Any authenticated member can insert (logAudit).
-- UPDATE: DENIED for all users (logs are immutable).
-- DELETE: DENIED for all users (logs are immutable).
-- ════════════════════════════════════════════════════════════

CREATE POLICY audit_logs_select_own_business
  ON audit_logs FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY audit_logs_insert_own_business
  ON audit_logs FOR INSERT
  WITH CHECK (is_business_member(business_id));

-- NO UPDATE policy on audit_logs.
-- NO DELETE policy on audit_logs.
-- Without an explicit policy, these operations are denied by RLS default.
-- This makes audit_logs effectively append-only for all user-level access.
