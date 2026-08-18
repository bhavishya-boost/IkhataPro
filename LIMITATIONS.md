# iKhataPro Platform Limitations & Disclosures

## Overview
To maintain transparency with merchants, stakeholders, and technical evaluators, this document details the current design choices, architectural boundaries, and scope limits of **iKhataPro**.

---

## 📌 Architectural Disclosures

### 1. Local-First Browser Storage
- Application state is persisted locally in the browser profile (`localStorage` under key `iKhataPro_app_state_v4`).
- **Impact**: Data is tied to the local device browser profile where it was created.

### 2. Multi-Device Real-Time Synchronization
- Simultaneous real-time synchronization across multiple physical devices (e.g. Owner phone + Cashier tablet) requires a cloud database backend.
- **Impact**: For multi-device cloud operations, deploy the PostgreSQL/Supabase backend script detailed in [`PRODUCTION_RUNBOOK.md`](file:///c:/Users/hp/OneDrive/Desktop/our%20project/PRODUCTION_RUNBOOK.md).

### 3. Explicit User Backups
- Data safety snapshots rely on the merchant exporting 1-click JSON backup files via `Settings (⚙️)`.
- **Impact**: Merchants are encouraged to download JSON backups regularly or prior to browser cache clears.

### 4. Client-Side PDF Generation
- Invoices are rendered into PDF using `html2pdf.bundle.js` in the browser DOM.
- **Impact**: PDF rendering performance depends on client browser rendering engine speed.
