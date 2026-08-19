-- ============================================================
-- 001_extensions.sql
-- iKhataPro — Enable Required PostgreSQL Extensions
-- Run this FIRST before any other migration file.
-- ============================================================

-- Enable UUID generation (gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable uuid-ossp for uuid_generate_v4() (alternate UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for fuzzy text search on customer/product names
CREATE EXTENSION IF NOT EXISTS pg_trgm;
