# iKhataPro Project Structure & File Map

## Directory Layout

```text
our project/
├── css/
│   ├── main.css              # Core design tokens, layout grid & global typography
│   ├── components.css        # Card, table, modal, badge & print media query styles
│   ├── khata.css             # Khata ledger specific visual styles
│   ├── onboarding.css        # Setup wizard & login gateway styles
│   ├── features.css          # Feature components & badge styles
│   └── landing.css           # Product landing page styles
├── js/
│   ├── demoData.js           # Multi-tenant seed dataset & demo state initializer
│   ├── state.js              # Reactive state store, RBAC, soft deletes & getters
│   ├── app.js                # App UI router, global keyboard listener, settings
│   └── modules/
│       ├── intelligence.js   # AI query engine, Health Score & Cash Flow compute
│       ├── copilot.js        # AI Copilot chat drawer & confirmation modals
│       ├── dashboard.js      # Executive dashboard view & KPI summary
│       ├── khata.js          # Customer Khata ledger view
│       ├── customers.js      # Customer 360° CRM view
│       ├── suppliers.js      # Supplier ledger & purchase order view
│       ├── pos.js            # POS billing counter & stock auto-deduction
│       ├── inventory.js      # Inventory management & restock modal
│       ├── invoices.js       # GST tax invoices & PDF view
│       ├── expenses.js       # Expense manager view
│       ├── pnl.js            # Profit & Loss statement & Cash Flow view
│       ├── analytics.js      # Unified Report Center & CSV export engine
│       ├── statementGenerator.js # Custom Statement filter & export module
│       ├── search.js         # Ctrl+K global multi-entity search palette
│       ├── onboarding.js     # 7-step store creation wizard
│       ├── simulator.js      # What-If profit simulator
│       ├── collectionMap.js  # Field collection route optimizer
│       ├── employees.js      # Employee management & RBAC view
│       ├── storefront.js     # Guest customer digital storefront (#shop/{slug})
│       ├── pinSecurity.js    # PIN lock security modal
│       ├── cashGullak.js     # Daily cash counter modal
│       ├── purchaseOrders.js # AI purchase order modal
│       ├── ptpScheduler.js   # Promise-to-Pay scheduler modal
│       └── voiceKhata.js     # Voice entry parser modal
├── index.html                # Main SPA web application shell
├── landing.html              # Marketing landing page
├── manifest.json             # PWA web app manifest
├── server.js                 # Node.js HTTP server
├── sw.js                     # PWA Service Worker v2
├── README.md                 # Project overview & quickstart
├── ARCHITECTURE.md           # Architecture overview & ASCII diagram
├── FEATURES.md               # Feature showcase catalog
├── DEMO_GUIDE.md             # 5-7 minute commercial demo script
├── SCREENSHOT_GUIDE.md       # Screen capture plan
├── PRESENTATION_CONTENT.md   # 12-slide deck content
├── SECURITY.md               # Security architecture & safeguards
├── LIMITATIONS.md            # Honest disclosures & boundaries
├── FUTURE_SCOPE.md           # Product roadmap
└── PROJECT_STRUCTURE.md      # File map & responsibilities
```
