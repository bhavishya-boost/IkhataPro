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
  console.log('🧪 EMPLOYEE CREATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');
  const bId = store.getActiveBusinessId();

  // 1. Create employee
  console.log('TEST 1: Add Employee "Ayushi Soni"');
  const emp = store.addEmployee({
    name: 'Ayushi Soni',
    phone: '8955004349',
    role: 'Manager'
  });

  assert(emp !== null && emp !== undefined, 'addEmployee must return employee object');
  assert(emp.name === 'Ayushi Soni', `Employee name must be Ayushi Soni, got ${emp.name}`);
  assert(emp.phone === '8955004349', `Phone must be 8955004349, got ${emp.phone}`);
  assert(emp.role === 'Manager', `Role must be Manager, got ${emp.role}`);

  // 2. Verify getEmployees()
  // 3. Add duplicate employee "Ayushi Soni" with same phone
  console.log('\nTEST 3: Add duplicate Employee "Ayushi Soni" multiple times');
  store.addEmployee({ name: 'Ayushi Soni', phone: '8955004349', role: 'Manager' });
  store.addEmployee({ name: 'Ayushi Soni', phone: '8955004349', role: 'Manager' });
  store.addEmployee({ name: 'Ayushi Soni', phone: '8955004349', role: 'Manager' });

  const empsAfterDup = store.getEmployees();
  const ayushiCount = empsAfterDup.filter(e => e.phone === '8955004349' || e.name === 'Ayushi Soni').length;
  assert(ayushiCount === 1, `getEmployees() must return exactly 1 entry for Ayushi Soni, got ${ayushiCount}`);

  // 4. Test loadState deduplication for legacy duplicate state
  console.log('\nTEST 4: Test loadState() deduplication on duplicate state in localStorage');
  const rawState = store.loadState();
  // Manually insert legacy duplicates with different IDs
  rawState.employees.push({ id: 'emp_111', business_id: 'BUS_LJS', name: 'Ayushi Soni', phone: '8955004349', role: 'Manager' });
  rawState.employees.push({ id: 'emp_222', business_id: 'BUS_LJS', name: 'Ayushi Soni', phone: '8955004349', role: 'Manager' });
  store.state = rawState;
  
  // Trigger loadState
  const cleanedState = store.loadState();
  const cleanedAyushiCount = cleanedState.employees.filter(e => e.phone === '8955004349').length;
  assert(cleanedAyushiCount === 1, `loadState() must clean up duplicates down to 1 entry, got ${cleanedAyushiCount}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 EMPLOYEE CREATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
