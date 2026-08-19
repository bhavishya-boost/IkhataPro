-- ============================================================
-- 020_audit_logs.sql
-- iKhataPro — Audit Logs Table
-- Immutable audit trail for all business data mutations.
-- Reflects actual fields from state.js logAudit() and demoData.js auditLogs[].
-- SECURITY: Normal users CANNOT delete audit logs. Owner-only soft flag.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Actor (Supabase auth user who performed the action)
  user_id         uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name       text,                                     -- Denormalized display name (for historical records)

  -- What happened
  action          text          NOT NULL,
  -- Examples from state.js logAudit():
  -- CUSTOMER_ADDED | KHATA_TRANSACTION | POS_BILL_CREATED | INVOICE_CREATED
  -- SUPPLIER_CREATED | SUPPLIER_PAYMENT | PURCHASE_CREATED
  -- PRODUCT_ADDED | PRODUCT_RESTOCKED | EXPENSE_ADDED
  -- RECORD_SOFT_DELETED | RECORD_RESTORED | BACKUP_EXPORTED | BACKUP_RESTORED
  -- USER_LOGIN | USER_LOGOUT | BUSINESS_SWITCHED | BUSINESS_REGISTER
  -- SUBSCRIPTION_CHANGED

  -- What was affected
  entity_type     text          NOT NULL,                   -- 'Customer' | 'Invoice' | 'POS' | 'Session' | etc.
  entity_id       text,                                     -- ID of the affected entity

  -- Human-readable detail string (HTML-escaped in state.js escapeHTML)
  details         text,

  -- Client context (for future multi-device sync tracking)
  ip_address      inet,
  user_agent      text,

  -- Timestamp — always UTC
  created_at      timestamptz   NOT NULL DEFAULT now()

  -- NO is_deleted column — audit logs are IMMUTABLE.
  -- RLS DELETE policy will deny all deletes from non-service-role users.
);

COMMENT ON TABLE audit_logs IS
  'IMMUTABLE audit trail. Every significant data mutation in iKhataPro is logged here.
   DO NOT add an is_deleted column — audit logs must never be soft-deleted by normal users.
   RLS DELETE policy denies all user-level deletes. Service-role only for maintenance.
   A user from Business B CANNOT read Business A audit logs.';

COMMENT ON COLUMN audit_logs.action IS
  'Action code matching the existing logAudit() calls in state.js.
   Examples: CUSTOMER_ADDED, KHATA_TRANSACTION, POS_BILL_CREATED, USER_LOGIN, etc.';

COMMENT ON COLUMN audit_logs.user_name IS
  'Denormalized user display name at time of action.
   Preserved for historical accuracy even if user account is deleted later.';
