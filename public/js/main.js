/* ── iKhataPro — Khata Dashboard Main.js ───────────────────────
   Connects to Express API at http://localhost:5000/api
   Handles: Customers, Transactions (UDHAR/JAMA), Dashboard Summary
────────────────────────────────────────────────────────────────── */

const API = 'http://localhost:5000/api';

// ── App State ───────────────────────────────────────────────────
const state = {
  customers: [],
  currentCustomerId: null,
  currentTransactions: [],
  selectedTxnType: 'UDHAR',
  isVoiceListening: false,
  recognition: null,
};

// ── Init ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setDateDisplay();
  loadDashboard();
  setupKeyboardShortcuts();
});

function setDateDisplay() {
  const el = document.getElementById('date-display');
  if (el) {
    el.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
}

// ── Navigation ──────────────────────────────────────────────────
function showView(viewName) {
  ['dashboard', 'customers', 'ledger'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== viewName);
  });

  ['dashboard', 'customers', 'ledger'].forEach(v => {
    const btn = document.getElementById(`nav-${v}`);
    if (btn) btn.classList.toggle('active', v === viewName);
  });

  // Toggle top Entry button visibility in ledger
  const topBtn = document.getElementById('btn-add-txn-top');
  if (topBtn) topBtn.style.display = viewName === 'ledger' ? 'inline-flex' : 'none';

  // Close sidebar on mobile after navigation
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

// ── Dashboard ───────────────────────────────────────────────────
async function loadDashboard() {
  await Promise.all([loadSummary(), loadCustomers()]);
}

async function loadSummary() {
  try {
    const res = await fetch(`${API}/dashboard/summary`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const { total_udhar, total_jama, net_balance } = json.data;

    setText('total-udhar-display', `₹ ${fmt(total_udhar)}`);
    setText('total-jama-display',  `₹ ${fmt(total_jama)}`);
    setText('sidebar-udhar',       `₹ ${fmt(total_udhar)}`);
    setText('sidebar-jama',        `₹ ${fmt(total_jama)}`);

    const netEl  = document.getElementById('net-balance-display');
    const netCard = document.getElementById('net-card');
    if (netEl) {
      netEl.textContent = `₹ ${fmt(Math.abs(net_balance))}`;
      netEl.style.color = net_balance >= 0 ? 'var(--green)' : 'var(--red)';
    }
    if (netCard) {
      const label = netCard.querySelector('.metric-label');
      if (label) label.textContent = net_balance >= 0
        ? '🟢 Net Lene Hain — You Will Collect'
        : '🔴 Net Dene Hain — You Need to Pay';
    }
  } catch (err) {
    console.warn('[loadSummary] Supabase not connected or table missing:', err.message);
    // Show zeroed-out state gracefully
    setText('total-udhar-display', '₹ 0.00');
    setText('total-jama-display',  '₹ 0.00');
    setText('net-balance-display', '₹ 0.00');
    setText('sidebar-udhar', '₹ 0.00');
    setText('sidebar-jama',  '₹ 0.00');
  }
}

// ── Customers ───────────────────────────────────────────────────
async function loadCustomers() {
  try {
    const res = await fetch(`${API}/customers`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    state.customers = json.data || [];
  } catch (err) {
    console.warn('[loadCustomers]', err.message);
    state.customers = [];
  }

  setText('total-customers-display', state.customers.length);
  renderRecentCustomers();
  renderAllCustomers(state.customers);
}

function renderRecentCustomers() {
  const el = document.getElementById('recent-customers-list');
  if (!el) return;
  const recent = state.customers.slice(0, 6);
  el.innerHTML = recent.length ? recent.map(customerCardHTML).join('') : emptyStateHTML('No customers yet. Add your first customer!');
}

function renderAllCustomers(list) {
  const el = document.getElementById('all-customers-list');
  if (!el) return;
  el.innerHTML = list.length ? list.map(customerCardHTML).join('') : emptyStateHTML('No customers found. Try a different search.');
}

function customerCardHTML(c) {
  const bal = c.balance || 0;
  // bal > 0 = customer owes you (LENE HAIN) = GREEN
  // bal < 0 = you owe customer (DENE HAIN) = RED
  const balClass  = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
  const cardClass = bal > 0 ? 'net-positive' : bal < 0 ? 'net-negative' : 'net-zero';
  const initials  = (c.name || '?').charAt(0).toUpperCase();

  let balLabel, balSub;
  if (bal > 0) {
    balLabel = `₹ ${fmt(bal)}`;
    balSub   = '🟢 Lene Hain';
  } else if (bal < 0) {
    balLabel = `₹ ${fmt(Math.abs(bal))}`;
    balSub   = '🔴 Dene Hain';
  } else {
    balLabel = '₹ 0.00';
    balSub   = 'Clear';
  }

  return `
    <div class="customer-card ${cardClass}" onclick="openLedger('${c.id}', ${JSON.stringify(c.name).replace(/"/g, '&quot;')}, '${c.phone || ''}')">
      <div class="cust-avatar">${initials}</div>
      <div class="cust-info">
        <div class="cust-name">${esc(c.name)}</div>
        <div class="cust-phone">${c.phone ? esc(c.phone) : 'No phone'}</div>
      </div>
      <div class="cust-balance-wrap">
        <div class="cust-balance ${balClass}">${balLabel}</div>
        <div class="cust-bal-sub ${balClass}">${balSub}</div>
      </div>
    </div>`;
}

// ── Search ──────────────────────────────────────────────────────
function filterCustomers(query) {
  const q = query.toLowerCase().trim();
  const filtered = q
    ? state.customers.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      )
    : state.customers;

  renderRecentCustomers();
  renderAllCustomers(filtered);

  if (document.getElementById('view-customers').classList.contains('hidden')) {
    showView('customers');
  }
}

// ── Ledger ──────────────────────────────────────────────────────
async function openLedger(customerId, name, phone) {
  state.currentCustomerId = customerId;
  showView('ledger');

  setText('ledger-customer-name', name || 'Customer');
  setText('ledger-customer-phone', phone || '—');
  const av = document.getElementById('ledger-avatar');
  if (av) av.textContent = (name || '?').charAt(0).toUpperCase();

  // Enable ledger nav button
  const ledgerNavBtn = document.getElementById('nav-ledger');
  if (ledgerNavBtn) { ledgerNavBtn.disabled = false; }

  await loadLedger(customerId);
}

async function loadLedger(customerId) {
  const tbody = document.getElementById('ledger-tbody');
  const emptyEl = document.getElementById('ledger-empty');
  const chip = document.getElementById('ledger-balance-chip');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-3);">Loading...</td></tr>';

  try {
    const res = await fetch(`${API}/transactions/${customerId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    state.currentTransactions = json.data || [];
    const txns = state.currentTransactions;

    if (emptyEl) emptyEl.classList.toggle('hidden', txns.length > 0);

    const lastBalance = txns.length ? txns[txns.length - 1].running_balance : 0;

    // Update chip
    // bal > 0 = net UDHAR = customer owes you = Lene Hain = GREEN
    // bal < 0 = net JAMA  = you owe customer  = Dene Hain = RED
    if (chip) {
      if (lastBalance > 0) {
        chip.textContent = `🟢 Lene Hain — Customer Owes ₹ ${fmt(lastBalance)}`;
        chip.className = 'ledger-balance-chip positive';
      } else if (lastBalance < 0) {
        chip.textContent = `🔴 Dene Hain — You Owe ₹ ${fmt(Math.abs(lastBalance))}`;
        chip.className = 'ledger-balance-chip negative';
      } else {
        chip.textContent = '✔ All Clear — Balance is Zero';
        chip.className = 'ledger-balance-chip';
      }
    }

    if (tbody) {
      tbody.innerHTML = txns.length === 0
        ? ''
        : txns.map(t => {
          const date = new Date(t.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
          const udharAmt = t.type === 'UDHAR' ? `₹ ${fmt(t.amount)}` : '—';
          const jamaAmt  = t.type === 'JAMA'  ? `₹ ${fmt(t.amount)}` : '—';
          const bal = t.running_balance;
          // bal > 0 = Lene Hain (GREEN), bal < 0 = Dene Hain (RED)
          const balClass   = bal > 0 ? 'balance-positive' : bal < 0 ? 'balance-negative' : 'balance-zero';
          const balText    = bal > 0
            ? `🟢 ₹ ${fmt(bal)} Lene`
            : bal < 0
            ? `🔴 ₹ ${fmt(Math.abs(bal))} Dene`
            : '✔ Clear';
          return `<tr>
            <td>${date}</td>
            <td>${esc(t.note || '—')}</td>
            <td class="${t.type==='UDHAR'?'amount-udhar':''} txn-cell">${udharAmt}</td>
            <td class="${t.type==='JAMA'?'amount-jama':''} txn-cell">${jamaAmt}</td>
            <td class="${balClass}">${balText}</td>
            <td><button class="del-btn" onclick="deleteTransaction('${t.id}', event)">🗑 Del</button></td>
          </tr>`;
        }).join('');
    }
  } catch (err) {
    console.error('[loadLedger]', err.message);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--red);">${esc(err.message)}</td></tr>`;
    showToast('Failed to load ledger: ' + err.message, 'error');
  }
}

async function deleteTransaction(txnId, event) {
  event.stopPropagation();
  if (!confirm('Delete this entry?')) return;
  try {
    const res = await fetch(`${API}/transactions/${txnId}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showToast('Entry deleted.', 'info');
    await loadLedger(state.currentCustomerId);
    await loadSummary();
  } catch (err) {
    showToast('Delete failed: ' + err.message, 'error');
  }
}

// ── Add Customer Modal ──────────────────────────────────────────
function openAddCustomerModal() {
  clearFields(['new-customer-name', 'new-customer-phone', 'new-customer-shopkeeper']);
  openModal('modal-add-customer');
  setTimeout(() => focusEl('new-customer-name'), 120);
}

async function saveCustomer() {
  const name       = val('new-customer-name').trim();
  const phone      = val('new-customer-phone').trim();
  const shopkeeper = val('new-customer-shopkeeper').trim();

  if (!name) { showToast('Customer name is required.', 'error'); return; }

  setBtnLoading('btn-save-customer', true, 'Saving...');
  try {
    const res = await fetch(`${API}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone: phone || null, shopkeeper_id: shopkeeper || null }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(`Customer "${name}" added!`, 'success');
    closeModal('modal-add-customer');
    await loadDashboard();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    setBtnLoading('btn-save-customer', false, 'Save Customer');
  }
}

// ── Add Transaction Modal ───────────────────────────────────────
function openAddTransactionModal(type) {
  if (!state.currentCustomerId && !type) {
    showToast('Please open a customer ledger first.', 'info');
    return;
  }
  clearFields(['txn-amount', 'txn-note']);
  setTxnType(type || state.selectedTxnType);
  openModal('modal-add-transaction');
  setTimeout(() => focusEl('txn-amount'), 120);
}

function setTxnType(type) {
  state.selectedTxnType = type;
  const udharBtn = document.getElementById('toggle-udhar');
  const jamaBtn  = document.getElementById('toggle-jama');
  if (udharBtn) udharBtn.classList.toggle('active', type === 'UDHAR');
  if (jamaBtn)  jamaBtn.classList.toggle('active',  type === 'JAMA');

  const titleEl    = document.getElementById('txn-modal-title');
  const explainerEl = document.getElementById('txn-explainer');

  if (type === 'UDHAR') {
    if (titleEl)     titleEl.textContent = '🔴 Udhar Diya — You Gave Credit';
    if (explainerEl) {
      explainerEl.className = 'txn-explainer udhar-explain';
      explainerEl.innerHTML = '<strong>You gave goods/money to the customer.</strong><br>Customer owes you this amount. <em>(उधार दिया — Lene Hain)</em>';
    }
  } else {
    if (titleEl)     titleEl.textContent = '🟢 Jama Hua — You Got Payment';
    if (explainerEl) {
      explainerEl.className = 'txn-explainer jama-explain';
      explainerEl.innerHTML = '<strong>Customer paid you back.</strong><br>This reduces the balance you are owed. <em>(जमा हुआ — Dene Hain)</em>';
    }
  }
}

async function saveTransaction() {
  const amount = parseFloat(val('txn-amount'));
  const note   = val('txn-note').trim();

  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!state.currentCustomerId) { showToast('No customer selected.', 'error'); return; }

  setBtnLoading('btn-save-txn', true, 'Saving...');
  try {
    const res = await fetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: state.currentCustomerId,
        type: state.selectedTxnType,
        amount,
        note: note || null,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    showToast(
      state.selectedTxnType === 'UDHAR'
        ? `🔴 Udhar Diya: ₹${fmt(amount)} recorded. Customer owes you.`
        : `🟢 Jama Hua: ₹${fmt(amount)} received. Balance reduced.`,
      'success'
    );
    closeModal('modal-add-transaction');
    await loadLedger(state.currentCustomerId);
    await loadSummary();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    setBtnLoading('btn-save-txn', false, 'Save Entry');
  }
}

// ── Voice Entry (Web Speech API) ────────────────────────────────
function openVoiceModal() {
  openModal('modal-voice');
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    setText('voice-status', '⚠️ Speech recognition not supported in this browser.');
    document.getElementById('btn-mic').disabled = true;
  }
}

function toggleVoiceListening() {
  if (state.isVoiceListening) stopVoiceListening();
  else startVoiceListening();
}

function startVoiceListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  state.recognition = new SpeechRecognition();
  state.recognition.lang = 'hi-IN';
  state.recognition.interimResults = true;
  state.recognition.maxAlternatives = 1;

  state.recognition.onstart = () => {
    state.isVoiceListening = true;
    setText('voice-status', '🔴 Listening... Speak now');
    setText('btn-mic', '⏹ Stop');
    document.getElementById('btn-mic').classList.add('listening');
  };

  state.recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(r => r[0].transcript).join('').trim();
    setText('voice-transcript', transcript);

    if (event.results[0].isFinal) {
      parseVoiceCommand(transcript);
    }
  };

  state.recognition.onerror  = (e) => { showToast('Voice error: ' + e.error, 'error'); stopVoiceListening(); };
  state.recognition.onend    = () => stopVoiceListening();
  state.recognition.start();
}

function stopVoiceListening() {
  state.isVoiceListening = false;
  if (state.recognition) state.recognition.stop();
  setText('voice-status', 'Click the mic to start speaking');
  setText('btn-mic', '🎙️ Start Listening');
  const btn = document.getElementById('btn-mic');
  if (btn) btn.classList.remove('listening');
}

function parseVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  const type  = lower.includes('udhar') ? 'UDHAR' : lower.includes('jama') ? 'JAMA' : null;
  const amountMatch = lower.match(/(\d+)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  if (type && amount) {
    closeModal('modal-voice');
    setTxnType(type);
    const amtInput = document.getElementById('txn-amount');
    if (amtInput) amtInput.value = amount;
    const noteInput = document.getElementById('txn-note');
    if (noteInput) noteInput.value = transcript;
    openModal('modal-add-transaction');
    showToast(`Voice: ${type} ₹${amount} — confirm to save.`, 'info');
  } else {
    setText('voice-status', '⚠️ Could not parse command. Try: "Ramesh 500 udhar"');
  }
}

// ── Sidebar Toggle (Mobile) ─────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Close sidebar if clicking outside on mobile
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  }
});

// ── Keyboard Shortcuts ──────────────────────────────────────────
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      focusEl('customer-search-input');
    }
    if (e.key === 'Escape') {
      ['modal-add-customer', 'modal-add-transaction', 'modal-voice'].forEach(id => closeModal(id));
      if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
    }
  });

  // Enter key to submit modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!document.getElementById('modal-add-customer').classList.contains('hidden')) saveCustomer();
      else if (!document.getElementById('modal-add-transaction').classList.contains('hidden')) saveTransaction();
    }
  });
}

// ── Modal Helpers ───────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── UI Utilities ────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}
function focusEl(id) {
  const el = document.getElementById(id);
  if (el) el.focus();
}
function clearFields(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}
function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = label;
}
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(num) {
  return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function emptyStateHTML(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
}

// ── Toast ───────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; }, 3000);
  setTimeout(() => toast.remove(), 3300);
}
