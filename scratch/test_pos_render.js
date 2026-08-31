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
require('../js/modules/pos');

const store = window.iKhataStore;
const pos = window.iKhataPOS;

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
  console.log('🧪 POS COUNTER RENDER TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  store.switchBusiness('BUS_LJS');

  // 1. Verify getOnlineOrders exists on store
  console.log('TEST 1: Verify getOnlineOrders() exists on window.iKhataStore');
  assert(typeof store.getOnlineOrders === 'function', 'store.getOnlineOrders must be a function');
  const orders = store.getOnlineOrders();
  assert(Array.isArray(orders), 'store.getOnlineOrders() must return an array');

  // 2. Verify iKhataPOS.render executes cleanly without throwing
  console.log('\nTEST 2: Verify iKhataPOS.render() returns valid HTML string without throwing');
  let html = null;
  try {
    html = pos.render(store.state);
  } catch (err) {
    console.error('pos.render threw error:', err);
  }
  assert(typeof html === 'string', 'pos.render must return an HTML string');
  assert(html && html.includes('Point of Sale (POS) Counter'), 'Rendered HTML must contain POS title');

  // 3. Test addToCartById
  console.log('\nTEST 3: Verify addToCartById()');
  const prods = store.getProducts();
  if (prods.length > 0) {
    const testProd = prods[0];
    pos.addToCartById(testProd.id);
    assert(pos.cart.length === 1, `Cart length must be 1, got ${pos.cart.length}`);
    assert(pos.cart[0].id === testProd.id, `Cart item ID must match ${testProd.id}`);
  } else {
    console.log('  ⚠️ Skipped cart test (no products in demo store)');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 POS COUNTER TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal POS test exception:', err);
  process.exit(1);
});
