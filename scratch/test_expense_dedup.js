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
  console.log('🧪 EXPENSE DEDUPLICATION & MULTI-CYCLE SYNC VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');
  const bId = store.getActiveBusinessId();

  // 1. Simulate 4 duplicate expense entries created locally & synced
  console.log('TEST 1: Cleaning existing 4 duplicate entries down to 1');
  const today = new Date().toISOString().split('T')[0];
  
  // Inject 4 duplicates of "bharatpur to mathura" ₹500
  for (let i = 1; i <= 4; i++) {
    store.state.expenses.push({
      id: `dup_exp_${i}`,
      business_id: bId,
      category: 'Transport',
      amount: 500,
      date: today,
      note: 'bharatpur to mathura',
      isDeleted: false
    });
  }

  const countBefore = store.getExpenses().filter(e => e.note === 'bharatpur to mathura').length;
  assert(countBefore === 4, `Injected 4 duplicate entries, got ${countBefore}`);

  // Run deduplication
  store.deduplicateExpenses();
  const countAfter = store.getExpenses().filter(e => e.note === 'bharatpur to mathura').length;
  assert(countAfter === 1, `Deduplication reduced duplicate count from 4 to ${countAfter}`);

  // 2. Test Multi-Cycle Cloud Sync (Simulated Push & Pull cycles)
  console.log('\nTEST 2: Multi-cycle periodic pull & push simulation');
  
  // Mock Supabase methods to return cloud data without network calls
  const mockCloudRows = [
    { id: 'uuid-b1', category: 'Transport', amount: 500, note: 'bharatpur to mathura', date: today, business_id: bId, is_deleted: false }
  ];

  window.iKhataSupabase = {
    isOnline: true,
    async pushFullLocalStateToCloud(state) {
      // Simulate sync: set expenseCloudMap for valid expenses
      state.expenseCloudMap = state.expenseCloudMap || {};
      state.expenses.forEach(e => {
        if (e.note === 'bharatpur to mathura') {
          state.expenseCloudMap[e.id] = 'uuid-b1';
          state.expenseCloudMap['uuid-b1'] = e.id;
        }
      });
      return { success: true, counts: { expenses: 1 } };
    },
    async pullAllCloudDataForBusiness(bizId) {
      return { success: true, expenses: mockCloudRows };
    }
  };

  // Run 5 simulated sync cycles
  for (let cycle = 1; cycle <= 5; cycle++) {
    const pullRes = await window.iKhataSupabase.pullAllCloudDataForBusiness(bId);
    store.mergeCloudDataIntoState(pullRes, bId);
    await window.iKhataSupabase.pushFullLocalStateToCloud(store.state);
  }

  const finalCount = store.getExpenses().filter(e => e.note === 'bharatpur to mathura').length;
  assert(finalCount === 1, `After 5 sync cycles, expense count remains strictly 1 (got ${finalCount})`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 DEDUPLICATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
