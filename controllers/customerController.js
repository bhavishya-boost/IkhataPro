const supabase = require('../config/supabaseClient');

// Helper to resolve or create a default business_id if missing
const resolveBusinessId = async (providedId) => {
  if (providedId && providedId.trim() && providedId !== 'YOUR_BUSINESS_ID') {
    return providedId.trim();
  }
  try {
    const { data } = await supabase.from('businesses').select('id').limit(1);
    if (data && data.length > 0) {
      return data[0].id;
    }
    const { data: newBiz, error } = await supabase
      .from('businesses')
      .insert([{
        name: 'iKhata Main Store',
        owner_name: 'Store Owner',
        username: 'main_store_' + Date.now(),
        slug: 'main-store-' + Date.now(),
      }])
      .select('id')
      .single();

    if (!error && newBiz) return newBiz.id;
  } catch (err) {
    console.warn('[customerController] resolveBusinessId error:', err.message);
  }
  return null;
};

// GET /api/customers — Fetch all customers (optional ?business_id=...)
const getAllCustomers = async (req, res) => {
  try {
    const { business_id } = req.query;
    let query = supabase.from('customers').select('*');

    if (business_id && business_id !== 'YOUR_BUSINESS_ID') {
      query = query.eq('business_id', business_id.trim());
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[customerController] getAllCustomers:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id — Fetch single customer by ID
const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[customerController] getCustomerById:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/customers — Add a new customer
const createCustomer = async (req, res) => {
  const { name, phone, email, address, notes, balance, business_id, shopkeeper_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Customer name is required.' });
  }

  try {
    const targetBusinessId = await resolveBusinessId(business_id || req.query.business_id || shopkeeper_id);

    const payload = {
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      balance: balance ? parseFloat(balance) : 0,
    };

    if (targetBusinessId) {
      payload.business_id = targetBusinessId;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[customerController] createCustomer:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/customers/:id — Update a customer
const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, notes, balance } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    if (address !== undefined) updateData.address = address || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (balance !== undefined) updateData.balance = parseFloat(balance);

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[customerController] updateCustomer:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/customers/:id — Delete a customer
const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete associated transactions first to prevent foreign key errors
    await supabase.from('transactions').delete().eq('customer_id', id);

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('[customerController] deleteCustomer:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};

