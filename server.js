require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { getDashboardSummary } = require('./controllers/transactionController');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);

// Dashboard summary shortcut route
app.get('/api/dashboard/summary', getDashboardSummary);

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'iKhataPro API is running ✅', timestamp: new Date().toISOString() });
});

// ── Serve public/ (new standalone dashboard) ───────────────────────────────────
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// ── Serve existing root-level frontend (legacy SPA) ────────────────────────────
app.use(express.static(__dirname, {
  index: 'landing.html',
  extensions: ['html'],
}));

// Fallback for SPA routing — serve landing.html for unmatched routes
app.get('*', (req, res) => {
  // If the request looks like an API call, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// ── Start Server ───────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 iKhataPro Express Server');
  console.log('────────────────────────────────────────');
  console.log(`   App:      http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   API Base:  http://localhost:${PORT}/api`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log('────────────────────────────────────────');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Set a different PORT in .env`);
    process.exit(1);
  } else {
    throw err;
  }
});
