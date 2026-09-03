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
  pool: true,
  keepAlive: true,
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

// ── In-memory Storefront Orders Store ──────────────────────────────────────────
const onlineOrdersStore = [];

// ── Online Storefront Orders Endpoints ──────────────────────────────────────────
// 1. GET /api/orders (Optionally query by businessId or business_id)
app.get('/api/orders', (req, res) => {
  try {
    const { businessId, business_id } = req.query;
    const targetBus = businessId || business_id;
    if (targetBus) {
      const filtered = onlineOrdersStore.filter(o => (o.business_id === targetBus || o.businessId === targetBus) && !o.isDeleted);
      return res.status(200).json({ success: true, count: filtered.length, data: filtered });
    }
    return res.status(200).json({ success: true, count: onlineOrdersStore.length, data: onlineOrdersStore });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/orders (Create new storefront order)
app.post('/api/orders', (req, res) => {
  try {
    const payload = req.body.order || req.body;
    const orderData = {
      id: payload.id || ('ORD-' + Math.floor(100000 + Math.random() * 900000)),
      business_id: payload.business_id || payload.businessId || 'BUS_LJS',
      customerId: payload.customerId || null,
      customerName: payload.customerName || 'Guest Customer',
      customerPhone: payload.customerPhone || '',
      address: payload.address || '',
      items: payload.items || [],
      subtotal: Number(payload.subtotal || 0),
      deliveryFee: Number(payload.deliveryFee || 0),
      total: Number(payload.total || 0),
      paymentMethod: payload.paymentMethod || 'WhatsApp',
      status: payload.status || 'Pending',
      createdAt: payload.createdAt || new Date().toISOString(),
      isDeleted: false
    };

    // Avoid duplicate IDs
    const existingIndex = onlineOrdersStore.findIndex(o => o.id === orderData.id);
    if (existingIndex !== -1) {
      onlineOrdersStore[existingIndex] = orderData;
    } else {
      onlineOrdersStore.unshift(orderData);
    }
    console.log(`[Online Orders] Order recorded: #${orderData.id} (Business: ${orderData.business_id})`);
    return res.status(201).json({ success: true, message: 'Order created successfully', data: orderData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PATCH /api/orders/:id/status (Update status)
app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const existing = onlineOrdersStore.find(o => o.id === id);
    if (existing) {
      existing.status = status || existing.status;
      return res.status(200).json({ success: true, message: 'Order status updated', data: existing });
    }
    return res.status(404).json({ success: false, error: 'Order not found' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// In-memory store for Staff Accounts: { [shopId]: [ { id, name, phone, role, username, passcode, createdAt } ] }
const staffStore = {
  'SHOP-90812': [
    {
      id: 'STAFF-101',
      shopId: 'SHOP-90812',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      role: 'Billing Staff',
      username: 'STAFF-101',
      passcode: '123456',
      createdAt: new Date().toISOString()
    }
  ]
};

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
        <h3 style="color: #333333; margin-bottom: 10px;">Admin/Owner Email Verification Code</h3>
        <p style="color: #555555; font-size: 14px; line-height: 1.5;">Your 6-digit One-Time Password (OTP) to log in as Admin / Owner is:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #777777; font-size: 13px;">This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="color: #999999; font-size: 12px; text-align: center; margin: 0;">© ${new Date().getFullYear()} iKhataPro. All rights reserved.</p>
      </div>
    `;

    // Send email via Nodemailer with a 3-second timeout safeguard to prevent API hanging
    let emailSent = false;
    try {
      const sendPromise = transporter.sendMail({
        from: '"iKhataPro Security" <ethical0future@gmail.com>',
        to: cleanEmail,
        subject: 'iKhataPro Admin OTP Verification Code',
        html: htmlContent
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout safeguard')), 3000)
      );

      await Promise.race([sendPromise, timeoutPromise]);
      emailSent = true;
      console.log(`[Admin Email OTP] Successfully sent OTP ${otp} to ${cleanEmail}`);
    } catch (mailErr) {
      console.warn(`[Admin Email OTP] Nodemailer notice: ${mailErr.message}. Active OTP in memory: ${otp}`);
    }

    return res.status(200).json({
      success: true,
      message: emailSent ? 'OTP sent successfully to email' : `OTP dispatched (Code: ${otp})`,
      otp: otp,
      emailSent: emailSent
    });
  } catch (err) {
    console.error('[Admin Email OTP] Error generating OTP:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to process Email OTP: ' + err.message });
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
    console.error('[Admin Email OTP] Error verifying OTP:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error verifying OTP.' });
  }
});

// ── Staff Authentication & Credential Management Endpoints ─────────────────────
// 3. POST /api/auth/staff-login (Shop ID + Staff User ID / Passcode — NO OTP)
app.post('/api/auth/staff-login', (req, res) => {
  try {
    const { shopId, staffUserId, passcode } = req.body;
    if (!shopId || (!staffUserId && !passcode)) {
      return res.status(400).json({ success: false, error: 'Shop ID and Staff Passcode are required.' });
    }

    const cleanShopId = shopId.trim().toUpperCase();
    const cleanUserOrPass = (staffUserId || passcode || '').trim();
    const cleanPass = (passcode || '').trim();

    const shopStaffList = staffStore[cleanShopId] || [];
    const staffMember = shopStaffList.find(s =>
      (s.username && s.username.toUpperCase() === cleanUserOrPass.toUpperCase()) ||
      (s.passcode && s.passcode === cleanPass) ||
      (s.passcode && s.passcode === cleanUserOrPass)
    );

    if (staffMember) {
      return res.status(200).json({
        success: true,
        message: 'Staff Authentication Successful',
        staff: staffMember
      });
    }

    return res.status(401).json({ success: false, error: 'Invalid Shop ID or Staff Passcode.' });
  } catch (err) {
    console.error('[Staff Login] Error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal server error during staff authentication.' });
  }
});

// 4. POST /api/auth/reset-staff-password (Admin password reset for staff)
app.post('/api/auth/reset-staff-password', (req, res) => {
  try {
    const { shopId, staffId, newPasscode } = req.body;
    if (!shopId || !staffId || !newPasscode) {
      return res.status(400).json({ success: false, error: 'Shop ID, Staff ID, and new passcode are required.' });
    }
    const cleanShopId = shopId.trim().toUpperCase();
    const shopStaffList = staffStore[cleanShopId] || [];
    const staff = shopStaffList.find(s => s.id === staffId || s.username === staffId);
    if (staff) {
      staff.passcode = newPasscode.trim();
      return res.status(200).json({ success: true, message: 'Staff passcode updated successfully.', staff });
    }
    return res.status(404).json({ success: false, error: 'Staff account not found.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'iKhataPro API is running ✅ (Database: Local In-Memory / Ready for MongoDB)', timestamp: new Date().toISOString() });
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
