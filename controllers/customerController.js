// In-Memory Customer Store (Ready for MongoDB integration)
let customersStore = [
  {
    id: 'cust_1',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'ramesh@example.com',
    address: 'Shop 12, Main Market',
    notes: 'Regular customer',
    balance: 500,
    business_id: 'default_biz',
    created_at: new Date().toISOString()
  },
  {
    id: 'cust_2',
    name: 'Suresh Sharma',
    phone: '9812345678',
    email: 'suresh@example.com',
    address: 'Block B, Sector 4',
    notes: 'Wholesale buyer',
    balance: -200,
    business_id: 'default_biz',
    created_at: new Date().toISOString()
  }
];

// GET /api/customers — Fetch all customers
const getAllCustomers = async (req, res) => {
  try {
    const { business_id } = req.query;
    let list = customersStore;
    if (business_id && business_id !== 'YOUR_BUSINESS_ID') {
      list = list.filter(c => c.business_id === business_id.trim());
    }
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    console.error('[customerController] getAllCustomers:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/customers/:id — Fetch single customer by ID
const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = customersStore.find(c => String(c.id) === String(id));
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    console.error('[customerController] getCustomerById:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/customers — Add a new customer
const createCustomer = async (req, res) => {
  const { name, phone, email, address, notes, balance, business_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Customer name is required.' });
  }

  try {
    const newCustomer = {
      id: 'cust_' + Date.now(),
      name: name.trim(),
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      balance: balance ? parseFloat(balance) : 0,
      business_id: business_id || 'default_biz',
      created_at: new Date().toISOString()
    };

    customersStore.push(newCustomer);
    return res.status(201).json({ success: true, data: newCustomer });
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
    const index = customersStore.findIndex(c => String(c.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    const current = customersStore[index];
    if (name !== undefined) current.name = name.trim();
    if (phone !== undefined) current.phone = phone || null;
    if (email !== undefined) current.email = email || null;
    if (address !== undefined) current.address = address || null;
    if (notes !== undefined) current.notes = notes || null;
    if (balance !== undefined) current.balance = parseFloat(balance);

    customersStore[index] = current;
    return res.status(200).json({ success: true, data: current });
  } catch (err) {
    console.error('[customerController] updateCustomer:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/customers/:id — Delete a customer
const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const initialLen = customersStore.length;
    customersStore = customersStore.filter(c => String(c.id) !== String(id));
    if (customersStore.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }
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
  customersStore // exported for balance sync if needed
};
