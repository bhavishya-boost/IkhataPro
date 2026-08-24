require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const nodemailer = require('nodemailer');

const customerRoutes = require('./routes/customerRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { getDashboardSummary } = require('./controllers/transactionController');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5000;

// ── Nodemailer Transporter Setup ───────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ethical0future@gmail.com',
    pass: 'ihym bdbq zcki dmty'
  }
});

// In-memory store for Email OTPs: { [email]: { otp: '123456', expiresAt: timestamp } }
const emailOtpStore = {};

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api/customers', customerRoutes);
app.use('/api/transactions', transactionRoutes);

// Dashboard summary shortcut route
app.get('/api/dashboard/summary', getDashboardSummary);

// ── Auth Email OTP Endpoints ────────────────────────────────────────────────────
// 1. POST /api/auth/send-otp
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Generate random 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in memory with 5-minute expiry
    emailOtpStore[cleanEmail] = {
      otp: otp,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">⚡ iKhataPro</h2>
          <p style="color: #666666; font-size: 14px; margin-top: 4px;">Digital Khata & Business Workspace</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <h3 style="color: #333333; margin-bottom: 10px;">Email Verification OTP</h3>
        <p style="color: #555555; font-size: 14px; line-height: 1.5;">Your 6-digit One-Time Password (OTP) to verify your account registration is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #777777; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} iKhataPro. All rights reserved.</p>
      </div>
    `;

    await transporter.sendMail({
      from: '"iKhataPro" <ethical0future@gmail.com>',
      to: cleanEmail,
      subject: 'iKhataPro - Account Verification OTP',
      html: htmlContent
    });

    console.log(`[Email OTP] Successfully sent OTP ${otp} to ${cleanEmail}`);
    return res.status(200).json({ success: true, message: 'OTP sent successfully to email' });
  } catch (err) {
    console.error('[Email OTP] Error sending email:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to send Email OTP: ' + err.message });
  }
});

// 2. POST /api/auth/verify-otp
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();
    const storedData = emailOtpStore[cleanEmail];

    if (!storedData) {
      return res.status(400).json({ success: false, error: 'Invalid or Expired OTP' });
    }

    if (Date.now() > storedData.expiresAt) {
      delete emailOtpStore[cleanEmail];
      return res.status(400).json({ success: false, error: 'Invalid or Expired OTP' });
    }

    if (storedData.otp !== cleanOtp) {
      return res.status(400).json({ success: false, error: 'Invalid or Expired OTP' });
    }

    // Correct OTP -> Clear OTP and return success
    delete emailOtpStore[cleanEmail];
    return res.status(200).json({ success: true, message: 'Email Verified Successfully' });
  } catch (err) {
    console.error('[Email OTP] Error verifying OTP:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error verifying OTP.' });
  }
});


// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'iKhataPro API is running ✅', timestamp: new Date().toISOString() });
});

app.get('/api/supabase/health', async (req, res) => {
  try {
    const supabaseWrapper = require('./js/supabaseClient');
    const result = await supabaseWrapper.testConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, isOnline: false, message: 'Supabase health check exception', error: err.message });
  }
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
