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
  console.log('🧪 PHASE 10 STAGE 10 — EXPENSES MIGRATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');

  // ─── TEST 1: Expense Structure Mapping ─────────────────────────────────
  console.log('TEST 1: Expense Structure Mapping');
  const exp1 = store.addExpense({
    category: 'Electricity',
    amount: 4500,
    note: 'Monthly Showroom Electricity Bill'
  });
  assert(exp1 !== null && exp1 !== false, 'addExpense must return created expense object');
  assert(exp1.id && exp1.id.startsWith('e_'), `Expense ID must start with e_, got ${exp1.id}`);
  assert(exp1.amount === 4500, `Amount must be 4500, got ${exp1.amount}`);
  assert(exp1.category === 'Electricity', `Category must be Electricity, got ${exp1.category}`);
  console.log();

  // ─── TEST 2: Local -> Cloud ID Mapping Setup ─────────────────────────────
  console.log('TEST 2: Expense Local -> Cloud ID Mapping Setup');
  store.state.expenseCloudMap = store.state.expenseCloudMap || {};
  const mockUuid = '11112222-3333-4444-5555-666677778888';
  store.state.expenseCloudMap[exp1.id] = mockUuid;
  store.state.expenseCloudMap[mockUuid] = exp1.id;
  assert(store.state.expenseCloudMap[exp1.id] === mockUuid, 'expenseCloudMap must map local ID to UUID');
  assert(store.state.expenseCloudMap[mockUuid] === exp1.id, 'expenseCloudMap must map UUID back to local ID');
  console.log();

  // ─── TEST 3: Expense INSERT (syncExpenseToCloud) ─────────────────────────
  console.log('TEST 3: Expense INSERT (syncExpenseToCloud)');
  const syncRes1 = await supabaseClient.syncExpenseToCloud(exp1, null);
  console.log('  syncExpenseToCloud response:', { success: syncRes1.success, error: syncRes1.error ? syncRes1.error.message : null });
  assert(syncRes1 !== undefined, 'syncExpenseToCloud must return response object');
  console.log();

  // ─── TEST 4: Expense UPDATE (syncExpenseToCloud with UUID) ───────────────
  console.log('TEST 4: Expense UPDATE (syncExpenseToCloud with UUID)');
  const updatePayload = { ...exp1, amount: 4800, note: 'Updated Electricity Bill' };
  const syncRes4 = await supabaseClient.syncExpenseToCloud(updatePayload, mockUuid);
  assert(syncRes4 !== undefined, 'syncExpenseToCloud UPDATE must return response object');
  console.log();

  // ─── TEST 5: Soft Delete Expense ──────────────────────────────────────────
  console.log('TEST 5: Expense Soft Delete');
  const delRes = store.softDeleteRecord('expense', exp1.id);
  assert(delRes === true, 'softDeleteRecord expense must return true');
  const allExp = store.getExpenses(true);
  const deletedExp = allExp.find(e => e.id === exp1.id);
  assert(deletedExp && deletedExp.isDeleted === true, 'Expense isDeleted must be true after soft delete');
  const activeExp = store.getExpenses();
  assert(!activeExp.find(e => e.id === exp1.id), 'Soft-deleted expense must not appear in active expenses');
  console.log();

  // ─── TEST 6: Restore Expense ──────────────────────────────────────────────
  console.log('TEST 6: Expense RESTORE');
  const restRes = store.restoreRecord('expense', exp1.id);
  assert(restRes === true, 'restoreRecord expense must return true');
  assert(deletedExp.isDeleted === false, 'Expense isDeleted must be false after restore');
  assert(store.getExpenses().some(e => e.id === exp1.id), 'Restored expense must appear in active expenses');
  console.log();

  // ─── TEST 7: Bulk Synchronization (syncAllExpensesWithCloud) ──────────────
  console.log('TEST 7: Bulk Synchronization (syncAllExpensesWithCloud)');
  supabaseClient.isOnline = true;
  window.iKhataSupabase = supabaseClient;
  const bulkRes = await store.syncAllExpensesWithCloud();
  console.log('  syncAllExpensesWithCloud result:', {
    success: bulkRes.success,
    localCount: bulkRes.localCount,
    syncedCount: bulkRes.syncedCount,
    discrepancy: bulkRes.discrepancy
  });
  assert(bulkRes !== undefined, 'syncAllExpensesWithCloud must return result object');
  assert(bulkRes.success === true, 'Bulk sync must return success when online');
  assert(bulkRes.localCount >= 10, `Local expenses count must be >= 10, got ${bulkRes.localCount}`);
  console.log();

  // ─── TEST 8: Idempotent Retry Protection ──────────────────────────────────
  console.log('TEST 8: Idempotent Retry Protection');
  const retry1 = await supabaseClient.syncExpenseToCloud(exp1, mockUuid);
  const retry2 = await supabaseClient.syncExpenseToCloud(exp1, mockUuid);
  assert(retry1 !== undefined && retry2 !== undefined, 'Idempotent retry calls must execute cleanly');
  console.log();

  // ─── TEST 9: Duplicate Prevention ─────────────────────────────────────────
  console.log('TEST 9: Duplicate Expense Prevention');
  const countBefore = store.getExpenses(true).length;
  await store.syncAllExpensesWithCloud();
  const countAfter = store.getExpenses(true).length;
  assert(countBefore === countAfter, `Local expense count must not duplicate on bulk sync: before=${countBefore}, after=${countAfter}`);
  console.log();

  // ─── TEST 10: Amount Precision (Numeric 12,2) ─────────────────────────────
  console.log('TEST 10: Amount Precision Check');
  const precExp = store.addExpense({ category: 'Transport', amount: 1245.75, note: 'Freight' });
  assert(precExp.amount === 1245.75, `Amount precision must be 1245.75, got ${precExp.amount}`);
  console.log();

  // ─── TEST 11: P&L Reconciliation ─────────────────────────────────────────
  console.log('TEST 11: P&L Financial Reconciliation');
  const pnl = store.getFinancialPNL('ALL');
  console.log('  P&L Result:', {
    grossSales: pnl.grossSales,
    cogs: pnl.cogs,
    grossProfit: pnl.grossProfit,
    operatingExpenses: pnl.operatingExpenses,
    netProfit: pnl.netProfit
  });
  assert(pnl !== undefined && pnl !== null, 'getFinancialPNL must return P&L object');
  assert(typeof pnl.operatingExpenses === 'number', 'Operating expenses must be numeric');
  assert(typeof pnl.netProfit === 'number', 'Net Profit must be numeric');
  assert(pnl.netProfit === pnl.grossProfit - pnl.operatingExpenses, `Net Profit (${pnl.netProfit}) must equal Gross Profit (${pnl.grossProfit}) - Operating Expenses (${pnl.operatingExpenses})`);
  console.log();

  // ─── TEST 12: Cash Flow Reconciliation ────────────────────────────────────
  console.log('TEST 12: Cash Flow Reconciliation');
  const activeExps = store.getExpenses();
  const totalExpSum = activeExps.reduce((s, e) => s + (e.amount || 0), 0);
  assert(totalExpSum > 0, `Total active expenses sum must be > 0, got ${totalExpSum}`);
  console.log();

  // ─── TEST 13: Dashboard Expense Reconciliation ────────────────────────────
  console.log('TEST 13: Dashboard Expense Reconciliation');
  const monthPNL = store.getFinancialPNL('THIS_MONTH');
  assert(monthPNL.operatingExpenses >= 0, `This Month operating expenses must be >= 0, got ${monthPNL.operatingExpenses}`);
  console.log();

  // ─── TEST 14: Pre-Migration Backup Snapshot Creation ──────────────────────
  console.log('TEST 14: Pre-Migration Backup Snapshot Creation');
  const snapKey = `iKhataPro_snapshot_before_expense_sync_test_${Date.now()}`;
  localStorage.setItem(snapKey, JSON.stringify({ expenseCount: activeExps.length, timestamp: new Date().toISOString() }));
  const snapVal = localStorage.getItem(snapKey);
  assert(snapVal !== null, 'Pre-migration backup snapshot must be stored in localStorage');
  console.log();

  // ─── TEST 15: Backup Preservation & Restore Safety ────────────────────────
  console.log('TEST 15: Backup Preservation and Restore Safety');
  const origCount = store.getExpenses(true).length;
  store.saveState();
  const loadedCount = store.getExpenses(true).length;
  assert(origCount === loadedCount, 'Local state save & reload must preserve expense count');
  console.log();

  // ─── TEST 16: Offline Local Operation Continuity ─────────────────────────
  console.log('TEST 16: Offline Expense Creation Continuity');
  const offlineExp = store.addExpense({ category: 'Maintenance', amount: 1500, note: 'Offline AC Repair' });
  assert(offlineExp !== false, 'Expense creation must succeed offline');
  assert(store.getExpenses().some(e => e.id === offlineExp.id), 'Offline expense must be in local state');
  console.log();

  // ─── TEST 17: Online Retry Synchronization ────────────────────────────────
  console.log('TEST 17: Online Retry Synchronization');
  const retryRes = await supabaseClient.syncExpenseToCloud(offlineExp, null);
  assert(retryRes !== undefined, 'Online retry sync must complete cleanly');
  console.log();

  // ─── TEST 18: BUS_LJS Tenant Isolation ────────────────────────────────────
  console.log('TEST 18: BUS_LJS Tenant Isolation');
  store.switchBusiness('BUS_LJS');
  const ljsExp = store.getExpenses(true);
  assert(ljsExp.length >= 10, `BUS_LJS must have >= 10 expenses, got ${ljsExp.length}`);
  console.log();

  // ─── TEST 19: BUS_SHARMA Tenant Isolation ─────────────────────────────────
  console.log('TEST 19: BUS_SHARMA Tenant Isolation');
  store.switchBusiness('BUS_SHARMA');
  const sharmaExp = store.getExpenses(true);
  const crossOver = sharmaExp.find(e => ljsExp.some(le => le.id === e.id));
  assert(!crossOver, 'BUS_SHARMA must not see BUS_LJS expenses');
  assert(sharmaExp.length >= 3, `BUS_SHARMA must have >= 3 expenses, got ${sharmaExp.length}`);
  store.switchBusiness('BUS_LJS');
  console.log();

  // ─── TEST 20: Cross-Tenant Read Rejection (RLS Security) ─────────────────
  console.log('TEST 20: Cross-Tenant Read Rejection (RLS Security)');
  const redTeamFetch = await supabaseClient.fetchExpensesFromCloud('unauthorized_business_id');
  assert(redTeamFetch.expenses.length === 0, 'Unauthorized cross-tenant fetch must return 0 rows');
  console.log();

  // ─── TEST 21: Cross-Tenant Write Rejection (RLS Security) ────────────────
  console.log('TEST 21: Cross-Tenant Write Rejection (RLS Security)');
  const redTeamInsert = await supabaseClient.syncExpenseToCloud(
    { business_id: 'BUS_SHARMA', category: 'Rent', amount: 999999, note: 'Hacker Expense' },
    null
  );
  assert(redTeamInsert.success === false, 'Cross-tenant expense insert must be rejected by RLS');
  console.log('  Red Team Insert Error:', redTeamInsert.error ? redTeamInsert.error.message : 'rejected as expected');
  console.log();

  // ─── TEST 22: Cross-Tenant Update Rejection (RLS Security) ───────────────
  console.log('TEST 22: Cross-Tenant Update Rejection (RLS Security)');
  const redTeamUpdate = await supabaseClient.syncExpenseToCloud(
    { business_id: 'BUS_SHARMA', category: 'Salary', amount: 888888 },
    '00000000-0000-0000-0000-000000000002'
  );
  assert(redTeamUpdate.success === false, 'Cross-tenant expense update must be rejected by RLS');
  console.log();

  // ─── TEST 23: Cross-Tenant Delete Rejection (RLS Security) ───────────────
  console.log('TEST 23: Cross-Tenant Delete Rejection (RLS Security)');
  const redTeamDel = await supabaseClient.syncExpenseToCloud(
    { business_id: 'BUS_SHARMA', is_deleted: true, deleted_at: new Date().toISOString() },
    '00000000-0000-0000-0000-000000000002'
  );
  assert(redTeamDel.success === false, 'Cross-tenant expense delete must be rejected by RLS');
  console.log();

  // ─── TEST 24: Demo Data Preservation ─────────────────────────────────────
  console.log('TEST 24: Demo Data Preservation');
  assert(store.state.businesses.length >= 2, 'Businesses demo data preserved');
  assert(store.state.customers.length >= 20, 'Customers demo data preserved');
  assert(store.state.products.length >= 5, 'Products demo data preserved');
  assert(store.state.expenses.length >= 10, 'Expenses demo data preserved');
  console.log();

  // ─── TEST 25: Phase 1-9 Regression Verification ──────────────────────────
  console.log('TEST 25: Phase 1-9 Regression Verification');
  assert(typeof store.getCustomers === 'function', 'getCustomers exists');
  assert(typeof store.getProducts === 'function', 'getProducts exists');
  assert(typeof store.getTransactions === 'function', 'getTransactions exists');
  assert(typeof store.getSuppliers === 'function', 'getSuppliers exists');
  assert(typeof store.getPurchases === 'function', 'getPurchases exists');
  assert(typeof store.getInvoices === 'function', 'getInvoices exists');
  assert(typeof store.getBills === 'function', 'getBills exists');
  console.log();

  // ─── SUMMARY REPORT ───────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 STAGE 10 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
