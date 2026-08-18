# iKhataPro — AI-Powered Local Business Management

> **Tagline**: Khata. POS. Inventory. GST. Financial Intelligence. One Platform.

[![Status](https://img.shields.io/badge/Status-Production_Ready-success.svg)]()
[![Architecture](https://img.shields.io/badge/Architecture-Local--First_SPA-blue.svg)]()
[![PWA](https://img.shields.io/badge/PWA-Offline_Shell_v2-purple.svg)]()
[![License](https://img.shields.io/badge/License-Commercial-green.svg)]()

---

## 📌 Problem Statement

Traditional small and mid-sized merchants in India manage shop operations through fragmented tools:
- Paper Khata notebooks for customer credit.
- Standalone POS billing software for counter sales.
- Manual Excel spreadsheets for stock inventory.
- Separate accounting tools for GST tax invoices and expenses.

This creates disconnected records, delayed collections, stockouts, inaccurate profit calculations, and poor business visibility.

---

## 💡 Solution Overview

**iKhataPro** unifies all merchant operations into a single **Local-First Business Operating Platform**:

```
Customer ──► Khata Ledger ──► POS Counter ──► Stock Inventory ──► GST Invoice ──► Accrual P&L ──► AI Copilot
```

---

## 🚀 Core Platform Features

### 1. 📖 Digital Khata & Customer 360° CRM
- Customer credit (GAVE) & payment (GOT) ledger with running balances.
- Dynamic Trust Scoring (0-100), Receivables Aging buckets (0-30d, 31-60d, 61-90d, 90d+), and Promise-to-Pay (PTP) tracking.
- WhatsApp automated payment reminder links and digital customer passbook URLs (`#shop/{slug}`).

### 2. 🛒 High-Speed POS Counter
- Rapid product search, instant QR code payment generation, auto-calculated totals, and multi-mode settlements (Cash, UPI, Credit).
- **Automated Stock Sync**: Counter sales immediately deduct catalog quantities.

### 3. 📦 Stock Inventory Intelligence
- Real-time stock tracking with low-stock alerts, auto-restock modal, and product profit margin breakdown.
- **Fast Movers & Reorder Intelligence**: Identifies high-margin and slow-moving items.

### 4. 📄 Professional GST Invoicing & PDF
- Compliant B2B / B2C tax invoices supporting Intra-State (CGST + SGST) and Inter-State (IGST) calculations.
- Instant PDF generation (`html2pdf.js`), printing, and 1-click WhatsApp sharing.

### 5. 🏭 Supplier & Purchase Management
- Supplier ledgers, purchase orders (PO), and payable tracking ("You Will Give").

### 6. 📊 Accrual Profit & Loss + Cash Flow Analysis
- **Accrual P&L**: `Revenue - COGS = Gross Profit - Operating Expenses = Net Profit`.
- **Cash Flow Decoupling**: Tracks `Money In` vs. `Money Out` vs. `Net Cash Movement`. Credit sales do NOT inflate cash balances until collected.

### 7. 🤖 Data-Grounded AI Business Copilot
- Natural language query assistant (*"Aaj ki sale kitni hai?"*, *"Rahul se 5000 rupees aaye"*).
- **AI Action Safety Guard**: Explicit confirmation dialog required before executing financial mutations.

### 8. 🛡️ Enterprise Security & Data Safety
- Multi-tenant data isolation, granular RBAC (Owner, Manager, Accountant, Cashier), soft deletion recovery engine (`isDeleted`), XSS input sanitization, and 1-click JSON backup export/restore.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Core** | HTML5, Vanilla JavaScript (ES6+), CSS3 (Modern Design Tokens) |
| **UI Components** | Glassmorphism, CSS Variables, Sticky Tables, Responsive Flex/Grid |
| **State Layer** | Reactive `iKhataStore` singleton with event emitter (`notify()`) |
| **Persistence** | LocalStorage (`iKhataPro_app_state_v4`), PWA Service Worker (`sw.js`) |
| **PDF Generation** | `html2pdf.bundle.min.js` |
| **Local Server** | Node.js HTTP Server (`server.js`) |

---

## 🖥️ Localhost Setup & Installation

> **Note**: iKhataPro is designed as a local-first, zero-cost localhost application. No paid APIs, cloud databases, or subscriptions are required.

```bash
# 1. Clone repository
git clone https://github.com/your-username/our-project.git
cd "our project"

# 2. Run local server
node server.js

# 3. Open in browser
http://localhost:3000
```

---

## 🔑 Pre-Configured Demo Credentials

Access pre-provisioned demo store accounts directly from the login screen (`#login`):

| Store Name | Owner Name | Username | Password |
| :--- | :--- | :--- | :--- |
| **LJS Jewellers & General Store** | Aryan Soni | `aryan` | `Pass123!` |
| **Sharma Electronics** | Rahul Sharma | `rahul` | `Pass123!` |

---

## ⚠️ Known Limitations & Disclosures
- **Local-First Persistence**: Data is persisted in the local browser profile (`localStorage`).
- **Multi-Device Synchronization**: Syncing across multiple physical devices simultaneously requires deploying a cloud database backend (see [`PRODUCTION_RUNBOOK.md`](file:///c:/Users/hp/OneDrive/Desktop/our%20project/PRODUCTION_RUNBOOK.md)).
- **Explicit Backup Action**: Merchants should export local JSON backups periodically via Settings (`⚙️`).
