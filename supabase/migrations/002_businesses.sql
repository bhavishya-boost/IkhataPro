-- ============================================================
-- 002_businesses.sql
-- iKhataPro — Businesses (Tenants) Table
-- Every business is a fully isolated tenant.
-- ============================================================

CREATE TABLE IF NOT EXISTS businesses (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic identity
  name                text          NOT NULL,
  owner_name          text          NOT NULL,
  username            text          UNIQUE NOT NULL,
  slug                text          UNIQUE NOT NULL,        -- URL-safe identifier e.g. "ljs-jewellers"

  -- Contact info
  email               text,
  mobile              text,
  address             text,
  city                text,
  state               text,
  pincode             text,

  -- Business details
  business_type       text,                                 -- e.g. "Jewellery & Retail", "Electronics"
  gstin               text,
  pan                 text,
  logo                text          DEFAULT '🏪',           -- emoji or image URL

  -- Store / online settings
  store_active        boolean       DEFAULT true,
  store_tagline       text,
  delivery_fee        numeric(12,2) DEFAULT 0,
  min_order_amount    numeric(12,2) DEFAULT 0,
  whatsapp_number     text,

  -- Subscription plan: FREE | PRO | ENTERPRISE
  subscription_plan   text          NOT NULL DEFAULT 'PRO'
                        CHECK (subscription_plan IN ('FREE', 'PRO', 'ENTERPRISE')),

  -- Cached KPI fields (denormalized for dashboard performance)
  to_receive_total    numeric(12,2) DEFAULT 0,
  to_give_total       numeric(12,2) DEFAULT 0,
  today_sales         numeric(12,2) DEFAULT 0,
  today_received      numeric(12,2) DEFAULT 0,
  health_score        integer       DEFAULT 80 CHECK (health_score BETWEEN 0 AND 100),

  -- Currency (INR default, future-proofed)
  currency            text          DEFAULT 'INR',

  -- Timestamps
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE businesses IS
  'Top-level tenant. Every business is completely isolated via business_id foreign key and RLS.';

COMMENT ON COLUMN businesses.slug IS
  'URL-safe slug. Used in storefront links and workspace routing.';

COMMENT ON COLUMN businesses.to_receive_total IS
  'Denormalized cached sum of outstanding customer balances (YOU WILL GET). Recomputed on mutations.';
