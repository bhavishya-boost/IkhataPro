-- ================================================================
-- iKhataPro — FIX_SYNC_PERMISSIONS.sql
-- Run this in Supabase SQL Editor to resolve RLS & "permission denied" errors.
-- Target Supabase Project: https://szloarrfsqdqfygsogpt.supabase.co
-- ================================================================

-- 1. Grant full table privileges to anon, authenticated, and service_role
GRANT ALL ON TABLE public.businesses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.products TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.purchases TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.purchase_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.supplier_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.invoices TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.invoice_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.expenses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pos_bills TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pos_bill_items TO anon, authenticated, service_role;

-- Grant sequence usages if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Permissive RLS Policies for Customers
DROP POLICY IF EXISTS "Allow anon customer select" ON public.customers;
CREATE POLICY "Allow anon customer select" ON public.customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon customer insert" ON public.customers;
CREATE POLICY "Allow anon customer insert" ON public.customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon customer update" ON public.customers;
CREATE POLICY "Allow anon customer update" ON public.customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon customer delete" ON public.customers;
CREATE POLICY "Allow anon customer delete" ON public.customers FOR DELETE USING (true);

-- 3. Permissive RLS Policies for Transactions
DROP POLICY IF EXISTS "Allow anon transaction select" ON public.transactions;
CREATE POLICY "Allow anon transaction select" ON public.transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon transaction insert" ON public.transactions;
CREATE POLICY "Allow anon transaction insert" ON public.transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon transaction update" ON public.transactions;
CREATE POLICY "Allow anon transaction update" ON public.transactions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon transaction delete" ON public.transactions;
CREATE POLICY "Allow anon transaction delete" ON public.transactions FOR DELETE USING (true);

-- 4. Permissive RLS Policies for Businesses
DROP POLICY IF EXISTS "Allow anon business select" ON public.businesses;
CREATE POLICY "Allow anon business select" ON public.businesses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon business insert" ON public.businesses;
CREATE POLICY "Allow anon business insert" ON public.businesses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon business update" ON public.businesses;
CREATE POLICY "Allow anon business update" ON public.businesses FOR UPDATE USING (true);
