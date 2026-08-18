# iKhataPro Feature Showcase Document

## 🏬 Business Operations
- **Digital Khata Ledger**: Instant entry logging (`GAVE` credit vs `GOT` payment) with running balances and WhatsApp collection receipts.
- **POS Counter & Instant QR**: Fast counter billing with automatic stock deduction and dynamic UPI QR codes.
- **Customer 360° CRM**: Profile dashboard displaying Trust Score (0-100), Lifetime Value, Receivables Aging, Promise-to-Pay (PTP) dates, and credit freeze controls.
- **Stock Inventory Intelligence**: Real-time stock levels, margin tracking, low-stock alerts, auto-restock modal, and fast/slow mover identification.
- **Supplier & Purchase Management**: Supplier ledgers, purchase orders (PO), and payable balances ("You Will Give").
- **Expense Manager**: Categorized expense tracking (Rent, Salary, Utilities) with period filtering.

---

## 💰 Financial Intelligence
- **GST Invoices**: Intra-State (CGST + SGST) and Inter-State (IGST) tax calculation engine supporting 0%, 5%, 12%, 18%, 28% rates.
- **Accrual Profit & Loss**: `Revenue - COGS = Gross Profit - Operating Expenses = Net Profit`.
- **Cash Flow Analysis**: Decoupled tracking of `Money In` vs. `Money Out` vs. `Net Cash Movement`.
- **Custom Statements & Filters**: Filter transactions by Date, Customer, and Type with 1-click CSV download.

---

## 🤖 AI Intelligence & Automation
- **AI Business Copilot**: Natural language query engine answering 15+ business questions (*"Aaj ki sale kitni hai?"*, *"Rahul se 5000 rupees aaye"*).
- **AI Action Safety Guard**: Explicit confirmation dialog required before executing financial mutations suggested by AI.
- **Business Health Score Gauge**: Transparent 8-factor health score (0-100) evaluating sales activity, overdue ratios, expense margins, and stockouts.
- **Smart Alert Center**: Real-time priority alerts for critical overdue receivables, low inventory, and cash flow warnings.

---

## 🛡️ Enterprise Security & Data Safety
- **Multi-Tenant Isolation**: Active session scoping prevents cross-tenant data leakage.
- **Role-Based Access Control (RBAC)**: Permission matrix for Owner, Manager, Accountant, Cashier roles.
- **Soft Delete Engine**: `isDeleted` tagging preserves historical audit trails for P&L consistency.
- **Audit Logging**: Comprehensive audit trail capturing user, timestamp, business ID, action, and details.
- **1-Click JSON Backup Export & Restore**: Download structured JSON backups; restore safely with pre-import emergency snapshots.
- **XSS & Double-Submit Protection**: Input sanitization via `escapeHTML()` and `processedTxTokens` idempotency guard.

---

## 📱 User Experience & Connectivity
- **PWA Service Worker v2**: Offline app shell caching (`ikhatapro-cache-v2`).
- **Offline Network Status Banner**: Real-time connection status detection (`online`/`offline`).
- **Universal Ctrl+K Search**: Global multi-entity search across Customers, Invoices, Products, Suppliers, and Transactions.
- **Keyboard Shortcuts (`⌨️` / `?`)**: Fast keys for POS (`S`), Khata (`N`), Payment (`P`), Invoice (`I`), and Search (`Ctrl+K`).
- **Responsive Layout**: Designed for mobile, tablet, and desktop screens (320px to 1440px+).
