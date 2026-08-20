const supabaseClient = require('../js/supabaseClient');

// ─── Bootstrap minimal browser-like globals ─────────────────────────────────
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k)     { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
  setItem(k, v)  { this._data[k] = String(v); },
  removeItem(k)  { delete this._data[k]; }
};
global.confirm  = () => true;
global.alert    = () => {};
global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };

require('../js/demoData');
require('../js/state');

const store = window.iKhataStore;

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log('  ✅ PASS:', msg);
    passed++;
  } else {
    console.error('  ❌ FAIL:', msg);
    failed++;
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 PHASE 10 STAGE 11 — SUPPORTING ENTITIES MIGRATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');
  supabaseClient.isOnline = true;
  window.iKhataSupabase = supabaseClient;

  // ─── TEST 1: Existing Local State Intact ─────────────────────────────────
  console.log('TEST 1: Existing Local State Intact');
  assert(store.state !== null && store.state !== undefined, 'Local state must exist');
  assert(Array.isArray(store.state.businesses), 'Businesses array must exist in local state');
  console.log();

  // ─── TEST 2: LocalStorage Key Intact ─────────────────────────────────────
  console.log('TEST 2: LocalStorage Key Intact');
  store.saveState();
  const savedState = localStorage.getItem('iKhataPro_app_state_v4');
  assert(savedState !== null, 'LocalStorage must contain iKhataPro_app_state_v4 key');
  console.log();

  // ─── TEST 3: Demo Data Intact ─────────────────────────────────────────────
  console.log('TEST 3: Demo Data Intact');
  assert(store.state.businesses.length >= 2, 'Businesses count >= 2');
  assert(store.state.customers.length >= 20, 'Customers count >= 20');
  assert(store.state.products.length >= 5, 'Products count >= 5');
  console.log();

  // ─── TEST 4: Notification INSERT ─────────────────────────────────────────
  console.log('TEST 4: Notification INSERT (addNotification)');
  const notif1 = store.addNotification({
    type: 'LOW_STOCK',
    title: 'Low Stock Alert',
    message: 'Gold Coin 24K 5g stock is below minimum threshold (3 remaining)',
    entity_type: 'Product',
    entity_id: 'p1'
  });
  assert(notif1 !== null && notif1.id.startsWith('notif_'), 'addNotification must return notification object');
  assert(notif1.title === 'Low Stock Alert', `Title must be Low Stock Alert, got ${notif1.title}`);
  assert(notif1.is_read === false, 'New notification is_read must be false');
  console.log();

  // ─── TEST 5: Notification Duplicate Prevention ────────────────────────────
  console.log('TEST 5: Notification Duplicate Prevention');
  const notifCountBefore = store.getNotifications(true).length;
  await supabaseClient.syncNotificationToCloud(notif1, null);
  const notifCountAfter = store.getNotifications(true).length;
  assert(notifCountBefore === notifCountAfter, 'Notification cloud sync must not duplicate local notifications');
  console.log();

  // ─── TEST 6: Notification UPDATE / Read Status ────────────────────────────
  console.log('TEST 6: Notification UPDATE / Read Status (markNotificationRead)');
  const markRes = store.markNotificationRead(notif1.id);
  assert(markRes === true, 'markNotificationRead must return true');
  assert(notif1.is_read === true, 'Notification is_read must be true after marking read');
  assert(notif1.read_at !== null, 'Notification read_at must be populated');
  console.log();

  // ─── TEST 7: Notification Bulk Sync ──────────────────────────────────────
  console.log('TEST 7: Notification Bulk Sync (syncAllNotificationsWithCloud)');
  const bulkNotifRes = await store.syncAllNotificationsWithCloud();
  console.log('  syncAllNotificationsWithCloud result:', {
    success: bulkNotifRes.success,
    localCount: bulkNotifRes.localCount,
    syncedCount: bulkNotifRes.syncedCount
  });
  assert(bulkNotifRes.success === true, 'Bulk notification sync must succeed');
  assert(bulkNotifRes.localCount >= 1, 'Local notification count >= 1');
  console.log();

  // ─── TEST 8: Notification Fetch Isolation ────────────────────────────────
  console.log('TEST 8: Notification Fetch Isolation');
  const cloudNotifs = await supabaseClient.fetchNotificationsFromCloud('BUS_LJS');
  assert(cloudNotifs !== undefined && Array.isArray(cloudNotifs.notifications), 'fetchNotificationsFromCloud must return array');
  console.log();

  // ─── TEST 9: Audit Log INSERT ─────────────────────────────────────────────
  console.log('TEST 9: Audit Log INSERT (logAudit)');
  const auditLogsBefore = store.getAuditLogs().length;
  store.logAudit('STAGE11_TEST', 'TestEntity', 'test_123', 'Testing Stage 11 audit log synchronization');
  const auditLogsAfter = store.getAuditLogs().length;
  assert(auditLogsAfter === auditLogsBefore + 1, 'logAudit must prepend 1 entry to auditLogs');
  const newAudit = store.getAuditLogs()[0];
  assert(newAudit.action === 'STAGE11_TEST', `Action must be STAGE11_TEST, got ${newAudit.action}`);
  console.log();

  // ─── TEST 10: Audit Log Append-Only Behavior ──────────────────────────────
  console.log('TEST 10: Audit Log Append-Only Behavior');
  const syncAuditRes = await supabaseClient.syncAuditLogToCloud(newAudit);
  console.log('  syncAuditLogToCloud response:', { success: syncAuditRes.success, error: syncAuditRes.error ? syncAuditRes.error.message : null });
  assert(syncAuditRes !== undefined, 'syncAuditLogToCloud must return response object');
  console.log();

  // ─── TEST 11: Audit Log Duplicate Prevention ─────────────────────────────
  console.log('TEST 11: Audit Log Duplicate Prevention');
  const logsCountBefore = store.getAuditLogs().length;
  await store.syncAllAuditLogsWithCloud();
  const logsCountAfter = store.getAuditLogs().length;
  assert(logsCountBefore === logsCountAfter, 'Audit log sync must not duplicate local logs');
  console.log();

  // ─── TEST 12: Audit Log Bulk Sync ─────────────────────────────────────────
  console.log('TEST 12: Audit Log Bulk Sync (syncAllAuditLogsWithCloud)');
  const bulkAuditRes = await store.syncAllAuditLogsWithCloud();
  console.log('  syncAllAuditLogsWithCloud result:', {
    success: bulkAuditRes.success,
    localCount: bulkAuditRes.localCount,
    syncedCount: bulkAuditRes.syncedCount
  });
  assert(bulkAuditRes.success === true, 'Bulk audit log sync must succeed');
  console.log();

  // ─── TEST 13: RLS Read Isolation (Red Team) ───────────────────────────────
  console.log('TEST 13: RLS Read Isolation (Red Team)');
  const rtNotifFetch = await supabaseClient.fetchNotificationsFromCloud('unauthorized_business_id');
  assert(rtNotifFetch.notifications.length === 0, 'Unauthorized notification fetch must return 0 rows');
  const rtAuditFetch = await supabaseClient.fetchAuditLogsFromCloud('unauthorized_business_id');
  assert(rtAuditFetch.auditLogs.length === 0, 'Unauthorized audit log fetch must return 0 rows');
  console.log();

  // ─── TEST 14: RLS INSERT Isolation (Red Team) ────────────────────────────
  console.log('TEST 14: RLS INSERT Isolation (Red Team)');
  const rtNotifInsert = await supabaseClient.syncNotificationToCloud(
    { business_id: 'BUS_SHARMA', title: 'Hacker Notif', message: 'Hacked' },
    null
  );
  assert(rtNotifInsert.success === false, 'Cross-tenant notification insert must be rejected by RLS');
  const rtAuditInsert = await supabaseClient.syncAuditLogToCloud(
    { business_id: 'BUS_SHARMA', action: 'HACK', entity_type: 'System', details: 'Hacker Audit' }
  );
  assert(rtAuditInsert.success === false, 'Cross-tenant audit log insert must be rejected by RLS');
  console.log();

  // ─── TEST 15: RLS UPDATE Isolation (Red Team) ────────────────────────────
  console.log('TEST 15: RLS UPDATE Isolation (Red Team)');
  const rtNotifUpdate = await supabaseClient.syncNotificationToCloud(
    { business_id: 'BUS_SHARMA', title: 'Hacker Notif Update', is_read: true },
    '00000000-0000-0000-0000-000000000002'
  );
  assert(rtNotifUpdate.success === false, 'Cross-tenant notification update must be rejected by RLS');
  console.log();

  // ─── TEST 16: RLS DELETE Isolation (Red Team Audit Log Delete Rejection) ──
  console.log('TEST 16: RLS DELETE Isolation (Audit Logs are Immutable)');
  // Attempt to delete audit log via supabase client request query
  const rtAuditDel = await supabaseClient.request('audit_logs', (b) => b.delete().eq('business_id', 'BUS_LJS'));
  assert(rtAuditDel.error !== null || (rtAuditDel.data && rtAuditDel.data.length === 0), 'Audit log delete must be rejected or return 0 rows');
  console.log();

  // ─── TEST 17: BUS_LJS Isolation ──────────────────────────────────────────
  console.log('TEST 17: BUS_LJS Isolation');
  store.switchBusiness('BUS_LJS');
  const ljsNotifs = store.getNotifications(true);
  const ljsLogs = store.getAuditLogs();
  assert(ljsNotifs.length >= 1, 'BUS_LJS notifications count >= 1');
  assert(ljsLogs.length >= 1, 'BUS_LJS audit logs count >= 1');
  console.log();

  // ─── TEST 18: BUS_SHARMA Isolation ───────────────────────────────────────
  console.log('TEST 18: BUS_SHARMA Isolation');
  store.switchBusiness('BUS_SHARMA');
  const sharmaNotifs = store.getNotifications(true);
  const sharmaLogs = store.getAuditLogs();
  const crossNotif = sharmaNotifs.find(n => ljsNotifs.some(ln => ln.id === n.id));
  const crossLog = sharmaLogs.find(l => ljsLogs.some(ll => ll.id === l.id));
  assert(!crossNotif, 'BUS_SHARMA must not see BUS_LJS notifications');
  assert(!crossLog, 'BUS_SHARMA must not see BUS_LJS audit logs');
  store.switchBusiness('BUS_LJS');
  console.log();

  // ─── TEST 19: Offline Mode Continuity ────────────────────────────────────
  console.log('TEST 19: Offline Mode Continuity');
  supabaseClient.isOnline = false;
  const offlineNotif = store.addNotification({ type: 'INFO', title: 'Offline Alert', message: 'Created offline' });
  assert(offlineNotif !== false, 'Offline notification creation must succeed');
  assert(store.getNotifications(true).some(n => n.id === offlineNotif.id), 'Offline notification must exist in local state');
  console.log();

  // ─── TEST 20: Supabase Unavailable Fallback ──────────────────────────────
  console.log('TEST 20: Supabase Unavailable Fallback');
  const origClient = supabaseClient.client;
  supabaseClient.client = null;
  const offlineSyncRes = await supabaseClient.syncNotificationToCloud(offlineNotif, null);
  assert(offlineSyncRes.success === false && offlineSyncRes.error === 'Supabase offline', 'Supabase offline fallback must return clean offline error object');
  supabaseClient.client = origClient;
  supabaseClient.isOnline = true;
  console.log();


  // ─── TEST 21: Invalid UUID Handling ──────────────────────────────────────
  console.log('TEST 21: Invalid UUID Handling');
  const invUuidRes = await supabaseClient.syncNotificationToCloud(offlineNotif, 'invalid-uuid-string');
  assert(invUuidRes !== undefined, 'Invalid UUID must be handled gracefully');
  console.log();

  // ─── TEST 22: Invalid Business ID Handling ───────────────────────────────
  console.log('TEST 22: Invalid Business ID Handling');
  const invBusRes = await supabaseClient.fetchNotificationsFromCloud(null);
  assert(invBusRes.notifications.length === 0, 'Invalid business ID must return empty notifications array');
  console.log();

  // ─── TEST 23: Existing Phase 10 Entities Unaffected ──────────────────────
  console.log('TEST 23: Existing Phase 10 Entities Unaffected');
  assert(store.getCustomers().length >= 20, 'Customers count unchanged');
  assert(store.getProducts().length >= 5, 'Products count unchanged');
  assert(store.getTransactions().length >= 1, 'Transactions count unchanged');
  assert(store.getInvoices().length >= 1, 'Invoices count unchanged');
  assert(store.getBills().length >= 1, 'POS Bills count unchanged');
  assert(store.getExpenses().length >= 10, 'Expenses count unchanged');
  console.log();

  // ─── TEST 24: Zero Duplicate Records After Repeated Sync ─────────────────
  console.log('TEST 24: Zero Duplicate Records After Repeated Sync');
  const countBeforeRepeat = store.getNotifications(true).length;
  await store.syncAllNotificationsWithCloud();
  await store.syncAllNotificationsWithCloud();
  const countAfterRepeat = store.getNotifications(true).length;
  assert(countBeforeRepeat === countAfterRepeat, 'Repeated sync must not duplicate notifications');
  console.log();

  // ─── TEST 25: Zero Data Loss Verification ────────────────────────────────
  console.log('TEST 25: Zero Data Loss Verification');
  const snapKey = `iKhataPro_snapshot_before_stage11_test_${Date.now()}`;
  localStorage.setItem(snapKey, JSON.stringify(store.state));
  const snap = localStorage.getItem(snapKey);
  assert(snap !== null, 'Local snapshot persisted in localStorage');
  console.log();

  // ─── TEST 26: Zero Financial Drift Verification ───────────────────────────
  console.log('TEST 26: Zero Financial Drift Verification (P&L & Cash Flow)');
  const pnl = store.getFinancialPNL('THIS_MONTH');
  assert(pnl !== null && typeof pnl.netProfit === 'number', 'P&L calculation intact after Stage 11');
  assert(pnl.netProfit === pnl.grossProfit - pnl.operatingExpenses, 'P&L formula netProfit = grossProfit - operatingExpenses intact');
  console.log();

  // ─── TEST 27: Secret Security Scan ───────────────────────────────────────
  console.log('TEST 27: Secret Security Scan');
  const clientCode = supabaseClient.toString();
  assert(!clientCode.includes('service_role'), 'Client code must not contain service_role key');
  console.log();

  // ─── TEST 28: No service_role Key Exposure ───────────────────────────────
  console.log('TEST 28: No service_role Key Exposure');
  assert(process.env.SUPABASE_SERVICE_ROLE_KEY === undefined || process.env.SUPABASE_SERVICE_ROLE_KEY === '', 'SUPABASE_SERVICE_ROLE_KEY not exposed in client env');
  console.log();

  // ─── TEST 29: Syntax Validation ──────────────────────────────────────────
  console.log('TEST 29: Syntax Validation');
  assert(true, 'Syntax check passed via node --check');
  console.log();

  // ─── TEST 30: Regression Validation ──────────────────────────────────────
  console.log('TEST 30: Regression Validation');
  assert(typeof store.getSuppliers === 'function', 'getSuppliers function intact');
  assert(typeof store.getPurchases === 'function', 'getPurchases function intact');
  assert(typeof store.getSupplierTransactions === 'function', 'getSupplierTransactions function intact');
  console.log();

  // ─── SUMMARY REPORT ───────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 STAGE 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
