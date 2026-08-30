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
  console.log('\nTEST 2: Verify getEmployees() includes Ayushi Soni');
  const employees = store.getEmployees();
  const found = employees.find(e => e.phone === '8955004349');
  assert(found !== undefined, 'getEmployees() must contain newly added employee');
  assert(found && found.name === 'Ayushi Soni', `Name in getEmployees must match Ayushi Soni, got ${found ? found.name : null}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 EMPLOYEE CREATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
