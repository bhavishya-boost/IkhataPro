# iKhataPro Platform Architecture Document

## Overview
**iKhataPro** utilizes a **Local-First Single Page Application (SPA)** architecture designed for low latency, zero external API cost, and high resilience.

---

## 🏗️ High-Level System Architecture

```text
                               +----------------------------------+
                               |     iKhataPro Web Client UI      |
                               |  (HTML5 / Vanilla CSS / ES6 SPA) |
                               +----------------------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |       iKhataUI Router & Gateway   |
                               +----------------------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               |     iKhataStore State Engine     |
                               | (Reactive Singleton & Event Bus) |
                               +----------------------------------+
                                                 |
            +--------------------+---------------+--------------------+
            |                    |               |                    |
            v                    v               v                    v
  +------------------+  +------------------+  +-------------+  +------------------+
  | Customer Khata   |  |   POS Counter    |  | Inventory   |  | GST Invoices     |
  | & 360° CRM       |  | & Stock Auto-Sync|  | Catalog     |  | & Suppliers      |
  +------------------+  +------------------+  +-------------+  +------------------+
            |                    |               |                    |
            +--------------------+---------------+--------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               | Business Intelligence Layer      |
                               | (P&L, Cash Flow, AI Copilot)     |
                               +----------------------------------+
                                                 |
                                                 v
                               +----------------------------------+
                               | Local Persistence & PWA Shell    |
                               | (LocalStorage + Service Worker)  |
                               +----------------------------------+
```

---

## 🔒 Multi-Tenant Data Isolation Strategy

Tenant scoping is strictly enforced at the data query layer in `js/state.js`:

```javascript
// Every data query filters records by active business ID
getCustomers(includeDeleted = false) {
  const bId = this.getActiveBusinessId();
  if (!this.state.customers) this.state.customers = [];
  return this.state.customers.filter(c => c.business_id === bId && (includeDeleted || !c.isDeleted));
}
```

---

## 👥 Role-Based Access Control (RBAC) Matrix

| Capability | OWNER | MANAGER | ACCOUNTANT | CASHIER |
| :--- | :---: | :---: | :---: | :---: |
| Full Business Access | ✅ | ❌ | ❌ | ❌ |
| Create POS Sales & Receivables | ✅ | ✅ | ❌ | ✅ |
| Manage Inventory & Restock | ✅ | ✅ | ❌ | Read-Only |
| Create GST Invoices & Purchases | ✅ | ✅ | ✅ | ❌ |
| View P&L & Cash Flow Reports | ✅ | Read-Only | ✅ | 🚫 Blocked |
| Soft Delete Records / Delete Tx | ✅ | 🚫 Blocked | 🚫 Blocked | 🚫 Blocked |
| Change Store Settings & Backup | ✅ | 🚫 Blocked | 🚫 Blocked | 🚫 Blocked |
