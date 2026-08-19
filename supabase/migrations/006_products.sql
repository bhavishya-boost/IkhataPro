-- ============================================================
-- 006_products.sql
-- iKhataPro — Products Catalog Table
-- Reflects actual fields from state.js addProduct() and demoData.js.
-- Covers inventory catalog, storefront visibility, and margin data.
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id         uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Core identity
  name                text          NOT NULL,
  description         text,
  category            text          DEFAULT 'General',

  -- Identification codes
  sku                 text,                                 -- e.g. "SKU-GLD-01"
  barcode             text,                                 -- e.g. "8901234567890"
  hsn_code            text,                                 -- HSN code for GST invoices

  -- Pricing — NUMERIC for financial precision
  price               numeric(12,2) NOT NULL DEFAULT 0,    -- Selling price
  cost                numeric(12,2) NOT NULL DEFAULT 0,    -- Purchase/cost price (for COGS calculation)

  -- Inventory
  stock               integer       NOT NULL DEFAULT 0,
  min_stock           integer       NOT NULL DEFAULT 5,    -- Low stock threshold (reorder alert trigger)
  unit                text          DEFAULT 'Pcs',          -- Pcs, Kg, Litre, Set, etc.

  -- Storefront visibility (from storefront.js & state.js toggleProductOnlineVisibility)
  is_online_visible   boolean       NOT NULL DEFAULT true,

  -- Image
  image_url           text,

  -- GST configuration
  gst_rate            numeric(5,2)  DEFAULT 18,             -- Default GST % applied on this product in POS/invoices

  -- Soft delete
  is_deleted          boolean       NOT NULL DEFAULT false,
  deleted_at          timestamptz,
  deleted_by          text,

  -- Timestamps
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE products IS
  'Product catalog per business. Contains pricing, stock levels, GST config, and storefront settings.
   Inventory is managed by deducting stock on POS bills and adding on purchases.
   business_id enforces strict tenant isolation.';

COMMENT ON COLUMN products.cost IS
  'Purchase/cost price used for COGS calculation in P&L reports. NEVER use FLOAT.';

COMMENT ON COLUMN products.price IS
  'Retail/selling price. Used in POS billing and invoices.';

COMMENT ON COLUMN products.min_stock IS
  'Low-stock threshold. When stock <= min_stock, triggers reorder alert. Used in inventory.js intelligence.';

COMMENT ON COLUMN products.is_online_visible IS
  'Controls whether product appears on the Digital Storefront (dukaan link). Toggled per product.';
