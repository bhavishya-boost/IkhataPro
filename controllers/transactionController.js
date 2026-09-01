const { customersStore } = require('./customerController');

// In-Memory Transaction Store (Ready for MongoDB integration)
let transactionsStore = [
  {
    id: 'txn_1',
    customer_id: 'cust_1',
    customer_name: 'Ramesh Kumar',
    business_id: 'default_biz',
    type: 'UDHAR',
    amount: 500,
    note: 'Initial balance entry',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  },
  {
    id: 'txn_2',
    customer_id: 'cust_2',
    customer_name: 'Suresh Sharma',
    business_id: 'default_biz',
    type: 'JAMA',
    amount: 200,
    note: 'Advance payment',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  }
];

// Helper to update customer running balance in customer memory store
const syncCustomerBalance = (customerId) => {
  if (!customerId) return;
  const txns = transactionsStore.filter(t => String(t.customer_id) === String(customerId));
  let balance = 0;
  txns.forEach((t) => {
    const typeStr = (t.type || '').toUpperCase();
    const amt = Number(t.amount) || 0;
    if (typeStr === 'UDHAR' || typeStr === 'GAVE') {
      balance += amt;
    } else if (typeStr === 'JAMA' || typeStr === 'GOT') {
      balance -= amt;
    }
  });

  const cust = customersStore.find(c => String(c.id) === String(customerId));
  if (cust) {
    cust.balance = Math.round(balance * 100) / 100;
  }
};

// GET /api/transactions/:customerId — Get full ledger for a customer
const getTransactionsByCustomer = async (req, res) => {
  const { customerId } = req.params;
  try {
    const txns = transactionsStore.filter(t => String(t.customer_id) === String(customerId));
    
    // Calculate running balance
    let runningBalance = 0;
    const ledger = txns.map((txn) => {
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
    const customer = customersStore.find(c => String(c.id) === String(customer_id));
    const customerName = customer ? customer.name : 'Unknown Customer';
    const targetBusinessId = business_id || (customer ? customer.business_id : 'default_biz');

    const newTxn = {
      id: 'txn_' + Date.now(),
      customer_id,
      customer_name: customerName,
      business_id: targetBusinessId,
      type: rawType,
      amount: parsedAmount,
      note: note || null,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    transactionsStore.push(newTxn);
    syncCustomerBalance(customer_id);

    return res.status(201).json({ success: true, data: newTxn });
  } catch (err) {
    console.error('[transactionController] createTransaction:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/transactions/:id — Delete a single transaction
const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const txn = transactionsStore.find(t => String(t.id) === String(id));
    if (!txn) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const customerId = txn.customer_id;
    transactionsStore = transactionsStore.filter(t => String(t.id) !== String(id));
    syncCustomerBalance(customerId);

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
    let list = transactionsStore;
    if (business_id && business_id !== 'YOUR_BUSINESS_ID') {
      list = list.filter(t => t.business_id === business_id.trim());
    }

    let totalUdhar = 0;
    let totalJama = 0;

    list.forEach((txn) => {
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
