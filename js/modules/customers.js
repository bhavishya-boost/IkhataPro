/* iKhataPro Customer CRM & 360° Profile Module (With Dynamic Segmentation & Aging) — Phase 3 */

window.iKhataCustomers = {
  toggleBadDebt(customerId) {
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    customer.isBadDebt = !customer.isBadDebt;
    if (customer.isBadDebt) {
      customer.category = 'Bad Debt';
      customer.score = 25;
    }
    window.iKhataStore.saveState();

    if (customer.isBadDebt) {
      window.iKhataUI.showToast(`🛑 ${customer.name} marked as Bad Debt / Credit Frozen!`, 'danger');
    } else {
      window.iKhataUI.showToast(`✓ Credit un-frozen for ${customer.name}`, 'success');
    }
    window.iKhataUI.refresh();
  },

  openDigitalPassbookModal(customerId) {
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (!customer) return;

    const customerTx = window.iKhataStore.getTransactions().filter(t => t.customerId === customerId);
    const currentBus = window.iKhataStore.getCurrentBusiness();
    const passbookURL = `${window.location.origin}${window.location.pathname}#shop/${currentBus ? currentBus.slug : 'store'}`;

    window.iKhataUI.openModal(`📲 Digital Passbook & Payment Link: ${customer.name}`, `
      <div>
        <div style="background: var(--primary-light); border: 1px solid var(--border-focus); padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 16px;">
          <div>Customer Public Link: <strong>${passbookURL}</strong></div>
          <div style="color: var(--text-muted); font-size: 0.78rem; margin-top: 2px;">Customer can view their passbook online and pay via UPI (GPay/PhonePe/Paytm)</div>
        </div>

        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 16px; background: white;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; font-weight: 700;">
            <span>${customer.name} Passbook</span>
            <span style="color: ${customer.balance > 0 ? 'var(--danger)' : 'var(--success)'};">Due: ₹${customer.balance.toLocaleString('en-IN')}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px; max-height: 180px; overflow-y: auto;">
            ${customerTx.length === 0 ? '<p style="color: var(--text-muted);">No transaction history.</p>' : customerTx.map(t => `
              <div class="passbook-row">
                <div>
                  <div>${t.note || t.type}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${t.date} ${t.time || ''}</div>
                </div>
                <strong style="color: ${t.type === 'GOT' ? 'var(--success)' : 'var(--danger)'};">
                  ${t.type === 'GOT' ? '-' : '+'}${t.amount.toLocaleString('en-IN')}
                </strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <button class="btn btn-success" onclick="const phone = ('${customer.phone || '919216953892'}').replace(/[^0-9]/g, ''); const formattedPhone = phone.length === 10 ? '91' + phone : phone; window.open('https://api.whatsapp.com/send?phone=' + formattedPhone + '&text=' + encodeURIComponent('Namaste ${customer.name} ji! Aapki dukaan passbook aur bill summary: ${passbookURL}'), '_blank'); window.iKhataUI.closeModal(); window.iKhataUI.showToast('📲 Passbook sent via WhatsApp!', 'success');">
            📲 Send Passbook via WhatsApp
          </button>
          <button class="btn btn-outline" onclick="navigator.clipboard.writeText('${passbookURL}'); window.iKhataUI.showToast('✓ Link copied to clipboard!', 'success');">
            📋 Copy Public Link
          </button>
        </div>
      </div>
    `);
  },

  renderProfile(customerId, state) {
    const customer = window.iKhataStore.getCustomers().find(c => c.id === customerId);
    if (!customer) return '<div>Customer not found</div>';

    const formatCurrency = (amt) => '₹' + Math.abs(amt || 0).toLocaleString('en-IN');
    const customerTx = window.iKhataStore.getTransactions().filter(t => t.customerId === customerId);
    const customerBills = window.iKhataStore.getBills().filter(b => b.customerId === customerId);
    const customerInvoices = window.iKhataStore.getInvoices().filter(i => i.customerId === customerId);

    // Compute Customer 360 Stats
    const totalGave = customerTx.filter(t => t.type === 'GAVE').reduce((s,t) => s + (t.amount || 0), 0);
    const totalGot = customerTx.filter(t => t.type === 'GOT').reduce((s,t) => s + (t.amount || 0), 0);
    const totalBillsAmt = customerBills.reduce((s,b) => s + (b.grandTotal || 0), 0);
    const totalInvsAmt = customerInvoices.reduce((s,i) => s + (i.total || 0), 0);
    const totalPurchases = totalGave + totalBillsAmt + totalInvsAmt;

    const daysOverdue = customer.daysSinceLastActivity || 0;
    const computedCategory = customer.isBadDebt ? 'Bad Debt' : (customer.category || 'Regular');

    // Dynamic category badge styling
    let categoryBadgeClass = 'badge-success';
    if (computedCategory === 'VIP') categoryBadgeClass = 'badge-ai';
    else if (computedCategory === 'At Risk' || computedCategory === 'Overdue') categoryBadgeClass = 'badge-danger';
    else if (computedCategory === 'Bad Debt') categoryBadgeClass = 'badge-danger';
    else if (computedCategory === 'New') categoryBadgeClass = 'badge-neutral';

    return `
      <div style="margin-bottom: 20px;">
        <button class="btn btn-outline btn-sm" onclick="window.iKhataUI.navigate('khata')">
          ← Back to Khata
        </button>
      </div>

      <!-- Credit Freeze Warning Banner if Bad Debt -->
      ${customer.isBadDebt ? `
        <div class="credit-freeze-banner">
          <span style="font-size: 1.4rem;">🛑</span>
          <div>
            <strong>CREDIT FROZEN (BAD DEBT / OVERDUE)</strong>
            <div style="font-size: 0.8rem; font-weight: normal;">New credit transactions ("I GAVE") are blocked for this customer.</div>
          </div>
        </div>
      ` : ''}

      <!-- Customer Profile Header Card -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--primary-light); color: var(--primary); font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; justify-content: center;">
              ${customer.name.charAt(0)}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h1 style="font-size: 1.5rem; margin-bottom: 2px;">${customer.name}</h1>
                <span class="badge ${categoryBadgeClass}">${computedCategory}</span>
                ${customer.isBadDebt ? '<span class="badge badge-danger">🛑 Frozen</span>' : ''}
              </div>
              <div style="display: flex; gap: 10px; font-size: 0.85rem; color: var(--text-muted); align-items: center; margin-top: 4px;">
                <span>📱 ${customer.phone}</span>
                <span>•</span>
                <span>📍 ${customer.city || 'Local'}</span>
                <span>•</span>
                <span>🕒 Last Active: ${customer.lastActive || daysOverdue + ' days ago'}</span>
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">CURRENT BALANCE</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; color: ${customer.balance > 0 ? 'var(--danger)' : (customer.balance < 0 ? 'var(--success)' : 'var(--text-muted)')};">
              ${formatCurrency(customer.balance)}
            </div>
            <div style="font-size: 0.8rem; font-weight: 700; color: ${customer.balance > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${customer.balance > 0 ? 'YOU WILL GET' : (customer.balance < 0 ? 'YOU WILL GIVE' : 'SETTLED')}
            </div>
          </div>
        </div>

        <!-- PTP Promise Badge Row if set -->
        ${customer.ptpDate ? `
          <div style="margin-top: 16px;">
            <span class="ptp-badge">📅 Promised to pay ₹${(customer.ptpAmount || customer.balance).toLocaleString('en-IN')} on ${customer.ptpDate}</span>
            ${customer.ptpNote ? `<span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">(${customer.ptpNote})</span>` : ''}
          </div>
        ` : ''}

        <hr style="border: none; border-top: 1px solid var(--border-color); margin: 20px 0;">

        <!-- Score & 360 Insights Row -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Trust & Credit Score</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <span style="font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: ${customer.score >= 80 ? 'var(--success)' : (customer.score >= 60 ? 'var(--primary)' : 'var(--danger)')};">
                ${customer.score || 80}/100
              </span>
              <span class="badge ${customer.score >= 80 ? 'badge-success' : 'badge-danger'}">${customer.score >= 80 ? 'Low Risk' : 'High Risk'}</span>
            </div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Lifetime Purchases</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-top: 4px;">
              ₹${totalPurchases.toLocaleString('en-IN')}
            </div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Total Payments Made</div>
            <div style="font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 700; color: var(--success); margin-top: 4px;">
              ₹${totalGot.toLocaleString('en-IN')}
            </div>
          </div>

          <div style="background: var(--bg-main); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px 16px;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">Digital Passbook</div>
            <button class="btn btn-outline btn-sm" style="margin-top: 4px; width: 100%; justify-content: center;" onclick="window.iKhataCustomers.openDigitalPassbookModal('${customer.id}')">
              📲 Send Passbook Link
            </button>
          </div>
        </div>

        <!-- Action Buttons Bar -->
        <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="window.iKhataUI.openReceivePaymentModal('${customer.id}')">
              💰 Receive Payment
            </button>

            ${customer.isBadDebt ? `
              <button class="btn btn-outline" disabled title="Credit Frozen for Bad Debt">
                🚫 Credit Blocked
              </button>
            ` : `
              <button class="btn btn-primary" onclick="window.iKhataUI.openAddKhataModal('GAVE', '${customer.id}')">
                ➕ Add Transaction
              </button>
            `}

            <button class="btn btn-outline" onclick="window.iKhataUI.openReminderModal('${customer.id}')">
              💬 WhatsApp Reminder
            </button>

            <button class="btn btn-outline" onclick="window.iKhataPTP.openPTPModal('${customer.id}')">
              📅 Set PTP Date
            </button>
          </div>

          <button class="btn ${customer.isBadDebt ? 'btn-success' : 'btn-danger'} btn-sm" onclick="window.iKhataCustomers.toggleBadDebt('${customer.id}')">
            ${customer.isBadDebt ? '✓ Un-freeze Credit' : '🛑 Mark as Bad Debt'}
          </button>
        </div>
      </div>

      <!-- Transaction History Timeline -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📜 360° Transaction History & Ledger (${customerTx.length} entries)</div>
        </div>

        <div class="timeline">
          ${customerTx.length === 0 ? `
            <p style="color: var(--text-muted); font-size: 0.9rem;">No transactions recorded for this customer yet.</p>
          ` : customerTx.map(t => `
            <div class="timeline-item">
              <div class="timeline-dot ${t.type === 'GOT' ? 'got' : 'gave'}"></div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                <div>
                  <strong style="font-size: 0.95rem;">${t.type === 'GAVE' ? 'You Gave (Credit)' : 'You Got (Payment Received)'}</strong>
                  <div style="font-size: 0.8rem; color: var(--text-muted);">${t.date} ${t.time ? 'at ' + t.time : ''} • ${t.mode || 'Credit'}</div>
                  ${t.note ? `<div style="font-size: 0.85rem; color: var(--text-main); margin-top: 2px;">Note: ${t.note}</div>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.1rem; color: ${t.type === 'GOT' ? 'var(--success)' : 'var(--danger)'};">
                    ${t.type === 'GOT' ? '-' : '+'}${formatCurrency(t.amount)}
                  </div>
                  <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.iKhataPIN.requirePIN(() => { window.iKhataStore.deleteTransaction('${t.id}'); window.iKhataUI.showToast('Transaction deleted', 'success'); window.iKhataUI.refresh(); }, 'Delete Transaction')">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};
