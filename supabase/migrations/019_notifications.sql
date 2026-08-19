-- ============================================================
-- 019_notifications.sql
-- iKhataPro — Notifications Table
-- In-app alerts for low stock, overdue payments, PTP reminders, etc.
-- Scoped to business + optionally to a specific user.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  business_id     uuid          NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,

  -- Target user (NULL = broadcast to all members of the business)
  user_id         uuid          REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification type
  type            text          NOT NULL DEFAULT 'INFO',
  -- LOW_STOCK | OVERDUE_PAYMENT | PTP_DUE | SUPPLIER_PAYABLE | SYSTEM | INFO | WARNING | DANGER

  -- Content
  title           text          NOT NULL,
  message         text          NOT NULL,

  -- Contextual links / references
  entity_type     text,                                     -- 'Customer' | 'Product' | 'Supplier' | etc.
  entity_id       text,                                     -- The ID of the related entity

  -- Read status
  is_read         boolean       NOT NULL DEFAULT false,
  read_at         timestamptz,

  -- Timestamps
  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS
  'In-app notifications per business. Scoped to business_id for isolation.
   user_id = NULL means the notification is for ALL members of the business.
   A user from Business B CANNOT see Business A notifications.
   Used for: low stock alerts, overdue payment reminders, PTP due dates.';

COMMENT ON COLUMN notifications.user_id IS
  'Specific user target. If NULL, the notification is visible to all active members
   of the business (business_id scoped).';
