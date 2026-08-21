-- ================================================================
-- iKhataPro — COMPLETE SUPABASE FIX & SYNC SCRIPT
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- Project URL: https://szloarrfsqdqfygsogpt.supabase.co
-- ================================================================

-- 1. Create Missing Tables (employees & audit_logs)
CREATE TABLE IF NOT EXISTS public.employees (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid          REFERENCES public.businesses(id) ON DELETE CASCADE,
  name         text          NOT NULL,
  phone        text,
  role         text          NOT NULL DEFAULT 'CASHIER'
                               CHECK (role IN ('OWNER','MANAGER','ACCOUNTANT','CASHIER')),
  auth_user_id uuid          REFERENCES auth.users(id),
  sales        numeric(12,2) DEFAULT 0,
  collections  numeric(12,2) DEFAULT 0,
  is_active    boolean       DEFAULT true,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid          REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_name    text,
  user_id      uuid          REFERENCES auth.users(id),
  action       text          NOT NULL,
  entity_type  text          NOT NULL,
  entity_id    text,
  details      text,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- 2. Grant permissions to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Enable Permissive RLS Policies on all core tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon access (Development/Demo Mode)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon all on %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;
