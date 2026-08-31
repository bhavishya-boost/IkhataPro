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
  console.log('🧪 SUPPLIER & EMPLOYEE CLOUD SYNC FIX TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');
  const bId = store.getActiveBusinessId();

  // 1. Supplier deduplication on cloud merge
  console.log('TEST 1: Supplier cloud merge deduplication');
  store.state.suppliers = [
    { id: 'sup_1', business_id: bId, name: 'Sharma Hardware', phone: '9876543210', balance: 500 }
  ];

  const cloudMock = {
    success: true,
    suppliers: [
      { id: 'cloud_uuid_101', name: 'Sharma Hardware', phone: '9876543210', balance: 500, is_active: true }
    ],
    employees: [
      { id: 'emp_cloud_1', name: 'Ayushi Soni', phone: '8955004349', role: 'MANAGER', sales: 0, collections: 0 }
    ]
  };

  store.mergeCloudDataIntoState(cloudMock, bId);

  const sups = store.getSuppliers();
  assert(sups.length === 1, `Suppliers length after merge must be 1, got ${sups.length}`);
  assert(store.state.supplierCloudMap['sup_1'] === 'cloud_uuid_101', 'supplierCloudMap must map local sup_1 to cloud_uuid_101');

  // 2. Repeat merge should NOT duplicate
  console.log('\nTEST 2: Repeat cloud merge does not create duplicates');
  store.mergeCloudDataIntoState(cloudMock, bId);
  store.mergeCloudDataIntoState(cloudMock, bId);
  const supsAfterRepeat = store.getSuppliers();
  assert(supsAfterRepeat.length === 1, `Suppliers length after 3 merges must remain 1, got ${supsAfterRepeat.length}`);

  // 3. Employee cloud merge
  console.log('\nTEST 3: Employee cloud merge into state');
  const emps = store.getEmployees();
  assert(emps.length === 1, `Employees length must be 1, got ${emps.length}`);
  assert(emps[0].name === 'Ayushi Soni', `Employee name must be Ayushi Soni, got ${emps[0].name}`);
  assert(emps[0].role === 'Manager', `Employee role must be Manager (converted from MANAGER), got ${emps[0].role}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
