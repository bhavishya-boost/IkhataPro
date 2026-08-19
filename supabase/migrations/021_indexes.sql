-- ============================================================
-- 021_indexes.sql
-- iKhataPro — Performance Indexes
-- Covers all critical query paths: tenant scoping, date ranges,
-- customer lookups, supplier lookups, product searches.
-- ============================================================

-- ─── businesses ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_slug
  ON businesses (slug);

-- ─── business_members ───────────────────────────────────────
-- The most critical index — used in EVERY RLS policy check
CREATE INDEX IF NOT EXISTS idx_bm_user_business
  ON business_members (user_id, business_id);

CREATE INDEX IF NOT EXISTS idx_bm_business
  ON business_members (business_id);

-- ─── customers ──────────────────────────────────────────────
-- Tenant scoping (used in every getCustomers() call)
CREATE INDEX IF NOT EXISTS idx_customers_business_id
  ON customers (business_id);

-- Composite: tenant + soft-delete filter (most common query)
CREATE INDEX IF NOT EXISTS idx_customers_business_active
  ON customers (business_id, is_deleted);

-- Phone lookup
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON customers (business_id, phone);

-- Segmentation / overdue queries
CREATE INDEX IF NOT EXISTS idx_customers_balance
  ON customers (business_id, balance);

-- PTP date alerts
CREATE INDEX IF NOT EXISTS idx_customers_ptp_date
  ON customers (business_id, ptp_date)
  WHERE ptp_date IS NOT NULL AND is_deleted = false;

-- Fuzzy name search (uses pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING gin (name gin_trgm_ops);

-- ─── products ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_business_id
  ON products (business_id);

CREATE INDEX IF NOT EXISTS idx_products_business_active
  ON products (business_id, is_deleted);

-- SKU and barcode lookups (POS scan)
CREATE INDEX IF NOT EXISTS idx_products_sku
  ON products (business_id, sku);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON products (business_id, barcode);

-- Low stock alerts
CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products (business_id, stock)
  WHERE is_deleted = false;

-- Storefront visibility
CREATE INDEX IF NOT EXISTS idx_products_online_visible
  ON products (business_id, is_online_visible)
  WHERE is_deleted = false AND is_online_visible = true;

-- Fuzzy name search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin (name gin_trgm_ops);

-- ─── inventory_movements ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_movements_business_product
  ON inventory_movements (business_id, product_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_product_date
  ON inventory_movements (product_id, created_at DESC);

-- ─── transactions ────────────────────────────────────────────
-- Most critical: tenant + customer + date for ledger queries
CREATE INDEX IF NOT EXISTS idx_transactions_business_id
  ON transactions (business_id);

CREATE INDEX IF NOT EXISTS idx_transactions_customer_id
  ON transactions (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_business_date
  ON transactions (business_id, date DESC);

-- Composite for date-ranged P&L and cash flow reports
CREATE INDEX IF NOT EXISTS idx_transactions_business_date_type
  ON transactions (business_id, date DESC, type);

-- Idempotency key lookup (double-submit prevention)
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency
  ON transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── suppliers ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_business_id
  ON suppliers (business_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_business_active
  ON suppliers (business_id, is_deleted);

-- ─── purchases ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchases_business_id
  ON purchases (business_id);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id
  ON purchases (business_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchases_business_date
  ON purchases (business_id, date DESC);

-- ─── purchase_items ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id
  ON purchase_items (purchase_id);

CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id
  ON purchase_items (business_id, product_id);

-- ─── supplier_transactions ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_supplier_tx_business_id
  ON supplier_transactions (business_id);

CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier_id
  ON supplier_transactions (business_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_tx_date
  ON supplier_transactions (business_id, date DESC);

-- ─── invoices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_business_id
  ON invoices (business_id);

CREATE INDEX IF NOT EXISTS idx_invoices_business_date
  ON invoices (business_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
  ON invoices (business_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices (business_id, status)
  WHERE is_deleted = false;

-- ─── invoice_items ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_business_id
  ON invoice_items (business_id);

-- ─── expenses ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_business_id
  ON expenses (business_id);

-- Date-ranged P&L expense queries
CREATE INDEX IF NOT EXISTS idx_expenses_business_date
  ON expenses (business_id, date DESC);

-- Category-based reporting
CREATE INDEX IF NOT EXISTS idx_expenses_business_category
  ON expenses (business_id, category);

-- ─── pos_bills ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pos_bills_business_id
  ON pos_bills (business_id);

CREATE INDEX IF NOT EXISTS idx_pos_bills_business_date
  ON pos_bills (business_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_pos_bills_customer_id
  ON pos_bills (business_id, customer_id);

-- ─── pos_bill_items ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_bill_id
  ON pos_bill_items (bill_id);

CREATE INDEX IF NOT EXISTS idx_pos_bill_items_product_id
  ON pos_bill_items (business_id, product_id);

-- ─── employees ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_business_id
  ON employees (business_id);

CREATE INDEX IF NOT EXISTS idx_employees_auth_user
  ON employees (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ─── notifications ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_business_id
  ON notifications (business_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (business_id, user_id, is_read)
  WHERE is_read = false;

-- ─── audit_logs ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id
  ON audit_logs (business_id);

-- Time-ordered audit trail (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created
  ON audit_logs (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (business_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (business_id, action);
