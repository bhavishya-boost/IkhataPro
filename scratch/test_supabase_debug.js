/**
 * Supabase Connection & Data Debug Script
 * Checks: Connection, RLS, Table Access, Insert, Select
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('');
console.log('🔍 iKhataPro — Supabase Debug Report');
console.log('═'.repeat(50));

console.log(`\n1️⃣  ENV CHECK:`);
console.log(`   SUPABASE_URL        : ${url ? '✅ SET (' + url.substring(0, 30) + '...)' : '❌ MISSING'}`);
console.log(`   Key Type            : ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '🔑 SERVICE_ROLE_KEY' : '🔓 ANON_KEY'}`);
console.log(`   Key Present         : ${key ? '✅ SET (' + key.substring(0, 20) + '...)' : '❌ MISSING'}`);

if (!url || !key) {
  console.log('\n❌ FATAL: Missing URL or Key. Cannot proceed.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runDiagnostics() {
  // Test 1: Basic Connection
  console.log(`\n2️⃣  CONNECTION TEST:`);
  try {
    const { data, error } = await supabase.from('businesses').select('id').limit(1);
    if (error) {
      console.log(`   ❌ Connection FAILED: ${error.message}`);
      console.log(`   📋 Error Code: ${error.code}`);
      console.log(`   📋 Error Details: ${error.details}`);
      console.log(`   📋 Error Hint: ${error.hint}`);
    } else {
      console.log(`   ✅ Connection OK — businesses table accessible`);
      console.log(`   📊 Rows returned: ${data ? data.length : 0}`);
    }
  } catch (e) {
    console.log(`   ❌ Network/Connection Error: ${e.message}`);
  }

  // Test 2: Check all tables
  console.log(`\n3️⃣  TABLE ACCESS TEST:`);
  const tables = ['businesses', 'customers', 'transactions', 'products', 'suppliers',
    'purchases', 'expenses', 'invoices', 'pos_bills', 'employees', 'audit_logs'];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`   ❌ ${table.padEnd(22)} → ERROR: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`   ✅ ${table.padEnd(22)} → Accessible (count: ${count ?? 'unknown'})`);
      }
    } catch (e) {
      console.log(`   ❌ ${table.padEnd(22)} → EXCEPTION: ${e.message}`);
    }
  }

  // Test 3: RLS Check
  console.log(`\n4️⃣  RLS (Row Level Security) CHECK:`);
  try {
    const { data, error } = await supabase.from('customers').select('id, name').limit(3);
    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied') || error.message.includes('RLS')) {
        console.log(`   ⚠️  RLS IS BLOCKING reads on customers table!`);
        console.log(`   💡 FIX: Run FIX_SYNC_PERMISSIONS.sql in Supabase SQL Editor`);
        console.log(`   💡 OR: Add SUPABASE_SERVICE_ROLE_KEY to .env (bypasses RLS)`);
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    } else {
      console.log(`   ✅ RLS allows reads (${(data || []).length} rows returned)`);
      if (data && data.length > 0) {
        console.log(`   📊 Sample: ${JSON.stringify(data[0])}`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Exception: ${e.message}`);
  }

  // Test 4: Write Test
  console.log(`\n5️⃣  WRITE (INSERT) TEST:`);
  try {
    let bizId = null;
    const { data: biz } = await supabase.from('businesses').select('id').limit(1);
    if (biz && biz.length > 0) {
      bizId = biz[0].id;
      console.log(`   📋 Using existing business: ${bizId}`);
    } else {
      console.log(`   ⚠️  No businesses found — tables may be empty or RLS blocking`);
    }

    const testPayload = {
      name: '__DEBUG_TEST_' + Date.now(),
      phone: '0000000000',
    };
    if (bizId) testPayload.business_id = bizId;

    const { data: inserted, error: insertErr } = await supabase
      .from('customers')
      .insert([testPayload])
      .select()
      .single();

    if (insertErr) {
      console.log(`   ❌ INSERT FAILED: ${insertErr.message}`);
      console.log(`   📋 Code: ${insertErr.code}`);
      console.log(`   📋 Details: ${insertErr.details}`);
      console.log(`   📋 Hint: ${insertErr.hint}`);

      if (insertErr.code === '42501') {
        console.log(`   💡 FIX: RLS is blocking inserts. Run FIX_SYNC_PERMISSIONS.sql`);
      }
      if (insertErr.code === '23503') {
        console.log(`   💡 FIX: Foreign key violation — business_id doesn't exist`);
      }
      if (insertErr.code === '23502') {
        console.log(`   💡 FIX: NOT NULL constraint — a required column is missing`);
      }
    } else {
      console.log(`   ✅ INSERT OK — Test customer created: ${inserted.id}`);
      await supabase.from('customers').delete().eq('id', inserted.id);
      console.log(`   🧹 Cleanup done — test row deleted`);
    }
  } catch (e) {
    console.log(`   ❌ Exception: ${e.message}`);
  }

  // Test 5: transactions CHECK constraint
  console.log(`\n6️⃣  TRANSACTIONS TYPE CHECK:`);
  try {
    const { data, error } = await supabase.from('transactions').select('type').limit(5);
    if (error) {
      console.log(`   ❌ Cannot read transactions: ${error.message}`);
    } else {
      console.log(`   ✅ Transactions table readable (${(data || []).length} rows)`);
      if (data && data.length > 0) {
        const types = data.map(t => t.type);
        console.log(`   📊 Existing types: ${JSON.stringify([...new Set(types)])}`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Exception: ${e.message}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📋 COMMON REASONS DATA DOESN'T REACH SUPABASE:`);
  console.log(`   1. RLS enabled but no permissive policies → blocks anon reads/writes`);
  console.log(`   2. Using ANON_KEY instead of SERVICE_ROLE_KEY → subject to RLS`);
  console.log(`   3. Tables not created → run MASTER_SCHEMA.sql first`);
  console.log(`   4. CHECK constraints mismatch → type must be 'GAVE'/'GOT' not 'UDHAR'`);
  console.log(`   5. Foreign key errors → business_id not in businesses table`);
  console.log(`   6. Network/CORS issues → Supabase URL unreachable`);
  console.log(`${'═'.repeat(50)}\n`);
}

runDiagnostics().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
