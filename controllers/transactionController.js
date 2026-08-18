const supabase = require('../config/supabaseClient');

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
    const ledger = data.map((txn) => {
      if (txn.type === 'UDHAR') {
        runningBalance += Number(txn.amount);
      } else if (txn.type === 'JAMA') {
        runningBalance -= Number(txn.amount);
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
  const { customer_id, type, amount, note, shopkeeper_id } = req.body;

  if (!customer_id || !type || !amount) {
    return res.status(400).json({
      success: false,
      error: 'customer_id, type (UDHAR|JAMA), and amount are required.',
    });
  }

  if (!['UDHAR', 'JAMA'].includes(type.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: 'Transaction type must be UDHAR or JAMA.',
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be a positive number.' });
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id,
          type: type.toUpperCase(),
          amount: parsedAmount,
          note: note || null,
          shopkeeper_id: shopkeeper_id || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
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
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true, message: 'Transaction deleted.' });
  } catch (err) {
    console.error('[transactionController] deleteTransaction:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/dashboard/summary — Calculate total Udhar and Jama across all customers
const getDashboardSummary = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount');

    if (error) throw error;

    let totalUdhar = 0;
    let totalJama = 0;

    data.forEach((txn) => {
      const amt = Number(txn.amount);
      if (txn.type === 'UDHAR') totalUdhar += amt;
      else if (txn.type === 'JAMA') totalJama += amt;
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
