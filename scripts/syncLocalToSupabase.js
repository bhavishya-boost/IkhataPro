const supabase = require('../config/supabaseClient');

async function seedCloudData() {
  console.log('🚀 Syncing initial store data to Supabase Cloud...');

  // 1. Ensure default business exists
  let businessId = null;
  const { data: businesses, error: bizErr } = await supabase.from('businesses').select('id').limit(1);

  if (bizErr) {
    console.error('❌ Supabase Error:', bizErr.message);
    console.error('👉 Please run supabase/FIX_SYNC_PERMISSIONS.sql in Supabase SQL Editor first!');
    return;
  }

  if (businesses && businesses.length > 0) {
    businessId = businesses[0].id;
    console.log('✅ Found active business ID:', businessId);
  } else {
    const { data: newBiz, error: createBizErr } = await supabase
      .from('businesses')
      .insert([{
        name: 'iKhata Main Store',
        owner_name: 'Shop Owner',
        username: 'main_store',
        slug: 'main-store',
      }])
      .select('id')
      .single();

    if (createBizErr) {
      console.error('❌ Failed to create business:', createBizErr.message);
      return;
    }
    businessId = newBiz.id;
    console.log('✅ Created main business ID:', businessId);
  }

  // 2. Initial demo customers seed if empty
  const { data: customers } = await supabase.from('customers').select('id').eq('business_id', businessId);
  if (!customers || customers.length === 0) {
    console.log('📦 Seeding initial demo customers into Supabase Cloud...');
    const demoCustomers = [
      { name: 'Ramesh Kumar', phone: '9876543210', balance: 1500, category: 'Regular', business_id: businessId },
      { name: 'Suresh Sharma', phone: '9812345678', balance: 500, category: 'Regular', business_id: businessId },
      { name: 'Anita Verma', phone: '9711223344', balance: -200, category: 'VIP', business_id: businessId },
    ];
    const { data: insertedCust, error: custInsErr } = await supabase.from('customers').insert(demoCustomers).select();
    if (custInsErr) {
      console.error('❌ Customer seeding error:', custInsErr.message);
    } else {
      console.log(`✅ Seeded ${insertedCust.length} customers into Supabase Cloud!`);
    }
  } else {
    console.log(`ℹ️ Supabase Cloud already has ${customers.length} customers.`);
  }

  console.log('🎉 Cloud Sync Test Completed Successfully!');
}

seedCloudData().catch(console.error);
