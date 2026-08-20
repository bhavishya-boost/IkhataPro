const supabase = require('../config/supabaseClient');

// Helper to update customer running balance in customers table
const syncCustomerBalance = async (customerId) => {
  if (!customerId) return;
  try {
    const { data: txns, error } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('customer_id', customerId);

    if (error) return;

    let balance = 0;
    (txns || []).forEach((t) => {
      const typeStr = (t.type || '').toUpperCase();
      const amt = Number(t.amount) || 0;
      if (typeStr === 'UDHAR' || typeStr === 'GAVE') {
        balance += amt;
      } else if (typeStr === 'JAMA' || typeStr === 'GOT') {
        balance -= amt;
      }
    });

    await supabase
      .from('customers')
      .update({ balance: Math.round(balance * 100) / 100 })
      .eq('id', customerId);
  } catch (err) {
    console.warn('[transactionController] syncCustomerBalance error:', err.message);
  }
};

// GET /api/transactions/:customerId — Get full ledger for a customer
const getTransactionsByCustomer = async (req, res) => {
  const { customerId } = req.params;
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Calculate running balance
    let runningBalance = 0;
    const ledger = (data || []).map((txn) => {
      const typeStr = (txn.type || '').toUpperCase();
      const amt = Number(txn.amount) || 0;
      if (typeStr === 'UDHAR' || typeStr === 'GAVE') {
        runningBalance += amt;
      } else if (typeStr === 'JAMA' || typeStr === 'GOT') {
        runningBalance -= amt;
      }
      return { ...txn, running_balance: runningBalance };
    });

    return res.status(200).json({ success: true, data: ledger });
  } catch (err) {
    console.error('[transactionController] getTransactionsByCustomer:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/transactions — Add a new UDHAR or JAMA entry
const createTransaction = async (req, res) => {
  const { customer_id, type, amount, note, business_id } = req.body;

  if (!customer_id || !type || !amount) {
    return res.status(400).json({
      success: false,
      error: 'customer_id, type (UDHAR|JAMA|GAVE|GOT), and amount are required.',
    });
  }

  const rawType = String(type).toUpperCase();
  if (!['UDHAR', 'JAMA', 'GAVE', 'GOT'].includes(rawType)) {
    return res.status(400).json({
      success: false,
      error: 'Transaction type must be UDHAR, JAMA, GAVE, or GOT.',
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number.' });
  }

  try {
    // Fetch customer details for customer_name and business_id
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('name, business_id')
      .eq('id', customer_id)
      .single();

    if (custError || !customer) {
      return res.status(404).json({ success: false, error: 'Customer not found.' });
    }

    const targetBusinessId = business_id || customer.business_id;

    // Standardize type format (Keep input type or map safely)
    const payload = {
      customer_id,
      customer_name: customer.name,
      business_id: targetBusinessId,
      type: rawType,
      amount: parsedAmount,
      note: note || null,
      date: new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    // Recalculate and update customer balance asynchronously
    await syncCustomerBalance(customer_id);

    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[transactionController] createTransaction:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/transactions/:id — Delete a single transaction
const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch transaction first to know customer_id for balance re-sync
    const { data: txn } = await supabase
      .from('transactions')
      .select('customer_id')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    if (txn && txn.customer_id) {
      await syncCustomerBalance(txn.customer_id);
    }

    return res.status(200).json({ success: true, message: 'Transaction deleted.' });
  } catch (err) {
    console.error('[transactionController] deleteTransaction:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/dashboard/summary — Calculate total Udhar and Jama across all customers
const getDashboardSummary = async (req, res) => {
  try {
    const { business_id } = req.query;
    let query = supabase.from('transactions').select('type, amount');

    if (business_id && business_id !== 'YOUR_BUSINESS_ID') {
      query = query.eq('business_id', business_id.trim());
    }

    const { data, error } = await query;

    if (error) throw error;

    let totalUdhar = 0;
    let totalJama = 0;

    (data || []).forEach((txn) => {
      const typeStr = (txn.type || '').toUpperCase();
      const amt = Number(txn.amount) || 0;
      if (typeStr === 'UDHAR' || typeStr === 'GAVE') {
        totalUdhar += amt;
      } else if (typeStr === 'JAMA' || typeStr === 'GOT') {
        totalJama += amt;
      }
    });

    const netBalance = totalUdhar - totalJama;

    return res.status(200).json({
      success: true,
      data: {
        total_udhar: totalUdhar,
        total_jama: totalJama,
        net_balance: netBalance,
        status: netBalance >= 0 ? 'YOU_WILL_GET' : 'YOU_WILL_GIVE',
      },
    });
  } catch (err) {
    console.error('[transactionController] getDashboardSummary:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getTransactionsByCustomer,
  createTransaction,
  deleteTransaction,
  getDashboardSummary,
};

