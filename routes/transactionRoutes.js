const express = require('express');
const router = express.Router();
const {
  getTransactionsByCustomer,
  createTransaction,
  deleteTransaction,
  getDashboardSummary,
} = require('../controllers/transactionController');

router.get('/dashboard/summary', getDashboardSummary);
router.get('/:customerId', getTransactionsByCustomer);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
