# iKhataPro Security Architecture Document

## Overview
**iKhataPro** enforces security at the data layer, query level, input validation layer, and AI execution pipeline.

---

## 🔒 Security Safeguards Matrix

### 1. Multi-Tenant Data Isolation
- Every getter function in `js/state.js` filters data strictly by active session `business_id`.
- Attempts to query, search, or modify another tenant's records via URL parameter or manual local storage manipulation are blocked.

### 2. Role-Based Access Control (RBAC)
- Enforces permissions across four roles: **Owner**, **Manager**, **Accountant**, and **Cashier**.
- Non-owner roles are blocked from deleting transactions, viewing P&L statements, modifying store settings, or restoring backups.

### 3. Double-Submission & Idempotency Guard
- `processedTxTokens` Set guard tracks payload tokens within a 3-second window, rejecting duplicate POS sales, Khata entries, or payments.

### 4. XSS Output Sanitization
- `escapeHTML(str)` converts special characters (`<`, `>`, `&`, `"`, `'`) to HTML entities before rendering.

### 5. Soft Deletion Engine
- Deletions tag records with `isDeleted: true`, `deletedAt`, and `deletedBy`. Historical financial audit trails and P&L history are preserved.

### 6. AI Action Confirmation Guard
- Financial transactions suggested by the AI Copilot require explicit merchant confirmation via `requestActionConfirmation()` modal dialogs before execution.

### 7. Safe Backup Restore Engine
- Restores require schema validation and active tenant mapping. An emergency pre-import snapshot is created automatically before importing data.

### 8. Audit Logging
- Every financial mutation logs user, timestamp, business ID, action, and details in `state.auditLogs`.

---

## ⚠️ Disclosures & Scope
- iKhataPro is designed as a **Local-First Application**. Application state is stored securely in local browser storage (`localStorage`).
- Backup files should be stored securely by the merchant.
