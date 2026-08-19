-- ================================================================
-- iKhataPro — MASTER_SCHEMA.sql
-- Complete database schema in correct execution order.
-- 
-- HOW TO USE:
-- 1. Open your Supabase project dashboard
-- 2. Go to SQL Editor → New Query
-- 3. Paste this entire file
-- 4. Click RUN
-- 
-- SAFE: Uses CREATE IF NOT EXISTS — safe to re-run.
-- DOES NOT: Drop tables, truncate data, or destroy existing data.
-- ================================================================

-- ════════════════════════════════════════════════════════════
-- STEP 1: Extensions
-- ════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ════════════════════════════════════════════════════════════
-- STEP 2: businesses
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS businesses (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text          NOT NULL,
  owner_name          text          NOT NULL,
  username            text          UNIQUE NOT NULL,
  slug                text          UNIQUE NOT NULL,
  email               text,
  mobile              text,
  address             text,
  city                text,
  state               text,
  pincode             text,
  business_type       text,
  gstin               text,
  pan                 text,
  logo                text          DEFAULT '🏪',
  store_active        boolean       DEFAULT true,
  store_tagline       text,
  delivery_fee        numeric(12,2) DEFAULT 0,
  min_order_amount    numeric(12,2) DEFAULT 0,
  whatsapp_number     text,
  subscription_plan   text          NOT NULL DEFAULT 'PRO'
                        CHECK (subscription_plan IN ('FREE', 'PRO', 'ENTERPRISE')),
  to_receive_total    numeric(12,2) DEFAULT 0,
  to_give_total       numeric(12,2) DEFAULT 0,
  today_sales         numeric(12,2) DEFAULT 0,
  today_received      numeric(12,2) DEFAULT 0,
  health_score        integer       DEFAULT 80 CHECK (health_score BETWEEN 0 AND 100),
  currency            text          DEFAULT 'INR',
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 3: profiles (extends auth.users)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text,
  avatar_url    text,
  phone         text,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ════════════════════════════════════════════════════════════
-- STEP 4: business_members + helper functions
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS business_members (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id   uuid          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role          text          NOT NULL DEFAULT 'CASHIER'
                  CHECK (role IN ('OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER')),
  invited_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean       NOT NULL DEFAULT true,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);

CREATE OR REPLACE FUNCTION is_business_member(bid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members
    WHERE user_id = auth.uid() AND business_id = bid AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION get_user_business_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT business_id FROM business_members
  WHERE user_id = auth.uid() AND is_active = true;
$$;

-- ════════════════════════════════════════════════════════════
-- STEP 5: customers
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name                  text          NOT NULL,
  phone                 text,
  email                 text,
  city                  text,
  address               text,
  notes                 text,
  balance               numeric(12,2) NOT NULL DEFAULT 0,
  balance_type          text          GENERATED ALWAYS AS (
                          CASE WHEN balance > 0 THEN 'GET'
                               WHEN balance < 0 THEN 'GIVE'
                               ELSE 'SETTLED' END
                        ) STORED,
  category              text          DEFAULT 'Regular',
  score                 integer       DEFAULT 85 CHECK (score BETWEEN 0 AND 100),
  is_bad_debt           boolean       NOT NULL DEFAULT false,
  ptp_date              date,
  ptp_amount            numeric(12,2),
  ptp_note              text,
  last_transaction_date date,
  days_since_last_activity integer,
  last_active           text,
  total_purchase_vol    numeric(12,2) DEFAULT 0,
  payment_behavior_pct  integer       DEFAULT 100,
  is_deleted            boolean       NOT NULL DEFAULT false,
  deleted_at            timestamptz,
  deleted_by            text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 6: products
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS products (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name                text          NOT NULL,
  description         text,
  category            text          DEFAULT 'General',
  sku                 text,
  barcode             text,
  hsn_code            text,
  price               numeric(12,2) NOT NULL DEFAULT 0,
  cost                numeric(12,2) NOT NULL DEFAULT 0,
  stock               integer       NOT NULL DEFAULT 0,
  min_stock           integer       NOT NULL DEFAULT 5,
  unit                text          DEFAULT 'Pcs',
  is_online_visible   boolean       NOT NULL DEFAULT true,
  image_url           text,
  gst_rate            numeric(5,2)  DEFAULT 18,
  is_deleted          boolean       NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 7: inventory_movements
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_movements (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  product_id      uuid          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type   text          NOT NULL
                    CHECK (movement_type IN ('SALE','PURCHASE','RESTOCK','RETURN','ADJUSTMENT')),
  quantity        integer       NOT NULL,
  stock_before    integer       NOT NULL,
  stock_after     integer       NOT NULL,
  reference_type  text,
  reference_id    text,
  unit_cost       numeric(12,2) DEFAULT 0,
  note            text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 8: transactions (Khata)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  customer_id     uuid          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name   text          NOT NULL,
  type            text          NOT NULL CHECK (type IN ('GAVE', 'GOT')),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  time_str        text,
  mode            text,
  note            text,
  idempotency_key text          UNIQUE,
  source_bill_id  text,
  source_invoice_id text,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 9: suppliers
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS suppliers (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name                text          NOT NULL,
  business_name       text,
  phone               text,
  email               text,
  address             text,
  gstin               text,
  pan                 text,
  category            text          DEFAULT 'General Supplier',
  balance             numeric(12,2) NOT NULL DEFAULT 0,
  total_purchases     numeric(12,2) NOT NULL DEFAULT 0,
  total_payments      numeric(12,2) NOT NULL DEFAULT 0,
  last_transaction    date,
  is_active           boolean       NOT NULL DEFAULT true,
  notes               text,
  is_deleted          boolean       NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 10: purchases
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchases (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  supplier_id     uuid          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name   text          NOT NULL,
  po_number       text          NOT NULL,
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2)  DEFAULT 18,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  grand_total     numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount     numeric(12,2) NOT NULL DEFAULT 0,
  status          text          NOT NULL DEFAULT 'UNPAID'
                    CHECK (status IN ('PAID','PARTIAL','UNPAID')),
  is_return       boolean       NOT NULL DEFAULT false,
  note            text,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 11: purchase_items
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS purchase_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  purchase_id     uuid          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id      uuid          REFERENCES products(id) ON DELETE SET NULL,
  product_name    text          NOT NULL,
  quantity        integer       NOT NULL CHECK (quantity > 0),
  unit_cost       numeric(12,2) NOT NULL DEFAULT 0,
  line_total      numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 12: supplier_transactions
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS supplier_transactions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  supplier_id     uuid          NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name   text          NOT NULL,
  type            text          NOT NULL CHECK (type IN ('PURCHASE','PAYMENT')),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  ref_no          text,
  note            text,
  purchase_id     uuid          REFERENCES purchases(id) ON DELETE SET NULL,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 13: invoices
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  invoice_number  text          NOT NULL,
  customer_id     uuid          REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text          NOT NULL,
  customer_phone  text,
  customer_gstin  text,
  billing_address text,
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  due_date        date,
  status          text          NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending','Paid','Overdue','Cancelled')),
  tax_type        text          NOT NULL DEFAULT 'INTRA'
                    CHECK (tax_type IN ('INTRA','INTER')),
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  discount_total  numeric(12,2) NOT NULL DEFAULT 0,
  taxable_total   numeric(12,2) NOT NULL DEFAULT 0,
  cgst_total      numeric(12,2) NOT NULL DEFAULT 0,
  sgst_total      numeric(12,2) NOT NULL DEFAULT 0,
  igst_total      numeric(12,2) NOT NULL DEFAULT 0,
  tax_total       numeric(12,2) NOT NULL DEFAULT 0,
  round_off       numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,
  note            text,
  is_credit       boolean       NOT NULL DEFAULT false,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 14: invoice_items
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  invoice_id      uuid          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_name       text          NOT NULL,
  hsn_code        text,
  unit            text          DEFAULT 'Pcs',
  quantity        numeric(10,3) NOT NULL DEFAULT 1,
  rate            numeric(12,2) NOT NULL DEFAULT 0,
  discount        numeric(12,2) NOT NULL DEFAULT 0,
  taxable_val     numeric(12,2) NOT NULL DEFAULT 0,
  tax_rate        numeric(5,2)  NOT NULL DEFAULT 18,
  cgst            numeric(12,2) NOT NULL DEFAULT 0,
  sgst            numeric(12,2) NOT NULL DEFAULT 0,
  igst            numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,
  sort_order      integer       DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 15: expenses
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS expenses (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  category        text          NOT NULL DEFAULT 'Other',
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  note            text,
  is_ocr_scanned  boolean       NOT NULL DEFAULT false,
  ocr_vendor      text,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 16: pos_bills
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pos_bills (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  bill_number     text          NOT NULL,
  customer_id     uuid          REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   text          NOT NULL DEFAULT 'Walk-in Customer',
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  discount        numeric(12,2) NOT NULL DEFAULT 0,
  grand_total     numeric(12,2) NOT NULL DEFAULT 0,
  payment_method  text          NOT NULL DEFAULT 'Cash',
  date            date          NOT NULL DEFAULT CURRENT_DATE,
  time_str        text,
  is_credit       boolean       NOT NULL DEFAULT false,
  is_deleted      boolean       NOT NULL DEFAULT false,
  deleted_at      timestamptz,
  deleted_by      text,
  created_by      uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 17: pos_bill_items
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pos_bill_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  bill_id         uuid          NOT NULL REFERENCES pos_bills(id) ON DELETE CASCADE,
  product_id      uuid          REFERENCES products(id) ON DELETE SET NULL,
  product_name    text          NOT NULL,
  quantity        integer       NOT NULL CHECK (quantity > 0),
  unit_price      numeric(12,2) NOT NULL DEFAULT 0,
  line_total      numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 18: employees
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS employees (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name            text          NOT NULL,
  phone           text,
  email           text,
  role            text          NOT NULL DEFAULT 'CASHIER'
                    CHECK (role IN ('OWNER','MANAGER','ACCOUNTANT','CASHIER')),
  auth_user_id    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  sales           numeric(12,2) DEFAULT 0,
  collections     numeric(12,2) DEFAULT 0,
  is_active       boolean       NOT NULL DEFAULT true,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 19: notifications
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  user_id         uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  type            text          NOT NULL DEFAULT 'INFO',
  title           text          NOT NULL,
  message         text          NOT NULL,
  entity_type     text,
  entity_id       text,
  is_read         boolean       NOT NULL DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 20: audit_logs (IMMUTABLE)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  user_id         uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name       text,
  action          text          NOT NULL,
  entity_type     text          NOT NULL,
  entity_id       text,
  details         text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- STEP 21: Indexes
-- ════════════════════════════════════════════════════════════

-- business_members (most critical — used in every RLS check)
CREATE INDEX IF NOT EXISTS idx_bm_user_business ON business_members (user_id, business_id);
CREATE INDEX IF NOT EXISTS idx_bm_business ON business_members (business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (slug);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_business_active ON customers (business_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (business_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_balance ON customers (business_id, balance);
CREATE INDEX IF NOT EXISTS idx_customers_ptp_date ON customers (business_id, ptp_date) WHERE ptp_date IS NOT NULL AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);

-- products
CREATE INDEX IF NOT EXISTS idx_products_business_active ON products (business_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products (business_id, stock) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- inventory_movements
CREATE INDEX IF NOT EXISTS idx_inv_movements_business_product ON inventory_movements (business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_product_date ON inventory_movements (product_id, created_at DESC);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions (business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_business_date ON transactions (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_business_date_type ON transactions (business_id, date DESC, type);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- suppliers & purchases
CREATE INDEX IF NOT EXISTS idx_suppliers_business_active ON suppliers (business_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_purchases_business_date ON purchases (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases (business_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier_id ON supplier_transactions (business_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_date ON supplier_transactions (business_id, date DESC);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_business_date ON invoices (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (business_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_business_category ON expenses (business_id, category);

-- pos
CREATE INDEX IF NOT EXISTS idx_pos_bills_business_date ON pos_bills (business_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_pos_bills_customer_id ON pos_bills (business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_bill_id ON pos_bill_items (bill_id);
CREATE INDEX IF NOT EXISTS idx_pos_bill_items_product_id ON pos_bill_items (business_id, product_id);

-- employees, notifications, audit
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees (business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (business_id, user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created ON audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (business_id, entity_type, entity_id);

-- ════════════════════════════════════════════════════════════
-- STEP 22: Enable Row Level Security
-- ════════════════════════════════════════════════════════════
ALTER TABLE businesses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members       ENABLE ROW LEVEL SECURITY;
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

-- ════════════════════════════════════════════════════════════
-- STEP 23: RLS Policies
-- ════════════════════════════════════════════════════════════

-- profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- businesses
CREATE POLICY businesses_select_member ON businesses FOR SELECT USING (is_business_member(id));
CREATE POLICY businesses_insert_authenticated ON businesses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY businesses_update_owner ON businesses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM business_members WHERE user_id=auth.uid() AND business_id=businesses.id AND role='OWNER' AND is_active=true))
  WITH CHECK (EXISTS (SELECT 1 FROM business_members WHERE user_id=auth.uid() AND business_id=businesses.id AND role='OWNER' AND is_active=true));

-- business_members
CREATE POLICY bm_select_own ON business_members FOR SELECT USING (user_id=auth.uid() OR is_business_member(business_id));
CREATE POLICY bm_insert_owner ON business_members FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM business_members bm2 WHERE bm2.user_id=auth.uid() AND bm2.business_id=business_members.business_id AND bm2.role='OWNER' AND bm2.is_active=true));
CREATE POLICY bm_update_owner ON business_members FOR UPDATE USING (EXISTS (SELECT 1 FROM business_members bm2 WHERE bm2.user_id=auth.uid() AND bm2.business_id=business_members.business_id AND bm2.role='OWNER' AND bm2.is_active=true));
CREATE POLICY bm_delete_owner ON business_members FOR DELETE USING (EXISTS (SELECT 1 FROM business_members bm2 WHERE bm2.user_id=auth.uid() AND bm2.business_id=business_members.business_id AND bm2.role='OWNER' AND bm2.is_active=true) AND business_members.user_id <> auth.uid());

-- customers
CREATE POLICY customers_select ON customers FOR SELECT USING (is_business_member(business_id));
CREATE POLICY customers_insert ON customers FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY customers_update ON customers FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY customers_delete ON customers FOR DELETE USING (is_business_member(business_id));

-- products
CREATE POLICY products_select ON products FOR SELECT USING (is_business_member(business_id));
CREATE POLICY products_insert ON products FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY products_update ON products FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY products_delete ON products FOR DELETE USING (is_business_member(business_id));

-- inventory_movements (append-only: no UPDATE/DELETE policies)
CREATE POLICY inv_movements_select ON inventory_movements FOR SELECT USING (is_business_member(business_id));
CREATE POLICY inv_movements_insert ON inventory_movements FOR INSERT WITH CHECK (is_business_member(business_id));

-- transactions
CREATE POLICY transactions_select ON transactions FOR SELECT USING (is_business_member(business_id));
CREATE POLICY transactions_insert ON transactions FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY transactions_update ON transactions FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY transactions_delete ON transactions FOR DELETE USING (is_business_member(business_id));

-- suppliers
CREATE POLICY suppliers_select ON suppliers FOR SELECT USING (is_business_member(business_id));
CREATE POLICY suppliers_insert ON suppliers FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY suppliers_update ON suppliers FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY suppliers_delete ON suppliers FOR DELETE USING (is_business_member(business_id));

-- purchases
CREATE POLICY purchases_select ON purchases FOR SELECT USING (is_business_member(business_id));
CREATE POLICY purchases_insert ON purchases FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY purchases_update ON purchases FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY purchases_delete ON purchases FOR DELETE USING (is_business_member(business_id));

-- purchase_items
CREATE POLICY purchase_items_select ON purchase_items FOR SELECT USING (is_business_member(business_id));
CREATE POLICY purchase_items_insert ON purchase_items FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY purchase_items_delete ON purchase_items FOR DELETE USING (is_business_member(business_id));

-- supplier_transactions
CREATE POLICY supplier_tx_select ON supplier_transactions FOR SELECT USING (is_business_member(business_id));
CREATE POLICY supplier_tx_insert ON supplier_transactions FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY supplier_tx_update ON supplier_transactions FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));

-- invoices
CREATE POLICY invoices_select ON invoices FOR SELECT USING (is_business_member(business_id));
CREATE POLICY invoices_insert ON invoices FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY invoices_update ON invoices FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY invoices_delete ON invoices FOR DELETE USING (is_business_member(business_id));

-- invoice_items
CREATE POLICY invoice_items_select ON invoice_items FOR SELECT USING (is_business_member(business_id));
CREATE POLICY invoice_items_insert ON invoice_items FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY invoice_items_delete ON invoice_items FOR DELETE USING (is_business_member(business_id));

-- expenses
CREATE POLICY expenses_select ON expenses FOR SELECT USING (is_business_member(business_id));
CREATE POLICY expenses_insert ON expenses FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY expenses_update ON expenses FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY expenses_delete ON expenses FOR DELETE USING (is_business_member(business_id));

-- pos_bills
CREATE POLICY pos_bills_select ON pos_bills FOR SELECT USING (is_business_member(business_id));
CREATE POLICY pos_bills_insert ON pos_bills FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY pos_bills_update ON pos_bills FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY pos_bills_delete ON pos_bills FOR DELETE USING (is_business_member(business_id));

-- pos_bill_items
CREATE POLICY pos_bill_items_select ON pos_bill_items FOR SELECT USING (is_business_member(business_id));
CREATE POLICY pos_bill_items_insert ON pos_bill_items FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY pos_bill_items_delete ON pos_bill_items FOR DELETE USING (is_business_member(business_id));

-- employees
CREATE POLICY employees_select ON employees FOR SELECT USING (is_business_member(business_id));
CREATE POLICY employees_insert ON employees FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY employees_update ON employees FOR UPDATE USING (is_business_member(business_id)) WITH CHECK (is_business_member(business_id));
CREATE POLICY employees_delete ON employees FOR DELETE USING (is_business_member(business_id));

-- notifications
CREATE POLICY notifications_select ON notifications FOR SELECT USING (is_business_member(business_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY notifications_insert ON notifications FOR INSERT WITH CHECK (is_business_member(business_id));
CREATE POLICY notifications_update ON notifications FOR UPDATE USING (is_business_member(business_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY notifications_delete ON notifications FOR DELETE USING (is_business_member(business_id));

-- audit_logs (SELECT + INSERT only — append-only, no UPDATE/DELETE)
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT USING (is_business_member(business_id));
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT WITH CHECK (is_business_member(business_id));

-- ════════════════════════════════════════════════════════════
-- DONE
-- iKhataPro schema is ready.
-- Run this file in Supabase SQL Editor to create the complete database.
-- ════════════════════════════════════════════════════════════
