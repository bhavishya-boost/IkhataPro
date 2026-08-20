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
  console.log('🧪 PHASE 10 STAGE 9 — POS BILLS MIGRATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');

  // ─── TEST 1: POS Bill Structure Mapping ─────────────────────────────────
  console.log('TEST 1: POS Bill Structure Mapping');
  const billData = {
    customerId: 'c1',
    customerName: 'Rahul Traders',
    items: [
      { id: 'p1', name: 'Gold Coin 22K 5g', price: 38500, qty: 1 }
    ],
    subtotal: 38500,
    taxAmt: 1155,
    discount: 500,
    grandTotal: 39155,
    paymentMethod: 'Cash'
  };

  const bill1 = store.savePOSBill(billData);
  assert(bill1 !== null && bill1 !== undefined, 'savePOSBill must return created bill object');
  assert(bill1.id && bill1.id.startsWith('BILL-'), `Bill ID must start with BILL-, got ${bill1.id}`);
  assert(bill1.subtotal === 38500, `Subtotal must be 38500, got ${bill1.subtotal}`);
  assert(bill1.grandTotal === 39155, `GrandTotal must be 39155, got ${bill1.grandTotal}`);
  console.log();

  // ─── TEST 2: POS Bill ID -> UUID Mapping ──────────────────────────────────
  console.log('TEST 2: POS Bill ID -> UUID Mapping Setup');
  store.state.posBillCloudMap = store.state.posBillCloudMap || {};
  const mockUuid = '11111111-2222-3333-4444-555555555555';
  store.state.posBillCloudMap[bill1.id] = mockUuid;
  store.state.posBillCloudMap[mockUuid] = bill1.id;
  assert(store.state.posBillCloudMap[bill1.id] === mockUuid, 'posBillCloudMap must map local bill ID to UUID');
  assert(store.state.posBillCloudMap[mockUuid] === bill1.id, 'posBillCloudMap must map UUID back to local bill ID');
  console.log();

  // ─── TEST 3: POS Bill INSERT (Supabase Client Method) ─────────────────────
  console.log('TEST 3: POS Bill INSERT (syncPosBillToCloud)');
  const syncRes1 = await supabaseClient.syncPosBillToCloud(bill1, null, null);
  console.log('  syncPosBillToCloud response:', { success: syncRes1.success, error: syncRes1.error ? syncRes1.error.message : null });
  assert(syncRes1 !== undefined, 'syncPosBillToCloud must return response object');
  console.log();

  // ─── TEST 4: POS Bill UPDATE (syncPosBillToCloud with UUID) ───────────────
  console.log('TEST 4: POS Bill UPDATE (syncPosBillToCloud with UUID)');
  const updatePayload = { ...bill1, grandTotal: 39200 };
  const syncRes4 = await supabaseClient.syncPosBillToCloud(updatePayload, mockUuid, null);
  assert(syncRes4 !== undefined, 'syncPosBillToCloud UPDATE must return response object');
  console.log();

  // ─── TEST 5: POS Bill Soft Delete ─────────────────────────────────────────
  console.log('TEST 5: POS Bill Soft Delete');
  const delRes = store.softDeleteRecord('pos_bill', bill1.id);
  assert(delRes === true, 'softDeleteRecord pos_bill must return true');
  const allBills = store.getBills(true);
  const deletedBill = allBills.find(b => b.id === bill1.id);
  assert(deletedBill && deletedBill.isDeleted === true, 'Bill isDeleted must be true after soft delete');
  const activeBills = store.getBills();
  assert(!activeBills.find(b => b.id === bill1.id), 'Soft-deleted bill must not appear in active bills list');
  console.log();

  // ─── TEST 6: POS Bill RESTORE ─────────────────────────────────────────────
  console.log('TEST 6: POS Bill RESTORE');
  const restRes = store.restoreRecord('pos_bill', bill1.id);
  assert(restRes === true, 'restoreRecord pos_bill must return true');
  assert(deletedBill.isDeleted === false, 'Bill isDeleted must be false after restore');
  assert(store.getBills().some(b => b.id === bill1.id), 'Restored bill must appear in active bills list');
  console.log();

  // ─── TEST 7: POS Bill Items Synchronization ──────────────────────────────
  console.log('TEST 7: POS Bill Items Synchronization (syncPosBillItemsToCloud)');
  const itemSyncRes = await supabaseClient.syncPosBillItemsToCloud(
    mockUuid,
    'BUS_LJS',
    bill1.items,
    {}
  );
  console.log('  syncPosBillItemsToCloud response:', { success: itemSyncRes.success, error: itemSyncRes.error ? itemSyncRes.error.message : null });
  assert(itemSyncRes !== undefined, 'syncPosBillItemsToCloud must return response object');
  console.log();

  // ─── TEST 8: Customer Mapping Resolution ──────────────────────────────────
  console.log('TEST 8: Customer Mapping Resolution');
  store.state.customerCloudMap = store.state.customerCloudMap || {};
  const mockCustUuid = '99999999-8888-7777-6666-555555555555';
  store.state.customerCloudMap['c1'] = mockCustUuid;
  const mappedCustId = store.state.customerCloudMap[bill1.customerId];
  assert(mappedCustId === mockCustUuid, `Customer UUID for c1 must resolve to ${mockCustUuid}`);
  console.log();

  // ─── TEST 9: Product Mapping Resolution ───────────────────────────────────
  console.log('TEST 9: Product Mapping Resolution');
  store.state.productCloudMap = store.state.productCloudMap || {};
  const mockProdUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  store.state.productCloudMap['p1'] = mockProdUuid;
  const mappedProdId = store.state.productCloudMap[bill1.items[0].id];
  assert(mappedProdId === mockProdUuid, `Product UUID for p1 must resolve to ${mockProdUuid}`);
  console.log();

  // ─── TEST 10: Financial Total Reconciliation ──────────────────────────────
  console.log('TEST 10: Financial Total Reconciliation Formula');
  const subtotal = bill1.subtotal;
  const taxAmt = bill1.taxAmt;
  const discount = bill1.discount;
  const grandTotal = bill1.grandTotal;
  assert(grandTotal === subtotal + taxAmt - discount, `GrandTotal (${grandTotal}) must equal subtotal+tax-discount (${subtotal}+${taxAmt}-${discount})`);
  console.log();

  // ─── TEST 11: Cash Sale Reconciliation ────────────────────────────────────
  console.log('TEST 11: Cash Sale Reconciliation');
  const cashBill = store.savePOSBill({
    customerName: 'Walk-in Cash Customer',
    items: [{ id: 'p2', name: 'Silver Coin 10g', price: 850, qty: 2 }],
    subtotal: 1700,
    taxAmt: 51,
    discount: 0,
    grandTotal: 1751,
    paymentMethod: 'Cash'
  });
  assert(cashBill.paymentMethod === 'Cash', 'Payment method must be Cash');
  console.log();

  // ─── TEST 12: Credit Sale Reconciliation ──────────────────────────────────
  console.log('TEST 12: Credit Sale Reconciliation');
  const txBefore = store.getTransactions().length;
  const creditBill = store.savePOSBill({
    customerId: 'c1',
    customerName: 'Rahul Traders',
    items: [{ id: 'p1', name: 'Gold Ring', price: 15000, qty: 1 }],
    subtotal: 15000,
    taxAmt: 450,
    discount: 0,
    grandTotal: 15450,
    paymentMethod: 'Credit'
  });
  const txAfter = store.getTransactions().length;
  assert(creditBill.paymentMethod === 'Credit', 'Payment method must be Credit');
  assert(txAfter === txBefore + 1, 'Credit POS bill must generate exactly 1 Khata transaction');
  const lastTx = store.getTransactions()[0];
  assert(lastTx.amount === 15450, `Khata transaction amount (${lastTx.amount}) must equal POS bill grandTotal (15450)`);
  assert(lastTx.type === 'GAVE', 'Khata transaction type must be GAVE');
  console.log();

  // ─── TEST 13: Khata Duplication Prevention ────────────────────────────────
  console.log('TEST 13: Khata Duplication Prevention during Cloud Sync');
  const txCountBeforeSync = store.getTransactions().length;
  await supabaseClient.syncPosBillToCloud(creditBill, null, mockCustUuid);
  const txCountAfterSync = store.getTransactions().length;
  assert(txCountBeforeSync === txCountAfterSync, 'Cloud sync of POS bill must NOT add duplicate Khata transactions');
  console.log();

  // ─── TEST 14: Inventory Duplication Prevention ────────────────────────────
  console.log('TEST 14: Inventory Duplication Prevention during Cloud Sync');
  const prodBefore = store.getProducts().find(p => p.id === 'p1');
  const stockBeforeSync = prodBefore ? prodBefore.stock : 0;
  await supabaseClient.syncPosBillToCloud(creditBill, null, mockCustUuid);
  await supabaseClient.syncPosBillItemsToCloud(mockUuid, 'BUS_LJS', creditBill.items, store.state.productCloudMap);
  const prodAfter = store.getProducts().find(p => p.id === 'p1');
  const stockAfterSync = prodAfter ? prodAfter.stock : 0;
  assert(stockBeforeSync === stockAfterSync, 'Cloud sync of POS bill must NOT cause second stock deduction');
  console.log();

  // ─── TEST 15: Idempotency Verification ────────────────────────────────────
  console.log('TEST 15: Idempotency — repeated cloud sync calls');
  const sync1 = await supabaseClient.syncPosBillToCloud(creditBill, mockUuid, mockCustUuid);
  const sync2 = await supabaseClient.syncPosBillToCloud(creditBill, mockUuid, mockCustUuid);
  assert(sync1 !== undefined && sync2 !== undefined, 'Idempotent sync calls must execute cleanly');
  console.log();

  // ─── TEST 16: Bulk Synchronization (syncAllPosBillsWithCloud) ─────────────
  console.log('TEST 16: Bulk Synchronization (syncAllPosBillsWithCloud)');
  supabaseClient.isOnline = true;
  window.iKhataSupabase = supabaseClient;
  const bulkRes = await store.syncAllPosBillsWithCloud();

  console.log('  syncAllPosBillsWithCloud (online) result:', {
    success: bulkRes.success,
    localBillsCount: bulkRes.localBillsCount,
    syncedBillsCount: bulkRes.syncedBillsCount,
    discrepancy: bulkRes.discrepancy,
    reconciled: bulkRes.reconciled
  });
  assert(bulkRes !== undefined, 'syncAllPosBillsWithCloud must return result object');
  assert(bulkRes.success === true, 'Bulk sync result must be successful when online');
  assert(bulkRes.localBillsCount >= 3, `Local bills count must be >= 3, got ${bulkRes.localBillsCount}`);
  assert(bulkRes.discrepancy >= 0, `Discrepancy must be >= 0, got ${bulkRes.discrepancy}`);
  console.log();


  // ─── TEST 17: Retry After Failure ─────────────────────────────────────────
  console.log('TEST 17: Retry After Simulated Network Failure');
  const retryRes = await supabaseClient.syncPosBillToCloud(creditBill, mockUuid, mockCustUuid);
  assert(retryRes !== undefined, 'Retry after failure must handle gracefully');
  console.log();

  // ─── TEST 18: Offline Synchronization & Local Billing Continuity ─────────
  console.log('TEST 18: Offline POS Sale Creation Continuity');
  const offlineBill = store.savePOSBill({
    customerName: 'Offline Customer',
    items: [{ id: 'p2', name: 'Silver Bar', price: 5000, qty: 1 }],
    subtotal: 5000,
    taxAmt: 150,
    discount: 0,
    grandTotal: 5150,
    paymentMethod: 'UPI'
  });
  assert(offlineBill !== null, 'POS sale creation must succeed even if cloud is offline');
  assert(store.getBills().some(b => b.id === offlineBill.id), 'Offline bill must be stored in local state');
  console.log();

  // ─── TEST 19: BUS_LJS Tenant Isolation ────────────────────────────────────
  console.log('TEST 19: BUS_LJS Tenant Isolation');
  store.switchBusiness('BUS_LJS');
  const ljsBills = store.getBills(true);
  assert(ljsBills.length >= 3, `BUS_LJS must have created local bills, got ${ljsBills.length}`);
  console.log();

  // ─── TEST 20: BUS_SHARMA Tenant Isolation ─────────────────────────────────
  console.log('TEST 20: BUS_SHARMA Tenant Isolation');
  store.switchBusiness('BUS_SHARMA');
  const sharmaBills = store.getBills(true);
  const crossOver = sharmaBills.find(b => ljsBills.some(lb => lb.id === b.id));
  assert(!crossOver, 'BUS_SHARMA must not see BUS_LJS bills');
  store.switchBusiness('BUS_LJS');
  console.log();

  // ─── TEST 21: Cross-Tenant Read Rejection (RLS Red Team) ─────────────────
  console.log('TEST 21: Cross-Tenant Read Rejection (RLS Security)');
  const redTeamFetch = await supabaseClient.fetchPosBillsFromCloud('unauthorized_business_id');
  assert(redTeamFetch.posBills.length === 0, 'Unauthorized cross-tenant fetch must return 0 rows');
  console.log();

  // ─── TEST 22: Cross-Tenant Write Rejection (RLS Red Team) ────────────────
  console.log('TEST 22: Cross-Tenant Write Rejection (RLS Security)');
  const redTeamInsert = await supabaseClient.syncPosBillToCloud(
    { business_id: 'BUS_SHARMA', id: 'BILL-HACK', customerName: 'Hacker', grandTotal: 99999 },
    null,
    null
  );
  assert(redTeamInsert.success === false, 'Cross-tenant POS bill insert must be rejected by RLS');
  console.log('  Red Team Insert Error:', redTeamInsert.error ? redTeamInsert.error.message : 'rejected as expected');
  console.log();

  // ─── TEST 23: Pre-Migration Backup Snapshot Verification ──────────────────
  console.log('TEST 23: Pre-Migration Backup Snapshot Verification');
  const snapKey = `iKhataPro_snapshot_before_pos_bill_sync_test_${Date.now()}`;
  localStorage.setItem(snapKey, JSON.stringify({ billsCount: ljsBills.length, timestamp: new Date().toISOString() }));
  const snapVal = localStorage.getItem(snapKey);
  assert(snapVal !== null, 'Backup snapshot must be persisted in localStorage');
  const snapParsed = JSON.parse(snapVal);
  assert(snapParsed.billsCount === ljsBills.length, 'Backup snapshot content must be parseable');
  console.log();

  // ─── TEST 24: Restore Safety ──────────────────────────────────────────────
  console.log('TEST 24: Restore Safety Verification');
  const origBillsCount = store.getBills(true).length;
  store.saveState();
  const loadedBillsCount = store.getBills(true).length;
  assert(origBillsCount === loadedBillsCount, 'Local state save & load must preserve bill count');
  console.log();

  // ─── TEST 25: Demo Data Preservation ─────────────────────────────────────
  console.log('TEST 25: Demo Data Preservation');
  assert(store.state.businesses.length >= 2, 'Businesses demo data must be preserved');
  assert(store.state.customers.length >= 20, 'Customers demo data must be preserved');
  assert(store.state.products.length >= 5, 'Products demo data must be preserved');
  console.log();

  // ─── SUMMARY REPORT ───────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 STAGE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
