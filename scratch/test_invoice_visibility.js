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
  console.log('🧪 REAL INVOICE CREATION & VISIBILITY TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Switch to a non-demo user business
  console.log('TEST 1: Switch to real user business & create invoice');
  store.state.businesses.push({
    id: 'BUS_REAL_USER_999',
    slug: 'my-real-shop',
    name: 'My Real Shop Mathura',
    ownerName: 'Jitendra',
    storeActive: true
  });
  store.state.currentSession = {
    isAuthenticated: true,
    user: { name: 'Jitendra' },
    businessId: 'BUS_REAL_USER_999'
  };

  const inv = store.createGSTInvoice({
    taxType: 'INTRA',
    customerName: 'Bharatpur Motors',
    customerPhone: '+91 98765 00000',
    date: '2026-08-30',
    items: [
      { name: 'Transport Spare Part', hsn: '8708', qty: 1, rate: 5000, discount: 0, taxRate: 18 }
    ]
  });

  assert(inv !== null && inv !== undefined, 'createGSTInvoice must return invoice object');
  assert(inv.id && inv.id.startsWith('INV-'), `Invoice ID must start with INV-, got ${inv.id}`);

  // 2. Verify getInvoices() includes the invoice
  console.log('\nTEST 2: Verify getInvoices() returns the new invoice');
  const invoices = store.getInvoices();
  const found = invoices.find(i => i.id === inv.id);
  assert(found !== undefined, `getInvoices() must return newly created invoice ${inv.id}`);
  assert(found && found.customerName === 'Bharatpur Motors', `Customer name must match Bharatpur Motors, got ${found ? found.customerName : null}`);

  // 3. Verify purgeSampleDemoData() does not remove real invoice
  console.log('\nTEST 3: Verify purgeSampleDemoData() preserves real invoice');
  store.purgeSampleDemoData();
  const invoicesAfterPurge = store.getInvoices();
  const foundAfterPurge = invoicesAfterPurge.find(i => i.id === inv.id);
  assert(foundAfterPurge !== undefined, `Invoice ${inv.id} must be preserved after purgeSampleDemoData()`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 INVOICE VISIBILITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test exception:', err);
  process.exit(1);
});
