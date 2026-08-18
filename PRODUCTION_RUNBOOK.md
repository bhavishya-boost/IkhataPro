# iKhataPro Production Operations & Deployment Runbook

## Overview
This runbook contains operational guidance for deploying, maintaining, backing up, and scaling **iKhataPro** in production environments.

---

## 1. Environment Configuration

### Required Environment Variables
Set these variables in your hosting provider (Vercel, Netlify, AWS, Render, Docker, or Nginx):

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# App Branding
APP_NAME="iKhataPro"
APP_URL="https://app.ikhatapro.com"

# Cloud Database Synchronization (Optional - for Multi-Device Team Sync)
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_ANON_KEY="your-anon-key-here"
```

---

## 2. Deployment Instructions

### Option A: Node.js HTTP Server (Docker / VPS / AWS EC2 / Render)
```bash
# 1. Clone repository
git clone https://github.com/your-org/ikhatapro.git
cd ikhatapro

# 2. Install dependencies (if any)
npm install --production

# 3. Start server with PM2 process manager
npm install -g pm2
pm2 start server.js --name "ikhatapro"
pm2 save
pm2 startup
```

### Option B: Static SPA Hosting (Vercel / Netlify / Cloudflare Pages)
- Build Command: `None` (Static HTML/JS SPA)
- Output Directory: `./` (Root directory)
- SPA Route Rewrite: Send all requests `/*` to `/index.html`

---

## 3. Cloud Database Backend Setup (Multi-Device Team Synchronization)

If your shop requires multi-device real-time syncing between different physical devices (e.g. Owner phone + Cashier tablet):

1. **Create Supabase / PostgreSQL Instance**:
   - Create a project at [supabase.com](https://supabase.com).
2. **Execute Database Migration Script**:
   - Run `setup_supabase.sql` in the Supabase SQL Editor.
3. **Connect Client**:
   - Supply `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.js`.

---

## 4. Data Safety & Backup Runbook

### Merchant Self-Service Backup
Merchants can export a 1-click JSON backup package anytime:
- Go to `Settings (⚙️)` -> `Data Safety & Backup` -> Click `📥 Download Backup JSON`.

### Emergency Restore Procedure
If a merchant experiences local browser data loss or switches devices:
1. Open iKhataPro on the new device.
2. Go to `Settings (⚙️)` -> `Data Safety & Backup`.
3. Click `📤 Restore from JSON` and upload the backup `.json` file.
4. iKhataPro will validate schema integrity, create an emergency pre-import snapshot, and restore all records.

---

## 5. PWA & Service Worker Maintenance

### Cache Invalidation & Assets Update
When deploying a new frontend build:
1. Bump `CACHE_NAME` in `sw.js` (e.g., `ikhatapro-cache-v3`).
2. Service Worker will automatically purge old static asset caches and fetch updated JS/CSS bundles upon activate event.

---

## 6. Emergency Recovery & Rollback Procedure

If a deployment contains a frontend regression:
1. Revert to the last stable Git commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Restart application process:
   ```bash
   pm2 restart ikhatapro
   ```
3. Bump Service Worker cache version in `sw.js` to force fresh client download.

---

## 7. Operational Health Checklist
- [x] HTTPS SSL certificate enabled.
- [x] Security headers configured (X-Frame-Options, X-Content-Type-Options).
- [x] Offline fallback banner `#offline-network-banner` functional.
- [x] Double-submit idempotency guard active.
- [x] Audit logs enabled for all financial mutations.
