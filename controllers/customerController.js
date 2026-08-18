const supabase = require('../config/supabaseClient');

// GET /api/customers — Fetch all customers
const getAllCustomers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ success: true, data });
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
  const { name, phone, shopkeeper_id } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: 'Customer name is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name: name.trim(), phone: phone || null, shopkeeper_id: shopkeeper_id || null }])
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
  const { name, phone } = req.body;

  try {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: name?.trim(), phone: phone || null })
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
