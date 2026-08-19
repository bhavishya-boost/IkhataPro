-- ============================================================
-- 022_rls_enable.sql
-- iKhataPro — Enable Row Level Security on ALL business-owned tables
-- RLS must be enabled BEFORE policies are created.
-- ============================================================

-- ─── Core tenant tables ──────────────────────────────────────
ALTER TABLE businesses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members       ENABLE ROW LEVEL SECURITY;

-- ─── Business-owned data tables ──────────────────────────────
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases              ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_bills              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_bill_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs             ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: After enabling RLS, NO rows are accessible until explicit policies grant access.
-- NEVER create policies with USING (true) for business-owned data.
-- Every policy must verify auth.uid() membership via is_business_member().
