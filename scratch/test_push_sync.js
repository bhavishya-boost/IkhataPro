global.window = global;
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const supabaseWrapper = require('../js/supabaseClient');
require('../js/demoData');
const demoData = global.window.iKhataDemo;

async function testPushSync() {
  console.log('🚀 Testing full batch sync of local state to Supabase...');
  
  const initialState = demoData.getInitialState();
  initialState.currentSession = { businessId: 'BUS_LJS' };

  console.log(`📋 Initial State contains:`);
  console.log(`   - Customers    : ${initialState.customers ? initialState.customers.length : 0}`);
  console.log(`   - Products     : ${initialState.products ? initialState.products.length : 0}`);
  console.log(`   - Transactions : ${initialState.transactions ? initialState.transactions.length : 0}`);
  console.log(`   - Suppliers    : ${initialState.suppliers ? initialState.suppliers.length : 0}`);
  console.log(`   - Expenses     : ${initialState.expenses ? initialState.expenses.length : 0}`);

  const res = await supabaseWrapper.pushFullLocalStateToCloud(initialState);
  
  console.log('\n📊 Batch Sync Result:');
  console.log(JSON.stringify(res, null, 2));

  // Verify in database:
  const connRes = await supabaseWrapper.testConnection();
  console.log('\n🔍 Post-Sync DB Health Check:', connRes.message);
}

testPushSync().catch(err => {
  console.error('Fatal error during testPushSync:', err);
  process.exit(1);
});
